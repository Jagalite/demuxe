// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ProviderRuntime} from '../web/generated/internal/provider-runtime.js';
const wasm=Buffer.from([0,97,115,109,1,0,0,0]);
const hash=createHash('sha256').update(wasm).digest('hex');
const path='web/engine-remux/remux.wasm';
const identity='sha256:'+createHash('sha256').update(JSON.stringify({'runtime/web/engine-remux/remux.wasm':hash},null,2)+'\n').digest('hex');
const manifest=()=>({schema:1,providerContractVersion:1,revision:'one',assets:[{id:'remux',path,bytes:wasm.length,sha256:hash}],providers:[{id:'ffmpeg-file-preparation',implementationIdentity:identity,technology:'wasm',delivery:['optional-assets'],assetIds:['remux'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]}]});
test('qualified assets deduplicate compilation and never acquire on admission',async t=>{
 const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(manifest()):new Response(wasm);});
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'ffmpeg-file-preparation':identity});await runtime.load();
 assert.match(runtime.rejection('native-remux',{},'selected','jspi'),/runtime assets/);assert.equal(requests.length,1);
 const [a,b]=await Promise.all([runtime.module(path),runtime.module(path)]);assert.equal(a,b);assert.equal(requests.length,2);await runtime.destroy();await assert.rejects(runtime.bytes(path),e=>e.name==='AbortError');
});
test('a manifest cannot self-qualify a changed build',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json(manifest()));
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'ffmpeg-file-preparation':'reviewed-build'});await runtime.load();
 assert.equal(runtime.has(path),false);assert.equal(runtime.hasOffer('ffmpeg-file-preparation','packet-copy'),false);
 await assert.rejects(runtime.bytes(path),e=>e.code==='DEPLOYMENT_UNAVAILABLE');await runtime.destroy();
});
test('declared corrupt bytes are terminal, not deployment absence',async t=>{
 t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(manifest()):new Response(Buffer.alloc(wasm.length)));
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'ffmpeg-file-preparation':identity});
 await assert.rejects(runtime.module(path),e=>e.code==='ASSET_LOAD_FAILED');await runtime.destroy();
});

test('editing asset expectations cannot impersonate a qualified build identity',async t=>{
 const edited=manifest();edited.assets[0].sha256='0'.repeat(64);let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(edited);});
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'ffmpeg-file-preparation':identity});await runtime.load();
 assert.equal(runtime.has(path),false);await assert.rejects(runtime.bytes(path),e=>e.code==='DEPLOYMENT_UNAVAILABLE');assert.equal(calls,1);await runtime.destroy();
});

test('codec preparation keeps source and deployed profile bounds',async t=>{
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{});
 const offers=new Map([['ts-container','finite-clear-av'],['audio-truehd-mlp','48khz-integer'],['audio-dts-hd','ma-48khz-s32p'],['audio-flac','48khz-s24']]);
 t.mock.method(runtime,'hasOffer',(id,profile)=>offers.get(id)===profile);
 const source={kind:'local',file:new Blob([new Uint8Array(16)])};
 const probe={format:'matroska',duration:1,tracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'truehd',sampleRate:48000,channels:2}]};
 assert.deepEqual(runtime.audioRepairCandidate(source,probe),{codec:'truehd',channels:2});
 const audio=probe.tracks[1];
 for(const channels of [2,6])assert.deepEqual(runtime.audioRepairCandidate(source,{...probe,tracks:[probe.tracks[0],{...audio,codec:'mlp',channels}]}),{codec:'mlp',channels});
 for(const changed of [{codec:'mlp',channels:8},{codec:'dts',channels:6},{sampleRate:96000},{channels:1},{codec:'aac'}])assert.equal(runtime.audioRepairCandidate(source,{...probe,tracks:[probe.tracks[0],{...audio,...changed}]}),undefined);
 assert.deepEqual(runtime.audioRepairCandidate(source,{...probe,tracks:[probe.tracks[0],{...audio,codec:'dts',channels:8}]}),{codec:'dts-hd',channels:8});
 assert.equal(runtime.audioRepairCandidate({kind:'remote'},probe),undefined);
 assert.equal(runtime.audioRepairCandidate({...source,file:new Blob([new Uint8Array(64*1024*1024+1)])},probe),undefined);
 assert.equal(runtime.audioRepairCandidate(source,{...probe,tracks:[...probe.tracks,{id:'3',index:2,type:'sub',codec:'ass'}]}),undefined);
 assert.equal(runtime.audioRepairCandidate(source,{...probe,format:'mp4'}),undefined);
 assert.equal(runtime.audioRepairCandidate(source,{...probe,tracks:[{...probe.tracks[0],codec:'hevc'},audio]}),undefined);
 offers.delete('audio-flac');assert.equal(runtime.audioRepairCandidate(source,probe),undefined);
 await runtime.destroy();
});

