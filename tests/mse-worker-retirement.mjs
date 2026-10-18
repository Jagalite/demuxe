// SPDX-License-Identifier: Apache-2.0
// Isolate browser worker/MSE retirement without FFmpeg, decoding or a player.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {waitForPageWorkers,closeTestBrowser} from './head-to-head/browser-exit.mjs';
const out=`results/mse-worker-retirement/${Date.now()}`;await mkdir(out,{recursive:true});
const report={scope:'Browser MSE lifetime diagnostic only; no playback or release qualification',checks:[],passed:false};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
const browser=await chromium.launch({headless:true,channel:'chrome'});report.browser=browser.version();
const workerSource=`let media;onmessage=({data})=>{if(data==='boot'){media=new MediaSource();media.addEventListener('sourceopen',()=>{media.addSourceBuffer('video/mp4; codecs="avc1.42c01e"');postMessage('ready');},{once:true});postMessage({handle:media.handle},[media.handle]);}else if(data==='self-close'){close();postMessage('closed');}else if(data==='parent-close')postMessage('closed');};`;
try{
 for(const owner of ['window','iframe'])for(const shutdown of ['self-close','parent-close'])for(const replacement of [false,true])for(let iteration=0;iteration<10;iteration++){
  const context=await browser.newContext(),page=await context.newPage(),row={owner,shutdown,replacement,iteration,passed:false};report.checks.push(row);page.setDefaultTimeout(10000);
  try{
   await page.goto(origin+'/examples/custom-controls.html');
   const supported=await page.evaluate(()=>MediaSource.canConstructInDedicatedWorker===true);
   if(!supported)throw Error('Chrome worker MSE unavailable; diagnostic cannot qualify');
   await page.evaluate(async({owner,source,replacement})=>{
    const video=document.createElement('video');document.body.append(video);
    async function start(){
     let frame;if(owner==='iframe'){frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);}
     const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),worker=new (frame?.contentWindow.Worker??Worker)(url),entry={worker,frame,url};
     await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('MSE sourceopen timed out')),5000);worker.onmessage=({data})=>{if(data?.handle){entry.handle=data.handle;video.srcObject=data.handle;}else if(data==='ready'){clearTimeout(timer);resolve();}};worker.onerror=event=>{clearTimeout(timer);reject(Error(event.message));};worker.postMessage('boot');});return entry;
    }
    const entries=[await start()];if(replacement)entries.push(await start());window.mseProbe={entries,video};
   },{owner,source:workerSource,replacement});
   row.cleanup=await page.evaluate(async shutdown=>{
    const {entries,video}=mseProbe,acknowledgements=[];
    for(const {worker,frame,url,handle} of entries){
     if(video.srcObject===handle){video.srcObject=null;video.load();}
     acknowledgements.push(await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),1000);worker.onmessage=({data})=>{if(data==='closed'){clearTimeout(timer);resolve(true);}};worker.postMessage(shutdown);}));
     worker.terminate();frame?.remove();URL.revokeObjectURL(url);
    }
    video.remove();return {acknowledgements,framesConnected:entries.some(entry=>entry.frame?.isConnected)};
   },shutdown);
   row.retirement=await waitForPageWorkers(page);
   if(row.cleanup.acknowledgements.some(value=>!value)||row.retirement.remainingWorkerURLs.length)throw Error('Minimal MSE worker failed retirement');
   row.passed=true;
  }catch(error){row.error=String(error.stack);try{const cdp=await browser.newBrowserCDPSession();row.targets=(await cdp.send('Target.getTargets')).targetInfos.filter(t=>t.type==='worker');await cdp.detach();}catch(cause){row.targetError=String(cause);}}
  finally{await context.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
 }
 report.passed=report.checks.every(row=>row.passed);if(!report.passed)process.exitCode=1;
}finally{
 await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');await closeTestBrowser(browser,'chrome');server.kill();console.log('MSE retirement diagnostic:',out);
}
