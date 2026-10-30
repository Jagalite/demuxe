// SPDX-License-Identifier: Apache-2.0
// Verify finite mono/stereo MP4/MOV owner and worker preservation evidence.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {build} from 'esbuild';
const [candidateArg, prefix, fixtureRootArg] = process.argv.slice(2); assert.ok(candidateArg && prefix && fixtureRootArg);
const candidate = resolve(candidateArg), fixtureRoot = resolve(fixtureRootArg), pkg = resolve('packages/provider-mediabunny'), core = resolve(pkg, '../../src');
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), manifest = JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json')));
assert.equal(manifest.providers[0].id,'mediabunny-mp4-file-preparation');
const worker = await readFile(join(candidate,manifest.assets[0].path)); assert.equal(sha(worker),manifest.assets[0].sha256);
const library = await build({absWorkingDir:pkg,entryPoints:[join(pkg,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false});
const owner = await build({absWorkingDir:pkg,stdin:{contents:`export {DemuxeRuntime} from ${JSON.stringify(join(core,'runtime.ts'))};export {ProviderRuntime} from ${JSON.stringify(join(core,'internal/provider-runtime.ts'))}; export {NativePlayer} from ${JSON.stringify(join(core,'internal/native-player.ts'))}; export {playerError} from ${JSON.stringify(join(core,'internal/errors.ts'))};`,resolveDir:core},bundle:true,platform:'browser',format:'esm',write:false});
const harness=sha(await readFile(join(pkg,'test/browser-mp4.mjs'))), fixtures={};
for(const scope of ['local','remote'])for(const channels of [1,2]){
 const key=`${scope}-${channels}`;fixtures[key]=[];
 for(const name of ['fixture.mp4','fixture.mov']){const bytes=await readFile(join(fixtureRoot,key,name));fixtures[key].push({name,bytes:bytes.length,sha256:sha(bytes)});}
}
function verify(r,scope,channels){
 assert.equal(r.status,'test-composition-passed-not-release');assert.ok(r.browser);assert.equal(r.remote,scope==='remote');
 assert.equal(r.preparationIdentity,manifest.providers[0].implementationIdentity);assert.equal(r.workerSHA256,sha(worker));
 assert.equal(r.presenterIdentity,'sha256:'+sha(owner.outputFiles[0].contents));assert.equal(r.librarySHA256,sha(library.outputFiles[0].contents));assert.equal(r.harnessSHA256,harness);
 assert.deepEqual(r.fixtureRecords,fixtures[`${scope}-${channels}`]);assert.equal(r.requests.mp4,2);assert.equal(r.requests.other,0);
 if(scope==='remote')assert.ok(r.requests.media>0);
 assert.equal(r.checks.profiles.length,2);
 for(const [index,c] of r.checks.profiles.entries()){
  assert.equal(c.profile,index===0?'mp4-h264-aac-av-v1':'mov-h264-aac-av-v1');assert.equal(c.remote,scope==='remote');
  assert.equal(c.packets,91);assert.equal(c.packetHashesPreserved,true);assert.equal(c.trackIdsPreserved,true);
  assert.equal(c.audio.frames,76800);assert.equal(c.audio.channels,channels);assert.equal(c.audio.sampleRate,48000);
  assert.equal(c.audio.pcmHashesPreserved,true);assert.equal(c.audio.authoredPrimingRetained,true);assert.ok(c.audio.decodedByteProgress>0);
  assert.equal(c.seekTime,.5);assert.ok(c.freshFrameTime>.5);
 }
 assert.equal(r.checks.unqualifiedAdmissionAcquired,false);assert.equal(r.checks.directAcquired,false);
 assert.equal(r.checks.lifecycle.remainingWorkers,0);assert.equal(r.checks.lifecycle.remainingObjectURLs,0);
 if(scope==='remote')assert.deepEqual(r.checks.remotePolicy,{identityChange:'SOURCE_CHANGED',authorization:'SOURCE_PERMISSION',cancelledDuringWorkerRead:true,credentialsPosted:false,policyMutationRejected:true});
}
let sample;
for(const scope of ['local','remote'])for(const channels of [1,2]){const r=JSON.parse(await readFile(`${prefix}-${scope}-${channels}.json`));verify(r,scope,channels);sample??=r;}
const mutations=[r=>r.fixtureRecords[0].sha256='wrong',r=>r.workerSHA256='wrong',r=>r.checks.profiles[0].audio.pcmHashesPreserved=false,r=>r.checks.profiles[1].packetHashesPreserved=false,r=>r.checks.lifecycle.remainingWorkers=1,r=>r.requests.other=1];
for(const mutate of mutations){const copy=structuredClone(sample);mutate(copy);assert.throws(()=>verify(copy,'local',1));}
console.log(JSON.stringify({status:'finite-mp4-mov-mono-stereo-preservation-verified-not-release',runs:4,fixtures:8,negativeControls:mutations.length}));
