// SPDX-License-Identifier: Apache-2.0
// Validate finite installed-consumer lifecycle evidence; not a release gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {build} from 'esbuild';
const [receiptPath, consumerArg, candidateArg, scope] = process.argv.slice(2);
assert.ok(receiptPath&&consumerArg&&candidateArg&&['local','remote'].includes(scope));
const consumer=resolve(consumerArg),candidate=resolve(candidateArg),repo=process.cwd(),packageRoot=join(repo,'packages/provider-mediabunny');
const hash=data=>createHash('sha256').update(data).digest('hex');
const receipt=JSON.parse(await readFile(receiptPath)), manifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json')));
const fixture=await readFile(join(packageRoot,'qualification/fixtures/avc-aac-320x240.mp4'));
const harness=hash(await readFile(join(packageRoot,'test/browser-public.mjs'))), worker=await readFile(join(candidate,manifest.assets[0].path));
assert.equal(hash(worker),manifest.assets[0].sha256);
const core=join(consumer,'node_modules/demuxe');
const app=await build({absWorkingDir:packageRoot,stdin:{contents:"export {Player,DemuxeRuntime,inspectMedia} from 'demuxe';",resolveDir:consumer},bundle:true,format:'esm',platform:'browser',write:false,metafile:true});
const appHash=hash(app.outputFiles[0].contents),expectedInputs={};
for(const path of Object.keys(app.metafile.inputs).filter(path=>!path.startsWith('<'))){
 const target=resolve(packageRoot,path);assert.ok(target.startsWith(core+sep));expectedInputs[path]=hash(await readFile(target));
}
assert.ok(Object.keys(expectedInputs).length>100);
const format={};for(const owner of ['inspect','preview']){
 const result=await build({absWorkingDir:packageRoot,stdin:{contents:`export * from '@demuxe/provider-mediabunny/${owner}/mp4';`,resolveDir:consumer},bundle:true,format:'esm',platform:'browser',write:false});
 const bytes=result.outputFiles[0].contents;format['/format-'+owner+'.js']={bytes:bytes.length,sha256:hash(bytes)};
}
function verify(r){
 assert.equal(r.status,'public-player-composition-passed-not-release');assert.ok(r.browser);assert.ok(['chrome','firefox','webkit'].includes(r.browserEngine));
 assert.deepEqual(r.fixture,{bytes:fixture.length,sha256:hash(fixture),origin:'external-encoded-bytes'});
 assert.equal(r.identities.harness,harness);assert.equal(r.identities.presenter,'sha256:'+appHash);assert.equal(r.identities.provider,manifest.providers[0].implementationIdentity);assert.equal(r.identities.worker,hash(worker));
 assert.deepEqual(r.identities.installedCoreInputs,expectedInputs);assert.deepEqual(r.identities.formatDelivery,format);
 assert.equal(r.identities.remuxOwner,hashSyncOwner);assert.equal(r.identities.fastInspector,hashSyncInspector);
 const c=r.checks;assert.equal(c.directControlPolicy,'startupEscalation:false');assert.equal(c.remote,scope==='remote');assert.equal(c.av,true);assert.equal(c.publicEntryPoint,true);assert.equal(c.plan,'native-remux');assert.equal(c.directAcquired,false);
 assert.equal(c.formatInspection.status,'partial');assert.deepEqual(c.formatInspection.completeFor,['container']);assert.equal(c.audio.channelLayout,'stereo');assert.equal(c.audio.sampleRate,48000);assert.ok(c.audio.observedAudio.length===2&&c.audio.observedAudio.every(v=>v.rms>.01&&v.expectedTone>2*v.otherTone));
 assert.ok(c.freshFrame>1.25);assert.equal(c.cancelledDuringPreparation,true);assert.equal(c.unqualifiedCatalogRejected,true);assert.equal(c.remainingWorkers,0);assert.equal(c.remainingURLs,0);
 assert.equal(c.lifecycle.replacementAfterCancelledPreparation,true);assert.equal(c.lifecycle.originalSourceRetired,true);assert.ok(c.lifecycle.concurrentFrames[0]>.75&&c.lifecycle.concurrentFrames[1]>1.25&&c.lifecycle.peerProgressAfterOtherClose>c.lifecycle.concurrentFrames[1]);
 if(scope==='remote'){assert.equal(c.terminalRemoteFailures,true);assert.ok(r.requests.media>0);}else{
  const p=c.preview;assert.equal(p.exactRequestDeclined,true);assert.ok(Math.abs(p.representedTime-.2)<.001);assert.equal(p.temporalAccuracy,'approximate');assert.equal(p.fidelity,'reduced');for(const k of ['deferredDuringPlayback','resumedAfterPause','sourceReplacement','lateReadDiscarded'])assert.equal(p[k],true);assert.ok(p.decodersCreated>0);assert.equal(p.remainingDecoders,0);
 }
 assert.equal(r.requests.worker,1);assert.deepEqual(r.requests.forbidden,[]);
}
const hashSyncOwner=hash(await readFile(join(core,'web/native-remux-player.js'))),hashSyncInspector=hash(await readFile(join(core,'web/fast-source-inspector.js')));
verify(receipt);
const mutations=[r=>r.identities.presenter='wrong',r=>r.identities.worker='wrong',r=>r.checks.lifecycle.originalSourceRetired=false,r=>r.checks.remainingWorkers=1,r=>r.checks.audio.observedAudio[0].rms=0,r=>r.fixture.sha256='wrong',r=>{if(scope==='remote')r.requests.media=0;else r.checks.preview.lateReadDiscarded=false;}];
for(const mutate of mutations){const value=structuredClone(receipt);mutate(value);assert.throws(()=>verify(value));}
console.log(JSON.stringify({status:'installed-lifecycle-verified-not-release',browser:receipt.browser,scope,provider:manifest.providers[0].id,installedCoreInputs:Object.keys(expectedInputs).length,negativeControls:mutations.length}));
