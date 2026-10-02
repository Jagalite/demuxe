// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {playerActionAuthority} from '../../web/generated/internal/machine/player-actions.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {publishControlSnapshot} from '../helpers/player-control.mjs';
function model(mode='hybrid'){
 let state=initialPlayerControl();const m={get state(){return state;},send(input){const old=state,json=JSON.stringify(state),decision=transitionPlayer(state,input);assert.equal(JSON.stringify(old),json);state=decision.state;assert.ok(Object.isFrozen(state));return decision;},scope(){return {epoch:state.operations.epoch,session:state.source.acceptedSession,operation:state.operations.active};},accept(mode,preserve=false){const attempt=this.send({type:'source.begin',operationEpoch:state.operations.epoch,mode,preserve,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])this.send({type,attempt});this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:state.settings,planMatches:true});this.send({type:'source.finished',attempt});},step(direction=1,initial=10){return this.send({type:'action.step',scope:this.scope(),direction,initial,hasVideo:true});},done(now=100){return this.send({type:'action.completed',id:state.actions.pending.id,phase:state.actions.pending.phase,now});},sample(now,time){return this.send({type:'action.sample',id:state.actions.pending.id,now,time});}};
 m.accept(mode);const id=m.send({type:'operation.admit',kind:'seeking'}).id;m.send({type:'operation.start',id});return m;
}
test('stepping commits pause after acknowledgement and waits for directional output before verification',()=>{
 for(const direction of [1,-1]){
  const m=model();m.send({type:'settings.change',value:{pause:false}});const started=m.step(direction),id=started.id;
  assert.deepEqual(started.actionEffects,[{kind:'action.pause'}]);assert.equal(m.state.settings.pause,false);
  assert.deepEqual(m.done().actionEffects,[{kind:'action.step',direction}]);assert.equal(m.state.settings.pause,true);
  m.done(500);assert.equal(m.state.actions.pending.deadline,25500);
  assert.deepEqual(m.sample(501,10-direction).actionEffects,[{kind:'action.wait',milliseconds:20}]);m.done();
  const verify=m.sample(502,10+direction);assert.deepEqual(verify.actionEffects,[{kind:'action.verify',target:10+direction}]);assert.equal(m.state.actions.pending.phase,'verifying');m.done();assert.equal(m.state.actions.pending.phase,'finished');assert.ok(playerActionAuthority(m.state,id));m.send({type:'action.finished',id});assert.equal(m.state.actions.pending,null);
 }
});
test('deadline is exclusive and does not mistake a late frame for successful stepping',()=>{
 const m=model();m.step();m.done();m.done(100);assert.equal(m.sample(25100,11).reason,'unsupported');assert.equal(m.state.actions.pending.phase,'sampling');
});
test('nonfinite and stationary output consumes polling time without successful verification',()=>{
 const m=model();m.step();m.done();m.done();for(const time of [NaN,Infinity,-Infinity,10,9]){assert.equal(m.sample(101,time).actionEffects[0].kind,'action.wait');m.done();}
});
test('backward stepping validates the beginning before physical pause',()=>{const m=model();assert.equal(m.step(-1,0).reason,'invalid');assert.equal(m.state.actions.pending,null);});
for(const phase of ['pausing','stepping','sampling','waiting','verifying','finished'])for(const retirement of ['cancel','close','replace','destroy'])test(retirement+' fences step completion in '+phase,()=>{
 const m=model();const id=m.step().id;
 if(phase!=='pausing')m.done();if(!['pausing','stepping'].includes(phase))m.done();if(phase==='waiting')m.sample(101,10);if(['verifying','finished'].includes(phase))m.sample(101,11);if(phase==='finished')m.done();
 const operation=m.state.operations.active;
 if(retirement==='replace')m.accept('software',true);else if(retirement==='close')m.send({type:'source.clear'});else if(retirement==='cancel')m.send({type:'operation.cancel',id:operation});else m.send({type:'operation.retire',terminal:true});
 assert.equal(m.state.actions.pending,null);assert.equal(m.send({type:'action.completed',id,phase,now:500}).accepted,false);assert.equal(m.send({type:'action.sample',id,now:500,time:11}).accepted,false);assert.equal(playerActionAuthority(m.state,id),false);
});
const nativeFacts={hasSurface:true,hasVideo:true,subtitle:false,readback:false,width:3840,height:2160};
test('native snapshot dimension policy is bounded and captures subtitle eligibility',()=>{
 const m=model('native'),decision=m.send({type:'action.snapshot',scope:m.scope(),options:{},facts:nativeFacts});assert.deepEqual(decision.actionEffects,[{kind:'action.capture',plan:{kind:'native',width:1920,height:1080,includesSubtitles:false}}]);m.done();m.send({type:'action.finished',id:decision.id});
 assert.equal(m.send({type:'action.snapshot',scope:m.scope(),options:{width:1921},facts:nativeFacts}).reason,'invalid');assert.equal(m.send({type:'action.snapshot',scope:m.scope(),options:{},facts:{...nativeFacts,subtitle:true}}).reason,'unsupported');
 assert.equal(m.send({type:'action.snapshot',scope:m.scope(),options:{includeSubtitles:false},facts:{...nativeFacts,subtitle:true}}).accepted,true);
});
test('mpv snapshot policy rejects resizing and impossible subtitle removal',()=>{
 const m=model(),facts={...nativeFacts,readback:true,subtitle:true};for(const options of [{width:100},{height:100},{includeSubtitles:false}])assert.equal(m.send({type:'action.snapshot',scope:m.scope(),options,facts}).reason,'unsupported');
 assert.equal(m.send({type:'action.snapshot',scope:m.scope(),options:{},facts:{...facts,readback:false}}).reason,'unsupported');const accepted=m.send({type:'action.snapshot',scope:m.scope(),options:{},facts});assert.equal(accepted.actionEffects[0].plan.includesSubtitles,true);
});
test('facts captured before source replacement cannot admit a snapshot of the replacement',()=>{
 const m=model('native'),scope=m.scope();m.accept('native',true);assert.equal(m.send({type:'action.snapshot',scope,options:{},facts:nativeFacts}).accepted,false);
});
test('live navigation stays active until correlated completion and ignores duplicates',()=>{
 const m=model('native');assert.equal(m.send({type:'action.live',scope:m.scope(),supported:false}).reason,'unsupported');const started=m.send({type:'action.live',scope:m.scope(),supported:true});assert.deepEqual(started.actionEffects,[{kind:'action.live'}]);assert.equal(m.send({type:'action.completed',id:started.id+1,phase:'live'}).accepted,false);m.done();assert.equal(m.send({type:'action.completed',id:started.id,phase:'live'}).accepted,false);
});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function physical(t,mode='hybrid',subtitle=false){
 const p=unitPlayer(),backend={properties:new Map([['time-pos',10]]),pause:async()=>{},command:async()=>{},destroy:async()=>{},seekToLive:async()=>{},previewSnapshot:async()=>({blob:new Blob(['image']),width:320,height:240})};
 const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode,preserve:false,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});p.dispatchControl({type:'source.finished',attempt});
 p.current={backend,surface:{remove(){},videoWidth:320,videoHeight:240}};p.source={kind:'local',file:new Blob()};publishControlSnapshot(p,{currentTime:10,duration:20});
 // Media facts are external observations; retain real command and lifecycle execution.
 const snapshot=p.state;Object.defineProperty(p,'state',{get:()=>({...snapshot,mediaInfo:{...snapshot.mediaInfo,video:{width:320,height:240},subtitle:subtitle?{}:null}})});
 p.settled=async()=>{};t.after(()=>p.destroy());return {p,backend};
}
test('actual step pauses then commands then verifies the captured backend',async t=>{
 const {p,backend}=physical(t),calls=[];p.updateSettings({pause:false});backend.pause=async()=>{calls.push('pause');assert.equal(p.settings.pause,false);};backend.command=async value=>{calls.push(value);assert.equal(p.settings.pause,true);backend.properties.set('time-pos',11);};p.settled=async(session,mode,target)=>{assert.equal(session.backend,backend);calls.push([mode,target]);};await p.stepFrame();assert.deepEqual(calls,['pause','frame-step',['hybrid',11]]);assert.equal(p.control.actions.pending,null);
});
test('close during pending pause settles the step without issuing a late frame command',async t=>{
 const {p,backend}=physical(t),pause=deferred(),started=deferred(),calls=[];backend.pause=()=>{started.resolve();return pause.promise;};backend.command=async()=>calls.push('step');const work=p.stepFrame();const rejection=assert.rejects(work,{code:'ABORTED'});await started.promise;await p.close();await rejection;pause.resolve();await Promise.resolve();assert.deepEqual(calls,[]);assert.equal(p.control.actions.pending,null);
});
test('late mpv snapshot cannot settle successfully after destroy',async t=>{
 const {p,backend}=physical(t),image=deferred(),started=deferred();backend.previewSnapshot=()=>{started.resolve();return image.promise;};const work=p.snapshot(),rejection=assert.rejects(work,{code:'ABORTED'});await started.promise;await p.destroy();await rejection;image.resolve({blob:new Blob(),width:2,height:2});await Promise.resolve();assert.equal(p.control.actions.pending,null);
});
test('live navigation failure releases action ownership and the next command still runs',async t=>{
 const {p,backend}=physical(t);backend.seekToLive=async()=>{throw Error('live failed');};await assert.rejects(p.seekToLive(),/live failed/);assert.equal(p.control.actions.pending,null);let calls=0;backend.seekToLive=async()=>{calls++;};await p.seekToLive();assert.equal(calls,1);
});

