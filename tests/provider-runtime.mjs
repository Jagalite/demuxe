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
