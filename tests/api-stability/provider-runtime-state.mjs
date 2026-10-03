// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createProviderRuntime,admitRuntimeLoad,observeRuntimeManifest,acceptRuntimeDeployment,runtimeAssetPath,runtimeAssetOwner,runtimeHasOffer,admitRuntimeRequest,completeRuntimeRequest,retireProviderRuntime,closeProviderRuntime,captureRuntimeProbe,codecProfile,selectCodecInspector,selectCodecPreparation,selectAudioRepair,updateCodecSource,storedCodecPreparation,runtimeCompositionEvidence,requiredRuntimeAssets} from '../../web/generated/internal/machine/provider-runtime.js';
const root='https://runtime.example/';
const asset={id:'shared',path:'web/engine-mpv/player.wasm',url:root+'web/engine-mpv/player.wasm'};
const provider={id:'owner',implementationIdentity:'build:1',manifestMatches:true,assets:['shared'],profiles:['packet-copy']};
const ready=()=>acceptRuntimeDeployment(admitRuntimeLoad(createProviderRuntime({owner:'build:1'}),0).state,[provider],[asset]).state;
test('manifest admission reserves one lifetime and enforces non-resetting deadline and byte bound',()=>{
 const initial=createProviderRuntime({owner:'build:1'}),admission=admitRuntimeLoad(initial,5);let state=admission.state;
 assert.equal(admission.effect,'start');assert.equal(admitRuntimeLoad(state,99).effect,'join');assert.equal(state.deadline,15005);
 state=observeRuntimeManifest(state,{kind:'bytes',bytes:1024*1024}).state;
 assert.equal(observeRuntimeManifest(state,{kind:'bytes',bytes:1}).effect,'overflow');assert.equal(state.manifestBytes,1024*1024);
 assert.equal(observeRuntimeManifest(state,{kind:'deadline',now:15004}).effect,'ignore');state=observeRuntimeManifest(state,{kind:'deadline',now:15005}).state;
 assert.equal(acceptRuntimeDeployment(state,[provider],[asset]).accepted,false);assert.equal(admitRuntimeLoad(state,15006).effect,'join');assert.equal(initial.phase,'idle');
});
test('manifest observations and reviewed registry must independently agree before qualification',()=>{
 for(const [qualified,matches,expected]of [['build:1',true,true],['build:other',true,false],['build:1',false,false]]){
  const state=acceptRuntimeDeployment(admitRuntimeLoad(createProviderRuntime({owner:qualified}),0).state,[{...provider,manifestMatches:matches}],[asset]).state;
  assert.equal(runtimeHasOffer(state,'owner','packet-copy'),expected);assert.equal(runtimeAssetOwner(state,asset.url).kind==='ready',expected);
 }
});
test('shared artifact aliases preserve explicit legacy precedence and reject unrelated aliases',()=>{
 const path='web/engine-hybrid/player.wasm';let state=ready();assert.equal(runtimeAssetPath(state,path,root+path),asset.path);
 assert.equal(runtimeAssetPath(state,'web/engine-remux/remux.wasm',root+'web/engine-remux/remux.wasm'),'web/engine-remux/remux.wasm');
 state=acceptRuntimeDeployment(admitRuntimeLoad(createProviderRuntime({owner:'build:1'}),0).state,[provider],[asset,{id:'legacy',path,url:root+path}]).state;
 assert.equal(runtimeAssetPath(state,path,root+path),path);
 assert.equal(runtimeAssetOwner(state,root+path).kind,'unqualified');
});
test('byte/module reservations are independent, failure stays shared, and retired completions cannot restore authority',()=>{
 let state=ready();state=admitRuntimeRequest(state,'bytes',asset.path).state;assert.equal(admitRuntimeRequest(state,'bytes',asset.path).effect,'join');
 state=admitRuntimeRequest(state,'module',asset.path).state;assert.equal(state.requests.length,2);
 state=completeRuntimeRequest(state,'bytes',asset.path,false);assert.equal(admitRuntimeRequest(state,'bytes',asset.path).effect,'join');
 state=retireProviderRuntime(state);assert.equal(completeRuntimeRequest(state,'module',asset.path,true),state);assert.equal(runtimeHasOffer(state,'owner','packet-copy'),false);
 const closed=closeProviderRuntime(state);assert.deepEqual(closed.requests,[]);assert.deepEqual(closed.assets,[]);assert.equal(admitRuntimeRequest(closed,'bytes',asset.path).effect,'retired');
});
test('deployment and qualification inputs are detached without freezing caller objects',()=>{
 const qualified={owner:'build:1'},providers=[{...provider,assets:['shared'],profiles:['packet-copy']}],assets=[{...asset}];
 const state=acceptRuntimeDeployment(admitRuntimeLoad(createProviderRuntime(qualified),0).state,providers,assets).state;
 qualified.owner='other';providers[0].profiles.length=0;providers[0].assets.length=0;assets[0].url='changed';assert.equal(runtimeHasOffer(state,'owner','packet-copy'),true);assert.equal(runtimeAssetOwner(state,asset.url).kind,'ready');assert.equal(Object.isFrozen(providers[0]),false);
});
const probe={format:'matroska',tracks:[{id:'v',index:0,type:'video',codec:'hevc'},{id:'a',index:1,type:'audio',codec:'truehd',sampleRate:48000,channels:8}]};
const available=['truehd-mlp','dts-hd','ac3-eac3'].map(profile=>({profile,offered:true,deployed:true}));
test('codec selection preserves exact full-file profile bounds and selected audio identity',()=>{
 const input={local:true,file:true,runtime:'asyncify',probe,aid:'auto'},expected={...codecProfile('truehd-mlp','asyncify'),audioIndex:1,videoIndex:0};
 assert.deepEqual(selectCodecPreparation(input,available),expected);assert.equal(selectCodecPreparation({...input,runtime:'pthread'},available),undefined);
 for(const changed of [{codec:'mlp'},{sampleRate:96000},{channels:1},{codec:'dts',channels:6}])assert.equal(selectCodecPreparation({...input,probe:{...probe,tracks:[probe.tracks[0],{...probe.tracks[1],...changed}]}},available),undefined);
 const tracks=[...probe.tracks,{id:'b',index:2,type:'audio',codec:'aac',sampleRate:48000,channels:2}];assert.equal(selectCodecPreparation({...input,probe:{...probe,tracks},aid:'b'},available),undefined);
 assert.deepEqual(selectCodecPreparation({...input,probe:{...probe,tracks},aid:'a'},available),expected);assert.equal(selectCodecPreparation(input,available.map(item=>({...item,deployed:false}))),undefined);
 assert.equal(selectCodecInspector('jspi',available).providerId,'ffmpeg-truehd-mlp-jspi');
});
test('bounded component repair is stricter than full-file preparation and captured tracks are isolated',()=>{
 const input={local:true,blob:true,size:64*1024*1024,probe:{...probe,tracks:[{...probe.tracks[0],codec:'h264'},probe.tracks[1]]},container:true,truehd:true,dts:true,flac:true};
 assert.deepEqual(selectAudioRepair(input),{codec:'truehd',channels:8});assert.equal(selectAudioRepair({...input,size:input.size+1}),undefined);assert.equal(selectAudioRepair({...input,probe}),undefined);assert.equal(selectAudioRepair({...input,flac:false}),undefined);
 const original=structuredClone(probe),captured=captureRuntimeProbe(original);original.tracks[1].channels=1;assert.equal(captured.tracks[1].channels,8);assert.equal(Object.isFrozen(original.tracks[0]),false);
});
test('recipe evidence binds reviewed identities and required runtime assets preserve backend closure',()=>{
 const state=ready(),recipe={id:'recipe',bindings:[{id:'reviewed',providerIds:['owner']},{id:'missing',providerIds:['other']}]};
 assert.deepEqual(runtimeCompositionEvidence(state,recipe,'source:1'),[{recipeId:'recipe',bindingId:'reviewed',scopeKey:'source:1',implementationIdentities:{owner:'build:1'}}]);
 assert.deepEqual(requiredRuntimeAssets({runtime:'asyncify',prepared:false,adaptation:false,selectedAudio:false,backend:'PrivateSoftwarePlayer',hybrid:false}),['web/engine-mpv-playback-asyncify/player.wasm','web/engine-mpv-playback-asyncify/manifest.json','web/engine-mpv-playback-asyncify/player.mjs','fixtures/DejaVuSans.ttf']);
});
test('varied request/reply/failure/retirement histories replay with no post-retirement admission',()=>{
 for(let stop=0;stop<5;stop++){
  const run=()=>{let state=ready();const history=[];const events=[s=>admitRuntimeRequest(s,'bytes',asset.path).state,s=>admitRuntimeRequest(s,'module',asset.path).state,s=>completeRuntimeRequest(s,'bytes',asset.path,true),s=>completeRuntimeRequest(s,'module',asset.path,false),s=>admitRuntimeRequest(s,'bytes','other').state];for(let i=0;i<events.length;i++){if(i===stop)state=retireProviderRuntime(state);state=events[i](state);history.push(state);}return history;};
  assert.deepEqual(run(),run());assert.equal(run().at(-1).phase,'retiring');
 }
});

