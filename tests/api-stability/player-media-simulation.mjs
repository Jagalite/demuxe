// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../../web/generated/unified-player.js';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
import {VirtualEffects} from './virtual-effects.mjs';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const drain=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};

// Only the media/DOM boundary and background browser scheduling are simulated.
// Public controls, command queue, effects, listeners, publication, readiness,
// boundary enforcement and session resource disposal are production code.
async function fixture(t,plan='direct',mutation,timing){
 const names=['HTMLElement','HTMLCanvasElement','HTMLVideoElement','document'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const document=new EventTarget();document.baseURI='http://localhost/';
 class Element extends EventTarget{ownerDocument=document;append(){}remove(){}}
 document.createElement=()=>new Element();Object.assign(globalThis,{document,HTMLElement:Element,HTMLCanvasElement:class extends Element{},HTMLVideoElement:class extends Element{}});
 class SimPlayer extends Player{startWatchdogs(){}stopWatchdogs(){}schedulePromotion(){}}
 const p=new SimPlayer(new Element(),{mode:'native',nativeRemux:'never',assetBase:'http://localhost/',preview:false,watchdogs:false}),clock=new VirtualEffects(),backends=[];
 async function pump(promise){let done=false,rejected=false,value,failure;Promise.resolve(promise).then(v=>{done=true;value=v;},e=>{done=true;rejected=true;failure=e;});for(let n=0;n<200;n++){await drain();if(done){if(rejected)throw failure;return value;}const deadlines=[...clock.timers.values()].map(timer=>timer.deadline);if(deadlines.length)await moveTo(Math.min(...deadlines));}throw Error('Simulated operation did not settle');}
 async function idle(){for(let n=0;n<200;n++){await drain();if(clock.timers.size){await moveTo(Math.min(...[...clock.timers.values()].map(timer=>timer.deadline)));continue;}if(!p.state.pendingOperation&&!p.control.operations.entries.length)return;}throw Error('Player did not become idle');}
 // Advance media before each physical callback, then let resulting Promise
 // continuations install their next command before moving farther in time.
 async function moveTo(target){
  assert.ok(Number.isFinite(target)&&target>=clock.time);
  for(let n=0;n<10000;n++){
   await drain();const due=[...clock.timers.values()].map(timer=>timer.deadline).filter(time=>time<=target);
   if(clock.time===target&&!due.length)return;
   const time=due.length?Math.max(clock.time,Math.min(...due)):target;
   for(const backend of backends)backend.advance((time-clock.time)/1000);
   clock.advanceTo(time);
  }
  throw Error('Media timeline did not quiesce');
 }
 async function attach(){
  const backend=new EventTarget(),calls=[];let position=0,paused=true,rate=p.settings.speed,stalled=false,closed=false,failVolume=false,playbackSerial=0;
  const properties=new Map([['time-pos',0],['duration',20],['pause',true],['seekable',true],['native-seekable',[{start:0,end:20}]],['track-list',[{id:1,type:'audio',selected:true},{id:2,type:'audio',selected:false}]]]);
  const emit=(type,detail)=>backend.dispatchEvent(new CustomEvent(type,{detail}));
  const property=(name,data,extra={})=>{properties.set(name,data);emit('mpv',{event:'property-change',name,data,...extra});};
  const action=(kind,work,delay=5)=>{calls.push(kind);return new Promise((resolve,reject)=>clock.scheduleDeadline(()=>{try{if(closed&&kind!=='destroy')throw Error('Simulated backend retired');work();resolve();}catch(error){reject(error);}},timing?.(kind,delay,calls.length)??delay));};
  Object.assign(backend,{properties,diagnostics:{plan},calls,
   // Native playback commands retire earlier physical work before acknowledgement.
   play:()=>{const serial=++playbackSerial;return action('play',()=>{if(serial!==playbackSerial)return;paused=false;property('pause',false);emit('activity','playing');});},
   pause:()=>{const serial=++playbackSerial;return action('pause',()=>{if(serial!==playbackSerial)return;if(mutation!=='drop-pause'){paused=true;property('pause',true);}});},
   seek:value=>action(['seek',value],()=>{position=value;property('eof-reached',false);property('time-pos',value);emit('activity','seeked');},30),
   volume:value=>action(['volume',value],()=>{if(failVolume){failVolume=false;throw Error('injected volume failure');}properties.set('volume',value);}),
   rate:value=>action(['rate',value],()=>{rate=mutation==='drop-rate'?rate:value;properties.set('speed',value);}),
   selectTrack:(type,value)=>action(['track',type,value],()=>{property(type==='audio'?'aid':'sid',value);property('track-list',properties.get('track-list').map(track=>({...track,selected:String(track.id)===value})));}),
   subtitleVisible:async()=>{},
   // Output verification must follow physical playback, even when its promise
   // acknowledgement is delayed. A paused simulation cannot claim output.
   verifyOutput:signal=>new Promise((resolve,reject)=>{
    const finish=error=>{backend.removeEventListener('activity',check);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
    const check=()=>{if(!paused)finish();},abort=()=>finish(new Error('Output verification aborted'));
    backend.addEventListener('activity',check);signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)abort();else check();
   }),verifyStartup:async()=>{},setBuffering:async()=>{},
   destroy:()=>{closed=true;return action('destroy',()=>{});},
   failNextVolume:()=>{failVolume=true;},
   stall:value=>{stalled=value;property('paused-for-cache',value);emit('activity',value?'waiting':'playing');},
   advance:seconds=>{if(closed||paused||stalled)return;position=Math.min(20,position+seconds*rate);property('time-pos',position);if(position===20){paused=true;property('eof-reached',true);property('pause',true,{ended:true});emit('activity','ended');}},
   stale:()=>{emit('activity','waiting');emit('mpv',{event:'property-change',name:'time-pos',data:19});emit('error',Error('retired source error'));},
  });
  const session={backend,surface:new Element()};p.source={kind:'local',file:new Blob()};p.current=session;
  // Construction/route selection is a fixture boundary. Accepted identities,
  // resource registration and event fencing still use their real owners.
  acceptSourceIdentity(p,p.sourceSerial+1);await p.registerSession(session,p.control.source.acceptedSession);p.observeBackend(session,p.control.source.acceptedSession);p.publish();backends.push(backend);return backend;
 }
 t.after(async()=>{try{await pump(p.destroy());await idle();assert.equal(clock.timers.size,0);assert.equal(p.control.resources.resources.length,0);}finally{for(const [name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
 return{p,clock,pump,idle,attach,backend:await attach(),step:milliseconds=>moveTo(clock.time+milliseconds),async advance(seconds){await moveTo(clock.time+seconds*1000);await idle();}};
}

test('public playback advances by rate, freezes during buffering and pause, and publishes EOF',async t=>{
 const {p,backend,pump,advance}=await fixture(t);
 await pump(p.play());await advance(2);assert.equal(p.state.currentTime,2);assert.equal(p.state.status,'playing');
 await pump(p.setPlaybackRate(2));await advance(3);near(p.state.currentTime,8.005);
 backend.stall(true);await advance(5);near(p.state.currentTime,8.005);assert.equal(p.state.status,'buffering');assert.equal(p.state.playbackIntent,'play');
 backend.stall(false);await advance(1);near(p.state.currentTime,10.005);assert.equal(p.state.status,'playing');
 await pump(p.pause());await advance(4);near(p.state.currentTime,10.015);assert.equal(p.state.playbackIntent,'pause');
 await pump(p.play());await advance(5);assert.equal(p.state.currentTime,20);assert.equal(p.state.status,'ended');
});

test('public latest seeks and queued controls retain final intent and compensate failed settings',async t=>{
 const {p,backend,pump,idle}=await fixture(t,'shaka-mse');
 await pump(p.play());
 const first=p.seek(4,{policy:'latest'});const firstResult=first.catch(error=>error);await drain();
 const second=p.seek(12,{policy:'latest'}),volume=p.setVolume(.4),pause=p.pause();
 await pump(Promise.all([firstResult,second,volume,pause]));await idle();
 assert.equal((await firstResult).code,'ABORTED');near(p.state.currentTime,12.01);assert.equal(p.state.volume,.4);assert.equal(p.state.playbackIntent,'pause');
 backend.failNextVolume();await assert.rejects(pump(p.setVolume(.8)));assert.equal(p.state.volume,.4);assert.equal(backend.properties.get('volume'),40);
 const selected=p.state.audioTracks[1].id;await pump(p.selectTrack('audio','2'));assert.equal(p.state.audioTracks.find(track=>track.selected).id,selected);assert.equal(backend.properties.get('aid'),'2');assert.equal(p.control.operations.entries.length,0);
});

for(const loop of [false,true])test(`public ${loop?'loop':'range stop'} follows advancing media and ordered backend effects`,async t=>{
 const {p,backend,pump,advance}=await fixture(t);
 await pump(p.setPlaybackRange({start:1,end:5}));await pump(p.setLoop(loop));await pump(p.play());
 const start=backend.calls.length;await advance(6);
 assert.equal(p.state.currentTime,loop?1:5);assert.equal(p.state.playbackIntent,loop?'play':'pause');
 assert.deepEqual(backend.calls.slice(start),loop?['pause',['seek',1],'play']:['pause',['seek',5]]);
 if(loop){for(let n=0;n<50;n++){await advance(4);assert.equal(p.state.currentTime,1);assert.equal(p.state.playbackIntent,'play');}assert.equal(p.control.boundary.pending,null);}
});

test('close during physical seek and reopen reject old events and drain original resources',async t=>{
 const {p,backend,pump,attach,advance,idle}=await fixture(t);
 await pump(p.play());const seek=p.seek(15);const result=seek.catch(error=>error);await drain();
 await pump(p.close());await pump(result);assert.equal((await result).code,'ABORTED');assert.equal(p.state.sourceId,null);assert.equal(p.control.resources.resources.length,0);
 const replacement=await attach(),source=p.state.sourceId;await pump(p.play());await advance(2);
 backend.stale();await idle();assert.equal(p.state.sourceId,source);assert.equal(p.state.currentTime,2);assert.equal(p.state.status,'playing');assert.equal(p.state.error,null);
 assert.equal(backend.calls.filter(call=>call==='destroy').length,1);assert.notEqual(replacement,backend);
});

test('pause retires an in-flight public play and wins after its physical completion',async t=>{
 const {p,pump,advance}=await fixture(t);const playing=p.play(),result=playing.catch(error=>error);await drain();
 const pause=p.pause();await pump(Promise.all([result,pause]));assert.equal(await result,undefined,'a superseding pause fulfills the retired play without fallback');
 await advance(3);assert.equal(p.state.currentTime,0);assert.equal(p.state.playbackIntent,'pause');assert.equal(p.control.playback.plays.length,0);
});

test('close during automatic loop seek prevents a late resume',async t=>{
 const {p,backend,pump,step,idle}=await fixture(t);
 await pump(p.setPlaybackRange({start:1,end:5}));await pump(p.setLoop(true));await pump(p.play());
 backend.advance(5);await drain();await step(5);await drain();
 assert.equal(p.control.boundary.pending.phase,'seeking');const plays=backend.calls.filter(call=>call==='play').length;
 await pump(p.close());await idle();assert.equal(backend.calls.filter(call=>call==='play').length,plays);assert.equal(p.state.sourceId,null);assert.equal(p.control.boundary.pending,null);
});

test('virtual playback advances before a delayed pause and preserves that position',async t=>{
 const {p,pump,advance}=await fixture(t);await pump(p.play());
 const pausing=p.pause();await advance(1);await pausing;
 near(p.state.currentTime,.005);assert.equal(p.state.playbackIntent,'pause');
 await advance(1);near(p.state.currentTime,.005);
});
test('simulation propagates even falsy promise rejection reasons',async t=>{
 const {pump}=await fixture(t);
 for(const reason of [undefined,null,false,0]){let rejected=false;await pump(Promise.reject(reason)).then(()=>assert.fail('rejection swallowed'),error=>{rejected=true;assert.equal(error,reason);});assert.equal(rejected,true);}
});

// A separate model predicts physical position from elapsed simulated time and
// public command contracts. It never reads reducer output to choose expectations.
async function mixedHistory(t,seed,{rounds=8,mutation}={}){
 const {p,clock,backend:initial,pump,idle,attach,advance}=await fixture(t,'shaka-mse',mutation);
 let backend=initial,bits=seed>>>0,position=0,rate=1,paused=true,stalled=false,volume=1;
 const history=[],coverage=new Set(),next=()=>{bits^=bits<<13;bits^=bits>>>17;bits^=bits<<5;return bits>>>0;};
 const elapsed=milliseconds=>{if(!paused&&!stalled){position=Math.min(20,position+milliseconds/1000*rate);if(position===20)paused=true;}};
 const check=()=>{
  near(p.state.currentTime,position);near(backend.properties.get('time-pos'),position);
  assert.equal(p.state.volume,volume);assert.equal(p.state.playbackRate,rate);
  assert.equal(p.control.operations.entries.length,0);assert.equal(p.control.transport.pending,null);
  assert.equal(p.control.settingsTransactions.pending,null);assert.equal(p.control.trackConfirmation.pending,null);
  assert.equal(p.control.playback.plays.length,0);assert.equal(p.control.playback.seeks.length,0);
 };
 const run=async(kind)=>{
  history.push({kind,time:clock.time,position,paused,rate});if(history.length>20)history.shift();coverage.add(kind);
  const start=clock.time;
  if(kind==='play'){await pump(p.play());elapsed(clock.time-start);paused=false;}
  else if(kind==='pause'){await pump(p.pause());elapsed(clock.time-start);paused=true;}
  else if(kind==='rate'){const value=[.5,1,1.5,2][next()%4];await pump(p.setPlaybackRate(value));elapsed(clock.time-start);rate=value;}
  else if(kind==='volume'){const value=(next()%11)/10;await pump(p.setVolume(value));elapsed(clock.time-start);volume=value;}
  else if(kind==='failed-volume'){backend.failNextVolume();await assert.rejects(pump(p.setVolume(volume===.9?.8:.9)));elapsed(clock.time-start);assert.equal(backend.properties.get('volume'),volume*100);}
  else if(kind==='seek'){const value=1+next()%12;await pump(p.seek(value));elapsed(clock.time-start);position=value;}
  else if(kind==='advance'){await advance((1+next()%750)/1000);elapsed(clock.time-start);}
  else if(kind==='buffer'){stalled=!stalled;backend.stall(stalled);await idle();}
  else if(kind==='track'){const value=String(1+next()%2);await pump(p.selectTrack('audio',value));elapsed(clock.time-start);assert.equal(backend.properties.get('track-list').find(track=>track.selected).id,Number(value));}
  else if(kind==='latest-seeks-pause'){
   const first=p.seek(3,{policy:'latest'}),old=first.catch(error=>error);await drain();
   const value=6+next()%7,second=p.seek(value,{policy:'latest'}),stop=p.pause();
   await pump(Promise.all([old,second,stop]));assert.equal((await old).code,'ABORTED');
   // Both physical seeks may settle; only the last target survives, followed
   // by five milliseconds of media advancement before the queued pause.
   position=value+(!paused&&!stalled?.005*rate:0);paused=true;
  }else if(kind==='close-reopen'){
   const retired=backend;await pump(p.close());assert.equal(p.state.sourceId,null);assert.equal(p.control.resources.resources.length,0);
   backend=await attach();position=0;paused=true;stalled=false;
   const source=p.state.sourceId;retired.stale();await idle();assert.equal(p.state.sourceId,source);assert.equal(p.state.error,null);
  }else if(kind==='invalid-seek'){assert.throws(()=>p.seek(-1),error=>error.code==='INVALID_ARGUMENT');}
  await idle();check();
 };
 try{
  for(let round=0;round<rounds;round++){
   // Shuffle complete rounds, rather than relying on lucky random coverage.
   const actions=['play','pause','rate','volume','failed-volume','seek','advance','buffer','track','latest-seeks-pause','close-reopen','invalid-seek'];
   for(let i=actions.length-1;i>0;i--){const j=next()%(i+1);[actions[i],actions[j]]=[actions[j],actions[i]];}
   for(const action of actions)await run(action);
  }
  // A final measurable interval makes a skipped physical rate effect visible.
  await run('pause');await pump(p.seek(1));position=1;
  await pump(p.setPlaybackRate(2));rate=2;stalled=false;backend.stall(false);
  await run('play');await advance(1);elapsed(1000);await idle();check();
  return [...coverage].sort();
 }catch(error){throw new Error(`Public media sequence seed=${seed}, recent=${JSON.stringify(history)}`,{cause:error});}
}
for(const seed of [7,42,2026])test(`seeded public media histories preserve an independent playback oracle: ${seed}`,async t=>{
 const coverage=await mixedHistory(t,seed);assert.equal(coverage.length,12);
});
test('mixed public sequence oracle detects a skipped physical rate effect',async t=>{
 await assert.rejects(mixedHistory(t,42,{rounds:2,mutation:'drop-rate'}),error=>error.cause?.code==='ERR_ASSERTION');
});

async function overlappingHistory(t,seed,clockMode,{mutation,rounds=3}={}){
 const timing=(_kind,delay,index)=>clockMode==='zero'?0:clockMode==='jitter'?[0,1,5,17,31][(Math.imul(index,17)+seed)%5]:delay;
 const {p,backend,pump,idle}=await fixture(t,'shaka-mse',mutation,timing);
 let bits=seed>>>0;const next=()=>{bits^=bits<<13;bits^=bits>>>17;bits^=bits<<5;return bits>>>0;},history=[];
 try{
  for(let round=0;round<rounds;round++){
   await pump(p.pause());await pump(p.seek(1));await pump(p.setPlaybackRate(1));
   const entries=[],actions=Array.from({length:4},()=>['play','pause','seek','rate','volume','track']).flat();
   for(let i=actions.length-1;i>0;i--){const j=next()%(i+1);[actions[i],actions[j]]=[actions[j],actions[i]];}
   let playing=false,rate=1,volume=p.state.volume,track,lastSeek;
   for(const action of actions){
    let work,value;
    if(action==='play'||action==='pause'){playing=action==='play';work=p[action]();}
    if(action==='seek'){value=2+next()%8;lastSeek=entries.length;work=p.seek(value,{policy:'latest'});}
    if(action==='rate'){value=[.5,1,1.5,2][next()%4];rate=value;work=p.setPlaybackRate(value);}
    if(action==='volume'){value=(next()%11)/10;volume=value;work=p.setVolume(value);}
    if(action==='track'){value=String(1+next()%2);track=value;work=p.selectTrack('audio',value);}
    // Observe rejection immediately; keep all commands pending together. Drain
    // microtasks without advancing time to vary active versus queued cancellation.
    entries.push({action,value,result:Promise.resolve(work).then(()=>({ok:true}),error=>({ok:false,code:error.code}))});history.push({round,action,value});await drain();
   }
   const results=await pump(Promise.all(entries.map(entry=>entry.result)));await idle();
   for(let i=0;i<entries.length;i++)assert.deepEqual(results[i],entries[i].action==='seek'&&i!==lastSeek?{ok:false,code:'ABORTED'}:{ok:true},`outcome ${i}`);
   assert.equal(p.state.playbackIntent,playing?'play':'pause');assert.equal(backend.properties.get('pause'),!playing,'physical pause must match final intent');
   assert.equal(p.state.playbackRate,rate);assert.equal(backend.properties.get('speed'),rate);
   assert.equal(p.state.volume,volume);assert.equal(backend.properties.get('volume'),volume*100);
   assert.equal(backend.properties.get('aid'),track);assert.equal(p.state.audioTracks.filter(item=>item.selected).length,1);
   const target=entries[lastSeek].value;assert.ok(p.state.currentTime>=target&&p.state.currentTime<=20);near(p.state.currentTime,backend.properties.get('time-pos'));
   assert.equal(p.control.operations.entries.length,0);assert.equal(p.control.transport.pending,null);assert.equal(p.control.trackConfirmation.pending,null);assert.equal(p.control.settingsTransactions.pending,null);assert.equal(p.control.playback.seeks.length,0);assert.equal(p.control.playback.plays.length,0);
  }
  await pump(p.play());await pump(p.pause());await idle();assert.equal(backend.properties.get('pause'),true,'settled Play followed by Pause must stop physical playback');
 }catch(error){throw new Error(`Overlapping public sequence seed=${seed} clock=${clockMode}, history=${JSON.stringify(history)}`,{cause:error});}
}
for(const clockMode of ['normal','zero','jitter'])for(const seed of [11,37,2027])test(`overlapping public commands retain final intent and values: ${clockMode}/${seed}`,async t=>{
 await overlappingHistory(t,seed,clockMode);
});
test('overlapping public oracle detects an ignored physical pause',async t=>{
 await assert.rejects(overlappingHistory(t,37,'jitter',{mutation:'drop-pause',rounds:1}),error=>error.cause?.code==='ERR_ASSERTION');
});
for(const cancelAt of [0,1,5,29,30])test(`close at ${cancelAt}ms retires an overlapping control burst before reopen`,async t=>{
 const {p,backend,pump,step,idle,attach}=await fixture(t,'shaka-mse');
 const capture=promise=>promise.then(()=>({ok:true}),error=>({ok:false,code:error.code}));
 const works=[capture(p.play()),capture(p.seek(10,{policy:'latest'})),capture(p.setVolume(.3)),capture(p.setPlaybackRate(2)),capture(p.selectTrack('audio','2')),capture(p.seek(7,{policy:'latest'}))];
 await drain();await step(cancelAt);const count=backend.calls.filter(call=>call!=='destroy').length;
 await pump(p.close());const outcomes=await pump(Promise.all(works));await idle();
 assert.ok(outcomes.every(result=>result.ok||result.code==='ABORTED'));assert.equal(p.state.sourceId,null);assert.equal(p.control.resources.resources.length,0);
 assert.equal(backend.calls.filter(call=>call!=='destroy').length,count,'retired queue started new physical work');
 const replacement=await attach(),source=p.state.sourceId;backend.stale();await pump(p.play());await idle();
 assert.equal(p.state.sourceId,source);assert.equal(p.state.error,null);assert.equal(replacement.properties.get('pause'),false);assert.equal(p.control.transport.pending,null);
});
