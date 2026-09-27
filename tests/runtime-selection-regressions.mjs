// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=process.env.OUT??`results/jspi-asyncify/runtime-selection-fixes-${Date.now()}`;
await mkdir(out,{recursive:false});
const media='build/remux-fixtures-v1/avc-aac.mp4',body=await readFile(media),report={cases:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const cases=[
 {name:'auto-missing-engine',missing:true},
 {name:'auto-no-ranges',noRanges:true},
 {name:'off-missing-engine',missing:true,policy:'off'},
 {name:'forced-jspi-missing-engine',missing:true,policy:'jspi',error:'ASSET_LOAD_FAILED'},
 {name:'required-remux-missing-engine',missing:true,options:{nativeRemux:'always'},error:'ASSET_LOAD_FAILED'},
 {name:'headers-missing-engine',missing:true,remote:{headers:{'X-Test':'value'}},error:'ASSET_LOAD_FAILED'},
 {name:'immutable-no-ranges',noRanges:true,remote:{immutable:true},reject:true},
 {name:'omit-credentials-no-ranges',noRanges:true,remote:{credentials:'omit'},reject:true},
 {name:'permission-401',status:401,error:'SOURCE_PERMISSION'},
 {name:'permission-403',status:403,error:'SOURCE_PERMISSION'},
 {name:'prepare-default-jspi',warm:true},
 {name:'prepare-asyncify-no-isolation',warm:true,policy:'asyncify'},
 {name:'prepare-asyncify-isolated',warm:true,policy:'asyncify',isolated:true},
 {name:'prepare-on-isolated',warm:true,policy:'on',isolated:true},
];
try{for(const c of cases){
 const server=await serve({isolated:!!c.isolated,mediaPaths:{movie:media}}),context=await browser.newContext(),page=await context.newPage();
 page.setDefaultTimeout(15000);const r={name:c.name,requests:[]};report.cases.push(r);
 page.on('request',req=>{if(/engine-.*\.wasm/.test(req.url()))r.requests.push(new URL(req.url()).pathname);});
 try{
  if(c.missing)await page.route('**/engine-remux-jspi/remux.wasm',route=>route.fulfill({status:404,body:'missing'}));
  if(c.noRanges||c.status)await page.route('**/media/movie',route=>route.fulfill({status:c.status??200,contentType:'video/mp4',body:c.status?'denied':body}));
  await page.goto(server.origin+'/experiment/page.html');
  r.result=await page.evaluate(async({c,url})=>{
   const {Player}=await import('/web/generated/index.js');const player=window.player=new Player(document.querySelector('#surface'),{...(c.policy?{remuxRuntime:c.policy}:{}),...c.options});
   const result={selection:player.diagnostics.remuxRuntime};
   if(c.warm)result.preparation=await player.prepare(['inspector']);
   try{await player.openRemote({url,...c.remote});await player.play();result.plan=player.diagnostics.plan?.id;result.width=player.surface.videoWidth;}
   catch(e){result.error={code:e.code,message:e.message};}
   return result;
  },{c,url:server.origin+'/media/movie'});
  if(c.error)assert.equal(r.result.error?.code,c.error);
  else if(c.reject)assert.ok(r.result.error);
  else{
   assert.equal(r.result.error,undefined);assert.equal(r.result.plan,'native-direct');assert.ok(r.result.width>0);
   await page.waitForFunction(()=>player.state.currentTime>.25);
  }
  if(c.warm){
   assert.equal(r.result.preparation.assets[0].status,'ready');
   assert.deepEqual(r.requests,[`/web/engine-remux-${r.result.selection.runtime}/remux.wasm`],'Preloaded inspector should compile once and be reused by source inspection');
  }
  await page.evaluate(()=>player.destroy());await new Promise(resolve=>setTimeout(resolve,150));assert.equal(page.workers().length,0);r.passed=true;
 }catch(error){r.passed=false;r.failure=String(error.stack??error);}
 finally{await context.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(c.name,r.passed,r.failure??'');}
}}finally{await browser.close();report.passed=report.cases.every(r=>r.passed);await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(out);}
if(!report.passed)process.exitCode=1;
