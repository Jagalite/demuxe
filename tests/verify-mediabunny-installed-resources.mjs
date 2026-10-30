// SPDX-License-Identifier: Apache-2.0
// Verify finite resource observations for an installed candidate; no release grant.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {build} from 'esbuild';
const [receiptPath,consumerArg,candidateArg,fixturePath,scope]=process.argv.slice(2);
assert.ok(receiptPath&&consumerArg&&candidateArg&&fixturePath&&['local','remote'].includes(scope));
const repo=process.cwd(),consumer=resolve(consumerArg),core=join(consumer,'node_modules/demuxe'),candidate=resolve(candidateArg);
const hash=data=>createHash('sha256').update(data).digest('hex'),readJSON=async path=>JSON.parse(await readFile(path));
const r=await readJSON(receiptPath),manifest=await readJSON(join(candidate,'demuxe-mediabunny-candidate.json'));
const fixture=await readFile(fixturePath),asset=manifest.assets[0],worker=await readFile(join(candidate,asset.path));assert.equal(hash(worker),asset.sha256);
const app=await build({absWorkingDir:repo,stdin:{contents:"export {Player,DemuxeRuntime} from 'demuxe';",resolveDir:consumer},bundle:true,format:'esm',platform:'browser',write:false,metafile:true});
const inputs={};for(const path of Object.keys(app.metafile.inputs).filter(x=>!x.startsWith('<'))){const target=resolve(repo,path);assert.ok(target.startsWith(core+sep));inputs[path]=hash(await readFile(target));}
const harness=hash(await readFile(join(repo,'packages/provider-mediabunny/test/browser-resources-installed.mjs'))),sampler=hash(await readFile(join(repo,'packages/provider-mediabunny/test/process-resources.js')));
function verify(value){
 assert.equal(value.status,'finite-public-resource-measurements-not-release');assert.ok(value.browser);const w=value.workload;
 assert.equal(w.trials,3);assert.equal(w.cycles,3);assert.equal(w.remote,scope==='remote');assert.equal(w.sourceBytes,fixture.length);assert.equal(w.sourceSha256,hash(fixture));assert.equal(w.aheadSeconds,1);assert.equal(w.behindSeconds,1);assert.equal(w.codedBudgetBytes,8*1024*1024);assert.equal(w.playbackSecondsPerLeg,.4);assert.equal(w.seekTarget,1.25);assert.equal(w.sampleIntervalMs,200);
 assert.equal(value.identities.provider,manifest.providers[0].implementationIdentity);assert.equal(value.identities.worker,hash(worker));assert.equal(value.identities.presenter,'sha256:'+hash(app.outputFiles[0].contents));assert.equal(value.identities.harness,harness);assert.equal(value.identities.sampler,sampler);assert.deepEqual(value.identities.installedCoreInputs,inputs);assert.ok(Object.keys(inputs).length>100);
 assert.equal(value.trials.length,3);
 for(const [i,trial] of value.trials.entries()){
  assert.equal(trial.trial,i);assert.equal(trial.status,'measured-workload-passed');assert.deepEqual(trial.sampleErrors,[]);assert.ok(trial.samples.length>0);assert.equal(trial.cycles.length,3);
  assert.equal(trial.destroyed.workers,0);assert.equal(trial.destroyed.objectURLs,0);assert.ok(trial.retainedDestroyed.rendererJsHeapUsedBytes>0);
  assert.equal(trial.delivery['/'+asset.path].requests,1);assert.equal(trial.delivery['/'+asset.path].bodyBytes,worker.length);
  if(scope==='remote')assert.ok(trial.delivery['/media.mp4'].requests>0);
  for(const [n,cycle] of trial.cycles.entries()){
   assert.equal(cycle.cycle,n);assert.equal(cycle.opened.plan,'native-remux');assert.ok(cycle.opened.milliseconds>=0&&cycle.seek.milliseconds>=0&&cycle.seek.freshMilliseconds>=0);assert.ok(Math.abs(cycle.seek.confirmed-1.25)<.05&&cycle.seek.time>1.25);assert.equal(cycle.closed.workers,0);assert.equal(cycle.closed.objectURLs,0);assert.equal(cycle.providerBodyBytesThisCycle,n===0?worker.length:0);assert.ok(cycle.retainedActive.rendererJsHeapUsedBytes>0&&cycle.retainedClosed.rendererJsHeapUsedBytes>0);
  }
 }
}
verify(r);
const mutations=[x=>x.workload.trials=2,x=>x.identities.presenter='wrong',x=>x.identities.worker='wrong',x=>x.trials[0].cycles.pop(),x=>x.trials[0].cycles[0].closed.workers=1,x=>x.trials[0].delivery['/'+asset.path].requests=2,x=>x.workload.sourceSha256='wrong',x=>x.trials[0].sampleErrors.push('error')];
for(const mutate of mutations){const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad));}
console.log(JSON.stringify({status:'installed-resource-workload-verified-not-release',browser:r.browser,scope,provider:manifest.providers[0].id,cycles:9,installedCoreInputs:Object.keys(inputs).length,negativeControls:mutations.length}));
