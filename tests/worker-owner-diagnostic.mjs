// SPDX-License-Identifier: Apache-2.0
// Diagnostic only: exact source assets, with a recorded optional preloaded owner overlay.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const arm=process.env.OWNER_ARM||'original',out=`results/worker-owner/${arm}`;
await mkdir(out,{recursive:true});const report={arm,cycles:[],events:[],passed:false};const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 const page=await browser.newPage();page.setDefaultTimeout(30000);
 page.on('console',m=>{const value=m.text();if(value.startsWith('WORKER_')){report.events.push({type:m.type(),value,time:Date.now()});console.log(value);}});
 page.on('requestfailed',r=>report.events.push({type:'requestfailed',url:r.url(),failure:r.failure(),time:Date.now()}));
 page.on('crash',()=>report.events.push({type:'crash',time:Date.now()}));
 await page.addInitScript(()=>{const Base=window.Worker;window.Worker=class extends Base{constructor(...args){const doc=window.document,frame=window.frameElement;super(...args);console.log('WORKER_CREATE',JSON.stringify({url:String(args[0]),iframe:!!frame,ready:doc.readyState,isolated:crossOriginIsolated}));frame?.addEventListener('load',()=>console.log('WORKER_OWNER_LOAD',JSON.stringify({url:String(args[0]),sameDocument:window.document===doc})),{once:true});this.addEventListener('error',e=>console.error('WORKER_ERROR',JSON.stringify({url:String(args[0]),type:e.type,message:e.message,filename:e.filename,line:e.lineno,connected:frame?.isConnected,ready:doc.readyState,sameDocument:window.document===doc})));}};});
 await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);await page.evaluate(()=>player.destroy());
 for(let cycle=0;cycle<80;cycle++){
  const row={cycle,phase:'create',passed:false};report.cycles.push(row);await save();
  try{
   await page.evaluate(async settled=>{
    window.__diagnosticReadyOwners=[];
    window.prepareOwner=async()=>{if(!settled)return;const frame=document.createElement('iframe');frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.src='about:blank';await new Promise((resolve,reject)=>{frame.addEventListener('load',resolve,{once:true});frame.addEventListener('error',reject,{once:true});document.body.append(frame);});frame.dataset.ownerSettled='1';__diagnosticReadyOwners.push(frame);};
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'hybrid'});await prepareOwner();await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4'));
    for(const name of ['first','second'])await player.addSubtitle(new File([`1\n00:00:00,000 --> 00:00:05,000\n${name}\n`],name+'.srt'));
    window.selectedSubtitle=player.state.subtitleTracks[1].id;await player.selectSubtitleTrack(selectedSubtitle);
   },arm==='settled');
   for(const mode of ['software','hybrid']){row.phase=mode;await save();await page.evaluate(async m=>{await prepareOwner();await player.setMode(m);if(player.state.mediaInfo.subtitle.id!==selectedSubtitle)throw Error('Subtitle selection changed');if(__diagnosticReadyOwners.length)throw Error('Prepared owner not consumed');},mode);}
   row.passed=true;console.log('PASS cycle',cycle,arm);
  }catch(error){row.error=String(error.stack);console.error('FAIL cycle',cycle,arm,row.error);}
  finally{let timer;try{await Promise.race([page.evaluate(async()=>{await player.destroy();for(const frame of window.__diagnosticReadyOwners||[])frame.remove();}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cleanup deadline')),15000);})]);}finally{clearTimeout(timer);await save();}}
 }
 report.failures=report.cycles.filter(row=>!row.passed).length;report.passed=report.failures===0;
 if(arm==='settled'&&!report.passed)process.exitCode=1;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});server.kill();await save();}
