// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {serve} from './server.mjs';
test('controlled server supports Native ranges, shares throughput and resumes an open response',async()=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'demuxe-cache-server-'));
 await fs.mkdir(path.join(home,'fixtures'));await fs.mkdir(path.join(home,'out'));
 const data=Buffer.from(Array.from({length:131072},(_,i)=>i%251));await fs.writeFile(path.join(home,'fixtures/x.mp4'),data);
 const server=await serve(home,path.join(home,'out'));
 try{
  server.control(131072);const start=performance.now();
  const responses=await Promise.all(['bytes=0-65535','bytes=65536-'].map(async range=>{const r=await fetch(server.origin+'/media/x.mp4',{headers:{Range:range}});assert.equal(r.status,206);return Buffer.from(await r.arrayBuffer());}));
  assert.deepEqual(Buffer.concat(responses),data);assert.ok(performance.now()-start>850,'concurrent requests must share one budget');
  server.control(131072,true);let finished=false;
  const blocked=fetch(server.origin+'/media/x.mp4',{headers:{Range:'bytes=-16384'}}).then(async r=>{assert.equal(r.headers.get('content-range'),'bytes 114688-131071/131072');const b=Buffer.from(await r.arrayBuffer());finished=true;return b;});
  await new Promise(r=>setTimeout(r,250));assert.equal(finished,false);server.control(131072);
  assert.deepEqual(await blocked,data.subarray(114688));
  assert.equal((await fetch(server.origin+'/media/x.mp4',{headers:{Range:'bytes=999999-'}})).status,416);
 }finally{await server.close();}
});
