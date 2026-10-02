// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBindingState,transitionBinding,bindingDiagnostics,initialMediaViewState,transitionMediaView,initialMediaViewEvents,initialSelectorState,transitionSelector} from '../../web/generated/internal/machine/bindings.js';
import {PlaybackBinding,bindPlayer,subscribeSelector} from '../../web/generated/integration/index.js';
import {MediaView} from '../../web/generated/integration/media-view.js';

const snapshot=patch=>Object.freeze({sourceId:1,currentTime:0,duration:null,streamType:'unknown',playbackIntent:'pause',status:'paused',volume:1,muted:false,playbackRate:1,error:null,loop:false,buffered:null,seekable:null,pendingOperation:null,...patch});
function runtime(){
  const p=new EventTarget(),listeners=new Set();p.state=snapshot();p.isDestroyed=false;
  p.subscribe=listener=>{listeners.add(listener);listener(p.state);return ()=>listeners.delete(listener);};
  p.publish=patch=>{p.state=snapshot({...p.state,...patch});for(const listener of [...listeners])listener(p.state);};
  p.play=async()=>{};p.pause=async()=>{};p.seek=async()=>{};
  p.setVolume=async()=>{};p.setMuted=async()=>{};p.setPlaybackRate=async()=>{};
  p.destroy=async()=>{p.isDestroyed=true;};p.listeners=listeners;return p;
}

test('binding reducer owns subscription admission, notification counts and idempotent retirement',()=>{
  const initial=initialBindingState('borrowed'),first=transitionBinding(initial,{type:'subscribe',runtimeDestroyed:false});
  assert.deepEqual(initial.subscriptions,[]);
  let state=first.state;
  const second=transitionBinding(state,{type:'subscribe',runtimeDestroyed:false});state=second.state;
  state=transitionBinding(state,{type:'notify',id:first.subscriptionId}).state;
  assert.deepEqual(bindingDiagnostics(state),{origin:'integration',subscriptions:2,notifications:1});
  state=transitionBinding(state,{type:'unsubscribe',id:first.subscriptionId}).state;
  assert.equal(transitionBinding(state,{type:'notify',id:first.subscriptionId}).deliver,false);
  const retired=transitionBinding(state,{type:'dispose'});
  assert.deepEqual(retired.release,[second.subscriptionId]);assert.equal(retired.destroyRuntime,false);
  assert.equal(transitionBinding(retired.state,{type:'run',runtimeDestroyed:false}).error.code,'ABORTED');
  assert.equal(transitionBinding(retired.state,{type:'notify',id:second.subscriptionId}).deliver,false);
  assert.deepEqual(transitionBinding(retired.state,{type:'dispose'}).release,[]);
  assert.equal(transitionBinding(initialBindingState('owned'),{type:'dispose'}).destroyRuntime,true);
  assert.equal(transitionBinding(initial,{type:'subscribe',runtimeDestroyed:true}).error.code,'ABORTED');
});

test('MediaView pure projection preserves ordering, intent versus observation and authoritative seek settlement',()=>{
  const initial=snapshot(),base=transitionMediaView(initialMediaViewState(),initial);
  assert.deepEqual(base.events,[]);
  const next=snapshot({sourceId:2,currentTime:3,duration:10,streamType:'vod',volume:.4,playbackRate:2,playbackIntent:'play',status:'buffering',pendingOperation:{id:1,kind:'seeking'}});
  const projected=transitionMediaView(base.state,next);
  assert.deepEqual(projected.events.map(event=>event.type),['loadedmetadata','durationchange','timeupdate','volumechange','ratechange','play','waiting']);
  assert.equal(projected.events.some(event=>event.type==='seeked'||event.type==='seeking'),false);
  assert.deepEqual(transitionMediaView(projected.state,snapshot({...next,status:'ended',loop:true})).events,[]);
  assert.deepEqual(initialMediaViewEvents(next),['loadedmetadata','durationchange','timeupdate','volumechange','ratechange','play']);
  assert.ok(Object.isFrozen(projected.events[0]));
});

