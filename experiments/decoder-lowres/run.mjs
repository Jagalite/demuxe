// SPDX-License-Identifier: Apache-2.0
// Run from the repository root. Each arm uses a fresh Chrome process.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {serve} from './server.mjs';
import {focusForQualification,observeForeground} from '../../scripts/qualification-foreground.mjs';
const cases=(process.env.CASES||'mpeg2_1080,mpeg4_1080,mpeg2_4k').split(',');
const levels=(process.env.LEVELS||'0,1,2,3').split(',').map(Number);
const rounds=Number(process.env.ROUNDS||2),warmup=Number(process.env.WARMUP||3),seconds=Number(process.env.MEASURE||6);
const out=`results/decoder-lowres/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),host:{cpu:os.cpus()[0].model,arch:os.arch(),memory:os.totalmem()},cases,levels,rounds,warmup,seconds,startAt:Number(process.env.START_AT||0),nativeControl:process.env.NATIVE_CONTROL==='1',trials:[]};
const save=()=>writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');
const server=await serve();console.log(out);
const dimensions=name=>name.endsWith('4k')||process.env.NATIVE_CONTROL==='1'?[1920,1080]:[960,540];
try {for(let round=0;round<rounds;round++)for(const name of cases)for(const lowres of (round%2?[...levels].reverse():levels)){
 const [width,height]=dimensions(name),trial={name,lowres,round,width,height};result.trials.push(trial);await save();
 const browser=await chromium.launch({channel:'chrome',headless:false,ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});trial.chrome=browser.version();let page;
 try {page=await browser.newPage({viewport:{width:Math.max(width+20,1100),height:Math.max(height+20,700)}});page.setDefaultTimeout(30000);trial.errors=[];page.on('pageerror',e=>trial.errors.push(String(e)));
  await page.goto(server.origin+'/experiment/page.html');trial.foregroundStart=await focusForQualification(page,browser);trial.start=await page.evaluate(o=>start(o),{url:`${server.origin}/media/${name}?id=${name}-${round}-${lowres}`,lowres,width,height});
  if(result.startAt)trial.initialSeek=await page.evaluate(t=>seekTo(t),result.startAt);
  await page.waitForTimeout(warmup*1000);trial.foregroundBeforeMeasure=await focusForQualification(page,browser);await page.evaluate(()=>player.worker.postMessage({type:'profile',enabled:true}));await page.waitForTimeout(250);
  const cdp=await browser.newBrowserCDPSession();const sample=async()=>({at:Date.now(),procs:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>snapshot()),foreground:await observeForeground(page,browser)});
  const first=await sample();await page.waitForTimeout(seconds*1000);const last=await sample();
  const elapsed=(last.at-first.at)/1000,cpuTime=last.procs.reduce((s,p)=>{const q=first.procs.find(q=>q.id===p.id);return s+(q?Math.max(0,p.cpuTime-q.cpuTime):0);},0);
  const d=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?b-a:null;
  const a=first.state,b=last.state,profile={};for(const key of Object.keys(b.diagnostics?.profile||{}))profile[key]=d(a.diagnostics?.profile?.[key],b.diagnostics.profile[key]);
  const yuv={};for(const key of Object.keys(b.diagnostics?.yuv||{}))if(typeof b.diagnostics.yuv[key]==='number')yuv[key]=d(a.diagnostics?.yuv?.[key],b.diagnostics.yuv[key]);
  trial.measure={elapsed,cpuTime,cpuPercent:100*cpuTime/elapsed,frames:d(a.frames,b.frames),fps:d(a.frames,b.frames)/elapsed,drops:d(a.drops,b.drops),positionAdvance:d(a.position,b.position),audioUnderruns:d(a.audioUnderruns,b.audioUnderruns),foreground:[first.foreground,last.foreground],processes:{first:first.procs,last:last.procs},profile,yuv,first:a,last:b};
  await page.evaluate(()=>player.pause());await page.waitForTimeout(200);trial.paused=await page.evaluate(()=>snapshot());
  trial.seekForward=await page.evaluate(()=>seekTo(10));trial.seekBackward=await page.evaluate(()=>seekTo(3));
  await page.evaluate(()=>player.pause());await page.waitForTimeout(200);await page.locator('canvas').screenshot({path:`${out}/${name}-${lowres}-${round}.png`});
  await page.evaluate(()=>player.rate(1.5));await page.evaluate(()=>player.play());await page.waitForTimeout(1200);const rateStart=await page.evaluate(()=>snapshot());await page.waitForTimeout(1200);const rateEnd=await page.evaluate(()=>snapshot());trial.rateAdvance=rateEnd.position-rateStart.position;await page.evaluate(()=>player.rate(1));
  const end=name.endsWith('4k')?15:23;trial.seekEnd=await page.evaluate(t=>seekTo(t),end-1.5);await page.waitForTimeout(3200);trial.eof=await page.evaluate(()=>snapshot());
  trial.correct=trial.errors.length===0&&b.errors.length===0&&b.diagnostics?.softwarePresenter==='yuv'&&trial.measure.foreground.every(f=>f.matched)&&trial.measure.frames>0&&trial.measure.fps>25&&trial.measure.drops<=2&&trial.measure.audioUnderruns===0&&Math.abs(trial.measure.positionAdvance-elapsed)<1&&trial.seekForward&&trial.seekBackward&&trial.rateAdvance>1.2&&trial.eof.eof===true;
  console.log(name,lowres,round,JSON.stringify({cpu:trial.measure.cpuPercent,fps:trial.measure.fps,size:b.params?.['w']+'x'+b.params?.['h'],presenter:b.diagnostics?.softwarePresenter,correct:trial.correct}));await save();
 }catch(error){trial.error=String(error.stack||error);console.log(name,lowres,round,'ERROR',String(error));}
 finally{await Promise.race([page?.evaluate(()=>stop()).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,5000))]);await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,5000))]);await save();}
}}finally{await server.close();await save();}
