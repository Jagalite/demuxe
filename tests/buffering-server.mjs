// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {serve} from './buffering/server.mjs';
test('qualification server records and releases cancellation during simulated RTT',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'demuxe-buffer-server-'));const fixtures=path.join(root,'research/items/mpv-cache-browser-stream/fixtures');await fs.mkdir(fixtures,{recursive:true});await fs.writeFile(path.join(fixtures,'test.mp4'),new Uint8Array(1024));
 const server=await serve(root,root,{rtt:100});
 try{
  const controller=new AbortController();const pending=fetch(server.origin+'/media/test.mp4',{signal:controller.signal,headers:{Range:'bytes=0-15'}});const rejected=assert.rejects(pending,{name:'AbortError'});
  for(let i=0;i<50&&!server.requests.length;i++)await new Promise(r=>setTimeout(r,2));assert.equal(server.requests.length,1);controller.abort();await rejected;await new Promise(r=>setTimeout(r,150));
  assert.equal(server.active,0);assert.equal(server.requests[0].bytesWritten,0);assert.ok(server.requests[0].closed);
  const response=await fetch(server.origin+'/media/test.mp4',{headers:{Range:'bytes=-16'}});assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 1008-1023/1024');assert.equal((await response.arrayBuffer()).byteLength,16);
 }finally{await server.close();await fs.rm(root,{recursive:true,force:true});}
});
