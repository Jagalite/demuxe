// SPDX-License-Identifier: Apache-2.0
// Synthetic observations over maintained code; not real browser MSE/allocator evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RemuxPlayer} from '../../../../web/native-remux-player.js';
import {RangeReader} from '../../../../web/range-reader.js';
const ranges = pairs => ({length:pairs.length,start:i=>pairs[i][0],end:i=>pairs[i][1]});
test('EB01: observed eviction rejects buffered seek despite retained append accounting',()=>{
 const source={}, sb={updating:false,buffered:ranges([[1,5]])};
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{source,acceptedSource:source,generation:1,acceptedGeneration:1,bufferedSeeks:true,targetReady:true,timelineBias:1,sb,video:{buffered:ranges([[1,5]])},media:{readyState:'open'},raps:[0],segments:[{bytes:4096,end:4}]});
 assert.equal(p.canSeekBuffered(1),true); // positive control
 sb.buffered=ranges([]);p.video.buffered=ranges([]);
 assert.equal(p.canSeekBuffered(1),false);
 assert.equal(p.segments.reduce((n,s)=>n+s.bytes,0),4096);
 // Existing byte upper bound is not an exact residency inventory; no playback bug inferred.
});
test('EB01: failed append retains provisional receipt, and stale completion cannot commit it',()=>{
 const sb={updating:false,appendBuffer(){throw new Error('synthetic quota rejection');}};
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{generation:2,sbs:[sb],receipts:new Map(),pendingUpdates:new Set(),segments:[],stats:{fragments:[]},pump(){throw Error('unexpected pump');}});
 assert.throws(()=>p.append([new ArrayBuffer(8)]),/quota rejection/);
 p.updateFinished(sb,1);
 assert.equal(p.receipts.size,1);assert.equal(p.pendingUpdates.size,1);
 assert.equal(p.segments[0].end,Infinity);
 // A recovery ledger would need an explicit failed/provisional status before reuse.
});
test('EB04: bounded cache charges backing storage and eviction cannot free an external view',async()=>{
 const r=new RangeReader({url:'https://media.test/file',immutable:true,blockBytes:1024,cacheBytes:1024,identity:{size:'4096'}});
 r.fetchBlock=async()=>new Uint8Array(new ArrayBuffer(1024),0,4);
 const a=await r.read(0n,1);
 assert.equal(a.byteLength,1);assert.equal(a.buffer.byteLength,1024);assert.equal(r.stats.cacheBytes,1024);
 await r.read(1024n,1);
 assert.equal(r.cache.size,1);assert.equal(r.stats.cacheBytes,1024);
 assert.equal(a.buffer.byteLength,1024);r.close();assert.equal(r.stats.cacheBytes,0);
 assert.equal(a.buffer.byteLength,1024); // cache accounting is not process-retention accounting
});
