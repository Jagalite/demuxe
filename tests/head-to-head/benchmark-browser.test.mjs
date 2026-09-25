// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCpuWindow,summarizeCpu} from './benchmark-browser.mjs';

test('sampling overhead does not accumulate into the measurement schedule',async()=>{
 let now=0;const deadlines=[];
 const sample=async()=>{const at=now;now+=700;return {at,processes:[]};};
 const samples=await collectCpuWindow(null,null,{seconds:20,interval:2,sample,waitUntil:async target=>{deadlines.push(target);now=Math.max(now,target);}});
 assert.equal(samples.at(-1).at-samples[0].at,20000);
 assert.deepEqual(deadlines,[2000,4000,6000,8000,10000,12000,14000,16000,18000,20000]);
});
const p=(id,type,cpuTime)=>({id,type,cpuTime});
test('roles include audio and utility services; whole CPU includes browser',()=>{
 const a=[p(1,'browser',1),p(2,'renderer',2),p(3,'GPU',3),p(4,'audio.mojom.AudioService',4),p(5,'network.mojom.NetworkService',5)];
 const b=a.map(x=>({...x,cpuTime:x.cpuTime+1}));
 const m=summarizeCpu([{at:0,processes:a,rssKiB:100},{at:20000,processes:b,rssKiB:120}]);
 assert.equal(m.oneCorePercent,25);assert.equal(m.roles.audio,5);assert.equal(m.roles.utility,5);assert.equal(m.nonBrowserPercent,20);assert.equal(m.peakSummedRssKiB,120);
});
test('transient process turnover invalidates CPU even with matching endpoints',()=>{
 const a=[p(1,'browser',1)],b=[p(1,'browser',2),p(2,'renderer',1)],c=[p(1,'browser',3)];
 const m=summarizeCpu([{at:0,processes:a},{at:10000,processes:b},{at:20000,processes:c}]);
 assert.equal(m.processIdsStable,false);assert.equal(m.oneCorePercent,null);assert.equal(m.roles,null);
});
test('CPU counter resets and nonpositive wall duration are rejected',()=>{
 assert.throws(()=>summarizeCpu([{at:0,processes:[p(1,'browser',3)]},{at:20000,processes:[p(1,'browser',2)]}]),/reset/);
 assert.throws(()=>summarizeCpu([{at:0,processes:[]},{at:0,processes:[]}]),/elapsed/);
});

import {CpuBrowserBlocks} from './benchmark-browser.mjs';
import {CampaignProgress} from './campaign-progress.mjs';
test('one browser per block, fresh idle contexts, retire before next block',async()=>{
 const events=[];let launches=0,contexts=0;
 const blocks=new CpuBrowserBlocks({launch:async()=>{const id=++launches;events.push('launch'+id);return {browser:{id,newContext:async()=>{contexts++;return {newPage:async()=>({}),close:async()=>{}};}},identity:{id}};},
  idle:async(browser,page,{seconds})=>({seconds}),retire:async b=>{events.push('retire'+b.id);return {};}});
 const a=await blocks.acquire('fixture:1'),b=await blocks.acquire('fixture:1'),c=await blocks.acquire('fixture:2');
 assert.equal(a.browser,b.browser);assert.notEqual(b.browser,c.browser);assert.equal(contexts,3);
 assert.equal(a.idle.seconds,20);assert.equal(b.idle.seconds,2);
 await blocks.close();assert.deepEqual(events,['launch1','retire1','launch2','retire2']);
});
test('a longer fixture-boundary idle observation retains the same browser',async()=>{
 const seen=[];let launches=0;
 const blocks=new CpuBrowserBlocks({launch:async()=>({browser:{newContext:async()=>({newPage:async()=>({}),close:async()=>{}})},identity:{launch:++launches}}),
  idle:async(_browser,_page,{seconds})=>{seen.push(seconds);return {seconds};},retire:async()=>({})});
 const first=await blocks.acquire('campaign');
 const later=await blocks.acquire('campaign',{idleSeconds:20});
 await blocks.close();assert.equal(launches,1);assert.equal(first.browser,later.browser);assert.deepEqual(seen,[20,20]);
});
test('a failed block cannot silently reuse or replace its browser for another arm',async()=>{
 const blocks=new CpuBrowserBlocks({launch:async()=>({browser:{newContext:async()=>({newPage:async()=>({}),close:async()=>{}})},identity:{}}),idle:async()=>({}),retire:async()=>({})});
 await blocks.acquire('a');await blocks.invalidate('cleanup failed');await assert.rejects(()=>blocks.acquire('a'),/aborted/);
 await blocks.acquire('b');await blocks.close();assert.equal(blocks.records[0].status,'failed');
});
test('progress shows timed phases, global counts and completion of failures',()=>{
 let now=0;const progress=new CampaignProgress({total:2,heartbeat:false,clock:()=>now,emit:()=>{},env:{DEMUXE_CAMPAIGN_TOTAL:'10',DEMUXE_CAMPAIGN_OFFSET:'4'}});
 progress.start('Auto');progress.phase('measurement',20,3);now=5000;
 const s=progress.snapshot();assert.equal(s.completed,4);assert.equal(s.total,10);assert.equal(s.current.index,5);assert.equal(s.current.phaseRemainingSeconds,15);assert.equal(s.current.estimatedRemainingSeconds,18);
 progress.finish('failed');assert.equal(progress.snapshot().completed,5);assert.equal(progress.snapshot().counts.failed,1);progress.close();
});
test('incorrect campaign plan counts are rejected rather than displayed',()=>{
 assert.throws(()=>new CampaignProgress({total:3,heartbeat:false,env:{DEMUXE_STEP_TESTS:'2'}}),/count/);
});
test('global ETA retains future CPU budgets after a fast correctness step',()=>{
 let now=0;const progress=new CampaignProgress({total:1,heartbeat:false,clock:()=>now,emit:()=>{},env:{DEMUXE_CAMPAIGN_TOTAL:'7',DEMUXE_CAMPAIGN_TAIL_SECONDS:'270'}});
 progress.start('correctness');now=7000;progress.finish('passed');assert.equal(progress.snapshot().estimatedCampaignRemainingSeconds,270);progress.close();
});
test('failed context retirement closes the browser and aborts its block',async()=>{
 let retired=0;
 const blocks=new CpuBrowserBlocks({launch:async()=>({browser:{newContext:async()=>({newPage:async()=>({}),close:async()=>{throw Error('context did not close');}})},identity:{}}),idle:async()=>({}),retire:async()=>{retired++;return {};}});
 await assert.rejects(()=>blocks.acquire('a'),/context did not close/);assert.equal(retired,1);assert.equal(blocks.current.status,'failed');assert.equal(blocks.browser,null);
});

