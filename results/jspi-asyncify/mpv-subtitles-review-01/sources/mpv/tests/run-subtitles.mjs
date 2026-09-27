// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..'),exp=path.join(root,'experiments/jspi-asyncify');
const build=process.env.MPV_SERVICE_BUILD,frozen=path.join(root,'build/jspi-asyncify/mpv-frozen');
const backends=(process.env.BACKENDS??'pthread,jspi,asyncify').split(',');
assert.ok(backends.every(x=>['pthread','jspi','asyncify'].includes(x)));assert.equal(new Set(backends).size,backends.length);
if(backends.some(x=>x!=='pthread')&&!build)throw Error('MPV_SERVICE_BUILD required');
const out=path.join(root,'results/jspi-asyncify',process.env.RUN_NAME??'mpv-subtitles-'+Date.now());await mkdir(out);
const files=new Map(),hashes={},requests=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function add(url,file){const bytes=await readFile(file);files.set(url,bytes);hashes[url]={path:file,sha256:hash(bytes)};}
for(const name of ['mpv/tests/run-subtitles.mjs','mpv/tests/subtitle-worker.mjs','mpv/runtime/engine.mjs','runtime/scheduler.mjs','runtime/continuations.mjs','stage2/runtime/range-source.mjs']){
 await add('/experiment/'+name,path.join(exp,name));const dest=path.join(out,'sources',name);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,files.get('/experiment/'+name));
}
for(const name of ['service.mjs','service.wasm'])await add('/baseline/'+name,path.join(frozen,'baseline',name));
if(build)for(const name of ['service.mjs','service.wasm','service.asyncify.wasm'])await add('/candidate/'+name,path.join(build,name));
for(const name of ['m0.mkv','replacement.mkv','movtext.mp4','pgs.mkv','vobsub.mkv','font.ttf'])await add('/fixtures/'+name,path.join(frozen,'fixtures',name));
// Freeze provenance before any server starts and require the declared binaries.
const provenance={};
for(const name of ['inputs.json','fixture-generation.json','bitmap-inputs.json','baseline/manifest.json']){
 const bytes=await readFile(path.join(frozen,name));provenance[name]=JSON.parse(bytes);
 const dest=path.join(out,'provenance',name);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);
}
for(const [name,wanted] of Object.entries(provenance['baseline/manifest.json'].artifacts))assert.equal(hashes['/baseline/'+name]?.sha256,wanted);
if(build){
 const bytes=await readFile(path.join(build,'result.json')),record=JSON.parse(bytes);
 assert.equal(record.status,'built_service_only');
 for(const name of ['service.mjs','service.wasm','service.asyncify.wasm'])assert.equal(hashes['/candidate/'+name].sha256,record.artifacts[name]);
 await writeFile(path.join(out,'provenance','candidate-build.json'),bytes);
}

