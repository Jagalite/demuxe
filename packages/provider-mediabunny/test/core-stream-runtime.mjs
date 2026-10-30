// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ProviderRuntime} from '../../../web/generated/internal/provider-runtime.js';
import {DemuxeRuntime} from '../../../web/generated/runtime.js';
const path='web/providers/mediabunny/mp4-stream.js',id='mediabunny-mp4-stream-preparation',presenter='sha256:'+'a'.repeat(64);
const bytes=new Uint8Array([1,2,3]),hash=value=>createHash('sha256').update(value).digest('hex');
const identity='sha256:'+hash(JSON.stringify({['runtime/'+path]:hash(bytes)},null,2)+'\n');
const manifest={schema:1,providerContractVersion:1,revision:'stream',assets:[{id:'stream',path,bytes:bytes.length,sha256:hash(bytes),dependencies:[]}],providers:[
  {id,implementationIdentity:identity,technology:'javascript',delivery:['optional-assets'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}],assetIds:['stream']},
  {id:'browser-prepared',implementationIdentity:presenter,applicationBuild:presenter,technology:'browser-native',delivery:['browser','application-bundle'],offers:[{capability:'media.present.prepared',version:1,profile:'selected-streams'}],assetIds:[]},
]};
async function setup(t,{mode='ready',corrupt=false,audio=false,compositions,admitted=true,presenterIdentity=presenter}={}){
  const deployment=structuredClone(manifest);deployment.providers[1].implementationIdentity=presenterIdentity;deployment.providers[1].applicationBuild=presenterIdentity;
  const workers=[],urls=new Set(),requests=[];
  const previous=Object.getOwnPropertyDescriptor(globalThis,'Worker');
  class Worker {
    constructor(){this.terminations=0;workers.push(this);}
    postMessage(data){this.request=data;if(mode!=='stall')queueMicrotask(()=>this.onmessage?.({data:mode==='ready'?{type:'producer-ready',size:data.file.size}:mode==='profile'?{type:'error',code:'PROVIDER_PROFILE_MISMATCH',message:'Unsupported clock'}:{type:'producer-ready',size:999}}));}
    terminate(){this.terminations++;}
  }
  Object.defineProperty(globalThis,'Worker',{configurable:true,value:Worker});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'Worker',previous);else delete globalThis.Worker;});
  t.mock.method(URL,'createObjectURL',()=>{const url='blob:test-'+urls.size;urls.add(url);return url;});
  t.mock.method(URL,'revokeObjectURL',url=>{assert.ok(urls.delete(url),'URL must retire exactly once');});
  t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));return String(url).endsWith('.json')?Response.json(deployment):new Response(corrupt?new Uint8Array([0,0,0]):bytes);});
  const qualified={[id]:identity,'browser-prepared':presenterIdentity};
  const shared=new DemuxeRuntime({assetBase:'https://stream.test/',qualifiedProviders:qualified,qualifiedCompositions:compositions??[{recipeId:'native-remux',bindingId:'mediabunny-mp4-stream',sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],implementationIdentities:qualified}]});
  await shared.providers.load('demuxe-providers.json');
  const runtime=new ProviderRuntime(new URL('https://stream.test/'),qualified,undefined,shared);
  t.after(async()=>{await runtime.destroy();await shared.destroy();});await runtime.load();
  const file=new File([new Uint8Array(16)],'finite.mp4');
  const facts={format:'mp4',duration:3,tracks:[{id:audio?'1':'source-video',index:0,type:'video',codec:'h264'},...(audio?[{id:'1',index:1,type:'audio',codec:'aac',sampleRate:48000,channels:2}]:[])]};
  const rejection=runtime.rejection('native-remux',{kind:'local',file},'stream','pthread',facts);
  if(admitted)assert.equal(rejection,undefined);else assert.ok(rejection);
  assert.equal(runtime.canStreamFile(file),admitted);assert.equal(requests.length,1);
  return {runtime,shared,file,workers,urls,requests};
}
test('stream acquisition keeps a verified worker lease until generation cancellation',async t=>{
  const {runtime,file,workers,urls}=await setup(t),controller=new AbortController();
  const value=await runtime.streamFile(file,1.25,controller.signal);
  assert.equal(value.worker,workers[0]);assert.equal(value.size,file.size);assert.equal(urls.size,1);
  assert.equal(workers[0].request.target,1.25);assert.equal(workers[0].request.sourceTracks[0].id,'source-video');
  controller.abort();assert.equal(workers[0].terminations,1);assert.equal(urls.size,0);
  value.worker.terminate();await runtime.destroy();assert.equal(workers[0].terminations,1);
});
test('runtime destruction retires an already handed-off stream worker',async t=>{
  const {runtime,file,workers,urls}=await setup(t);
  await runtime.streamFile(file,0,new AbortController().signal);await runtime.destroy();
  assert.equal(workers[0].terminations,1);assert.equal(urls.size,0);
});
test('cancellation during stream acquisition rejects and retires late readiness',async t=>{
  const {runtime,file,workers,urls}=await setup(t,{mode:'stall'}),controller=new AbortController();
  const pending=runtime.streamFile(file,0,controller.signal);
  while(!workers.length)await new Promise(resolve=>setImmediate(resolve));
  const reason=new DOMException('Source replaced','AbortError');controller.abort(reason);
  await assert.rejects(pending,error=>error===reason);
  workers[0].onmessage?.({data:{type:'producer-ready',size:file.size}});
  assert.equal(workers[0].terminations,1);assert.equal(urls.size,0);
});
test('only explicit profile rejection declines; malformed worker readiness is terminal',async t=>{
  for(const mode of ['profile','malformed'])await t.test(mode,async t=>{
    const {runtime,file,workers,urls}=await setup(t,{mode});
    if(mode==='profile')assert.equal(await runtime.streamFile(file,0,new AbortController().signal),undefined);
    else await assert.rejects(runtime.streamFile(file,0,new AbortController().signal),error=>error.code==='ASSET_LOAD_FAILED'&&error.name==='PlayerError');
    assert.equal(workers[0].terminations,1);assert.equal(urls.size,0);
  });
});
test('corrupt verified-stream assets never construct a worker',async t=>{
  const {runtime,file,workers,urls}=await setup(t,{corrupt:true});
  await assert.rejects(runtime.streamFile(file,0,new AbortController().signal),{code:'ASSET_LOAD_FAILED'});
  assert.equal(workers.length,0);assert.equal(urls.size,0);
});