test('MediaView unknown/live ranges and session errors keep their existing event distinctions',()=>{
  const baseline=transitionMediaView(initialMediaViewState(),snapshot());
  assert.deepEqual(transitionMediaView(baseline.state,snapshot()).events,[]);
  assert.deepEqual(transitionMediaView(baseline.state,snapshot({streamType:'live'})).events.map(event=>event.type),['durationchange']);
  const operationError={scope:'operation',code:'INVALID_ARGUMENT'};
  assert.deepEqual(transitionMediaView(baseline.state,snapshot({error:operationError})).events,[]);
  const sessionError={scope:'session',code:'DECODE_FAILED'};
  const failed=transitionMediaView(baseline.state,snapshot({error:sessionError}));
  assert.deepEqual(failed.events,[{type:'error',detail:sessionError}]);
  assert.deepEqual(transitionMediaView(failed.state,snapshot({error:sessionError})).events,[]);
});

test('selector delivery state honors equality and retirement independent of application callbacks',()=>{
  let state=initialSelectorState();
  const first=transitionSelector(state,{type:'observe',equal:true});assert.equal(first.deliver,true);state=first.state;
  assert.equal(transitionSelector(state,{type:'observe',equal:true}).deliver,false);
  assert.equal(transitionSelector(state,{type:'observe',equal:false}).deliver,true);
  state=transitionSelector(state,{type:'stop'}).state;
  assert.equal(transitionSelector(state,{type:'observe',equal:false}).deliver,false);
});

test('binding shell disposes during initial delivery and releases the late subscription handle',async()=>{
  const p=runtime(),binding=bindPlayer(p);let calls=0,done;
  const stop=binding.subscribe(()=>{calls++;done=binding.dispose();});
  await done;stop();p.publish({currentTime:1});
  assert.equal(calls,1);assert.equal(p.listeners.size,0);
  assert.equal(binding.diagnostics.subscriptions,0);assert.equal(p.isDestroyed,false);
});

test('binding disposal attempts all cleanup and owned destroy after an unsubscribe failure',async()=>{
  const p=runtime(),calls=[],failure=Error('unsubscribe');let serial=0;
  p.subscribe=()=>{const id=++serial;return ()=>{calls.push(id);if(id===1)throw failure;};};
  p.destroy=async()=>{calls.push('destroy');};
  const binding=new PlaybackBinding(p,'owned');binding.subscribe(()=>{});binding.subscribe(()=>{});
  const done=binding.dispose();assert.equal(binding.dispose(),done);
  await assert.rejects(done,error=>error===failure);
  assert.deepEqual(calls,[1,2,'destroy']);assert.equal(binding.diagnostics.subscriptions,0);
});

test('binding disposal is idempotent under reentrant unsubscribe and accepted work survives borrowed retirement',async()=>{
  const p=runtime();let reentrant,finish;
  const binding=bindPlayer(p);
  p.subscribe=()=>()=>{reentrant=binding.dispose();};binding.subscribe(()=>{});
  p.play=()=>new Promise(resolve=>{finish=resolve;});
  const work=binding.play(),done=binding.dispose();assert.equal(reentrant,done);await done;
  finish('accepted');assert.equal(await work,'accepted');assert.equal(p.isDestroyed,false);
});

test('selector disposal during application selection or equality suppresses the retired notification',()=>{
  for(const stage of ['selection','equality']){
    const p=runtime(),seen=[];let stop;
    stop=subscribeSelector(p,state=>{if(stage==='selection'&&state.currentTime)stop();return state.currentTime;},value=>seen.push(value),(a,b)=>{if(stage==='equality'&&b)stop();return a===b;});
    p.publish({currentTime:1});assert.deepEqual(seen,[0],stage);assert.equal(p.listeners.size,0);
  }
});

test('MediaView event dispatch stops old snapshot events after reentrant source replacement',async()=>{
  const p=runtime(),view=new MediaView(p),seen=[];
  view.addEventListener('loadedmetadata',()=>p.publish({sourceId:null,duration:null,currentTime:0,playbackIntent:'pause'}));
  for(const name of ['emptied','durationchange','timeupdate','play'])view.addEventListener(name,()=>seen.push([name,view.state.sourceId]));
  p.publish({sourceId:2,duration:10,currentTime:5,playbackIntent:'play'});
  assert.deepEqual(seen,[['emptied',null],['durationchange',null],['timeupdate',null]]);
  await view.dispose();
});
