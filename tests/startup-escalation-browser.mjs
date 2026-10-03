// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=process.env.OUT??`results/startup-escalation/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});const server=await serve(),results=[];
try{for(const family of ['chrome','firefox']){
 const browser=await(family==='chrome'?chromium:firefox).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});
 try{for(const variant of ['default','custom','fast']){
  const page=await browser.newPage();const requests=[];page.on('request',r=>{if(r.url().endsWith('/engine-remux/remux.wasm'))requests.push({at:Date.now(),url:r.url()});});
  try{
   await page.goto(server.origin+'/experiment/page.html');
   const result=await page.evaluate(async variant=>{
    const {Player}=await import('/web/generated/index.js'),{NativePlayer}=await import('/web/generated/internal/native-player.js');
    const file=new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4',{type:'video/mp4'});
    const options=variant==='custom'?{startupEscalation:{prefetchAfterMs:100,switchAfterMs:200}}:{};
    const p=new Player(document.querySelector('#surface'),options),trace=[];const mark=(name,data)=>trace.push({name,at:performance.timeOrigin+performance.now(),data});
    const originalPrefetch=p.prefetchStartup;p.prefetchStartup=function(...args){mark('prefetch',{plan:args[0]});return originalPrefetch.apply(this,args);};
    const wait=NativePlayer.prototype.wait;NativePlayer.prototype.wait=function(event,start,...args){if(this.requestedPlan?.startsWith('native-direct')&&['loadeddata','loadedmetadata'].includes(event)){mark('direct-load');return wait.call(this,event,variant==='fast'?start:()=>{},...args);}return wait.call(this,event,start,...args);};
    const create=p.create;p.create=async function(...args){mark('create',args[4]);return create.apply(this,args);};
    const dispose=p.dispose;p.dispose=async function(session){if(session)mark('dispose',session.backend.requestedPlan);return dispose.call(this,session);};
    try{await p.open(file);await p.play();const before=p.state.currentTime;await new Promise(r=>setTimeout(r,500));const after=p.state.currentTime;const result={variant,trace,before,after,plan:p.diagnostics.plan?.id,attempts:p.diagnostics.selection.attempts};await p.destroy();return result;}
    finally{NativePlayer.prototype.wait=wait;await p.destroy();}
   },variant);
   result.family=family;result.version=browser.version();result.requests=requests;results.push(result);
   assert.ok(result.after>result.before+.2,'Playback must advance');
   const start=result.trace.find(e=>e.name==='direct-load').at,prefetch=result.trace.find(e=>e.name==='prefetch');
   if(variant!=='fast'){
    const soft=variant==='custom'?100:400,hard=variant==='custom'?200:500;
    assert.equal(result.plan,'native-remux');assert.ok(prefetch.at-start>=soft-5);assert.ok(prefetch.at-start<hard+250);
    const next=result.trace.find(e=>e.name==='create'&&e.data==='native-remux');assert.ok(next.at-start>=hard-5);
    assert.ok(result.trace.some(e=>e.name==='dispose'&&e.data==='native-direct'&&e.at<=next.at),'Old native session must retire first');
    assert.equal(requests.length,1,'Prefetched Wasm must be consumed without a second download');
    assert.ok(requests[0].at>=prefetch.at-20&&requests[0].at<next.at,'Wasm request must begin before fallback allocation');
   }else{assert.equal(result.plan,'native-direct');assert.equal(prefetch,undefined);assert.equal(requests.length,0);}
   for(let i=0;i<80&&page.workers().length;i++)await page.waitForTimeout(25);assert.equal(page.workers().length,0);
   console.log('PASS',family,variant,JSON.stringify(result.trace));
  }finally{await page.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2));}
 }}finally{await browser.close();}
}}finally{await server.close();console.log(out);}