test('full-file codec preparation is explicit, trusted and independent of the Blob budget',async t=>{
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{});
 let deployed=true;t.mock.method(runtime,'has',()=>deployed);t.mock.method(runtime,'hasOffer',(id,profile)=>deployed&&id==='ffmpeg-truehd-mlp-asyncify'&&['flac24','packet-copy'].includes(profile));
 const file=new File([new Uint8Array(65*1024*1024)],'movie.mkv'),source={kind:'local',file};
 const probe={format:'matroska',duration:120,tracks:[{id:'1',index:0,type:'video',codec:'hevc'},{id:'2',index:1,type:'audio',codec:'truehd',sampleRate:48000,channels:8}]};
 const expected={providerId:'ffmpeg-truehd-mlp-asyncify',folder:'web/providers/preparation/truehd-mlp-asyncify/',wasmPath:'web/providers/preparation/truehd-mlp-asyncify/engine-adaptation-asyncify/remux.wasm',runtime:'asyncify',audioIndex:1,videoIndex:0};
 assert.deepEqual(runtime.codecPreparation(source,probe,'asyncify'),expected);
 assert.deepEqual(runtime.preparation(file,'asyncify'),expected);assert.equal(runtime.preparation(file,'jspi'),undefined);
 assert.equal(runtime.codecPreparation(source,probe,'pthread'),undefined);assert.equal(runtime.codecPreparation(source,probe,'jspi'),undefined);
 assert.equal(runtime.codecPreparation({kind:'remote'},probe,'asyncify'),undefined);
 assert.equal(runtime.codecPreparation(source,{...probe,tracks:[probe.tracks[0],{...probe.tracks[1],codec:'mlp'}]},'asyncify'),undefined);
 assert.equal(runtime.codecPreparation(source,{...probe,tracks:[probe.tracks[0],{...probe.tracks[1],sampleRate:96000}]},'asyncify'),undefined);
 const multi={...probe,tracks:[...probe.tracks,{id:'3',index:2,type:'audio',codec:'aac',sampleRate:48000,channels:2}]};
 assert.deepEqual(runtime.codecPreparation(source,multi,'asyncify','2'),expected);
 assert.equal(runtime.preparation(file,'asyncify',2),undefined);
 assert.equal(runtime.codecPreparation(source,multi,'asyncify','3'),undefined);
 assert.equal(runtime.preparation(file,'asyncify'),undefined);
 assert.deepEqual(runtime.codecPreparation(source,multi,'asyncify','2'),expected);
 deployed=false;assert.equal(runtime.codecPreparation(source,probe,'asyncify'),undefined);assert.equal(runtime.preparation(file,'asyncify'),undefined);await runtime.destroy();
});

test('one qualified mpv artifact serves every legacy role with one fetch and compilation',async t=>{
 const shared='web/engine-mpv/player.wasm',id='sha256:'+createHash('sha256').update(JSON.stringify({['runtime/'+shared]:hash},null,2)+'\n').digest('hex');
 const data=manifest();data.assets=[{id:shared,path:shared,bytes:wasm.length,sha256:hash}];data.providers=[{...data.providers[0],id:'mpv-software',implementationIdentity:id,assetIds:[shared],offers:[{capability:'video.decode',version:1,profile:'software'}]}];
 // Retain a known valid capability; this test checks acquisition, not routing.
 data.providers[0].offers=manifest().providers[0].offers;
 const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(data):new Response(wasm);});
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'mpv-software':id});await runtime.load();
 const roles=['hybrid','selective','software-full','software-yuv'].map(role=>'web/engine-'+role+'/player.wasm');
 for(const role of roles)assert.equal(runtime.has(role),true);
 assert.equal(runtime.has('web/engine-remux/remux.wasm'),false);
 const modules=await Promise.all(roles.map(role=>runtime.module(role)));assert.ok(modules.every(module=>module===modules[0]));assert.deepEqual(requests,['https://example.test/demuxe-providers.json','https://example.test/'+shared]);await runtime.destroy();
 const unqualified=new ProviderRuntime(new URL('https://example.test/'),{'mpv-software':'different-build'});await unqualified.load();assert.equal(unqualified.has(roles[0]),false);await assert.rejects(unqualified.module(roles[0]),e=>e.code==='DEPLOYMENT_UNAVAILABLE');await unqualified.destroy();
});

test('legacy mpv artifacts take precedence when both layouts are deployed',async t=>{
 const shared='web/engine-mpv/player.wasm',legacy='web/engine-hybrid/player.wasm';
 const artifacts=Object.fromEntries([legacy,shared].sort().map(p=>['runtime/'+p,hash]));
 const id='sha256:'+createHash('sha256').update(JSON.stringify(artifacts,null,2)+'\n').digest('hex');
 const data=manifest();data.assets=[legacy,shared].map(p=>({id:p,path:p,bytes:wasm.length,sha256:hash}));data.providers=[{...data.providers[0],id:'mpv-hybrid',implementationIdentity:id,assetIds:[legacy,shared]}];
 const requests=[];t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(data):new Response(wasm);});
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{'mpv-hybrid':id});await runtime.module(legacy);assert.equal(requests.at(-1),'https://example.test/'+legacy);await runtime.module('web/engine-selective/player.wasm');assert.equal(requests.at(-1),'https://example.test/'+shared);await runtime.destroy();
});
