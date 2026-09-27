// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {PreviewController} from '../web/generated/preview/controller.js';
import {createPlayerPreview} from '../web/generated/preview/player-preview.js';

const frame=time=>({time,width:8,height:8,image:{blob:new Blob(['image'])},path:'custom'});
const provider={id:'custom',priority:1,canHandle:()=>true,getFrame:async r=>frame(r.time)};

test('facade exposes consumer controls, immutable diagnostics and bound methods',async()=>{
 const controller=new PreviewController([provider],{debounceMs:0});
 const api=createPlayerPreview(controller);
 try{
  assert.ok(Object.isFrozen(api));
  for(const name of ['setSourceIdentity','setDuration','setSuspended','drain','destroy'])assert.equal(name in api,false);
  assert.throws(()=>{api.getFrame=()=>{};},TypeError);
  const {getFrame}=api;
  assert.equal((await getFrame({time:1})).path,'custom');
  const snapshot=api.diagnostics;assert.ok(Object.isFrozen(snapshot));
  assert.throws(()=>{snapshot.cacheEntries=100;},TypeError);
  api.clear();assert.equal(api.diagnostics.cacheEntries,0);assert.equal(snapshot.cacheEntries,1);
  api.enabled=false;assert.equal(await getFrame({time:1}),null);
  api.enabled=true;assert.equal(controller.enabled,true);
  assert.throws(()=>{api.enabled='yes';},TypeError);
  api.setProviders([]);assert.equal(await getFrame({time:1}),null);
  const remove=api.addProvider(provider);
  let updates=0;await api.request({time:2,onUpdate:()=>updates++});assert.equal(updates,1);
  // Prefetch deliberately declines while the preceding provider is retiring.
  await new Promise(resolve=>setImmediate(resolve));
  await api.prefetch({time:3});assert.equal((await getFrame({time:3})).cache,'hit');
  remove();remove();assert.equal(await getFrame({time:1}),null);
  api.addProvider({...provider,getFrame:async()=>{throw Error('private failure');}});
  await getFrame({time:4});assert.ok(Object.isFrozen(api.diagnostics.lastFailure));
 }finally{await controller.destroy();}
});

test('owner source replacement suppresses stale provider publication through facade',async()=>{
 let started,finish,context;
 const ready=new Promise(resolve=>{started=resolve;});
 const controller=new PreviewController([{...provider,getFrame:r=>{context=r;started();return new Promise(resolve=>{finish=resolve;});}}],{debounceMs:0});
 const api=createPlayerPreview(controller);let updates=0;
 const pending=assert.rejects(api.request({time:1,onUpdate:()=>updates++}),{name:'AbortError'});
 await ready;controller.setSourceIdentity('replacement');await pending;
 context.publish(frame(1));finish(frame(1));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(updates,0);assert.equal(api.diagnostics.cacheEntries,0);
 assert.equal(api.diagnostics.sourceId,'replacement');
 await controller.destroy();await assert.rejects(api.getFrame({time:1}),{name:'AbortError'});
});

test('public declarations restrict PlayerPreview while retaining standalone ownership',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'demuxe-preview-types-'));
 try{
  const entry=JSON.stringify(resolve('web/generated/index.js'));
  const file=join(directory,'consumer.ts');
  await writeFile(file,`import {Player,PreviewController,type PlayerPreview} from ${entry};
declare const player:Player;
player.addEventListener('modechange',event=>{if(event.detail.phase==='failed')console.log(event.detail.rolledBack);});
player.addEventListener('selectionchange',event=>console.log(event.detail.outcome));
// @ts-expect-error candidate phases are not state snapshots
player.addEventListener('modechange',event=>console.log(event.detail.currentTime));
player.open(new Blob(),{startTime:1});player.setSubtitleDelay(.2);player.setAudioDelay(.1);player.setSubtitleStyle({fontSize:30});
player.setQuality({mode:'auto',maxHeight:720});player.seekToLive();player.setLoop({start:1,end:2});player.setPlaybackRange(null);player.snapshot();player.stepFrame();
player.getPlaybackExplanation().admission.forEach(decision=>console.log(decision.code));
const legacySubtitle:Promise<void>=player.addSubtitle(new File([],'a.srt'));
player.attachTextTrack({src:'/captions.vtt',label:'Caption'}).then(handle=>player.removeAttachment(handle));
player.presentation.requestFullscreen();

const preview:PlayerPreview=player.preview;
preview.enabled=false;
preview.getFrame({time:1,signal:new AbortController().signal});
preview.request({time:1,onUpdate:frame=>console.log(frame.sourceId)});
preview.prefetch({time:1});preview.clear();preview.setProviders([]);
const remove=preview.addProvider({id:'custom',priority:1,canHandle:()=>true,getFrame:async()=>null});remove();
// @ts-expect-error owner control
preview.setSourceIdentity('wrong');
// @ts-expect-error owner control
preview.setDuration(10);
// @ts-expect-error owner control
preview.setSuspended(false);
// @ts-expect-error owner control
preview.drain();
// @ts-expect-error owner control
preview.destroy();
// @ts-expect-error facade identity is read-only
player.preview=preview;
// @ts-expect-error method is read-only
preview.clear=()=>{};
// @ts-expect-error diagnostics are read-only
preview.diagnostics.cacheEntries=1;
if(preview.diagnostics.lastFailure){
// @ts-expect-error nested diagnostics are read-only
preview.diagnostics.lastFailure.kind='changed';
}
const independent=new PreviewController();independent.setSourceIdentity('owned');independent.setDuration(10);independent.setSuspended(false);independent.drain();independent.destroy();
`);
  execFileSync(process.execPath,['node_modules/typescript/lib/tsc.js','--noEmit','--strict','--target','ES2022','--module','ES2022','--moduleResolution','bundler',file],{stdio:'pipe'});
 }finally{await rm(directory,{recursive:true,force:true});}
});
