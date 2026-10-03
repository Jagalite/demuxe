// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {Player} from '../../web/generated/unified-player.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {deferred} from './virtual-effects.mjs';

/** Real route/source transactions; only deployment, probe, admission and physical
 * backend boundaries are synthetic. The trace is bounded and printed on failure. */
function routeFixture(t,{plans=['native-direct','hybrid','software'],hook}={}){
 const p=unitPlayer(),sessions=[],trace=[],events=[],background=[];let serial=0;
 p.publish=Player.prototype.publish.bind(p);p.publish();
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),doc=p.host.ownerDocument;
 doc.createElement=()=>({canPlayType:()=> 'probably'});globalThis.document=doc;
 t.after(async()=>{try{await p.destroy();await Promise.allSettled(background);await p.queue;
  for(const session of sessions){assert.equal(session.destroyed,1,`destroy count for session ${session.id}: ${JSON.stringify(trace)}`);assert.equal(session.removed,1,`surface removal count for session ${session.id}`);}
  assert.equal(p.control.resources.resources.length,0);assert.equal(p.control.source.candidate,null);assert.equal(p.control.routing.discovery.current,null);assert.equal(p.control.routing.inspection.work,null);assert.equal(p.control.operations.entries.length,0);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}});
 const log=(stage,session,value)=>{const entry={step:serial++,stage,session:session?.id??null,plan:session?.plan??null,value:value??null};trace.push(entry);if(trace.length>256)trace.shift();return entry;};
 const effect=async(stage,session,value)=>{log(stage,session,value);await hook?.({stage,session,value,p,trace,background});};
 const probe={format:'matroska',duration:120,tracks:[{id:'1',index:0,type:'video',codec:'h264',width:640,height:360,default:true},{id:'2',index:1,type:'audio',codec:'aac',sampleRate:48000,channels:2,default:true}]};
 Object.defineProperty(p,'canInspectFFmpeg',{get:()=>true});
 p.inspectWithFFmpeg=async()=>{await effect('probe');return structuredClone(probe);};
 p.checkInspectedAssets=async()=>effect('assets');p.inspectForQualifiedWebGPU=async()=>effect('gpu-probe');
 p.admissible=(_source,_settings,_attachments,_tracks,_reason,_automatic,requirements={})=>plans.map(id=>({id,mode:id.startsWith('native')?'native':id,eligible:!(id==='native-direct'&&requirements.nativeRemux==='always'),reason:id==='native-direct'&&requirements.nativeRemux==='always'?'Original-copy route excluded by remux requirement':undefined}));
 p.create=async(mode,_aid,_adaptation,_force,plan)=>{
  p.assertOperation();const id=p.control.source.candidate.session,backend=new EventTarget(),surface={style:{display:'none'},remove(){session.removed++;log('surface.remove',session);}},session={id,plan,backend,surface,destroyed:0,removed:0};
  const properties=new Map([['duration',120],['time-pos',0],['pause',true],['seekable',true],['native-seekable',[{start:0,end:120}]],['track-list',[{id:1,type:'video',codec:'h264',selected:true},{id:2,type:'audio',codec:'aac',selected:true}]]]);
  Object.assign(backend,{properties,diagnostics:{plan:mode==='native'?'direct':mode,rendered:1,decoder:mode==='hybrid'?'webcodecs':'software',presentation:{position:0},presentedPosition:0},
   command:async(...args)=>effect('command',session,args),gain:async value=>effect('gain',session,value),volume:async value=>effect('volume',session,value),rate:async value=>effect('rate',session,value),selectTrack:async(...args)=>effect('track',session,args),subtitleVisible:async value=>effect('subtitles',session,value),
   open:async()=>effect('open',session),openRemote:async()=>effect('open',session),
   seek:async value=>{await effect('seek',session,value);properties.set('time-pos',value);backend.diagnostics.presentation.position=value;backend.diagnostics.presentedPosition=value;},
   play:async()=>{await effect('play',session);properties.set('pause',false);},pause:async()=>{await effect('pause',session);properties.set('pause',true);},
   verifyStartup:async()=>effect('verify',session),verifyOutput:async()=>effect('output',session),confirmSeek:async()=>{await effect('confirm',session);return true;},
   destroy:async()=>{session.destroyed++;await effect('destroy',session);},startupEvidence:()=>({metadata:true,prepared:true,outputVerified:properties.get('pause')===false}),
  });
  Object.defineProperty(backend,'ready',{get:()=>effect('ready',session)});
  sessions.push(session);log('create',session);await p.registerSession(session,id);p.observeBackend(session,id);await hook?.({stage:'created',session,p,trace,background});return session;
 };
 for(const kind of ['selectionchange','modechange','mpv','error'])p.addEventListener(kind,event=>{events.push({kind,detail:event.detail});if(events.length>256)events.shift();});
 const run=async(name,work)=>{try{await work();}catch(error){throw new Error(`route scenario ${name} failed: ${error?.message??String(error)}\n${JSON.stringify({trace,events},null,2)}`,{cause:error});}};
 const input=()=>new ArrayBuffer(8);
 const quiescent=()=>{assert.equal(p.control.source.candidate,null);assert.equal(p.control.routing.discovery.current,null);assert.equal(p.control.routing.inspection.work,null);assert.equal(p.control.operations.entries.length,0);};
 return {p,sessions,trace,events,background,input,run,quiescent};
}

