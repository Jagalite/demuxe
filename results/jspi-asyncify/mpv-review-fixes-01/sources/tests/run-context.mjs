// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'../../../..'),exp=path.join(root,'experiments/jspi-asyncify');
const build=process.env.MPV_CONTEXT_BUILD;
if(!build)throw Error('MPV_CONTEXT_BUILD required');
const out=path.join(root,'results/jspi-asyncify',process.env.RUN_NAME??'mpv-context-'+Date.now());await mkdir(out);
const files=new Map(),hashes={};
for(const name of ['mpv/tests/context-worker.mjs','mpv/runtime/engine.mjs','runtime/scheduler.mjs','runtime/continuations.mjs','stage2/runtime/range-source.mjs']){
 const bytes=await readFile(path.join(exp,name));files.set('/experiment/'+name,bytes);hashes[name]=createHash('sha256').update(bytes).digest('hex');
 const dest=path.join(out,'sources',name);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);
}
for(const name of ['probe.mjs','probe.wasm','probe.asyncify.wasm']){const bytes=await readFile(path.join(build,name));files.set('/engine/'+name,bytes);hashes[name]=createHash('sha256').update(bytes).digest('hex');}
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>mpv context oracle</title>');return;}
 const bytes=files.get(req.url);if(!bytes){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',req.url.endsWith('.wasm')?'application/wasm':'text/javascript');res.end(bytes);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const result={scope:'Emscripten libc and cooperative continuation ownership, not full mpv media',sourceSHA256:hashes,cases:[]};
try{
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();
 for(const backend of ['jspi','asyncify']){
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const r=await page.evaluate(backend=>new Promise((resolve,reject)=>{
   const w=new Worker('/experiment/mpv/tests/context-worker.mjs',{type:'module'});
   const timer=setTimeout(()=>{w.terminate();reject(Error('Watchdog'));},30000);
   w.onerror=e=>{clearTimeout(timer);w.terminate();reject(Error(e.message));};
   w.onmessage=({data})=>{clearTimeout(timer);w.terminate();resolve(data);};w.postMessage({backend});
  }),backend);result.cases.push(r);console.log(JSON.stringify(r));await page.close();if(!r.passed)process.exitCode=1;
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
