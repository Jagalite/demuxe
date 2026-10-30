// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFragmentStream} from '../fragment-stream.js';
const box=(name,payload=[])=>{const bytes=new Uint8Array(8+payload.length);new DataView(bytes.buffer).setUint32(0,bytes.length);bytes.set(new TextEncoder().encode(name),4);bytes.set(payload,8);return bytes;};
const concat=parts=>{const bytes=new Uint8Array(parts.reduce((n,part)=>n+part.length,0));let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;};
test('fragment framing crosses write boundaries and applies handoff backpressure',async()=>{
  const stream=createFragmentStream({maxInitializationBytes:128,maxFragmentBytes:128}),writer=stream.writable.getWriter();
  const initialization=concat([box('ftyp',[1]),box('moov',[2])]),fragment=concat([box('moof',[3]),box('mdat',[4,5,6])]);
  const bytes=concat([initialization,fragment,box('mfra')]);let settled=false;
  const write=(async()=>{for(let at=0;at<bytes.length;at+=3)await writer.write({position:at,data:bytes.slice(at,at+3)});await writer.close();settled=true;})();
  const first=await stream.next();assert.equal(first.value.kind,'initialization');assert.deepEqual(first.value.bytes,initialization);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(stream.stats.queuedRecords,1);
  const second=await stream.next();assert.equal(second.value.kind,'fragment');assert.deepEqual(second.value.bytes,fragment);
  await write;assert.equal((await stream.next()).done,true);assert.equal(stream.stats.fragments,1);assert.ok(stream.stats.peakOwnedBytes<=272);
});
test('cancel releases a blocked writer and preserves the original failure',async()=>{
  const stream=createFragmentStream(),writer=stream.writable.getWriter(),error=new Error('Retired generation');
  const pending=writer.write({position:0,data:concat([box('ftyp'),box('moov')])});
  const rejected=assert.rejects(pending,actual=>actual===error);
  await new Promise(resolve=>setImmediate(resolve));stream.abort(error);
  await rejected;await assert.rejects(stream.next(),actual=>actual===error);assert.equal(stream.stats.queuedRecords,0);
});
test('oversized, truncated and nonmonotonic output never becomes a fragment',async()=>{
  for(const [bytes,position] of [[box('mdat',new Uint8Array(129)),0],[box('ftyp'),1]]){
    const stream=createFragmentStream({maxInitializationBytes:128,maxFragmentBytes:128}),writer=stream.writable.getWriter();
    await assert.rejects(writer.write({position,data:bytes}));assert.equal(stream.stats.fragments,0);
  }
  const stream=createFragmentStream(),writer=stream.writable.getWriter();await writer.write({position:0,data:box('ftyp').subarray(0,5)});await assert.rejects(writer.close(),/Incomplete/);
});
