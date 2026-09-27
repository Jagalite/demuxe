// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome} from './head-to-head/benchmark-browser.mjs';
const assets=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'),manifest=await fs.readFile(path.join(assets,'manifest.json'));
for(const [name,v] of Object.entries(JSON.parse(manifest).files))assert.equal(hash(await fs.readFile(path.join(assets,name))),v.sha256,name);
await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
const result={assetsSHA256:hash(manifest),cases:[]},save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const server=await serve(assets,path.join(import.meta.dirname,'head-to-head'),path.join(out,'requests.jsonl'));let browser;
const cases=[
 {isolated:true,runtime:'pthread'},
 {isolated:false,runtime:'jspi'},
 {isolated:false,noJSPI:true,runtime:'asyncify'},
 {policy:'auto',isolated:true,runtime:'pthread'},
 {policy:'auto',isolated:false,runtime:'jspi',transcode:true},
 {policy:'on',isolated:true,runtime:'jspi'},
 {policy:'on',isolated:false,noJSPI:true,runtime:'asyncify',transcode:true},
 {policy:'asyncify',isolated:true,runtime:'asyncify'},
 {policy:'jspi',isolated:false,runtime:'jspi'},
 {policy:'off',isolated:true,runtime:'pthread'},
 {policy:'off',isolated:false,reject:true},
 {policy:'jspi',isolated:false,noJSPI:true,error:'UNSUPPORTED_FEATURE'},
 {policy:'asyctify',isolated:false,error:'INVALID_ARGUMENT'},
 {policy:'auto',isolated:false,missing:true,error:'ASSET_LOAD_FAILED'},
];
try{
 const launched=await launchBenchmarkChrome({headless:false});browser=launched.browser;result.browser=launched.identity;
 for(const c of cases){
  const entry={...c,requests:[]};result.cases.push(entry);const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('request',req=>{if(/engine-(remux|adaptation)/.test(req.url()))entry.requests.push(new URL(req.url()).pathname);});
  try{
   if(c.noJSPI)await context.addInitScript(()=>{WebAssembly.Suspending=undefined;WebAssembly.promising=undefined;});
   if(c.missing)await page.route('**/engine-remux-jspi/remux.wasm',route=>route.fulfill({status:404,body:'missing'}));
   await page.goto(server.origin+'/harness/harness.html'+(c.isolated?'':'?isolation=off'));
   const error=await page.evaluate(async c=>{
    try{
     const {Player}=await import('/demuxe/web/generated/index.js');
     window.player=new Player(document.querySelector('#stage'),{assetBase:'/demuxe/',...(c.policy===undefined?{}:{remuxRuntime:c.policy})});
     await player.open(location.origin+'/fixtures/'+(c.transcode?'h264-ac3-stereo/index.mkv':'h264-ts/index.ts'));await player.play();return null;
    }catch(e){return {code:e.code,message:e.message};}
   },c);entry.error=error;
   if(c.error)assert.equal(error?.code,c.error);
   else if(c.reject)assert.ok(error,'Off must not open a remux-only source without isolation');
   else{
    assert.equal(error,null);await page.waitForFunction(()=>player.state.currentTime>.5);
    entry.diagnostics=await page.evaluate(()=>player.diagnostics);
    assert.equal(entry.diagnostics.remuxRuntime.runtime,c.runtime);
    assert.equal(entry.diagnostics.remuxRuntime.isolated,c.isolated);
    assert.equal(entry.diagnostics.backend.remux.remux.transport,c.runtime);
    assert.equal(entry.diagnostics.plan.id,c.transcode?'native-transcode':'native-remux');
    await page.evaluate(async()=>{await player.pause();await player.seek(8);await player.play();});
    await page.waitForFunction(()=>player.state.currentTime>8.25);
   }
   if(c.policy==='off')assert.ok(entry.requests.every(url=>!/-jspi\/|-asyncify\//.test(url)));
   if(!c.isolated)assert.ok(entry.requests.every(url=>! /engine-(?:remux|adaptation)\//.test(url)),'Non-isolated selection requested pthread engine');
   await page.evaluate(()=>window.player?.destroy());await new Promise(r=>setTimeout(r,250));assert.equal(page.workers().length,0);
   entry.passed=true;
  }catch(e){entry.passed=false;entry.failure=String(e.stack??e);}
  finally{await context.close();await save();console.log(JSON.stringify({policy:c.policy??'default',isolated:c.isolated,noJSPI:c.noJSPI,passed:entry.passed,failure:entry.failure}));}
 }
 result.passed=result.cases.every(c=>c.passed);
}finally{await browser?.close();await server.close();await save();}
if(!result.passed)process.exitCode=1;
