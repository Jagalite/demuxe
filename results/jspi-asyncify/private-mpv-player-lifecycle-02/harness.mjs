// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const assets=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'),manifestBytes=await fs.readFile(path.join(assets,'manifest.json'));
for(const [name,item] of Object.entries(JSON.parse(manifestBytes).files))assert.equal(hash(await fs.readFile(path.join(assets,name))),item.sha256,name);
const report={assetsSHA256:hash(manifestBytes),cases:[]};await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
try{for(const runtime of ['jspi','asyncify'])for(const service of ['subtitles','audio'])for(const scenario of ['pending-close','permission','asset-mismatch',...(service==='audio'?['worklet-fault','suspended-close']:['active-close'])]){
 const row={runtime,service,scenario};report.cases.push(row);
 const server=await serve({isolated:false,assetRoot:assets,mediaPaths:{movie:path.join(assets,'fixtures',service==='audio'?'pcm.mkv':'m0.mkv')}}),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(20000);
 try{
  if(scenario==='pending-close'||scenario==='permission')page.on('worker',worker=>{
   if(worker.url().includes(service==='audio'?'/private-mpv/audio-worker.js':'/mpv-subtitle-worker.js'))void worker.evaluate(scenario=>{
    const original=fetch;globalThis.fetch=(input,options)=>{
     const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
     if(url.pathname==='/media/movie'){url.searchParams.set('id','held');if(scenario==='pending-close')url.searchParams.set('delay','10000');else url.searchParams.set('denied','1');return original(url,options);}
     return original(input,options);
    };
   },scenario).catch(()=>{});
  });
  if(scenario==='permission')await context.route('**/media/movie?*denied=1',route=>route.fulfill({status:403,body:'denied'}));
  if(scenario==='asset-mismatch'){
   const opposite=runtime==='jspi'?'asyncify':'jspi',bytes=await fs.readFile(path.join(assets,`web/engine-mpv-${service}-${opposite}/service.wasm`));
   await context.route(`**/engine-mpv-${service}-${runtime}/service.wasm`,route=>route.fulfill({status:200,contentType:'application/wasm',body:bytes}));
  }
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async({runtime,service,url})=>{
   const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{assetBase:'/',remuxRuntime:runtime,nativeRemux:'always',...(service==='audio'?{audioPlayback:'worklet'}:{})});
   window.opening=player.openRemote({url}).then(()=>({opened:true}),e=>({error:{code:e.code,message:e.message}}));
  },{runtime,service,url:server.origin+'/media/movie'});
  if(scenario==='pending-close'){
   let observed=false;for(let i=0;i<400&&!observed;i++){observed=(server.states.get('held')?.active??0)>0;if(!observed)await page.waitForTimeout(25);}assert.ok(observed,'Service did not start a real pending source read');
   row.pending=JSON.parse(JSON.stringify(server.states.get('held')));
   row.closeMs=await page.evaluate(async()=>{const start=performance.now();await player.destroy();return performance.now()-start;});assert.ok(row.closeMs<1500,'Close waited for source timeout');row.open=await page.evaluate(()=>opening);assert.ok(row.open.error);
  }else if(scenario==='permission'||scenario==='asset-mismatch'){
   row.open=await page.evaluate(()=>opening);assert.equal(row.open.error?.code,scenario==='permission'?'SOURCE_PERMISSION':'ASSET_LOAD_FAILED');
  }else{
   row.open=await page.evaluate(()=>opening);assert.ok(row.open.opened,JSON.stringify(row.open));await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.2);
   if(scenario==='suspended-close')await page.evaluate(()=>player.current.backend.mpvAudio.context.suspend());
   if(scenario==='worklet-fault'){
    row.fault=await page.evaluate(async()=>{const owner=window.faultOwner=player.current.backend.mpvAudio;const channel=new MessageChannel();owner.node.port.postMessage({type:'connect',port:channel.port1},[channel.port1]);channel.port2.close();return owner.diagnostics;});
    await page.waitForFunction(()=>faultOwner.failed&&faultOwner.stopped);await page.waitForFunction(()=>faultOwner.context.state==='closed');row.faultStopped=await page.evaluate(()=>({failed:faultOwner.failed,stopped:faultOwner.stopped,context:faultOwner.context.state}));
   }
   row.closeMs=await page.evaluate(async()=>{const start=performance.now();await player.destroy();return performance.now()-start;});assert.ok(row.closeMs<1500);
  }
  await page.evaluate(()=>player.destroy());for(let i=0;i<30&&page.workers().length;i++)await page.waitForTimeout(50);row.remainingWorkers=page.workers().map(w=>w.url());assert.deepEqual(row.remainingWorkers,[]);row.passed=true;
 }catch(e){row.passed=false;row.failure=String(e.stack??e);}
 finally{await context.close();await server.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(row));}
}}finally{await browser.close();report.passed=report.cases.every(c=>c.passed);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');}
if(!report.passed)process.exitCode=1;