for(const descriptor of ['inherited','nonenumerable'])test('actual snapshot retains '+descriptor+' known options',async t=>{
 const {p}=physical(t,'hybrid',true);
 const options=descriptor==='inherited'?Object.create({includeSubtitles:false}):Object.defineProperty({},'includeSubtitles',{value:false});
 await assert.rejects(p.snapshot(options),/already contains subtitles/);
 const dimensions=descriptor==='inherited'?Object.create({width:320}):Object.defineProperty({},'width',{value:320});
 await assert.rejects(p.snapshot(dimensions),/current presentation size/);
});
test('snapshot ignores unrelated option getters and captures known options when queued work runs',async t=>{
 const {p,backend}=physical(t),options={includeSubtitles:true,get unrelated(){throw Error('unrelated getter');}};
 const barrier=deferred(),started=deferred();backend.seekToLive=()=>{started.resolve();return barrier.promise;};
 const live=p.seekToLive();await started.promise;const image=p.snapshot(options);options.width=320;barrier.resolve();await live;await assert.rejects(image,/current presentation size/);
 delete options.width;const result=await p.snapshot(options);assert.equal(result.width,320);assert.equal(result.blob.size,5);
});
test('a command getter that retires the player cannot issue a late frame step',async t=>{
 const {p,backend}=physical(t);let calls=0,closing;Object.defineProperty(backend,'command',{get(){closing=p.close();return async()=>{calls++;};}});
 await assert.rejects(p.stepFrame(),{code:'ABORTED'});await closing;assert.equal(calls,0);assert.equal(p.control.actions.pending,null);
});
test('snapshot readback discovery cannot authorize an effect after reentrant close',async t=>{
 const {p,backend}=physical(t);let calls=0,closing;Object.defineProperty(backend,'previewSnapshot',{get(){closing=p.close();return async()=>{calls++;return {blob:new Blob(),width:2,height:2};};}});
 await assert.rejects(p.snapshot(),{code:'ABORTED'});await closing;assert.equal(calls,0);assert.equal(p.control.actions.pending,null);
});