test('source hint clearing retains only the detached probe for later explicit reselection',()=>{
 const input={local:true,file:true,runtime:'asyncify',probe,aid:'auto'};
 const first=updateCodecSource(undefined,input,available);assert.equal(first.hint.audioIndex,1);
 const cleared=updateCodecSource(first,{...input,aid:'no'},available);assert.equal(cleared.hint,null);assert.equal(cleared.probe,first.probe);
 assert.equal(storedCodecPreparation(first,'jspi',true),undefined);assert.equal(storedCodecPreparation(first,'asyncify',false),undefined);
 assert.equal(storedCodecPreparation(first,'asyncify',true),first.hint);assert.equal(first.hint.audioIndex,1);
});

test('runtime request history admits only canonical declared qualified asset paths',()=>{
 const state=ready();for(let i=0;i<256;i++){const denied=admitRuntimeRequest(state,'bytes','unknown-'+i);assert.equal(denied.effect,'unavailable');assert.equal(denied.state,state);}
 assert.equal(runtimeAssetPath(state,'./'+asset.path,asset.url),asset.path);
 assert.equal(runtimeAssetPath(state,asset.url,asset.url),asset.path);
 const disabled={...state,qualified:{}};assert.equal(admitRuntimeRequest(disabled,'module',asset.path).effect,'unavailable');
});