test('real discovery rejects failed first candidate and accepts the next with one physical owner',async t=>{
 const f=routeFixture(t,{hook:({stage,session})=>{if(stage==='open'&&session.plan==='native-direct')throw new PlayerError('DECODE_FAILED','fixture native rejection');}});
 await f.run('first-candidate-failure',async()=>{await f.p.open(f.input());await f.p.queue;f.quiescent();
  assert.deepEqual(f.sessions.map(s=>s.plan),['native-direct','hybrid']);assert.equal(f.p.mode,'hybrid');assert.equal(f.p.current,f.sessions[1]);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[0].removed,1);assert.equal(f.sessions[1].destroyed,0);
  assert.deepEqual(f.events.filter(e=>e.kind==='selectionchange'&&e.detail.mode!=='probe').map(e=>e.detail.outcome),['failed','selected']);
 });
});

test('failed pinned replacement restores the original source, position and playing intent',async t=>{
 let rejectHybrid=false;const f=routeFixture(t,{hook:({stage,session})=>{if(stage==='open'&&session.plan==='hybrid'&&rejectHybrid)throw new PlayerError('DECODE_FAILED','fixture replacement rejection');}});
 await f.run('pinned-rollback',async()=>{await f.p.open(f.input());await f.p.play();await f.p.seek(23);const accepted=f.p.current,source=f.p.source,serial=f.p.sourceSerial;rejectHybrid=true;
  await assert.rejects(f.p.setMode('hybrid'),/fixture replacement rejection/);await f.p.queue;f.quiescent();
  assert.equal(f.p.current,accepted);assert.equal(f.p.source,source);assert.equal(f.p.sourceSerial,serial);assert.equal(f.p.mode,'native');assert.equal(f.p.automaticSelection,true);assert.equal(accepted.backend.properties.get('time-pos'),23);assert.equal(accepted.backend.properties.get('pause'),false);assert.equal(accepted.destroyed,0);assert.equal(f.sessions[1].destroyed,1);
 });
});

for(const stage of ['created','ready','gain','volume','rate','subtitles','open','seek','verify'])for(const interruption of ['abort','close'])test(`real candidate ${stage} completion after ${interruption} cannot accept or try a successor`,async t=>{
 const entered=deferred(),completion=deferred(),caller=new AbortController();let held=false;
 const f=routeFixture(t,{hook:event=>{if(!held&&event.stage===stage&&event.session?.id===1){held=true;entered.resolve();return completion.promise;}}});
 await f.run(`${stage}/${interruption}`,async()=>{
  const opening=f.p.open(f.input(),{startTime:10,signal:caller.signal}),rejected=assert.rejects(opening,error=>error.code==='ABORTED');await entered.promise;
  const closing=interruption==='close'?f.p.close():undefined;if(interruption==='abort')caller.abort();
  completion.resolve();await rejected;await closing;await f.p.queue;f.quiescent();
  assert.equal(f.sessions.length,1);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[0].removed,1);assert.equal(f.p.current,undefined);assert.equal(f.p.source,undefined);
  assert.equal(f.events.some(e=>e.kind==='mpv'&&e.detail.event==='file-loaded'||e.kind==='modechange'&&e.detail.phase==='ready'),false);
  assert.equal(f.p.control.resources.resources.length,0);
 });
});

