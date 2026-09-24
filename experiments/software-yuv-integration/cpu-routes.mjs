// SPDX-License-Identifier: Apache-2.0
// Fresh matched measurements. Run from the repository root.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {serve} from './server.mjs';
import {focusForQualification,observeForeground} from '../../scripts/qualification-foreground.mjs';

const cases=(process.env.CASES||'mpeg2ts,mpeg2ps,mpeg4avi').split(',');
const rounds=Number(process.env.ROUNDS||3),roundStart=Number(process.env.ROUND_START||0),warmup=Number(process.env.WARMUP||4),windowSeconds=Number(process.env.MEASURE||12);
const out=`results/software-yuv-integration/cpu-routes-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const power=()=>execFileSync('pmset',['-g','batt'],{encoding:'utf8'}).trim();
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),host:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model,memory:os.totalmem(),powerAtStart:power()},cases,rounds,warmup,windowSeconds,trials:[]};
const save=()=>writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');
const server=await serve();
const finite=(v)=>Number.isFinite(v)?v:null;
const delta=(a,b)=>a===undefined||b===undefined?null:b-a;
console.log(out);
try{
 for(const name of cases)for(let round=roundStart;round<roundStart+rounds;round++)for(const variant of round%2?['auto','software']:['software','auto']){
  const trial={name,round,variant,powerAtStart:power()};result.trials.push(trial);await save();
  if(!trial.powerAtStart.includes('AC Power'))throw Error(`AC power required: ${trial.powerAtStart}`);
  const browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  trial.chrome=browser.version();let page;
  try{
   page=await browser.newPage({viewport:{width:1100,height:700},deviceScaleFactor:1});page.setDefaultTimeout(30000);
   trial.foregroundStart=await focusForQualification(page,browser);
   trial.pageErrors=[];page.on('pageerror',e=>trial.pageErrors.push(String(e)));
   await page.goto(server.origin+'/experiment/page.html');
   const url=`${server.origin}/media/${name}?id=${name}-${round}-${variant}`;
   trial.start=await page.evaluate(o=>start(o),{variant,url});
   await page.waitForTimeout(warmup*1000);
   trial.foregroundBeforeMeasure=await focusForQualification(page,browser);
   await page.evaluate(()=>player.current.backend.worker.postMessage({type:'profile',enabled:true}));
   await page.waitForTimeout(300);
   const cdp=await browser.newBrowserCDPSession();
   const sample=async()=>({at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>snapshot()),foreground:await observeForeground(page,browser),power:power()});
   const first=await sample(),samples=[first];let last=first;
   while(last.at-first.at<windowSeconds*1000){await page.waitForTimeout(1000);last=await sample();samples.push(last);}
   await page.waitForTimeout(250);last=await sample();samples.push(last);
   const cpuTime=last.processes.reduce((sum,p)=>{const old=first.processes.find(q=>q.id===p.id);return sum+(old?Math.max(0,p.cpuTime-old.cpuTime):0);},0);
   const elapsed=(last.at-first.at)/1000;
   const a=first.state,b=last.state;
   trial.continuity={first:first.processes.map(p=>({id:p.id,type:p.type})),last:last.processes.map(p=>({id:p.id,type:p.type})),sameProcesses:samples.every(s=>first.processes.every(p=>s.processes.some(q=>q.id===p.id&&q.type===p.type))),foreground:samples.map(s=>s.foreground),power:samples.map(s=>s.power)};
   const profile={};for(const key of Object.keys(b.diagnostics.profile||{}))profile[key]=delta(a.diagnostics.profile?.[key],b.diagnostics.profile[key]);
   const yuv={};for(const key of Object.keys(b.diagnostics.yuv||{}))if(typeof b.diagnostics.yuv[key]==='number')yuv[key]=delta(a.diagnostics.yuv?.[key],b.diagnostics.yuv[key]);
   trial.measurement={elapsed,cpuTime,cpuPercent:cpuTime/elapsed*100,frames:delta(a.frames,b.frames),fps:delta(a.frames,b.frames)/elapsed,positionAdvance:delta(a.position,b.position),drops:delta(a.drops,b.drops),audioUnderruns:delta(a.audio?.underruns,b.audio?.underruns),profile,yuv,first:a,last:b};
   trial.pixel=await page.evaluate(()=>{const canvas=document.querySelector('canvas');const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(canvas,0,0);return [...x.getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data];});
   await page.evaluate(()=>player.pause());await page.waitForTimeout(300);trial.paused=await page.evaluate(()=>snapshot());
   await page.evaluate(()=>player.play());await page.waitForTimeout(350);trial.resumed=await page.evaluate(()=>snapshot());
   const duration=name==='prores'?18:38;
   trial.seekForward=await page.evaluate(t=>seek(t),Math.min(duration-5,27));
   trial.seekBackward=await page.evaluate(t=>seek(t),4);
   await page.evaluate(()=>player.pause());await page.waitForTimeout(250);
   trial.seekImage=`${out}/${name}-${round}-${variant}.png`;
   await page.locator('canvas').screenshot({path:trial.seekImage});
   await page.evaluate(()=>player.play());
   trial.seekEOF=await page.evaluate(t=>seek(t),duration-1.5);
   await page.waitForTimeout(3000);trial.eof=await page.evaluate(()=>({snapshot:snapshot(),eof:player.properties.get('eof-reached'),idle:player.properties.get('idle-active')}));
   trial.cleanup=await page.evaluate(()=>stop());await page.waitForTimeout(300);trial.workersAfter=page.workers().length;
   const m=trial.measurement;
   trial.accepted=Boolean(trial.pageErrors.length===0&&b.errors.length===0&&m.frames>0&&Math.abs(m.positionAdvance-m.elapsed)<0.8&&m.drops<=Math.max(2,m.frames*.01)&&m.audioUnderruns===0&&trial.workersAfter===0&&trial.resumed.position>trial.paused.position+.1&&trial.eof.eof===true&&trial.seekForward&&trial.seekBackward&&a.diagnostics.softwarePresenter===(variant==='auto'?'yuv':'rgb')&&b.diagnostics.softwarePresenter===(variant==='auto'?'yuv':'rgb')&&trial.continuity.sameProcesses&&trial.continuity.foreground.every(f=>f.matched)&&trial.continuity.power.every(p=>p.includes('AC Power')));
   console.log(name,round,variant,JSON.stringify({accepted:trial.accepted,cpu:finite(m.cpuPercent),fps:finite(m.fps),drops:m.drops,upload:yuv.videoUploadBytes,fallBack:yuv.fallbackFrames}));
   trial.powerAtEnd=power();await save();
  }catch(error){trial.error=String(error.stack||error);console.log(name,round,variant,'ERROR',String(error));}
  finally{
   if(!trial.cleanup)await Promise.race([page?.evaluate(()=>window.player?.destroy()).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,5000))]);
   await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);
   await save();
  }
 }
}finally{await server.close();result.passed=result.trials.every(t=>t.accepted===true);await save();console.log(out);}
process.exit(result.passed?0:1);
