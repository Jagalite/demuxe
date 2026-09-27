// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome} from './head-to-head/benchmark-browser.mjs';
const assets=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=await fs.readFile(path.join(assets,'manifest.json'));
for(const [name,value] of Object.entries(JSON.parse(manifest).files))assert.equal(hash(await fs.readFile(path.join(assets,name))),value.sha256,name);
const result={assetsSHA256:hash(manifest),sourceSHA256:hash(await fs.readFile(import.meta.filename)),cases:[]};
await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const server=await serve(assets,path.join(import.meta.dirname,'head-to-head'),path.join(out,'requests.jsonl'));
let browser;
try{
 const launched=await launchBenchmarkChrome({headless:false});browser=launched.browser;result.browser=launched.identity;
 for(const runtime of ['jspi','asyncify'])for(const scenario of ['replace','pending-destroy','permission','asset-mismatch']){
  const entry={runtime,scenario};result.cases.push(entry);const context=await browser.newContext({viewport:{width:960,height:540}});const page=await context.newPage();
  page.setDefaultTimeout(15000);
  try{
   await page.goto(server.origin+'/harness/harness.html?isolation=off');
   await page.evaluate(async runtime=>{const {Player}=await import('/demuxe/web/generated/index.js');window.testPlayer=new Player(document.querySelector('#stage'),{assetBase:'/demuxe/',experimentalRemuxRuntime:runtime});},runtime);
   if(scenario==='asset-mismatch'){
    const opposite=runtime==='jspi'?'asyncify':'jspi';const body=await fs.readFile(path.join(assets,`demuxe/web/engine-remux-${opposite}/remux.wasm`));
    await page.route(`**/engine-remux-${runtime}/remux.wasm`,route=>route.fulfill({status:200,contentType:'application/wasm',body}));
    entry.error=await page.evaluate(async()=>{try{await testPlayer.open(location.origin+'/fixtures/h264-ts/index.ts');return null;}catch(e){return {code:e.code,message:e.message};}});
    assert.equal(entry.error?.code,'ASSET_LOAD_FAILED');assert.match(entry.error.message,/backend asset mismatch/);
   }else{
    await page.evaluate(async()=>{await testPlayer.open(location.origin+'/fixtures/h264-ts/index.ts');await testPlayer.play();});
    await page.waitForFunction(()=>testPlayer.state.currentTime>.4);
    entry.initial=await page.evaluate(()=>testPlayer.diagnostics.backend.remux.remux);assert.equal(entry.initial.transport,runtime);
    if(scenario==='replace'){
     entry.routes=[];
     for(const file of ['h264-ac3-stereo/index.mkv','h264-ts/index.ts']){
      await page.evaluate(async file=>{await testPlayer.open(location.origin+'/fixtures/'+file);await testPlayer.play();},file);
      await page.waitForFunction(()=>testPlayer.state.currentTime>.4);
      const state=await page.evaluate(()=>({route:testPlayer.diagnostics.plan.id,runtime:testPlayer.diagnostics.backend.remux.remux}));
      assert.equal(state.runtime.transport,runtime);assert.equal(state.runtime.sharedHeap,false);entry.routes.push(state);
     }
     assert.deepEqual(entry.routes.map(s=>s.route),['native-transcode','native-remux']);
    }else if(scenario==='permission'){
     await page.route('**/fixtures/h264-ac3-stereo/index.mkv',route=>route.fulfill({status:401,body:'denied'}));
     entry.error=await page.evaluate(async()=>{try{await testPlayer.open(location.origin+'/fixtures/h264-ac3-stereo/index.mkv');return null;}catch(e){return {code:e.code,message:e.message};}});
     assert.equal(entry.error?.code,'SOURCE_PERMISSION');
     entry.retained=await page.evaluate(()=>testPlayer.diagnostics.backend.remux.remux);assert.equal(entry.retained.transport,runtime);
    }else{
     let observed;const pending=new Promise(resolve=>observed=resolve),held=[];
     await page.route('**/fixtures/h264-ts/index.ts',route=>{held.push(route);observed();});
     await page.evaluate(()=>{window.seekOutcome=testPlayer.seek(20).then(()=>({ok:true}),e=>({error:e.message}));});
     await Promise.race([pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('No held source read')),10000))]);
     entry.closeMs=await page.evaluate(async()=>{const start=performance.now();await testPlayer.destroy();return performance.now()-start;});
     assert.ok(entry.closeMs<1500);entry.seekOutcome=await page.evaluate(()=>seekOutcome);assert.ok(entry.seekOutcome.error);
     for(const route of held)await route.abort().catch(()=>{});
    }
   }
   await page.evaluate(()=>testPlayer.destroy());
   await page.waitForFunction(()=>document.querySelectorAll('#stage video,#stage canvas').length===0);
   await new Promise(resolve=>setTimeout(resolve,250));assert.equal(page.workers().length,0);
   entry.passed=true;
  }catch(error){entry.passed=false;entry.error=String(error.stack??error);}
  finally{await context.close();await save();console.log(runtime,scenario,entry.passed,entry.passed?'':entry.error);}
 }
 result.passed=result.cases.every(c=>c.passed);
}finally{await browser?.close();await server.close();await save();}
if(!result.passed)process.exitCode=1;
