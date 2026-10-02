// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxLifecycle,transitionRemuxLifecycle} from '../../web/generated/internal/machine/remux-lifecycle.js';
import {RemuxPlayer} from '../../web/native-remux-player.js';
function machine(){
 let state=initialRemuxLifecycle();const history=[];
 const send=command=>{const before=structuredClone(state),old=state,result=transitionRemuxLifecycle(state,command);assert.deepEqual(old,before);state=result.state;history.push(structuredClone(command));assert.ok(Object.isFrozen(state.buffer));return result;};
 return {get state(){return state;},send,buffer(command,generation=state.generation){return send({type:'buffer',generation,command}).buffer??{accepted:false};},begin(){send({type:'open'});const restart=send({type:'restart',target:0,duration:30});send({type:'begin',restartId:restart.restartId});this.buffer({type:'busy',value:false});return state.generation;},replay(){assert.deepEqual(history.reduce((state,command)=>transitionRemuxLifecycle(state,command).state,initialRemuxLifecycle()),state);}};
}
test('pulls admit once and progressive payload identities preserve ordered final delivery',()=>{
 const m=machine();m.begin();const pull=m.buffer({type:'pull'});assert.equal(pull.pullId,1);assert.equal(m.buffer({type:'pull'}).accepted,false);
 const part=m.buffer({type:'part',pullId:1,bytes:7});assert.equal(part.resources[0].bytes,7);assert.equal(m.state.buffer.pull,1);
 const fragment=m.buffer({type:'fragment',pullId:1,parts:[3,5],buffers:[11,13],more:false,updating:false});
 assert.equal(m.state.buffer.eof,true);assert.equal(m.state.buffer.pull,null);assert.deepEqual(m.state.buffer.delivery.map(part=>part.bytes),[7,3,5]);assert.deepEqual(m.state.buffer.pending.map(part=>part.bytes),[11,13]);
 assert.equal(new Set([...m.state.buffer.delivery,...fragment.buffers].map(part=>part.id)).size,5);assert.equal(m.buffer({type:'pull'}).accepted,false);
 for(const bytes of [7,3,5])assert.equal(m.buffer({type:'take-delivery'}).resources[0].bytes,bytes);assert.deepEqual(m.buffer({type:'take-pending'}).resources.map(part=>part.bytes),[11,13]);assert.equal(m.buffer({type:'take-pending'}).accepted,false);m.replay();
});
test('unexpected producer replies cannot replace a current pull or queued payloads',()=>{
 const m=machine();m.begin();m.buffer({type:'pull'});const before=m.state;
 assert.match(m.buffer({type:'part',pullId:9,bytes:2}).error,/Unexpected progressive/);assert.equal(m.state,before);
 assert.match(m.buffer({type:'fragment',pullId:9,parts:[],buffers:[2],more:true,updating:false}).error,/Unexpected remux/);assert.equal(m.state,before);
});
test('append batch completion commits evidence only after every independent lane receipt',()=>{
 const m=machine();m.begin();const entries=[{lane:0,bytes:9},{lane:1,bytes:5}],append=m.buffer({type:'append',entries,initialization:true,now:10});entries[0].bytes=100;
 assert.deepEqual(m.state.buffer.segments.map(segment=>segment.bytes),[9,5]);assert.equal(m.state.buffer.busy,true);assert.equal(m.state.buffer.initAccepted,false);
 const first=m.buffer({type:'updated',id:append.updates[0].id,lane:0,end:8,now:40,updating:false});assert.equal(first.latency,30);assert.equal(m.state.buffer.busy,true);assert.equal(m.state.buffer.initAccepted,true);
 const before=m.state;assert.equal(m.buffer({type:'updated',id:append.updates[0].id,lane:0,end:99,now:45,updating:false}).accepted,false);assert.equal(m.state,before);
 m.buffer({type:'updated',id:append.updates[1].id,lane:1,end:6,now:50,updating:false});assert.equal(m.state.buffer.busy,false);assert.deepEqual(m.state.buffer.segments.map(segment=>segment.end),[8,6]);m.replay();
});
test('remove receipts prune only intended history and never fabricate media append evidence',()=>{
 const m=machine();m.begin();const append=m.buffer({type:'append',entries:[{lane:0,bytes:9},{lane:1,bytes:5}],initialization:true,now:0});
 for(const update of append.updates)m.buffer({type:'updated',id:update.id,lane:update.lane,end:4,now:10,updating:false});
 const removal=m.buffer({type:'remove',lane:1,cut:4,allLanes:false,now:20});assert.deepEqual(m.state.buffer.segments.map(segment=>segment.lane),[0]);assert.equal(m.state.buffer.mediaAccepted,false);
 const complete=m.buffer({type:'updated',id:removal.updates[0].id,lane:1,end:99,now:30,updating:false});assert.equal(complete.latency,undefined);assert.equal(m.state.buffer.mediaAccepted,false);
});
test('completed append evidence survives retirement for diagnostics and resets only at the next MSE generation',()=>{
 const m=machine();m.begin();
 for(const initialization of [true,false]){const append=m.buffer({type:'append',entries:[{lane:0,bytes:3}],initialization,now:0});m.buffer({type:'updated',id:append.updates[0].id,lane:0,end:4,now:10,updating:false});}
 m.send({type:'failure',generation:m.state.generation,message:'MSE SourceBuffer error',playing:false});m.send({type:'retire',generation:m.state.generation});
 assert.equal(m.state.buffer.initAccepted,true);assert.equal(m.state.buffer.mediaAccepted,true);assert.equal(m.state.buffer.updates.length,0);
 m.send({type:'open'});const restart=m.send({type:'restart',target:0,duration:30});assert.equal(m.state.buffer.initAccepted,true);m.send({type:'begin',restartId:restart.restartId});assert.equal(m.state.buffer.initAccepted,false);assert.equal(m.state.buffer.mediaAccepted,false);
});
for(const retirement of ['open','restart','begin','retire','failure','destroy'])test(retirement+' atomically retires buffer ownership with lifecycle authority',()=>{
 const m=machine(),generation=m.begin();m.buffer({type:'pull'});m.buffer({type:'part',pullId:1,bytes:7});const append=m.buffer({type:'append',entries:[{lane:0,bytes:3}],initialization:false,now:0});
 const command={open:{type:'open'},restart:{type:'restart',target:1,duration:30},begin:{type:'begin',restartId:m.state.restartId},retire:{type:'retire',generation},failure:{type:'failure',generation,message:'broken',playing:false},destroy:{type:'destroy'}}[retirement];m.send(command);
 assert.equal(m.state.buffer.pull,null);assert.equal(m.state.buffer.pending,null);assert.equal(m.state.buffer.delivery.length,0);assert.equal(m.state.buffer.updates.length,0);
 const before=m.state;assert.equal(m.buffer({type:'updated',id:append.updates[0].id,lane:0,end:20,now:30,updating:false},generation).accepted,false);assert.equal(m.state,before);m.replay();
});
test('varied append/remove/replacement histories retain immutable snapshots and unique receipts',()=>{
 for(let seed=1;seed<=9;seed++){
  const m=machine(),ids=new Set();let random=seed;m.begin();
  for(let turn=0;turn<80;turn++){
   random=(random*1664525+1013904223)>>>0;
   if(random%7===0){m.begin();continue;}
   const lane=random%2,old=m.state.buffer.updates.find(update=>update.lane===lane);
   if(old)m.buffer({type:'updated',id:old.id,lane,end:turn,now:turn*10,updating:false});
   else {const result=m.buffer({type:'append',entries:[{lane,bytes:random%100+1}],initialization:turn===0,now:turn*10});for(const update of result.updates){assert.equal(ids.has(update.id),false);ids.add(update.id);}}
   assert.equal(new Set(m.state.buffer.updates.map(update=>update.lane)).size,m.state.buffer.updates.length);
  }
  m.replay();
 }
});
function shell(t,lanes=2){
 const video={paused:true,currentTime:1,pause(){},removeAttribute(){},load(){}},player=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi'});clearInterval(player.timer);t.after(()=>player.destroy());
 const begin=()=>{player.transitionLifecycle({type:'open'});const restart=player.transitionLifecycle({type:'restart',target:0,duration:30});player.transitionLifecycle({type:'begin',restartId:restart.restartId});player.setBusy(false);};begin();
 const buffers=Array.from({length:lanes},()=>{const handlers=new Set(),all=[];return {updating:false,buffered:{length:1,start:()=>1,end:()=>6},calls:[],handlers,all,addEventListener(type,handler){if(type==='updateend'){handlers.add(handler);all.push(handler);}},removeEventListener(type,handler){handlers.delete(handler);},appendBuffer(buffer){this.calls.push(buffer);this.updating=true;},remove(){this.updating=true;},finish(){this.updating=false;for(const handler of [...handlers])handler();}};});
 player.sbs=buffers;player.sb=buffers[0];player.media={readyState:'open'};player.pumps=0;player.pump=()=>player.pumps++;return {player,buffers,begin};
}
test('actual append admits all lanes before a synchronous first-lane completion',t=>{
 const {player:p,buffers}=shell(t);buffers[0].appendBuffer=function(buffer){this.calls.push(buffer);this.finish();};p.append([new ArrayBuffer(3),new ArrayBuffer(5)],true);
 assert.equal(p.pumps,0);assert.equal(p.busy,true);assert.equal(p.bufferState.updates.length,1);buffers[1].finish();assert.equal(p.pumps,1);assert.equal(p.busy,false);assert.equal(p.bufferState.initAccepted,true);
});
test('actual duplicate old update callback cannot settle a newer append on the same SourceBuffer',t=>{
 const {player:p,buffers:[sb]}=shell(t,1);p.append([new ArrayBuffer(3)]);const first=sb.all[0];sb.finish();p.append([new ArrayBuffer(5)]);const current=p.bufferState.updates[0];first();assert.equal(p.bufferState.updates[0],current);assert.equal(p.busy,true);sb.finish();assert.equal(p.pumps,2);assert.equal(p.bufferState.updates.length,0);
});
test('actual append reentry retires the whole old batch before it can append the second lane',t=>{
 const {player:p,buffers,begin}=shell(t);buffers[0].appendBuffer=()=>begin();assert.throws(()=>p.append([new ArrayBuffer(3),new ArrayBuffer(5)]),{name:'AbortError'});assert.equal(buffers[1].calls.length,0);assert.equal(p.bufferState.updates.length,0);
});
test('actual listener acquisition after destroy is removed before an append effect',t=>{
 const {player:p,buffers:[sb]}=shell(t,1),add=sb.addEventListener;sb.addEventListener=function(...args){add.apply(this,args);void p.destroy();};assert.throws(()=>p.append([new ArrayBuffer(3)]),{name:'AbortError'});assert.equal(sb.calls.length,0);assert.equal(sb.handlers.size,0);assert.equal(p.updateResources.size,0);
});
test('actual stale producer completion cannot populate a replacement payload registry',t=>{
 const {player:p,begin}=shell(t);const generation=p.generation,pull=p.transitionBuffer({type:'pull'});begin();assert.equal(p.acceptFragment({type:'fragment',id:pull.pullId,buffers:[new ArrayBuffer(9)],more:true},generation),false);assert.equal(p.bufferResources.size,0);assert.equal(p.pending,null);
});
test('actual cleanup attempts every listener removal and counts queued bytes once after logical retirement',t=>{
 const {player:p,buffers}=shell(t);p.append([new ArrayBuffer(2),new ArrayBuffer(3)]);for(const sb of buffers)sb.finish();p.setBusy(false);const pull=p.transitionBuffer({type:'pull'});p.acceptFragment({type:'fragment',id:pull.pullId,parts:[new ArrayBuffer(7)],buffers:[new ArrayBuffer(5)],more:true});p.append([new ArrayBuffer(2),new ArrayBuffer(3)]);
 let removed=0,terminated=0;for(const sb of buffers)sb.removeEventListener=()=>{removed++;throw Error('cleanup failed');};p.worker={postMessage(){},terminate(){terminated++;}};p.stopWorkers();p.stopWorkers();assert.equal(removed,2);assert.equal(terminated,1);assert.equal(p.stats.discardedBytes,12);assert.equal(p.stats.cleanupFailures,2);assert.equal(p.stats.cancellations[0].pendingBytes,5);assert.equal(p.stats.cancellations[0].retainedCompressedBytesUpperBound,10);assert.equal(p.bufferResources.size,0);
});
