// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {NetworkSamples}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/network-samples.js')).href:'./files/web/network-samples.js');
function setup(){let now=200;const clock={timeOrigin:1000,now:()=>now};return {ledger:new NetworkSamples(clock,null),advance:n=>now=n};}
const item = extra=>({url:'https://example.test/video?secret=hidden',received:100000n,eof:true,fetchStart:0,idleMs:5,maxIdleMs:2,attempt:0,...extra});
const timing = extra=>({initiatorType:'fetch',name:item().url,startTime:0,responseEnd:200,transferSize:100300,encodedBodySize:100000,...extra});
test('network time includes request latency and no URL reaches the output sample',()=>{
 const {ledger}=setup();ledger.complete(item());ledger.observe([timing()]);const [s]=ledger.collect();
 assert.equal(s.eligible,true);assert.equal(s.networkMs,200);assert.equal(s.completedAt,1200);
 assert.equal(JSON.stringify(s).includes('secret'),false);
});
test('cache hits or missing cross-origin timing cannot become bandwidth estimates',()=>{
 const {ledger}=setup();ledger.complete(item());ledger.observe([timing({transferSize:0})]);
 assert.equal(ledger.collect()[0].eligible,false);
});
test('application backpressure invalidates the sample instead of being subtracted',()=>{
 const {ledger}=setup();ledger.complete(item({idleMs:120,maxIdleMs:100}));ledger.observe([timing()]);
 const [s]=ledger.collect();assert.equal(s.reason,'application-backpressure');assert.equal(s.networkMs,200);
});
test('incomplete, canceled and small resources do not create completed samples',()=>{
 const {ledger}=setup();ledger.complete(item({eof:false}));ledger.complete(item({error:Error('cancelled')}));ledger.complete(item({received:1024n}));
 assert.equal(ledger.pending.length,0);assert.equal(ledger.collect().length,0);
});
test('late timing entries may arrive after EOF, but missing entries expire explicitly',()=>{
 const {ledger,advance}=setup();ledger.complete(item());assert.equal(ledger.collect().length,0);
 advance(300);ledger.observe([timing()]);assert.equal(ledger.collect()[0].eligible,true);
 ledger.complete(item({fetchStart:250}));advance(1000);
 assert.equal(ledger.collect().at(-1).reason,'timing-unavailable');
});
test('duplicate URLs consume distinct timing entries and check body size',()=>{
 const {ledger}=setup();ledger.complete(item());ledger.complete(item({fetchStart:5,received:200000n}));
 ledger.observe([timing(),timing({startTime:5,encodedBodySize:200000,transferSize:200300})]);
 assert.equal(ledger.collect().filter(s=>s.eligible).length,2);assert.equal(ledger.timings.length,0);
 ledger.complete(item({fetchStart:10}));ledger.observe([timing({startTime:10,encodedBodySize:99999})]);
 assert.equal(ledger.collect().at(-1).reason,'timing-body-mismatch');
});
test('retry and sub-50ms resource samples are conservative exclusions',()=>{
 const {ledger}=setup();ledger.complete(item({attempt:1}));ledger.observe([timing()]);
 assert.equal(ledger.collect()[0].reason,'retried-resource');
 ledger.complete(item({fetchStart:100}));ledger.observe([timing({startTime:100,responseEnd:110})]);
 assert.equal(ledger.collect().at(-1).reason,'sample-too-short');
});
test('all histories are bounded and source retirement rejects later completion',()=>{
 const {ledger,advance}=setup();for(let i=0;i<100;i++){ledger.complete(item({fetchStart:i}));ledger.observe([timing({startTime:i})]);}
 assert.equal(ledger.pending.length,32);assert.equal(ledger.timings.length,64);
 advance(1000);ledger.collect();assert.equal(ledger.samples.length,16);
 ledger.close();ledger.complete(item());ledger.observe([timing()]);
 assert.equal(ledger.pending.length,0);assert.equal(ledger.timings.length,0);
});
test('network completion during consumer idle is independent of later consumption',()=>{
 const {ledger,advance}=setup();advance(2000);
 ledger.complete(item({idleMs:1980,maxIdleMs:1980,idleIntervals:[[20,2000]]}));ledger.observe([timing()]);
 const [s]=ledger.collect();assert.equal(s.eligible,true);assert.equal(s.networkMs,200);assert.equal(s.completedAt,1200);
});
test('earlier application waits and overflow remain excluded even if final idle spans completion',()=>{
 const {ledger,advance}=setup();advance(2000);
 ledger.complete(item({idleIntervals:[[0,100],[150,2000]]}));ledger.observe([timing()]);
 assert.equal(ledger.collect()[0].reason,'application-backpressure');
 ledger.complete(item({idleIntervals:[[20,2000]],idleOverflow:true}));ledger.observe([timing()]);
 assert.equal(ledger.collect().at(-1).reason,'application-backpressure');
});
