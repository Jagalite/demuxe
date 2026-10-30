// SPDX-License-Identifier: Apache-2.0
// Verify the finite MOV audio-only public-player backup matrix; not qualification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyReviewedComposition,verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,candidatePath,deploymentPath,fixturePath]=process.argv.slice(2);
if(!fixturePath)throw Error('Pass receipt, candidate, deployment and MOV fixture');
const hash=data=>createHash('sha256').update(data).digest('hex');
const candidate=JSON.parse(await readFile(join(candidatePath,'demuxe-mediabunny-candidate.json'))),deployment=JSON.parse(await readFile(join(deploymentPath,'demuxe-providers.json'))),fixture=await readFile(fixturePath);
const currentHarness=hash(await readFile(new URL('../packages/provider-mediabunny/test/browser-backup.mjs',import.meta.url)));
const original=JSON.parse(await readFile(receiptPath));
function verify(receipt){
 assert.equal(receipt.status,'finite-real-backup-composition-passed-not-release');assert.equal(receipt.completeMatrix,true);assert.equal(receipt.container,'mov');assert.equal(receipt.audioOnly,true);
 assert.ok([1,2].includes(receipt.audioChannels));assert.equal(receipt.fixtures.ordinary.sha256,hash(fixture));assert.equal(receipt.fixtures.ordinary.bytes,fixture.length);
 assert.equal(fixture.subarray(4,8).toString(),'ftyp');assert.equal(fixture.subarray(8,12).toString(),'qt  ');
 assert.equal(receipt.identities.harness,currentHarness);assert.equal(receipt.identities.mediabunny,candidate.providers[0].implementationIdentity);
 const names=['direct','default-backup','preferred-mediabunny','declined-mediabunny','corrupt-mediabunny','missing-backup','source-denied'];assert.deepEqual(receipt.cases.map(item=>item.name),names);
 const byName=Object.fromEntries(receipt.cases.map(item=>[item.name,item]));
 assert.equal(byName.direct.deliveries.length,0);
 for(const name of ['direct','default-backup','preferred-mediabunny','declined-mediabunny']){
  const row=byName[name];assert.ok(row.freshAudioTime>1.25);assert.equal(row.remainingWorkers,0);assert.equal(row.remainingURLs,0);
  assert.equal(row.audioTracks.length,1);assert.equal(row.audioTracks[0].type,'audio');assert.equal(row.audio.length,receipt.audioChannels);
  assert.ok(row.audio.every(channel=>channel.rms>.01&&channel.expected>2*channel.other));
 }
 for(const name of ['default-backup','declined-mediabunny'])assert.ok(byName[name].ffmpegCalls>0&&byName[name].deliveries.some(item=>item.path==='/web/engine-remux/remux.wasm'));
 assert.equal(byName['preferred-mediabunny'].profile,'mov-aac-audio-only-v1');
 assert.ok(byName['preferred-mediabunny'].deliveries.some(item=>item.path==='/'+candidate.assets[0].path&&item.sha256===candidate.assets[0].sha256));
 assert.ok(!byName['preferred-mediabunny'].deliveries.some(item=>item.path.startsWith('/web/engine-remux/')));
 for(const [name,code] of [['corrupt-mediabunny','ASSET_LOAD_FAILED'],['missing-backup','DEPLOYMENT_UNAVAILABLE'],['source-denied','SOURCE_PERMISSION']]){
  assert.equal(byName[name].terminalCode,code);assert.ok(!byName[name].deliveries.some(item=>item.path.startsWith('/web/engine-remux/')));
 }
 const composition=verifyReviewedComposition(receipt,candidate,deployment);
 assert.equal(composition.sourceProfile,(receipt.remote?'remote:':'local:')+'pthread:mp4-mov-aac-'+receipt.audioChannels+'ch');
 return composition;
}
const composition=verify(original),root=resolve(deploymentPath),coreFiles=await verifyPresenterInputs(root,composition.implementationIdentities['browser-prepared']);
assert.ok(Object.keys(original.staticInputs??{}).length>10);assert.equal('sha256:'+original.staticInputs['/app.js']?.sha256,original.identities.presenter);
for(const [path,expected] of Object.entries(original.staticInputs)){
 if(path==='/app.js')continue;assert.ok(path.startsWith('/')&&!path.split('/').includes('..'));
 const data=await readFile(join(root,path.slice(1)));assert.equal(data.length,expected.bytes,path);assert.equal(hash(data),expected.sha256,path);
}
const mutations=[
 value=>value.cases.pop(),
 value=>{value.cases.find(row=>row.name==='preferred-mediabunny').audio[0].rms=0;},
 value=>{value.cases.find(row=>row.name==='declined-mediabunny').ffmpegCalls=0;},
 value=>{value.cases.find(row=>row.name==='preferred-mediabunny').profile='mp4-aac-audio-only-v1';},
 value=>{value.cases.find(row=>row.name==='corrupt-mediabunny').terminalCode='DEPLOYMENT_UNAVAILABLE';},
 value=>{value.cases.find(row=>row.name==='preferred-mediabunny').remainingWorkers=1;},
 value=>{value.cases[0].reviewedCompositions=[];},
 value=>{value.fixtures.ordinary.sha256='wrong';},
];
for(const mutate of mutations){const changed=structuredClone(original);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-mov-audio-evidence-verified-not-release',browser:original.browser,channels:original.audioChannels,remote:original.remote,sourceProfile:composition.sourceProfile,coreFiles,staticInputs:Object.keys(original.staticInputs).length-1,negativeControls:mutations.length}));