test('complete A/V source facts retain type-scoped duplicate IDs',async t=>{
 const {runtime,file,workers}=await setup(t,{audio:true});
 const lease=await runtime.streamFile(file,0,new AbortController().signal);
 assert.deepEqual(workers[0].request.sourceTracks.map(track=>[track.type,track.id]),[['video','1'],['audio','1']]);lease.worker.terminate();
});

test('audio-only facts cannot acquire the video random-access streaming producer',async t=>{
 const {runtime,file,workers,requests}=await setup(t);
 const probe={format:'mp4',duration:3.2,tracks:[{id:'audio',index:0,type:'audio',codec:'aac',sampleRate:48000,channels:2}]};
 runtime.rejection('native-remux',{kind:'local',file},'audio-only','pthread',probe);
 assert.equal(runtime.canStreamFile(file),false);
 assert.equal(await runtime.streamFile(file,1,new AbortController().signal),undefined);
 assert.equal(workers.length,0);assert.equal(requests.length,1);
});

test('invalid source-profile lists are rejected when constructing the runtime',()=>{
  for(const sourceProfiles of [undefined,[],[''],['local:pthread:mp4-mov-avc-video','local:pthread:mp4-mov-avc-video'],[4]]){
    const record={recipeId:'native-remux',bindingId:'mediabunny-mp4-stream',implementationIdentities:{[id]:identity,'browser-prepared':presenter},sourceProfiles};
    assert.throws(()=>new DemuxeRuntime({assetBase:'https://stream.test/',qualifiedCompositions:[record]}),{code:'INVALID_ARGUMENT'});
  }
});

