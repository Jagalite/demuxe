// SPDX-License-Identifier: Apache-2.0
// Diagnostic only: exact source assets, with a recorded optional preloaded owner overlay.
import {webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const arm=process.env.OWNER_ARM||'production',out=`results/worker-owner/${arm}`;
await mkdir(out,{recursive:true});const report={arm,cycles:[],events:[],passed:false};const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
let browser;
try{
 browser=await webkit.launch({headless:true});report.browser=browser.version();
 const page=await browser.newPage();page.setDefaultTimeout(30000);
 page.on('console',m=>{const value=m.text();if(value.startsWith('WORKER_')){report.events.push({type:m.type(),value,time:Date.now()});console.log(value);}});
 page.on('requestfailed',r=>report.events.push({type:'requestfailed',url:r.url(),failure:r.failure(),time:Date.now()}));
 page.on('crash',()=>report.events.push({type:'crash',time:Date.now()}));
 await page.addInitScript(()=>{const Base=window.Worker;window.Worker=class extends Base{constructor(...args){const doc=window.document,frame=window.frameElement;super(...args);console.log('WORKER_CREATE',JSON.stringify({url:String(args[0]),iframe:!!frame,ready:doc.readyState,isolated:crossOriginIsolated}));frame?.addEventListener('load',()=>console.log('WORKER_OWNER_LOAD',JSON.stringify({url:String(args[0]),sameDocument:window.document===doc})),{once:true});this.addEventListener('error',e=>console.error('WORKER_ERROR',JSON.stringify({url:String(args[0]),type:e.type,message:e.message,filename:e.filename,line:e.lineno,connected:frame?.isConnected,ready:doc.readyState,sameDocument:window.document===doc})));}};});
 await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);await page.evaluate(()=>player.destroy());await page.evaluate(async()=>{const {WasmPlayer}=await import('/web/generated/internal/wasm-player.js');const original=WasmPlayer.prototype.destroy;let id=0;WasmPlayer.prototype.destroy=function(){if(!this.__traced){this.__traced=++id;const self=this;console.log('WORKER_CLEANUP_START',id,this.lifecycle.phase);if(this.worker){const post=this.worker.postMessage.bind(this.worker);this.worker.postMessage=(m,...args)=>{if(m.type==='destroy')console.log('WORKER_DESTROY_SENT',self.__traced);return post(m,...args);};this.worker.addEventListener('message',({data})=>{if(data.type==='destroyed')console.log('WORKER_DESTROY_ACK',self.__traced);});const terminate=this.worker.terminate.bind(this.worker);this.worker.terminate=()=>{console.log('WORKER_TERMINATE',self.__traced);return terminate();};}const remove=this.workerOwner.remove.bind(this.workerOwner);this.workerOwner.remove=()=>{console.log('WORKER_REMOVE_OWNER',self.__traced);return remove();};const close=this.audioContext.close.bind(this.audioContext);this.audioContext.close=()=>{console.log('WORKER_AUDIO_CLOSE_START',self.__traced,self.audioContext.state);return close().then(v=>{console.log('WORKER_AUDIO_CLOSE_DONE',self.__traced);return v;});};}const result=original.call(this);void result.then(()=>console.log('WORKER_CLEANUP_DONE',this.__traced),e=>console.error('WORKER_CLEANUP_FAILED',this.__traced,String(e)));return result;};});
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
  finally{let timer;try{await Promise.race([page.evaluate(async()=>{try{await player.destroy();}catch(error){console.error('WORKER_PUBLIC_CLEANUP_FAILED',JSON.stringify({error:String(error),diagnostics:player.resourceRegistry?.diagnostics,resources:player.control?.resources,current:player.current?.backend?.lifecycle}));await new Promise(resolve=>setTimeout(resolve,11000));throw error;}for(const frame of window.__diagnosticReadyOwners||[])frame.remove();}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cleanup deadline')),15000);})]);}catch(error){row.passed=false;row.cleanupError=String(error.stack);throw error;}finally{clearTimeout(timer);await save();}}
 }
 report.failures=report.cycles.filter(row=>!row.passed).length;report.passed=report.failures===0;
 if(!report.passed)process.exitCode=1;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});server.kill();await save();}