const controlSchedules=[
 ['mode','seek','volume','play','pause'],['play','volume','mode','pause','seek'],['pause','mode','seek','volume','play'],
 ['seek','pause','volume','play','mode'],['volume','seek','play','mode','pause'],['mode','pause','play','seek','volume'],
];
for(const schedule of controlSchedules)test(`acceptance callback queues real controls: ${schedule.join(' → ')}`,async t=>{
 const f=routeFixture(t),queued=[];let admitted=false;
 f.p.addEventListener('mpv',event=>{if(admitted||event.detail.event!=='file-loaded')return;admitted=true;
  for(const action of schedule){const promise=action==='mode'?f.p.setMode('hybrid'):action==='seek'?f.p.seek(37,{policy:'latest'}):action==='volume'?f.p.volume(24):action==='play'?f.p.play():f.p.pause();promise.catch(()=>{});queued.push(promise);}
 });
 await f.run(`accept-controls:${schedule.join(',')}`,async()=>{await f.p.open(f.input());await Promise.all(queued);await f.p.queue;f.quiescent();
  assert.equal(f.sessions.length,2);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.p.mode,'hybrid');assert.equal(f.p.automaticSelection,false);assert.equal(f.p.settings.volume,24);
  const paused=schedule.lastIndexOf('pause')>schedule.lastIndexOf('play');assert.equal(f.p.settings.pause,paused);assert.equal(f.p.current.backend.properties.get('pause'),paused);assert.equal(f.p.current.backend.properties.get('time-pos'),37);
  assert.deepEqual(f.events.filter(e=>e.kind==='modechange'&&e.detail.phase==='ready').map(e=>e.detail.mode),['native','hybrid']);
 });
});

for(const kind of ['property-change','file-loaded'])test(`close from accepted ${kind} stops real discovery and cleans accepted session`,async t=>{
 const f=routeFixture(t);let closing;
 f.p.addEventListener('mpv',event=>{if(event.detail.event===kind)closing??=f.p.close();});
 await f.run(`accepted-close:${kind}`,async()=>{await assert.rejects(f.p.open(f.input()),error=>error.code==='ABORTED');await closing;await f.p.queue;f.quiescent();
  assert.equal(f.sessions.length,1);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[0].removed,1);assert.equal(f.p.current,undefined);assert.equal(f.p.control.resources.resources.length,0);
  assert.equal(f.events.some(e=>e.kind==='modechange'&&e.detail.phase==='ready'),false);
  if(kind==='property-change')assert.equal(f.events.some(e=>e.kind==='mpv'&&e.detail.event==='file-loaded'),false);
 });
});

for(const action of ['play','seek'])for(const paused of [false,true])test(`public ${action} failure executes real automatic fallback with prior pause=${paused}`,async t=>{
 let armed=false;const f=routeFixture(t,{hook:({stage,session,value})=>{if(armed&&session?.id===1&&(action==='play'?stage==='output':stage==='seek'&&value===56)){armed=false;throw new PlayerError('DECODE_FAILED','fixture active route failure');}}});
 await f.run(`active-fallback:${action}/${paused}`,async()=>{
  await f.p.open(f.input());if(!paused)await f.p.play();const source=f.p.source,serial=f.p.sourceSerial;armed=true;
  if(action==='play')await f.p.play();else await f.p.seek(56);
  await f.p.queue;f.quiescent();assert.equal(f.p.mode,'hybrid');assert.equal(f.p.source,source);assert.equal(f.p.sourceSerial,serial);assert.equal(f.sessions.length,2);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[1].destroyed,0);
  assert.equal(f.p.settings.pause,action==='play'?false:paused);assert.equal(f.p.current.backend.properties.get('pause'),action==='play'?false:paused);
  assert.equal(f.p.current.backend.properties.get('time-pos'),action==='play'?0:56);
 });
});