test('MediaBunny requires one exact, independently reviewed composition',async t=>{
  const exact={recipeId:'native-remux',bindingId:'mediabunny-mp4-stream',sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],implementationIdentities:{[id]:identity,'browser-prepared':presenter}};
  const variants=[
    [],
    [{...exact,implementationIdentities:{[id]:identity}},{...exact,implementationIdentities:{'browser-prepared':presenter}}],
    [{...exact,recipeId:'other'}],
    [{...exact,bindingId:'mediabunny-mp4'}],
    [{...exact,implementationIdentities:{...exact.implementationIdentities,'browser-prepared':'wrong'}}],
    [{...exact,implementationIdentities:{...exact.implementationIdentities,[id]:'wrong'}}],
    [{...exact,implementationIdentities:{...exact.implementationIdentities,extra:'identity'}}],
    [{...exact,sourceProfiles:['remote:pthread:mp4-mov-avc-video']}],
    [{...exact,sourceProfiles:['local:pthread:mp4-mov-avc-aac-2ch']}],
    [{...exact,sourceProfiles:['local:pthread:mp4-mov-avc-video'],implementationIdentities:{[id]:identity}},{...exact,sourceProfiles:['remote:pthread:mp4-mov-avc-video']}],
  ];
  for(const [index,compositions] of variants.entries())await t.test('rejects variant '+index,async t=>{
    const {runtime,file,workers,requests}=await setup(t,{compositions,admitted:false});
    assert.equal(await runtime.streamFile(file,0,new AbortController().signal),undefined);
    assert.equal(workers.length,0);assert.equal(requests.length,1);
  });
  await t.test('video-only grant cannot authorize stereo A/V',async t=>{
    const {runtime,file,workers}=await setup(t,{audio:true,compositions:[{...exact,sourceProfiles:['local:pthread:mp4-mov-avc-video']}],admitted:false});
    assert.equal(await runtime.streamFile(file,0,new AbortController().signal),undefined);assert.equal(workers.length,0);
  });
  await t.test('pthread grant cannot authorize a different remux runtime',async t=>{
    const {runtime,file,workers,requests}=await setup(t,{compositions:[{...exact,sourceProfiles:['local:pthread:mp4-mov-avc-video']}]});
    assert.equal(runtime.canStreamFile(file,'jspi'),false);
    assert.equal(await runtime.streamFile(file,0,new AbortController().signal,'jspi'),undefined);
    assert.equal(workers.length,0);assert.equal(requests.length,1);
  });
  await t.test('local grant cannot authorize remote acquisition',async t=>{
    const {runtime,requests}=await setup(t,{compositions:[{...exact,sourceProfiles:['local:pthread:mp4-mov-avc-video']}]});
    const source={url:'https://stream.test/media.mp4',format:'file',identity:{size:'16',etag:'\"stable\"'}};
    const facts={format:'mp4',duration:3,tracks:[{id:'v',index:0,type:'video',codec:'h264'}]};
    assert.ok(runtime.rejection('native-remux',{kind:'remote',options:source},'remote','pthread',facts));
    assert.equal(runtime.canStreamRemote(source),false);assert.equal(requests.length,1);
  });
  await t.test('remote grant admits only matching controlled remote source',async t=>{
    const {runtime,file,workers,requests}=await setup(t,{compositions:[{...exact,sourceProfiles:['remote:pthread:mp4-mov-avc-video']}],admitted:false});
    assert.equal(runtime.canStreamFile(file),false);
    const source={url:'https://stream.test/media.mp4',format:'file',identity:{size:'16',etag:'\"stable\"'}};
    const facts={format:'mp4',duration:3,tracks:[{id:'v',index:0,type:'video',codec:'h264'}]};
    assert.equal(runtime.rejection('native-remux',{kind:'remote',options:source},'remote','pthread',facts),undefined);
    assert.equal(runtime.canStreamRemote(source),true);assert.equal(workers.length,0);assert.equal(requests.length,1);
  });
  await t.test('rejects generic presenter identity even when the binding matches',async t=>{
    const generic='demuxe-browser-v1',record={...exact,implementationIdentities:{[id]:identity,'browser-prepared':generic}};
    const {runtime,file,workers}=await setup(t,{presenterIdentity:generic,compositions:[record],admitted:false});
    assert.equal(await runtime.streamFile(file,0,new AbortController().signal),undefined);assert.equal(workers.length,0);
  });
  await t.test('snapshots the exact record',async t=>{
    const record=structuredClone(exact),{runtime,shared,file}=await setup(t,{compositions:[record]});
    record.implementationIdentities[id]='changed';record.bindingId='changed';record.sourceProfiles.length=0;
    assert.throws(()=>{shared.qualifiedCompositions=[];},TypeError);
    assert.throws(()=>{shared.qualifiedCompositions[0].implementationIdentities[id]='changed';},TypeError);
    assert.throws(()=>{shared.qualifiedCompositions[0].sourceProfiles.push('local:other');},TypeError);
    assert.equal(runtime.canStreamFile(file),true);
  });
});
