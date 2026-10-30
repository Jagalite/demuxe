// SPDX-License-Identifier: Apache-2.0
// Exercise packaged bridge handoff and cancellation, without creating a worker.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
const [deployment,output,engine]=process.argv.slice(2);assert.ok(deployment&&output&&['chrome','firefox','webkit'].includes(engine));
const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex'),manifest=await readFile(join(root,'demuxe-providers.json')),requests=[];
const browser=await ({chrome:chromium,firefox,webkit}[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage();await page.route('https://stream-handoff.test/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/')return route.fulfill({contentType:'text/html',body:'<body></body>'});const file=resolve(root,path.slice(1));if(!file.startsWith(root+sep))return route.abort();try{const bytes=await readFile(file);requests.push({path,bytes:bytes.length,sha256:hash(bytes)});return route.fulfill({contentType:'text/javascript',body:bytes});}catch{return route.abort();}});await page.goto('https://stream-handoff.test/');
 const checks=await page.evaluate(async()=>{
  const {bridgeStreamWorker}=await import('/web/generated/internal/stream-worker.js');
  async function run(mode){
   const reason=Object.assign(new Error('source changed'),{code:'SOURCE_CHANGED'});let terminations=0,closes=0;const raw={postMessage(){},terminate(){terminations++;}};
   const worker=bridgeStreamWorker(raw,{size:32,read:async()=>new Uint8Array(1),check(){throw reason;},close(){closes++;}}),old=[],next=[];
   worker.onmessage=event=>old.push(event.data.error===reason);raw.onmessage({data:{type:'fragment'}});
   if(mode==='replace')worker.onmessage=event=>next.push(event.data.error===reason);
   if(mode==='gap')worker.onmessage=null;
   if(mode==='terminate')worker.terminate();
   await Promise.resolve();if(mode==='gap'){worker.onmessage=event=>next.push(event.data.error===reason);await Promise.resolve();}
   return {old,next,terminations,closes};
  }
  return {replace:await run('replace'),gap:await run('gap'),terminate:await run('terminate')};
 });
 for(const mode of ['replace','gap'])assert.deepEqual(checks[mode],{old:[],next:[true],terminations:1,closes:1});assert.deepEqual(checks.terminate,{old:[],next:[],terminations:1,closes:1});
 const receipt={status:'packaged-stream-handoff-cases-passed-not-release',browserEngine:engine,browser:browser.version(),manifestSHA256:hash(manifest),harnessSHA256:hash(await readFile(new URL(import.meta.url))),requests,checks,limitations:['Controlled bridge and handler handoff only; actual network playback is tested separately.']};await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,browser:receipt.browser}));
}finally{await browser.close();}
