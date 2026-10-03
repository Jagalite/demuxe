// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
const turn=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const result=promise=>promise.then(()=>({ok:true}),error=>({ok:false,error}));
const commands={
 volume:{initial:100,first:25,next:70,read:p=>p.settings.volume,run:(p,value)=>p.volume(value)},
 rate:{initial:1,first:1.5,next:.75,read:p=>p.settings.speed,run:(p,value)=>p.rate(value)},
 gain:{initial:1,first:.25,next:.75,read:p=>p.settings.gain,run:(p,value)=>p.setAudioGain(value)},
 track:{initial:'1',first:'2',next:'3',read:p=>p.settings.aid,run:(p,value)=>p.selectAudioTrack(`1:audio:stream:${Number(value)-1}`)},
};
function fixture(t){
 const p=unitPlayer(),backend=new EventTarget(),calls=[],physical={volume:100,rate:1,gain:1,track:'1'};
 const raw=[1,2,3].map(id=>({id,type:'audio','ff-index':id-1,lang:'eng',selected:id===1,default:id===1}));
 const mutate=(kind,value)=>{physical[kind]=value;if(kind==='track')for(const track of raw)track.selected=String(track.id)===value;};
 let onCall;
 const request=(kind,value)=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});const call={kind,value,resolve,reject,mutate:()=>mutate(kind,value)};calls.push(call);call.mutate();onCall?.(call);return promise;};
 Object.assign(backend,{planId:'hybrid',properties:new Map([['track-list',raw]]),diagnostics:{plan:'hybrid'},pause:async()=>{},play:async()=>{},destroy:async()=>{},volume:value=>request('volume',value),rate:value=>request('rate',value),gain:value=>request('gain',value),selectTrack:(_type,value)=>request('track',value)});
 p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};p.currentMode='hybrid';acceptSourceIdentity(p,1);p.updateSettings({aid:'1'});p.updatePreferences({publicSelections:{audio:'audio:stream:0'}});
 t.after(async()=>{for(const call of calls)call.resolve();await p.destroy();});
 return{p,backend,calls,physical,mutate,set onCall(value){onCall=value;},async call(index){await turn();assert.ok(calls[index],`missing physical effect ${index}; received ${calls.map(c=>c.kind+':'+c.value)}`);return calls[index];}};
}
// Independent contract: applying work cannot commit accepted values; successful
// rollback restores the prior physical value; failed rollback must be explicit.
// A FIFO successor cannot touch the backend until the prior transaction settles.
for(const [kind,command] of Object.entries(commands))for(const outcome of ['success','rollback','degraded','close-applying','close-compensating'])test(`${kind}: delayed ${outcome} with a queued public successor`,async t=>{
 const f=fixture(t),{p}=f;let expected=command.initial;
 const first=result(command.run(p,command.first)),apply=await f.call(0);
 assert.equal(command.read(p),expected);assert.equal(f.physical[kind],command.first);
 const successor=result(command.run(p,command.next));await turn();assert.equal(f.calls.length,1,'successor bypassed pending apply');
 let closing;
 if(outcome==='close-applying')closing=p.close();
 else if(outcome==='success'){apply.resolve();expected=command.first;}
 else {
  apply.reject(Error('partially applied'));const restore=await f.call(1);assert.equal(restore.value,expected);assert.equal(command.read(p),expected);assert.equal(f.calls.length,2);
  if(outcome==='close-compensating'){closing=p.close();restore.reject(Error('late rollback failure'));}
  else if(outcome==='degraded'){f.mutate(kind,command.first);restore.reject(Error('restore failed'));}
  else restore.resolve();
 }
 if(closing){
  await closing;const [a,b]=await Promise.all([first,successor]);assert.equal(a.error.code,'ABORTED');assert.equal(b.error.code,'ABORTED');
  // Deliberately deliver an obsolete physical result after retirement. It may
  // mutate the dead backend, but must not revive settings, errors or queue work.
  apply.mutate();apply.resolve();apply.reject(Error('duplicate obsolete callback'));await turn();
  assert.equal(command.read(p),kind==='track'?'auto':expected);assert.equal(p.control.settingsTransactions.pending,null);assert.equal(p.control.settingsTransactions.degraded,null);assert.equal(p.current,undefined);assert.equal(p.queued,0);return;
 }
 const prior=await first;assert.equal(prior.ok,outcome==='success');if(outcome==='degraded')assert.equal(prior.error.code,'DECODE_FAILED');
 const next=await f.call(outcome==='success'?1:2);assert.equal(next.value,command.next);assert.equal(command.read(p),expected,'successor request committed before acknowledgement');
 // Repeated settlement of the previous physical Promise cannot affect successor.
 apply.reject(Error('duplicate old failure'));apply.resolve();assert.equal(command.read(p),expected);
 next.resolve();const final=await successor;assert.equal(final.ok,true,final.error?.message);expected=command.next;
 assert.equal(command.read(p),expected);assert.equal(f.physical[kind],expected);assert.equal(p.control.settingsTransactions.pending,null);await p.queue;assert.equal(p.queued,0);
});
for(const [kind,command] of Object.entries(commands))test(`${kind}: synchronous method reentry queues successor without sharing rollback`,async t=>{
 const f=fixture(t);let successor;f.onCall=()=>{f.onCall=undefined;successor=result(command.run(f.p,command.next));};
 const first=result(command.run(f.p,command.first)),apply=await f.call(0);apply.reject(Error('partial apply'));
 const restore=await f.call(1);assert.equal(restore.value,command.initial);assert.equal(f.calls.length,2);restore.resolve();assert.equal((await first).ok,false);
 const next=await f.call(2);assert.equal(next.value,command.next);next.resolve();assert.equal((await successor).ok,true);assert.equal(command.read(f.p),command.next);assert.equal(f.physical[kind],command.next);
});
for(const [kind,command] of Object.entries(commands))test(`${kind}: backend method acquisition retirement prevents the physical call`,async t=>{
 const f=fixture(t),method=kind==='track'?'selectTrack':kind,original=f.backend[method];let closing,reads=0;
 Object.defineProperty(f.backend,method,{get(){if(++reads===(kind==='gain'?2:1))closing=f.p.close();return original;}});
 const work=result(command.run(f.p,command.first));await turn();const outcome=await work;assert.equal(outcome.error.code,'ABORTED');await closing;
 assert.equal(f.calls.length,0,'retired backend method was invoked after acquisition reentered close');
});
function random(seed){let state=seed>>>0;return max=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%max;};}
for(const seed of [0x51a7,0xbad5eed,0xc0ffee])test(`seed ${seed}: 128 interleaved public settings keep accepted and physical state aligned`,async t=>{
 const f=fixture(t),pick=random(seed),keys=Object.keys(commands),model={volume:100,rate:1,gain:1,track:'1'},pools={volume:[10,25,50,70,100],rate:[.5,.75,1,1.5,2],gain:[.25,.5,.75,1],track:['1','2','3']};let index=0;
 const snapshot=()=>Object.fromEntries(keys.map(kind=>[kind,commands[kind].read(f.p)]));
 const value=(kind,exclude)=>{const options=pools[kind].filter(v=>v!==model[kind]&&v!==exclude);return options[pick(options.length)];};
 for(let step=0;step<64;step++){
  const kind=keys[pick(keys.length)],nextKind=keys[pick(keys.length)],firstValue=value(kind),nextValue=value(nextKind,nextKind===kind?firstValue:undefined),fail=pick(3)===0;
  const label=`seed=${seed} step=${step} ${kind}:${firstValue} -> ${nextKind}:${nextValue} failure=${fail}`;
  const first=result(commands[kind].run(f.p,firstValue)),apply=await f.call(index++);assert.deepEqual(snapshot(),model,label);
  const successor=result(commands[nextKind].run(f.p,nextValue));await turn();assert.equal(f.calls.length,index,label);
  if(fail){apply.reject(Error(label));const rollback=await f.call(index++);assert.equal(rollback.value,model[kind],label);assert.deepEqual(snapshot(),model,label);rollback.resolve();}
  else {apply.resolve();model[kind]=firstValue;}
  assert.equal((await first).ok,!fail,label);const next=await f.call(index++);assert.deepEqual(snapshot(),model,label);assert.equal(next.kind,nextKind,label);assert.equal(next.value,nextValue,label);
  next.resolve();assert.equal((await successor).ok,true,label);model[nextKind]=nextValue;assert.deepEqual(snapshot(),model,label);assert.deepEqual(f.physical,model,label);
 }
 await f.p.queue;assert.equal(f.p.queued,0);assert.equal(f.p.control.settingsTransactions.pending,null);
});
for(const [kind,command] of Object.entries(commands))test(`${kind}: compensation method acquisition retirement does not call the dead backend`,async t=>{
 const f=fixture(t),method=kind==='track'?'selectTrack':kind,original=f.backend[method];let closing,reads=0;
 Object.defineProperty(f.backend,method,{get(){if(++reads===(kind==='gain'?3:2))closing=f.p.close();return original;}});
 const work=result(command.run(f.p,command.first)),apply=await f.call(0);apply.reject(Error('partial first effect'));await turn();const outcome=await work;assert.equal(outcome.error.code,'ABORTED');await closing;
 assert.equal(f.calls.length,1,'retired rollback method was invoked');assert.equal(f.p.control.settingsTransactions.degraded,null);assert.equal(f.p.sessionError,null);
});
