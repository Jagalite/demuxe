// SPDX-License-Identifier: Apache-2.0
// Diagnostic trace only, not a performance qualification.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {collectCpuWindow,summarizeCpu} from './head-to-head/benchmark-browser.mjs';
import {serve} from './head-to-head/server.mjs';
import path from 'node:path';
const out=path.resolve('results/hevc-root-trace/20260926-05');await mkdir(out,{recursive:true});
const assets=path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01');
const server=await serve(assets,path.resolve('tests/head-to-head'),out+'/requests.jsonl');
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),cdp=await browser.newBrowserCDPSession();
 await page.addInitScript(()=>{const original=HTMLVideoElement.prototype.requestVideoFrameCallback;window.frameCallbacks=new Map();HTMLVideoElement.prototype.requestVideoFrameCallback=function(fn){const id=original.call(this,(...args)=>{frameCallbacks.delete(id);fn(...args);});frameCallbacks.set(id,this);return id;};});
 await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
 const catalogue=JSON.parse(await readFile(assets+'/fixtures/catalogue.json'));
 await page.evaluate(c=>api.start({...c,id:'demuxe.auto.hevc10-ac3',fixture:'hevc10-ac3',player:'demuxe',lane:'auto',correctness:false}),catalogue['hevc10-ac3']);
 await page.waitForTimeout(5000);
 const observations=[];
 const observe=async label=>{const samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>api.snapshot()),{seconds:8});observations.push({label,cpu:summarizeCpu(samples),samples});await writeFile(out+'/cpu.json',JSON.stringify(observations,null,2));console.log(label,JSON.stringify(observations.at(-1).cpu.roles));};
 await observe('with-eof-frame-callback');
 await page.evaluate(()=>{window.cancelledFrameCallbacks=frameCallbacks.size;for(const [id,video] of frameCallbacks)video.cancelVideoFrameCallback(id);frameCallbacks.clear();});
 const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 await cdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,v8,audio,media,gpu,viz,cc',options:'record-as-much-as-possible',transferMode:'ReportEvents'});
 await observe('without-eof-frame-callback');
 const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
 await writeFile(out+'/trace.json',JSON.stringify({traceEvents:events}));await writeFile(out+'/state.json',JSON.stringify(await page.evaluate(()=>api.snapshot()),null,2));
 console.log('trace',events.length);
}finally{await browser.close();await server.close();}
