// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startLiveFaultServer} from './live-fault-server.mjs';
test('live fault server serves exact ranged bytes and changes only representation identity',async()=>{
 const server=await startLiveFaultServer(),bytes=await readFile('fixtures/example.mp4');
 try{
  for(const [at,etag]of [[0,'"first"'],[1024,'"second"']]){
   const response=await fetch(server.origin+'/media.mp4?case=identity&fault=changed',{headers:{Range:`bytes=${at}-${at+15}`}});
   assert.equal(response.status,206);assert.equal(response.headers.get('etag'),etag);assert.equal(response.headers.get('content-range'),`bytes ${at}-${at+15}/${bytes.length}`);
   assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(at,at+16));
  }
 }finally{await server.close();}
});
test('live fault server holds until explicit release and distinguishes rejected credentials from retry',async()=>{
 const server=await startLiveFaultServer();
 try{
  const pending=fetch(server.origin+'/media.mp4?case=hold&fault=hold',{headers:{Range:'bytes=0-15'}});let stats;
  const end=Date.now()+2000;
  do{stats=await(await fetch(server.origin+'/control?case=hold')).json();if(stats.held)break;await new Promise(r=>setTimeout(r,5));}while(Date.now()<end);
  assert.equal(stats.held,1);await fetch(server.origin+'/control?case=hold&release=1');assert.equal((await pending).status,206);
  assert.equal((await fetch(server.origin+'/media.mp4?case=auth&fault=auth')).status,401);
  assert.equal((await fetch(server.origin+'/media.mp4?case=retry&fault=retry')).status,503);
  assert.equal((await fetch(server.origin+'/media.mp4?case=retry&fault=retry')).status,200);
 }finally{await server.close();}
});
