// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {pendingOperation} from '../../web/generated/internal/machine/operations.js';
function runner(){let state=initialPlayerControl();const history=[];return{get state(){return state;},send(input){const before=state,bytes=JSON.stringify(before),result=transitionPlayer(state,input);state=result.state;assert.equal(JSON.stringify(before),bytes);history.push([input,state]);return result;},history};}
test('FIFO admission, pending kind, completion and delayed bookkeeping have separate boundaries',()=>{
  const r=runner();assert.equal(r.send({type:'operation.admit',kind:null}).id,1);r.send({type:'operation.admit',kind:'seeking'});
  assert.equal(r.send({type:'operation.start',id:2}).reason,'order');r.send({type:'operation.start',id:1});
  assert.equal(pendingOperation(r.state.operations),null);assert.equal(r.state.operations.active,1);
  r.send({type:'operation.name',id:1,kind:'switching'});assert.deepEqual(pendingOperation(r.state.operations),{id:1,kind:'switching'});
  r.send({type:'operation.finish',id:1});assert.equal(pendingOperation(r.state.operations),null);assert.equal(r.state.operations.entries.length,2);
  r.send({type:'operation.release',id:1});r.send({type:'operation.start',id:2});assert.deepEqual(pendingOperation(r.state.operations),{id:2,kind:'seeking'});
});
test('ordinary capacity is bounded, rejection consumes an ID, closing bypasses the limit',()=>{
  const r=runner();for(let i=0;i<32;i++)assert.equal(r.send({type:'operation.admit',kind:null}).accepted,true);
  const full=r.send({type:'operation.admit',kind:'seeking'});assert.equal(full.reason,'full');assert.equal(full.id,33);assert.equal(r.state.operations.entries.length,32);
  const close=r.send({type:'operation.admit',kind:'closing'});assert.equal(close.accepted,true);assert.equal(close.id,34);
});
test('abort and owner retirement reject stale starts without erasing physical cleanup entries',()=>{
  for(const terminal of [false,true]){
    const r=runner();r.send({type:'operation.admit',kind:'opening'});r.send({type:'operation.admit',kind:'seeking'});r.send({type:'operation.start',id:1});
    r.send({type:'operation.retire',terminal});r.send({type:'operation.cancel',id:1});r.send({type:'operation.finish',id:1});r.send({type:'operation.release',id:1});
    assert.equal(r.send({type:'operation.start',id:2}).accepted,false);assert.equal(r.state.operations.entries.length,1);
    const next=r.send({type:'operation.admit',kind:'closing'});assert.equal(next.accepted,!terminal);
    r.send({type:'operation.release',id:2});if(!terminal)assert.equal(r.send({type:'operation.start',id:next.id}).accepted,true);
  }
});
test('duplicate finishes, old naming and stale release cannot change a newer active operation',()=>{
  const r=runner();r.send({type:'operation.admit',kind:'opening'});r.send({type:'operation.start',id:1});r.send({type:'operation.finish',id:1});r.send({type:'operation.release',id:1});
  r.send({type:'operation.admit',kind:'seeking'});r.send({type:'operation.start',id:2});const before=r.state;
  for(const type of ['operation.finish','operation.release','operation.cancel'])assert.equal(r.send({type,id:1}).accepted,false);
  assert.equal(r.send({type:'operation.name',id:1,kind:'switching'}).accepted,false);assert.equal(r.state,before);
});
test('deterministic composed replay covers cancellation, queue pressure and retirement permutations',()=>{
  let seed=713;const events=[];const r=runner();
  for(let i=0;i<1000;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const entries=r.state.operations.entries,chosen=entries[seed%Math.max(1,entries.length)];
    const input=seed%9<3?{type:'operation.admit',kind:seed%2?'seeking':null}:seed%9===8?{type:'operation.retire',terminal:false}:{type:['operation.start','operation.cancel','operation.finish','operation.release','operation.release'][seed%5],id:chosen?.id??0};
    events.push(input);r.send(input);
    assert.ok(r.state.operations.entries.length<=32);assert.ok(r.state.operations.active===null||r.state.operations.entries.some(e=>e.id===r.state.operations.active&&e.phase==='active'));
    assert.equal(new Set(r.state.operations.entries.map(e=>e.id)).size,r.state.operations.entries.length);
  }
  const replay=runner();for(const input of events)replay.send(input);assert.deepEqual(replay.state,r.state);
});

test('pause retires every outstanding play while stale play settlement cannot retire a replacement',()=>{
  const r=runner();const a=r.send({type:'play.request'}).id,b=r.send({type:'play.request'}).id;
  assert.deepEqual(r.send({type:'play.retire'}).retire,[a,b]);const c=r.send({type:'play.request'}).id;
  r.send({type:'play.settled',id:a});r.send({type:'play.settled',id:b});assert.deepEqual(r.state.playback.plays,[c]);
  assert.equal(r.state.settings.pause,true,'a request never proves accepted intent or physical output');
  r.send({type:'settings.change',value:{pause:false}});assert.equal(r.state.playback.observedPlaying,false);
  r.send({type:'playback.observed',playing:true,waiting:false});assert.equal(r.state.playback.observedPlaying,true);
  r.send({type:'playback.observed',waiting:true});assert.equal(r.state.playback.observedPlaying,true);assert.equal(r.state.playback.observedWaiting,true);
});
test('latest seeks supersede only the previous latest request, including pre-start replacements',()=>{
  const r=runner();const a=r.send({type:'seek.request',latest:true}).id,queued=r.send({type:'seek.request',latest:false}).id;
  const b=r.send({type:'seek.request',latest:true});assert.deepEqual(b.retire,[a]);
  r.send({type:'seek.settled',id:a});assert.equal(r.state.playback.latestSeek,b.id);assert.ok(r.state.playback.seeks.includes(queued));
  r.send({type:'seek.settled',id:b.id});assert.equal(r.state.playback.latestSeek,null);assert.deepEqual(r.state.playback.seeks,[queued]);
});
test('accepted settings are immutable and detached from transaction candidates',()=>{
  const r=runner(),desired={...r.state.settings,volume:75};r.send({type:'settings.accept',value:desired});const accepted=r.state.settings;
  desired.volume=10;assert.equal(accepted.volume,75);assert.ok(Object.isFrozen(accepted));
  r.send({type:'settings.change',value:{pause:false}});assert.equal(accepted.pause,true);assert.equal(r.state.settings.volume,75);
});