for(const cancel of [false,true])test(`real fallback ${cancel?'cancellation during':'waits for'} failed candidate cleanup`,async t=>{
 const cleaning=deferred(),release=deferred();const f=routeFixture(t,{hook:({stage,session})=>{
  if(session?.id===1&&stage==='open')throw new PlayerError('DECODE_FAILED','fixture first candidate');
  if(session?.id===1&&stage==='destroy'){cleaning.resolve();return release.promise;}
 }});
 await f.run(`cleanup-before-fallback:${cancel}`,async()=>{
  const opening=f.p.open(f.input());opening.catch(()=>{});await cleaning.promise;assert.equal(f.sessions.length,1);assert.equal(f.p.current,undefined);
  const closing=cancel?f.p.close():undefined;release.resolve();
  if(cancel){await assert.rejects(opening,error=>error.code==='ABORTED');await closing;assert.equal(f.sessions.length,1);assert.equal(f.p.current,undefined);}
  else {await opening;assert.equal(f.sessions.length,2);assert.equal(f.p.mode,'hybrid');assert.ok(f.trace.findIndex(e=>e.stage==='surface.remove'&&e.session===1)<f.trace.findIndex(e=>e.stage==='create'&&e.session===2));}
  await f.p.queue;f.quiescent();assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[0].removed,1);
 });
});

test('automatic selection from pinned Hybrid runs real preferred-route handoff and preserves controls',async t=>{
 const f=routeFixture(t);
 await f.run('automatic-after-pinned',async()=>{await f.p.open(f.input());await f.p.setMode('hybrid');await f.p.volume(31);await f.p.play();await f.p.seek(19);const source=f.p.source,serial=f.p.sourceSerial;
  await f.p.setAutomaticSelection(true);await f.p.queue;f.quiescent();
  assert.equal(f.p.mode,'native');assert.equal(f.p.automaticSelection,true);assert.equal(f.p.source,source);assert.equal(f.p.sourceSerial,serial);assert.equal(f.p.settings.volume,31);assert.equal(f.p.settings.pause,false);assert.equal(f.p.current.backend.properties.get('time-pos'),19);
  assert.deepEqual(f.sessions.map(s=>s.plan),['native-direct','hybrid','native-direct']);assert.deepEqual(f.sessions.map(s=>s.destroyed),[1,1,0]);
 });
});

test('accepted callback Close then Open cannot let old discovery finish the replacement source',async t=>{
 const f=routeFixture(t);let closing,reopening;
 f.p.addEventListener('mpv',event=>{if(event.detail.event==='file-loaded'&&!reopening){closing=f.p.close();reopening=f.p.open(new ArrayBuffer(16));reopening.catch(()=>{});}});
 await f.run('accepted-close-reopen',async()=>{
  await assert.rejects(f.p.open(f.input()),error=>error.code==='ABORTED');await closing;await reopening;await f.p.queue;f.quiescent();
  assert.equal(f.sessions.length,2);assert.equal(f.sessions[0].destroyed,1);assert.equal(f.sessions[1].destroyed,0);assert.equal(f.p.current,f.sessions[1]);assert.equal(f.p.sourceSerial,2);assert.equal(f.p.source.file.byteLength,16);
  assert.equal(f.events.filter(e=>e.kind==='modechange'&&e.detail.phase==='ready').length,1);
 });
});

for(const notification of ['property-change','file-loaded','ready'])test(`caller abort from accepted ${notification} cannot roll back committed source`,async t=>{
 const f=routeFixture(t),caller=new AbortController();let aborted=false;
 const abort=event=>{if((event.type==='mpv'&&event.detail.event===notification)||(event.type==='modechange'&&event.detail.phase===notification)){aborted=true;caller.abort();}};
 f.p.addEventListener('mpv',abort);f.p.addEventListener('modechange',abort);
 await f.run(`abort-after-accept:${notification}`,async()=>{
  await f.p.open(f.input(),{signal:caller.signal});await f.p.volume(63);await f.p.queue;f.quiescent();
  assert.equal(aborted,true);assert.equal(f.sessions.length,1);assert.equal(f.p.current,f.sessions[0]);assert.equal(f.sessions[0].destroyed,0);assert.equal(f.p.settings.volume,63);
  assert.equal(f.events.filter(e=>e.kind==='modechange'&&e.detail.phase==='ready').length,1);
 });
});
