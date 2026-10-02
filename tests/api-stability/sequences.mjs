// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../../web/generated/unified-player.js';
import {bindPlayer} from '../../web/generated/integration/index.js';

function fixture(t) {
  const names=['HTMLElement','HTMLCanvasElement','HTMLVideoElement','document'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const document=new EventTarget();document.baseURI='http://localhost/';
  class Element extends EventTarget {ownerDocument=document;append(){}remove(){this.removed=true;}}
  document.createElement=()=>new Element();
  Object.assign(globalThis,{document,HTMLElement:Element,HTMLCanvasElement:class extends Element{},HTMLVideoElement:class extends Element{}});
  // Only browser scheduling is suppressed. State, events, operation admission,
  // cancellation, settings and consumer bindings are production implementations.
  class TestPlayer extends Player {startWatchdogs(){}stopWatchdogs(){}schedulePromotion(){}}
  const p=new TestPlayer(new Element(),{mode:'native',nativeRemux:'never',assetBase:'http://localhost/',preview:false,watchdogs:false});
  t.after(async()=>{try{await p.destroy();}finally{for(const [name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  const calls=[],backend=new EventTarget();
  Object.assign(backend,{
    properties:new Map([['time-pos',1],['duration',20],['pause',true],['native-seekable',[{start:0,end:20}]]]),
    diagnostics:{plan:'direct'},
    play:async()=>{calls.push('play');backend.properties.set('pause',false);p.observedPlaying=true;},
    pause:async()=>{calls.push('pause');backend.properties.set('pause',true);},
    volume:async value=>{calls.push(['volume',value]);},
    rate:async value=>{calls.push(['rate',value]);},
    setBuffering:async()=>{},verifyOutput:async()=>{},destroy:async()=>{},
  });
  Object.assign(p,{source:{kind:'local',file:new Blob()},current:{backend,surface:new Element()},sourceSerial:1});
  p.publish();
  return {p,backend,calls};
}
function random(seed){let value=seed>>>0;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};}
function invariant(p,expected) {
  assert.ok(Object.isFrozen(p.state));assert.ok(Object.isFrozen(p.state.mediaInfo));
  assert.equal(p.state.pendingOperation,null);assert.equal(p.state.error,null);
  for(const [key,value]of Object.entries(expected))if(typeof value==='number')assert.ok(Math.abs(p.state[key]-value)<1e-10,key);else assert.equal(p.state[key],value,key);
}

// Independent expected state: update it from commands, never copy it from Player.
// Each shuffled round contains every action; seeds vary order, values and bursts.
for(const seed of Array.from({length:16},(_,i)=>(0x5eed+i*7919)>>>0))test(`model seed ${seed}: varied settings, intent, rejection and binding histories`,{timeout:15000},async t=>{
  const {p,backend}=fixture(t),next=random(seed),trace=[];let binding=bindPlayer(p);
  const expected={volume:1,muted:false,playbackRate:1,playbackIntent:'pause',sourceId:1,activeMode:'native'};
  let profile='balanced';const snapshots=[],stop=p.subscribe(state=>snapshots.push(state));
  const actions=['volume','mute','rate','play','pause','burst','invalid','buffer','reject-buffer','rebind'];
  try{
    for(let round=0;round<12;round++){
      const order=[...actions];for(let i=order.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(const action of order){
        const value=Math.round(next()*100)/100,entry={round,action,value};trace.push(entry);
        if(action==='volume'){await binding.setVolume(value);expected.volume=value;}
        if(action==='mute'){expected.muted=value>=.5;await binding.setMuted(expected.muted);}
        if(action==='rate'){expected.playbackRate=value>=.5?1.5:1;await binding.setPlaybackRate(expected.playbackRate);}
        if(action==='play'||action==='pause'){await binding[action]();expected.playbackIntent=action;}
        if(action==='burst'){
          entry.commands=Array.from({length:2+Math.floor(next()*5)},()=>next()>.5?'play':'pause');
          await Promise.all(entry.commands.map(command=>binding[command]()));expected.playbackIntent=entry.commands.at(-1);
        }
        if(action==='invalid'){const old=p.state;assert.throws(()=>p.setVolume(-1),{code:'INVALID_ARGUMENT'});assert.equal(p.state,old);}
        if(action==='buffer'){profile=value>.5?'low-latency':'balanced';await p.setBuffering({profile});}
        if(action==='reject-buffer'){
          backend.setBuffering=async policy=>{if(policy.profile==='resilient')throw Error('Injected buffering failure before application');};
          try{await assert.rejects(p.setBuffering({profile:'resilient'}));}finally{backend.setBuffering=async()=>{};}
        }
        if(action==='rebind'){const retired=binding;await retired.dispose();binding=bindPlayer(p);await assert.rejects(retired.play(),{code:'ABORTED'});}
        entry.expected={...expected,profile};
        invariant(p,{...expected,status:expected.playbackIntent==='play'?'playing':'paused'});
        assert.equal(p.getBuffering().requested.profile,profile,'Rejected command changed buffering policy');
        assert.equal(backend.properties.get('pause'),expected.playbackIntent==='pause','Backend intent diverged');
        entry.expected={...expected,profile};entry.observed={status:p.state.status,intent:p.state.playbackIntent};
      }
    }
    const retained=snapshots.at(-1);stop();const count=snapshots.length;
    await binding.dispose();await p.close();assert.equal(snapshots.length,count);assert.equal(retained.sourceId,1);
    invariant(p,{volume:expected.volume,muted:expected.muted,playbackRate:expected.playbackRate,sourceId:null,status:'idle'});
    await p.destroy();assert.equal(p.isDestroyed,true);await assert.rejects(p.play(),{code:'ABORTED'});
  }catch(error){error.message+=`\nReplay seed=${seed} trace=${JSON.stringify(trace)}`;throw error;}
  finally{stop();await binding.dispose();}
});

test('delayed Play → Pause → Play publishes accepted intent and releases the queue',{timeout:5000},async t=>{
  const {p,backend}=fixture(t),states=[],events=[],stop=p.subscribe(s=>states.push(s));
  for(const name of ['play','pause','error'])p.addEventListener(name,()=>events.push({name,state:p.state}));
  let started;const ready=new Promise(resolve=>started=resolve);let signal;
  backend.verifyOutput=s=>{signal=s;started();return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
  const play=p.play();await ready;await p.pause();await play;
  assert.equal(signal.aborted,true);invariant(p,{playbackIntent:'pause',status:'paused',sourceId:1});
  backend.verifyOutput=async()=>{};await p.play();invariant(p,{playbackIntent:'play'});
  await p.pause();await p.queue;
  assert.equal(p.queued,0);assert.equal(p.playRequests.size,0);
  assert.ok(events.some(e=>e.name==='play'&&e.state.playbackIntent==='play'));
  assert.ok(events.some(e=>e.name==='pause'&&e.state.playbackIntent==='pause'));
  assert.ok(states.every(Object.isFrozen));assert.ok(!events.some(e=>e.name==='error'));stop();
});

test('failed buffering update retains public state and binding remains usable',{timeout:5000},async t=>{
  const {p,backend}=fixture(t),binding=bindPlayer(p),errors=[];
  p.addEventListener('error',event=>errors.push(event.detail));
  await p.setBuffering({profile:'low-latency'});await binding.setVolume(.4);
  backend.setBuffering=async policy=>{if(policy.profile==='resilient')throw Error('rejected');};
  await assert.rejects(p.setBuffering({profile:'resilient'}));
  invariant(p,{sourceId:1,volume:.4,playbackIntent:'pause'});
  assert.equal(p.getBuffering().requested.profile,'low-latency');assert.equal(errors.length,1);
  await binding.play();await binding.pause();await binding.dispose();assert.equal(p.isDestroyed,false);
});

for(const terminal of ['close','destroy'])test(`${terminal} during pending output retires work and observers see final state`,{timeout:5000},async t=>{
  const {p,backend}=fixture(t);let started;const ready=new Promise(resolve=>started=resolve);
  backend.verifyOutput=s=>{started();return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
  const work=p.play(),rejected=assert.rejects(work,{code:'ABORTED'});await ready;
  const states=[],stop=p.subscribe(s=>states.push(s));await p[terminal]();await rejected;
  assert.equal(states.at(-1).sourceId,null);assert.equal(p.state.status,'idle');
  assert.equal(p.state.pendingOperation,null);assert.equal(p.playRequests.size,0);stop();
});
