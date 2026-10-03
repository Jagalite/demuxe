// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {privateMpvSource} from '../../web/private-mpv.js';
import * as core from '../../web/generated/internal/machine/private-engine-admission.js';
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
const playback=['demuxe_coop_invoke','demuxe_source_live','web_create','web_render','web_event','web_command_args','web_destroy','web_audio_ptr'];
test('private runtime and ABI policy rejects crossed identities and preserves admitted capacities',()=>{
 assert.equal(core.privateRuntimeError('jspi',false,'playback'),'Selected JSPI runtime unavailable');assert.equal(core.privateRuntimeError('asyncify',false,'playback'),null);assert.match(core.privateRuntimeError('pthread',true),/Invalid/);
 assert.equal(core.privateMpvAbiError('asyncify','playback',[...controls,...playback],false,undefined),null);assert.match(core.privateMpvAbiError('jspi','playback',[...controls,...playback],false,false),/backend/);assert.match(core.privateMpvAbiError('jspi','playback',playback,true,false),/identity/);
 assert.equal(core.privateAudioCapacityValid(8192,undefined),true);assert.equal(core.privateAudioCapacityValid(32768,32768),true);assert.equal(core.privateAudioCapacityValid(32768,undefined),false);assert.equal(core.privateAudioCapacityValid('8192',8192),false);
});
test('private source owner rejects stale open facts and never revives after close',()=>{
 const initial=core.initialPrivateSourceLifetime(),first=core.beginPrivateSourceOpen(initial),second=core.beginPrivateSourceOpen(first.state);assert.equal(core.acceptPrivateSourceOpen(second.state,first.id,8).accepted,false);assert.equal(core.acceptPrivateSourceOpen(second.state,second.id,Infinity).invalid,true);const accepted=core.acceptPrivateSourceOpen(second.state,second.id,8);assert.equal(accepted.state.size,8);const closed=core.closePrivateSourceLifetime(accepted.state);assert.equal(core.beginPrivateSourceOpen(closed).id,null);assert.equal(core.privateSourceCurrent(closed,second.id),false);assert.equal(initial.phase,'idle');
});
function source(){return privateMpvSource({file:new Blob(['fixture'])});}
test('close during source open blocks host installation and repeated close is idempotent',async()=>{
 const wrapper=source(),hold=pending();let calls=0,closes=0;wrapper.reader.open=()=>hold.promise;wrapper.reader.close=()=>closes++;const opening=wrapper.open({source:{setSource:()=>calls++}}),rejected=assert.rejects(opening,{name:'AbortError'});wrapper.close();wrapper.close();hold.resolve({size:8n});await rejected;assert.equal(calls,0);assert.equal(closes,1);
});
test('open after close rejects before invoking a reader',async()=>{
 const wrapper=source();let opens=0;wrapper.reader.open=async()=>{opens++;return{size:8n};};wrapper.close();await assert.rejects(wrapper.open({}),{name:'AbortError'});assert.equal(opens,0);
});
test('late earlier open cannot overwrite a newer host source',async()=>{
 const wrapper=source(),first=pending(),second=pending();let count=0,installed=[];wrapper.reader.open=()=>++count===1?first.promise:second.promise;const host={source:{setSource:value=>installed.push(value.size)}},old=wrapper.open(host),rejected=assert.rejects(old,{name:'AbortError'}),newer=wrapper.open(host);second.resolve({size:20n});await newer;first.resolve({size:10n});await rejected;assert.deepEqual(installed,[20]);wrapper.close();
});
test('size getter retirement cannot publish source metadata',async()=>{
 const wrapper=source();let calls=0;wrapper.reader.open=async()=>({get size(){wrapper.close();return 8n;}});await assert.rejects(wrapper.open({source:{setSource:()=>calls++}}),{name:'AbortError'});assert.equal(calls,0);
});
test('host source method acquisition retirement prevents source installation',async()=>{
 const wrapper=source();let calls=0;wrapper.reader.open=async()=>({size:8n});await assert.rejects(wrapper.open({source:{get setSource(){wrapper.close();return()=>calls++;}}}),{name:'AbortError'});assert.equal(calls,0);
});
test('retirement during host installation rejects obsolete open result',async()=>{
 const wrapper=source();wrapper.reader.open=async()=>({size:8n});await assert.rejects(wrapper.open({source:{setSource:()=>wrapper.close()}}),{name:'AbortError'});
});
test('retired source read cannot deliver bytes after reader completion',async()=>{
 const wrapper=source(),hold=pending();let installed;wrapper.reader.open=async()=>({size:8n});wrapper.reader.read=()=>hold.promise;wrapper.reader.close=()=>{};await wrapper.open({source:{setSource:value=>installed=value}});const read=installed.read(0,1,new AbortController().signal),rejected=assert.rejects(read,{name:'AbortError'});wrapper.close();hold.resolve(Uint8Array.of(7));await rejected;
});
test('abort during listener acquisition prevents reader invocation',async()=>{
 const wrapper=source();let installed,reads=0;wrapper.reader.open=async()=>({size:8n});wrapper.reader.read=async()=>{reads++;return Uint8Array.of(7);};await wrapper.open({source:{setSource:value=>installed=value}});const controller=new AbortController(),signal=controller.signal,add=signal.addEventListener.bind(signal);signal.addEventListener=(...args)=>{controller.abort();return add(...args);};await assert.rejects(installed.read(0,1,signal),{name:'AbortError'});assert.equal(reads,0);wrapper.close();
});
async function loader(t,host){
 const url=new URL('../../web/private-mpv.js',import.meta.url);let source=await readFile(url,'utf8');const key='__privateHostFixture';globalThis[key]=host;t.after(()=>{delete globalThis[key];});
 source=source.replace("import {createCooperativeEngine} from './private-mpv/engine.js';",`const createCooperativeEngine=async()=>globalThis.${key};`).replaceAll('import.meta.url',JSON.stringify(url.href));source=source.replace(/from '(\.\.?\/[^']+)'/g,(_match,relative)=>'from '+JSON.stringify(new URL(relative,url).href));
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+Math.random());
 t.mock.method(WebAssembly.Module,'exports',()=>[...controls,...playback].map(name=>({name,kind:'function'})));t.mock.method(WebAssembly.Module,'imports',()=>[]);
 const glue='export default function(){}',wasm=Uint8Array.of(0,97,115,109,1,0,0,0).buffer,glueBytes=new TextEncoder().encode(glue).buffer;
 const hash=async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');const manifest={schema:1,backend:'asyncify',profile:'playback',files:{'player.wasm':await hash(wasm),'player.mjs':await hash(glueBytes)}};
 t.mock.method(URL,'createObjectURL',()=> 'data:text/javascript;base64,'+Buffer.from(glue).toString('base64'));t.mock.method(URL,'revokeObjectURL',()=>{});
 const assets={'manifest.json':new TextEncoder().encode(JSON.stringify(manifest)).buffer,'player.wasm':wasm,'player.mjs':glueBytes};return options=>api.privateMpv('asyncify','playback',{assets,...options});
}
test('rejected audio-capacity call disposes an acquired native host and preserves cause',async t=>{
 const error=Error('capacity RPC failed');let disposed=0;const run=await loader(t,{raw:{memory:{buffer:new ArrayBuffer(8)},web_audio_capacity(){}},call:async()=>{throw error;},dispose(){disposed++;}});await assert.rejects(run(),value=>value===error);assert.equal(disposed,1);
});
test('host metadata failure still disposes acquisition even when cleanup throws',async t=>{
 const error=Error('metadata failure');let disposed=0;const host={raw:{memory:{buffer:new ArrayBuffer(8)}},set asset(_value){throw error;},dispose(){disposed++;throw Error('cleanup');}};const run=await loader(t,host);await assert.rejects(run(),value=>value===error);assert.equal(disposed,1);
});
test('abort during native host acquisition disposes before returning it',async t=>{
 const controller=new AbortController();let disposed=0;const host={raw:{memory:{buffer:new ArrayBuffer(8)},web_audio_capacity(){}},call:async()=>{controller.abort();return 8192;},dispose(){disposed++;}};const run=await loader(t,host);await assert.rejects(run({signal:controller.signal}),{name:'AbortError'});assert.equal(disposed,1);
});
async function remuxLoader(t,engine){
 const url=new URL('../../web/private-remux.js',import.meta.url);let source=await readFile(url,'utf8');globalThis.__privateRemuxFixture=engine;t.after(()=>{delete globalThis.__privateRemuxFixture;});
 source=source.replace('const {default:create}=await import(url.href);','const create=async()=>globalThis.__privateRemuxFixture;').replaceAll('import.meta.url',JSON.stringify(url.href)).replace(/from '(\.\.?\/[^']+)'/g,(_match,relative)=>'from '+JSON.stringify(new URL(relative,url).href));
 t.mock.method(WebAssembly.Module,'exports',()=>[...controls,'rm_probe','rm_open','rm_start','rm_step','rm_close'].map(name=>({name,kind:'function'})));
 return(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+Math.random())).privateRemux;
}
test('remux bridge acquisition failure closes transferred reader port without masking error',async t=>{
 const error=Error('import installation failed'),engine={HEAPU8:new Uint8Array(65536),ccall(){return 0;},set nonIsolatedRead(_value){throw error;}};const run=await remuxLoader(t,engine);let closed=0;
 await assert.rejects(run('asyncify',{port:{close(){closed++;throw Error('cleanup');}},size:8,compiledWasm:{}}),value=>value===error);assert.equal(closed,1);
});
test('remux source admission failure closes port even before reader acquisition completes',async t=>{
 const run=await remuxLoader(t,{HEAPU8:new Uint8Array(65536),ccall(){return 0;}});let closed=0;await assert.rejects(run('asyncify',{port:{close(){closed++;}},size:0,compiledWasm:{}}),/Invalid private remux source/);assert.equal(closed,1);
});
test('remux initialization failure retires transferred port and retains original cause',async t=>{
 const run=await remuxLoader(t,{HEAPU8:{buffer:{}},ccall(){return 0;}});let closed=0;await assert.rejects(run('asyncify',{port:{close(){closed++;}},size:8,compiledWasm:{}}),error=>error.cause.message.includes('memory mismatch'));assert.equal(closed,1);
});
test('reader method acquisition retirement cannot start open or read effects',async()=>{
 const opening=source();let opens=0;Object.defineProperty(opening.reader,'open',{get(){opening.close();return()=>{opens++;return Promise.resolve({size:8n});};}});await assert.rejects(opening.open({}),{name:'AbortError'});assert.equal(opens,0);
 const reading=source();let read,reads=0;reading.reader.open=async()=>({size:8n});await reading.open({source:{setSource:value=>{read=value.read;}}});Object.defineProperty(reading.reader,'read',{get(){reading.close();return()=>{reads++;return Promise.resolve(Uint8Array.of(7));};}});await assert.rejects(read(0,1,new AbortController().signal),{name:'AbortError'});assert.equal(reads,0);
});
test('missing private mpv profile rejects before attempting asset acquisition',async()=>{
 const {privateMpv}=await import('../../web/private-mpv.js');await assert.rejects(privateMpv('asyncify',undefined),/Invalid private mpv runtime/);
});