async function serve(isolated){
 const server=http.createServer((req,res)=>{
  if(isolated){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>mpv subtitle component</title>');return;}
  const bytes=files.get(req.url);if(!bytes){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',req.url.endsWith('.wasm')?'application/wasm':req.url.endsWith('.mjs')?'text/javascript':'application/octet-stream');
  if(req.headers.range){
   const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range);if(!m||+m[1]>+m[2]||+m[2]>=bytes.length){res.writeHead(416).end();return;}
   const start=+m[1],end=+m[2];requests.push({url:req.url,start,end,isolated});res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`});res.end(bytes.subarray(start,end+1));
  }else res.end(bytes);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
const isolated=await serve(true),privateServer=await serve(false);let browser;
const result={schema:2,scope:'Actual subtitle-only mpv, not A/V playback or Player qualification',inputs:hashes,cases:[]},references=new Map();
try{
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();
 const cases=['m0.mkv','replacement.mkv','movtext.mp4'].flatMap(fixture=>backends.map(backend=>({fixture,backend,scenario:'media'})));
 cases.push(...['pgs.mkv','vobsub.mkv'].flatMap(fixture=>backends.map(backend=>({fixture,backend,scenario:'bitmap'}))));
 cases.push(...backends.filter(backend=>backend!=='pthread').map(backend=>({fixture:'m0.mkv',backend,scenario:'cancel'})));
 for(const {fixture,backend,scenario} of cases){
  const entry={fixture,backend,scenario};result.cases.push(entry);const page=await browser.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error(msg.text().slice(0,400));});
  try{
   const response=await page.goto((backend==='pthread'?isolated:privateServer).origin);
   entry.headers=response.headers();assert.equal(entry.headers['cross-origin-opener-policy'],backend==='pthread'?'same-origin':undefined);assert.equal(entry.headers['cross-origin-embedder-policy'],backend==='pthread'?'require-corp':undefined);
   const replacement=fixture==='m0.mkv'?'replacement.mkv':'m0.mkv';
   entry.evidence=await page.evaluate(async config=>{
    const fontBytes=await(await fetch('/fixtures/font.ttf')).arrayBuffer();
    return await new Promise((resolve,reject)=>{
     const worker=new Worker('/experiment/mpv/tests/subtitle-worker.mjs',{type:'module'});let mailbox,reading=false,observedPending=false;
     const finish=(error,data)=>{clearTimeout(timer);clearInterval(poll);worker.terminate();error?reject(error):resolve(data);};
     const timer=setTimeout(()=>finish(Error('Service watchdog')),90000);
     const poll=setInterval(async()=>{
      if(!mailbox||reading)return;
      const {buffer,pointer,fixture}=mailbox,h=new Int32Array(buffer,pointer,16),ticket=Atomics.load(h,0);
      if((ticket&7)!==1)return;reading=true;
      try{
       const offset=Number(new DataView(buffer).getBigUint64(pointer+32,true)),count=Math.min(Atomics.load(h,4),fixture.size-offset);
       const response=await fetch(fixture.url,{headers:{Range:`bytes=${offset}-${offset+count-1}`}});
       if(response.status!==206)throw Error('Pthread range failure');const bytes=new Uint8Array(await response.arrayBuffer());
       if(Atomics.load(h,0)===ticket){new Uint8Array(buffer,pointer+64,bytes.length).set(bytes);Atomics.store(h,5,bytes.length);Atomics.store(h,0,ticket+1);Atomics.notify(h,0);}
      }catch{if(Atomics.load(h,0)===ticket){Atomics.store(h,5,-1);Atomics.store(h,0,ticket+1);Atomics.notify(h,0);}}finally{reading=false;}
     },0);
     worker.onerror=e=>finish(Error(e.message));
     worker.onmessage=({data})=>{
      if(data.type==='mailbox')mailbox=data;
      if(data.type==='log')console.log(data.message);
      if(data.type==='pending'){observedPending=true;worker.postMessage({type:'cancel'});}
      if(data.type==='error')finish(Error(JSON.stringify(data)));
      if(data.type==='done')finish(null,{...data,observedPending});
     };
     worker.postMessage({...config,fontBytes});
    });
   },{backend,scenario,attachmentOnly:fixture==='m0.mkv',fixture:{url:'/fixtures/'+fixture,size:files.get('/fixtures/'+fixture).length},replacement:{url:'/fixtures/'+replacement,size:files.get('/fixtures/'+replacement).length},engineURL:backend==='pthread'?'/baseline/service.mjs':'/candidate/service.mjs',wasmURL:'/candidate/service'+(backend==='asyncify'?'.asyncify':'')+'.wasm'});
   if(backend==='pthread')references.set(fixture,entry.evidence.frames);
   else{assert.ok(references.has(fixture),'Matching pthread reference required');assert.deepEqual(entry.evidence.frames,scenario==='cancel'?[references.get(fixture)[0]]:references.get(fixture));entry.pthreadPixelIdentity=true;}
   if(scenario==='cancel')assert.equal(entry.evidence.observedPending,true);
   entry.passed=true;console.log('PASS',fixture,backend,scenario);
  }catch(error){entry.passed=false;entry.error=String(error.stack);console.error('FAIL',fixture,backend,entry.error.slice(0,2000));process.exitCode=1;}
  finally{await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{
 await browser?.close();await isolated.close();await privateServer.close();
 result.passed=result.cases.filter(c=>c.passed).length;result.total=result.cases.length;
 await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');await writeFile(path.join(out,'ranges.json'),JSON.stringify(requests,null,2)+'\n');console.log(out,result.passed+'/'+result.total);
}
