// SPDX-License-Identifier: Apache-2.0
// Installed packages only: qualified resolution -> acquisition -> recipe -> MSE.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',setup=JSON.parse(await readFile('build/component-consumer/latest.json','utf8'));
const combined=JSON.parse(await readFile(path.join(setup.work,'combined/demuxe-providers.json'),'utf8'));
const identities=Object.fromEntries(combined.providers.map(p=>[p.id,p.implementationIdentity]));
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;requests.push({case:active,path:name});
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><video width="320" height="180"></video>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-audio/repair'):path.resolve(setup.work);
 const relative=name.startsWith('/fixtures/')?name.slice(10):name.slice(1),file=name==='/fixtures/copy.mkv'?path.resolve('build/provider-container/no-reorder.mkv'):path.resolve(base,relative);
 if(name!=='/fixtures/copy.mkv'&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const result={family,setup,cases:[],costs:[],passed:false};
const policy={objective:'startup',maxAgeMs:600000,maxStartupMs:10000,minThroughputRatio:1};
try{
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0}}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});result.browser=browser.version();
 async function run({codec='ac3',deployment='combined',baseline='fine',measurement,verify=true,id}){
  active=id;const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  const sample=await page.evaluate(async({codec,deployment,baseline,identities,measurement,verify,policy,coreBuild})=>{
   const base=new URL('/'+deployment+'/',location.href);
   const {parseProviderDeployment}=await import(new URL('web/generated/internal/provider-catalog.js',base).href);
   const {ProviderAcquisition}=await import(new URL('web/generated/internal/provider-acquisition.js',base).href);
   const {audioRepairRecipe,packetCopyRecipe}=await import(new URL('web/generated/internal/component-recipes.js',base).href);
   const {executeComponentBinding}=await import(new URL('web/generated/internal/component-selection.js',base).href);
   const {providerReadinessKey}=await import(new URL('web/generated/internal/provider-cost.js',base).href);
   const {createComponentOwners}=await import(new URL('web/providers/components/provider-container/src/owners.js',base).href);
   const catalog=parseProviderDeployment(await(await fetch(new URL('demuxe-providers.json',base))).json(),base);
   const manager=createComponentOwners(catalog,base),acquisition=new ProviderAcquisition(catalog,manager.owners),controller=new AbortController();
   const input=await(await fetch('/fixtures/'+codec+'.mkv')).arrayBuffer();
   const sourceSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),b=>b.toString(16).padStart(2,'0')).join('');
   const logicalCodec=codec==='dca'?'dts-core':codec,recipe=codec==='copy'?packetCopyRecipe():audioRepairRecipe(logicalCodec);
   const scopeKey=JSON.stringify([recipe.id,sourceSHA256,navigator.userAgent,crossOriginIsolated]);
   const contextKey=JSON.stringify([coreBuild,catalog.catalog.revision,scopeKey,providerReadinessKey(manager.readiness())]);
   // Candidate qualification is explicit and test-scoped. Package offers never
   // generate these tickets in production; successful output supplies evidence.
   const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,identities[a.providerId]]))}));
   let mediaResult;
   try{
    const start=performance.now();const execution=await executeComponentBinding(acquisition,recipe,evidence,scopeKey,baseline,
     binding=>codec==='copy'?manager.executeCopy(new Blob([input]),controller.signal):manager.execute(new Blob([input]),logicalCodec,binding,controller.signal),measurement?{records:measurement,contextKey,policy,now:Date.now()}:undefined);
    const executionMs=performance.now()-start,blob=execution.value,readiness=manager.readiness();
    if(!verify)return {sourceSHA256,codec,contextKey,decision:execution.decision,executionMs,bytes:blob.size,readiness};
    const video=document.querySelector('video'),audio=new AudioContext(),analyser=audio.createAnalyser(),source=audio.createMediaElementSource(video);
    source.connect(analyser);analyser.connect(audio.destination);await audio.resume();
    const media=new MediaSource(),url=URL.createObjectURL(media);video.src=url;
    try{
     await new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('MSE open timeout')),10000);media.addEventListener('sourceopen',()=>{clearTimeout(timer);r();},{once:true});});
     const buffer=media.addSourceBuffer(codec==='copy'?'video/mp4; codecs="avc1.64001e,mp4a.40.2"':'video/mp4; codecs="avc1.64001e,flac"'),bytes=await blob.arrayBuffer();
     await new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('MSE append timeout')),10000);buffer.addEventListener('updateend',()=>{clearTimeout(timer);r();},{once:true});buffer.addEventListener('error',()=>{clearTimeout(timer);j(Error('MSE append failed'));},{once:true});buffer.appendBuffer(bytes);});media.endOfStream();await video.play();
     const wave=new Float32Array(analyser.fftSize),end=performance.now()+15000;let audioPeak=0;
     while(video.currentTime<0.5&&performance.now()<end){analyser.getFloatTimeDomainData(wave);for(const n of wave)audioPeak=Math.max(audioPeak,Math.abs(n));await new Promise(r=>setTimeout(r,20));}
     const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);
     mediaResult={time:video.currentTime,duration:video.duration,audioPeak,nonblack:cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60)};
     video.currentTime=2;const seekEnd=performance.now()+5000;let seekAudioPeak=0;
     while((video.seeking||video.currentTime<2.15)&&performance.now()<seekEnd){analyser.getFloatTimeDomainData(wave);for(const n of wave)seekAudioPeak=Math.max(seekAudioPeak,Math.abs(n));await new Promise(r=>setTimeout(r,20));}
     mediaResult.seekTime=video.currentTime;mediaResult.seekAudioPeak=seekAudioPeak;
     if(video.seeking||video.currentTime<2.15||seekAudioPeak<=0.001)throw Error('Seek output verification failed');

    }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);source.disconnect();analyser.disconnect();await audio.close();}
    return {sourceSHA256,codec,contextKey,decision:execution.decision,executionMs,bytes:blob.size,readiness,...mediaResult};
   }catch(error){return {code:error.code,message:String(error),sourceSHA256,codec,contextKey};}
   finally{controller.abort();await acquisition.dispose();}
  },{codec,deployment,baseline,identities,measurement,verify,policy,coreBuild:setup.archives[0].archiveSHA256});
  assert.deepEqual(errors,[]);await page.close();result.cases.push({id,deployment,...sample});console.log(id,JSON.stringify({decision:sample.decision,code:sample.code,executionMs:sample.executionMs,nonblack:sample.nonblack}));return sample;
 }
 const copy=await run({id:'typescript-copy',codec:'copy',deployment:'missing',baseline:'typescript'});assert.equal(copy.decision?.bindingId,'typescript',JSON.stringify(copy));assert.ok(copy.nonblack&&copy.audioPeak>0.001);assert.ok(!requests.some(r=>r.case==='typescript-copy'&&r.path.endsWith('.wasm')));
 for(const codec of ['ac3','eac3','dca'])for(const deployment of ['fine','common']){
  const sample=await run({id:deployment+'-'+codec,codec,deployment});assert.equal(sample.decision?.bindingId,deployment,JSON.stringify(sample));assert.ok(sample.time>=0.5);assert.equal(sample.nonblack,true);assert.ok(sample.audioPeak>0.001);
  const used=requests.filter(r=>r.case===deployment+'-'+codec&&r.path.endsWith('.wasm')).map(r=>r.path);
  assert.equal(used.length,deployment==='common'?1:2);assert.ok(used.every(p=>deployment==='common'?p.includes('/common/'):!p.includes('/common/')));
 }
 const missing=await run({id:'missing-provider',deployment:'missing',verify:false});assert.equal(missing.code,'DEPLOYMENT_UNAVAILABLE');assert.match(missing.message,/audio.decode.ac3/);assert.ok(!requests.some(r=>r.case==='missing-provider'&&r.path.endsWith('.wasm')));
 // Sequential, interleaved complete-preparation measurements. No CPU or peak
 // memory is fabricated; this policy requests only measured startup/throughput.
 const samples={fine:[],common:[]};let contextKey;
 for(let repeat=0;repeat<3;repeat++)for(const baseline of repeat%2?['common','fine']:['fine','common']){
  const sample=await run({id:`cost-${repeat}-${baseline}`,baseline});assert.ok(sample.nonblack&&sample.audioPeak>0.001);contextKey??=sample.contextKey;assert.equal(sample.contextKey,contextKey);samples[baseline].push(sample);
 }
 for(const [bindingId,group]of Object.entries(samples)){
  const values=group.map(s=>s.executionMs),mean=values.reduce((a,b)=>a+b,0)/values.length;
  result.costs.push({bindingId,contextKey,evidenceId:'sha256:'+createHash('sha256').update(JSON.stringify(group)).digest('hex'),measuredAt:Date.now(),samples:group.length,measurement:'complete-recipe',remainingStartupMs:mean,throughputRatio:Math.min(...group.map(s=>s.duration*1000/s.executionMs)),startupUncertaintyMs:Math.max(...values.map(n=>Math.abs(n-mean)))});
 }
 const selected=await run({id:'measured-selection',measurement:result.costs});assert.ok(selected.nonblack&&selected.audioPeak>0.001);assert.equal(selected.contextKey,contextKey);assert.ok(['baseline','measured-cost','uncertain-difference'].includes(selected.decision.reason));
 result.passed=true;
}finally{
 if(browser)result.cleanup=await closeTestBrowser(browser,family);server.closeAllConnections();await new Promise(r=>server.close(r));result.requests=requests;
 await mkdir('results/media-components/component-installed',{recursive:true});await writeFile(`results/media-components/component-installed/${family}.json`,JSON.stringify(result,null,2)+'\n');
}