import {completedHardwareKeyTask,confirmStartupReadiness} from './benchmark-browser.mjs';
import {EventEmitter} from 'node:events';
test('startup proof requires completed task from the browser process',()=>{
 const event={pid:1,ph:'X',name:'ThreadPool_RunTask',dur:100,args:{src_file:'crypto/unexportable_key_metrics.cc',src_func:'MaybeMeasureTpmOperations'}};
 assert.equal(completedHardwareKeyTask([event],1),event);
 for(const change of [{pid:2},{ph:'B'},{dur:0},{args:{src_func:'Other'}}])assert.equal(completedHardwareKeyTask([{...event,...change}],1),undefined);
});
test('missing startup evidence fails closed and closes the observation context',async()=>{
 const cdp=new EventEmitter();let closed=false,stopped=false;
 cdp.send=async name=>{if(name==='SystemInfo.getProcessInfo')return {processInfo:[{type:'browser',id:1}]};if(name==='Tracing.end'){stopped=true;cdp.emit('Tracing.tracingComplete',{});}return {};};
 const browser={newContext:async()=>({newPage:async()=>({goto:async()=>{},bringToFront:async()=>{}}),close:async()=>{closed=true;}})};
 await assert.rejects(()=>confirmStartupReadiness(browser,cdp,{platform:'darwin',wait:async()=>{}}),/unconfirmed/);
 assert.ok(closed&&stopped);assert.equal(cdp.listenerCount('Tracing.dataCollected'),0);
});
test('startup gate returns proof only after tracing stops and closes its context',async()=>{
 const cdp=new EventEmitter();const order=[];
 const event={pid:7,ph:'X',name:'ThreadPool_RunTask',dur:500,args:{src_file:'crypto/unexportable_key_metrics.cc',src_func:'MaybeMeasureTpmOperations'}};
 cdp.send=async name=>{if(name==='SystemInfo.getProcessInfo')return {processInfo:[{type:'browser',id:7}]};if(name==='Tracing.end'){order.push('trace stopped');cdp.emit('Tracing.dataCollected',{value:[event]});cdp.emit('Tracing.tracingComplete',{});}return {};};
 const browser={newContext:async()=>({newPage:async()=>({goto:async()=>{},bringToFront:async()=>{}}),close:async()=>order.push('context closed')})};
 const proof=await confirmStartupReadiness(browser,cdp,{platform:'darwin',wait:async()=>order.push('observed')});
 assert.equal(proof.status,'complete');assert.equal(proof.completedTask,event);assert.equal(proof.traceStopped,true);
 assert.deepEqual(order,['observed','trace stopped','context closed']);
});
