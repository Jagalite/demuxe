// SPDX-License-Identifier: Apache-2.0
// Validate the finite, generated-fixture remote owner test; not a release gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
const [receiptPath,candidateArg,fixturePath]=process.argv.slice(2);assert.ok(receiptPath&&candidateArg&&fixturePath);
const repo=process.cwd(),pkg=join(repo,'packages/provider-mediabunny'),candidate=resolve(candidateArg),hash=data=>createHash('sha256').update(data).digest('hex');
const r=JSON.parse(await readFile(receiptPath)),manifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'))),worker=await readFile(join(candidate,manifest.assets[0].path)),fixture=await readFile(fixturePath);assert.equal(hash(worker),manifest.assets[0].sha256);
const library=await build({absWorkingDir:pkg,entryPoints:[join(pkg,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false});
const contents=`export {DemuxeRuntime} from ${JSON.stringify(join(repo,'src/runtime.ts'))};export {ProviderRuntime} from ${JSON.stringify(join(repo,'src/internal/provider-runtime.ts'))};export {NativePlayer} from ${JSON.stringify(join(repo,'src/internal/native-player.ts'))};export {playerError} from ${JSON.stringify(join(repo,'src/internal/errors.ts'))};`;
const owners=await build({absWorkingDir:pkg,stdin:{contents,resolveDir:repo},bundle:true,platform:'browser',format:'esm',write:false});
const expected={library:hash(library.outputFiles[0].contents),harness:hash(await readFile(join(pkg,'test/browser-stream.mjs'))),owner:hash(await readFile(join(repo,'web/native-remux-player.js'))),presenter:'sha256:'+hash(owners.outputFiles[0].contents),worker:'sha256:'+hash(worker),provider:manifest.providers[0].implementationIdentity};
for(const name of ['mp4-stream.js','fragment-stream.js','remux-producer.js','mp4-profile.js','stream-preparation.js','worker-stream.js'])expected[name]=hash(await readFile(join(pkg,name)));
function verify(v){
 assert.equal(v.status,'remote-native-stream-composition-passed-not-release');assert.ok(v.browser);assert.deepEqual(v.identities,expected);assert.deepEqual(v.fixture,{bytes:fixture.length,sha256:hash(fixture),origin:'generated-in-browser'});assert.equal(v.assetRequests,1);assert.ok(v.mediaRequests>2);
 const c=v.checks;assert.equal(c.container,'mp4');assert.equal(c.sourceBytes,fixture.length);assert.ok(fixture.length>2*65536);assert.equal(c.remote.identityAfterSeek,'SOURCE_CHANGED');assert.equal(c.remote.authorization,'SOURCE_PERMISSION');assert.equal(c.remote.authorizationRefreshes,1);assert.equal(c.remote.cancelledDuringWorkerRead,true);assert.equal(c.remote.policyMutationRejected,true);assert.equal(c.remote.credentialsPosted,false);
 assert.equal(c.admission.unqualifiedAcquired,false);assert.equal(c.admission.unsupportedAcquired,false);assert.equal(c.admission.directAcquired,false);assert.equal(c.admission.ffmpegBaselineRetained,true);assert.equal(c.admission.explicitStreamingPreference,true);assert.equal(c.admission.sourceTrackIdsPreserved,true);
 assert.equal(c.audio.channels,2);assert.equal(c.audio.sampleRate,48000);assert.equal(c.audio.frames,614400);assert.equal(c.audio.packetAndPCMHashesPreserved,true);assert.ok(c.audio.freshDecodedBytes>0);assert.equal(c.packetHashesPreserved,true);assert.equal(c.cancelledFactory,true);assert.equal(c.lateProducerRetired,true);assert.ok(Math.abs(c.seekTime-1.25)<.001&&c.freshFrameTime>1.25);assert.equal(c.generations,2);assert.ok(c.fragments.every(n=>n>0));assert.equal(c.lifecycle.remainingWorkers,0);assert.equal(c.lifecycle.remainingWorkerURLs,0);assert.ok(c.lifecycle.workersRetired>0);assert.equal(c.owner.initAccepted,true);assert.equal(c.owner.mediaAccepted,true);
}
verify(r);
const mutations=[v=>v.checks.remote.identityAfterSeek='ok',v=>v.checks.remote.cancelledDuringWorkerRead=false,v=>v.checks.remote.policyMutationRejected=false,v=>v.checks.remote.credentialsPosted=true,v=>v.checks.audio.packetAndPCMHashesPreserved=false,v=>v.checks.lifecycle.remainingWorkers=1,v=>v.identities.worker='wrong',v=>v.fixture.sha256='wrong'];for(const mutate of mutations){const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad));}
console.log(JSON.stringify({status:'finite-remote-stream-source-verified-not-release',browser:r.browser,fixtureBytes:fixture.length,mediaRequests:r.mediaRequests,negativeControls:mutations.length}));
