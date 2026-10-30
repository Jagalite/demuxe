// SPDX-License-Identifier: Apache-2.0
// Verify one selected independent MOV decline and real backup, not a release gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {verifyReviewedComposition,verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';

const [receiptPath,candidatePath,deploymentPath,fixturePath]=process.argv.slice(2);
if(!fixturePath)throw Error('Pass receipt, candidate, deployment and MOV fixture');
const hash=data=>createHash('sha256').update(data).digest('hex');
const candidate=JSON.parse(await readFile(join(candidatePath,'demuxe-mediabunny-candidate.json')));
const deployment=JSON.parse(await readFile(join(deploymentPath,'demuxe-providers.json')));
const fixture=await readFile(fixturePath),original=JSON.parse(await readFile(receiptPath));
const harness=hash(await readFile(new URL('../packages/provider-mediabunny/test/browser-backup.mjs',import.meta.url)));
function verify(receipt){
 assert.equal(receipt.status,'selected-backup-cases-passed-not-complete-matrix');
 assert.equal(receipt.completeMatrix,false);assert.deepEqual(receipt.requestedCases,['natural-decline']);
 assert.equal(receipt.container,'mov');assert.equal(receipt.audioOnly,true);assert.equal(receipt.audioChannels,1);
 assert.equal(fixture.subarray(4,8).toString(),'ftyp');assert.equal(fixture.subarray(8,12).toString(),'qt  ');
 assert.equal(receipt.fixtures.ordinary.sha256,hash(fixture));assert.equal(receipt.fixtures.ordinary.bytes,fixture.length);
 assert.equal(receipt.identities.harness,harness);assert.equal(receipt.identities.mediabunny,candidate.providers[0].implementationIdentity);
 assert.equal(receipt.cases.length,1);const row=receipt.cases[0];assert.equal(row.name,'natural-decline');
 assert.ok(row.messages.some(message=>message.code==='PROVIDER_PROFILE_MISMATCH'||message.type==='preparation-result'&&message.prepared===false));
 assert.ok(row.ffmpegCalls>0);assert.ok(row.deliveries.some(item=>item.path==='/web/engine-remux/remux.wasm'));
 assert.ok(row.deliveries.some(item=>item.path==='/'+candidate.assets[0].path&&item.sha256===candidate.assets[0].sha256));
 assert.ok(row.freshAudioTime>1.25);assert.equal(row.audioTracks.length,1);assert.equal(row.audioTracks[0].type,'audio');
 assert.equal(row.audio.length,1);assert.ok(row.audio[0].rms>.01&&row.audio[0].expected>2*row.audio[0].other);
 assert.equal(row.remainingWorkers,0);assert.equal(row.remainingURLs,0);
 const composition=verifyReviewedComposition(receipt,candidate,deployment);
 assert.equal(composition.sourceProfile,(receipt.remote?'remote:':'local:')+'pthread:mp4-mov-aac-1ch');
 return composition;
}
const composition=verify(original),root=resolve(deploymentPath),coreFiles=await verifyPresenterInputs(root,composition.implementationIdentities['browser-prepared']);
assert.ok(Object.keys(original.staticInputs??{}).length>10);assert.equal('sha256:'+original.staticInputs['/app.js']?.sha256,original.identities.presenter);
for(const [path,expected] of Object.entries(original.staticInputs)){
 if(path==='/app.js')continue;assert.ok(path.startsWith('/')&&!path.split('/').includes('..'));
 const data=await readFile(join(root,path.slice(1)));assert.equal(data.length,expected.bytes,path);assert.equal(hash(data),expected.sha256,path);
}
const mutations=[
 value=>{value.cases[0].messages=[];},
 value=>{value.cases[0].ffmpegCalls=0;},
 value=>{value.cases[0].deliveries=value.cases[0].deliveries.filter(item=>!item.path.endsWith('remux.wasm'));},
 value=>{value.cases[0].audio[0].rms=0;},
 value=>{value.cases[0].remainingWorkers=1;},
 value=>{value.cases[0].reviewedCompositions=[];},
 value=>{value.fixtures.ordinary.sha256='wrong';},
];
for(const mutate of mutations){const changed=structuredClone(original);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-independent-mov-decline-verified-not-release',browser:original.browser,remote:original.remote,sourceProfile:composition.sourceProfile,coreFiles,staticInputs:Object.keys(original.staticInputs).length-1,negativeControls:mutations.length}));
