// SPDX-License-Identifier: Apache-2.0
// Decompose real remux engine construction using Emscripten's existing hook.
import {chromium} from 'playwright';import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const out=process.env.RESULT_ROOT||`results/local-screening/runs/module-${Date.now()}`;await mkdir(out,{recursive:true});
const original=await readFile('web/native-remux-worker.js','utf8');
const controls=process.env.MODULE_CONTROLS==='1';
const reuse=process.env.MODULE_REUSE==='1';
const marker='engine=await createRemux({printErr:';
assert.equal(original.split(marker).length,2);
const hook=`engine=await createRemux({instantiateWasm(imports,done){void(async()=>{const start=performance.now();let module=data.screenModule;let fetched=start,bodyReady=start,compiled=start;if(!module){const response=await fetch(new URL('./engine-remux/remux.wasm',import.meta.url));fetched=performance.now();const bytes=await response.arrayBuffer();bodyReady=performance.now();module=await WebAssembly.compile(bytes);compiled=performance.now();}const instance=new WebAssembly.Instance(module,imports);console.info('SCREEN_MODULE '+JSON.stringify({operation:data.type,reused:!!data.screenModule,fetchHeadersMs:fetched-start,bodyMs:bodyReady-fetched,compileMs:compiled-bodyReady,instantiateMs:performance.now()-compiled}));done(instance,module);})().catch(error=>postMessage({type:'error',message:String(error)}));return {};},printErr:`;
const maintainedReference=process.env.MAINTAINED_REFERENCE==='1';
const body=maintainedReference?original:original.replace(marker,hook);await writeFile(out+'/instrumented-worker.js',body);
const result={scope:'Separate fetch/body/compile/instance attribution; optional one-page immutable module reuse with fresh mutable instances. Diagnostic only; browser compilation cache remains active.',reuse,maintainedReference,workerSHA256:createHash('sha256').update(body).digest('hex'),cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.once('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const page=await browser.newPage();let current;
 page.on('console',m=>{if(m.text().startsWith('SCREEN_MODULE '))current?.observations.push(JSON.parse(m.text().slice(14)));if(m.text().startsWith('SCREEN_READ '))current?.sourceReads.push(JSON.parse(m.text().slice(12)));});
 await page.route('**/native-remux-worker.js',async r=>r.fulfill({response:await r.fetch(),body}));
 const sourceWorker=await readFile('web/native-remux-source-worker.js','utf8');
 const readMarker='bytes=await reader.read(BigInt(offset),n);';assert.equal(sourceWorker.split(readMarker).length,2);
 const sourceBody=sourceWorker.replace(readMarker,"const screenReadStart=performance.now();"+readMarker+"console.info('SCREEN_READ '+JSON.stringify({readMs:performance.now()-screenReadStart,reader:globalThis.screenReader??=crypto.randomUUID(),offset,requested:n,bytes:bytes.length}));");
 result.sourceWorkerSHA256=createHash('sha256').update(sourceBody).digest('hex');await writeFile(out+'/instrumented-source-worker.js',sourceBody);
 await page.route('**/native-remux-source-worker.js',async r=>r.fulfill({response:await r.fetch(),body:sourceBody}));
 await page.addInitScript(({reuse,controls})=>{if(!reuse)return;let modulePromise;window.screenModuleBuilds=[];const send=Worker.prototype.postMessage;Worker.prototype.postMessage=function(data,...args){if((data?.type==='init'||data?.type==='probe')&&data.mailbox&&!('file' in data)&&!data.options){window.screenModuleConsumers=(window.screenModuleConsumers??0)+1;modulePromise??=(async()=>{const start=performance.now();if(controls){window.screenPopulationStarted=true;await new Promise(resolve=>window.screenResumePopulation=resolve);}const response=await fetch('/web/engine-remux/remux.wasm');const headers=performance.now();const bytes=await response.arrayBuffer();const body=performance.now();const module=await WebAssembly.compile(bytes);screenModuleBuilds.push({fetchHeadersMs:headers-start,bodyMs:body-headers,compileMs:performance.now()-body,bytes:bytes.byteLength});return module;})();modulePromise.then(module=>send.call(this,{...data,screenModule:module},...args));}else send.call(this,data,...args);};},{reuse,controls});
 await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async()=>{await player.destroy();window.API=await import('/web/generated/index.js');const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});await page.locator('#file').setInputFiles('build/optimization-fixtures/gain.mp4');
 if(controls){
  assert.ok(reuse);await page.evaluate(()=>{window.abandoned=new API.Player(document.body.appendChild(document.createElement('div')),{mode:'native',nativeRemux:'always'});window.abandonedResult=abandoned.open(document.querySelector('#file').files[0]).then(()=>({opened:true}),e=>({rejected:true,error:e.message}));});
  await page.waitForFunction(()=>window.screenPopulationStarted);
  await page.evaluate(()=>{window.live=new API.Player(document.body.appendChild(document.createElement('div')),{mode:'native',nativeRemux:'always'});window.liveOpen=live.open(document.querySelector('#file').files[0]);});
  await page.waitForFunction(()=>window.screenModuleConsumers>=2);
  result.abandonedPreparation=await page.evaluate(async()=>{await abandoned.destroy();screenResumePopulation();await liveOpen;await live.play();const outcome=await abandonedResult;const frames=live.surface.getVideoPlaybackQuality().totalVideoFrames;await live.destroy();return {outcome,frames,moduleBuilds:screenModuleBuilds.length};});
  assert.ok(result.abandonedPreparation.outcome.rejected);assert.ok(result.abandonedPreparation.frames>0);assert.equal(result.abandonedPreparation.moduleBuilds,1);await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  await page.evaluate(()=>{const f=document.createElement('input');f.type='file';f.id='other-file';document.body.append(f);});await page.locator('#other-file').setInputFiles('fixtures/example.mp4');
  result.sourceChange=await page.evaluate(async()=>{const p=new API.Player(document.body.appendChild(document.createElement('div')),{mode:'native',nativeRemux:'always'});const rows=[];try{for(const id of ['file','other-file']){const file=document.querySelector('#'+id).files[0];await p.open(file);await p.play();rows.push({name:file.name,size:file.size,sourceMatches:p.current.backend.remux.source.file===file,frames:p.surface.getVideoPlaybackQuality().totalVideoFrames});}return rows;}finally{await p.destroy();}});
  assert.ok(result.sourceChange.every(r=>r.sourceMatches&&r.frames>0));assert.notEqual(result.sourceChange[0].size,result.sourceChange[1].size);await page.waitForTimeout(100);assert.equal(page.workers().length,0);
 }
 for(const [name,count] of [['cold',1],['repeat-1',1],['repeat-2',1],['concurrent',2]]){current={name,observations:[],sourceReads:[]};result.cases.push(current);
  const operationStart=performance.now();current.output=await page.evaluate(async count=>{const players=[];try{return await Promise.all(Array.from({length:count},async()=>{const host=document.createElement('div');document.body.append(host);const p=new API.Player(host,{mode:'native',nativeRemux:'always'});players.push({p,host});await p.open(document.querySelector('#file').files[0]);await p.play();const d=p.diagnostics;if(d.plan.id!=='native-remux')throw Error('Wrong route');return {plan:d.plan.id,frames:p.surface.getVideoPlaybackQuality().totalVideoFrames};}));}finally{await Promise.all(players.map(async({p,host})=>{await p.destroy();host.remove();}));}},count);
  current.openPlayDestroyMs=performance.now()-operationStart;
  assert.equal(current.observations.length,maintainedReference?0:count*2);assert.ok(current.output.every(x=>x.frames>0));await page.waitForTimeout(100);assert.equal(page.workers().length,0);current.moduleBuilds=await page.evaluate(()=>window.screenModuleBuilds??[]);if(reuse){assert.equal(current.moduleBuilds.length,1);assert.ok(current.observations.every(x=>x.reused));}current.passed=true;
 }
}catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out,result.error||'PASS');}
