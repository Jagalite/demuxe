// SPDX-License-Identifier: MIT
// Explicit isolated Wasm ownership check, not a browser playback qualification.
// node tests/private-retained-lease-native.mjs /external/link-output asyncify
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCooperativeEngine} from '../web/private-mpv/engine.js';
const directory=resolve(process.argv[2]??''),backend=process.argv[3]??'asyncify';
if(!process.argv[2]||!['asyncify','jspi'].includes(backend))throw Error('Pass an isolated --retained-lease-tests output directory and backend');
const record=JSON.parse(await readFile(join(directory,'build.json'),'utf8'));
assert.equal(record.retainedLeaseVersion,1);assert.equal(record.retainedLeaseTests,true);assert.equal(record.status,'built_candidate_only');
const name=backend==='asyncify'?'playback.asyncify.wasm':'playback.wasm',bytes=await readFile(join(directory,name));
const sha256=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha256(bytes),record.artifacts[name]);
assert.equal(sha256(await readFile(join(directory,'playback.mjs'))),record.artifacts['playback.mjs']);
// The generated glue targets workers; no browser APIs are invoked by these
// exported native allocation/copy/free probes. Instantiation uses exact bytes.
globalThis.WorkerGlobalScope=class {};
const {default:createModule}=await import(pathToFileURL(join(directory,'playback.mjs')).href),released=[];
const engine=await createCooperativeEngine(createModule,bytes,backend,{print:()=>{},printErr:message=>{throw Error(message);}},{onReleaseFrame:(generation,id)=>released.push({generation,id})});
const result={scope:'Actual isolated Wasm libavutil/mp_image ownership; no browser/media-output claim',backend,wasmSHA256:sha256(bytes),buildRecordSHA256:sha256(await readFile(join(directory,'build.json'))),checks:[]};
try{
 assert.equal(await engine.call('demuxe_test_lease_begin'),2);assert.equal(released.length,0);
 assert.equal(await engine.call('demuxe_test_lease_copy_release'),1);assert.equal(released.length,0);
 await engine.call('demuxe_test_lease_finish');assert.deepEqual(released,[{generation:7,id:41}]);
 await engine.call('demuxe_test_lease_finish');assert.equal(released.length,1);result.checks.push('FFmpeg clone/copy_props/final-free/duplicate-free');
 assert.equal(await engine.call('demuxe_test_lease_mpv_begin'),1);assert.equal(released.length,1);
 assert.equal(await engine.call('demuxe_test_lease_mpv_release'),1);assert.equal(released.length,1);
 await engine.call('demuxe_test_lease_finish');assert.deepEqual(released,[{generation:7,id:41},{generation:7,id:41}]);result.checks.push('mp_image reference/pixel-copy/AVFrame roundtrip/metadata/final-free');
 await engine.call('demuxe_test_lease_begin');const count=released.length;engine.decoder.close();
 await engine.call('demuxe_test_lease_copy_release');await engine.call('demuxe_test_lease_finish');assert.equal(released.length,count);result.checks.push('native-final-free-after-mailbox-close');
 result.status='passed';
}catch(error){result.status='failed';result.error=String(error);throw error;}
finally{engine.dispose();await writeFile(join(directory,`retained-lease-${backend}-checks.json`),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
