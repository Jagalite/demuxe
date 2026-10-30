// SPDX-License-Identifier: Apache-2.0
// Verify explicitly selected WebKit cases; not a complete playback matrix.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {verifyReviewedComposition,verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,candidatePath,deploymentPath]=process.argv.slice(2);if(!deploymentPath)throw Error('Pass receipt, candidate and deployment');
const root=resolve(deploymentPath),hash=x=>createHash('sha256').update(x).digest('hex'),candidate=JSON.parse(await readFile(join(candidatePath,'demuxe-mediabunny-candidate.json'))),deployment=JSON.parse(await readFile(join(root,'demuxe-providers.json'))),receipt=JSON.parse(await readFile(receiptPath));
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url)),declined=Buffer.from(fixture),group=declined.indexOf('sgpd');assert.ok(group>0);assert.equal(declined.readInt16BE(group+20),-1);declined.writeInt16BE(-2,group+20);
const harness=hash(await readFile(new URL('../packages/provider-mediabunny/test/browser-backup.mjs',import.meta.url))),asset=candidate.assets[0],worker=await readFile(join(candidatePath,asset.path));assert.equal(worker.length,asset.bytes);assert.equal(hash(worker),asset.sha256);
function verify(value){
 assert.equal(value.status,'selected-backup-cases-passed-not-complete-matrix');assert.equal(value.completeMatrix,false);assert.equal(value.browserEngine,'webkit');assert.ok(value.browser);assert.equal(value.container,'mp4');assert.equal(value.audioOnly,false);assert.equal(value.audioChannels,2);assert.equal(value.remote,false);
 assert.equal(value.identities.harness,harness);assert.equal(value.identities.mediabunny,candidate.providers[0].implementationIdentity);assert.equal(value.fixtures.ordinary.sha256,hash(fixture));assert.equal(value.fixtures.declined.sha256,hash(declined));
 const expected=candidate.providers[0].id==='mediabunny-mp4-file-preparation'?['preferred-mediabunny','corrupt-mediabunny','missing-backup','source-denied']:['corrupt-mediabunny','missing-backup','source-denied'];assert.deepEqual(value.requestedCases,expected);assert.deepEqual(value.cases.map(x=>x.name),expected);
 const rows=Object.fromEntries(value.cases.map(x=>[x.name,x]));if(rows['preferred-mediabunny']){const row=rows['preferred-mediabunny'];assert.equal(row.profile,'mp4-h264-aac-av-v1');assert.ok(row.freshFrame>1.25);assert.equal(row.remainingWorkers,0);assert.equal(row.remainingURLs,0);assert.ok(row.audio?.length===2&&row.audio.every(c=>c.rms>.01&&c.expected>2*c.other));assert.ok(row.deliveries.some(x=>x.path==='/'+asset.path&&x.sha256===asset.sha256));assert.ok(!row.deliveries.some(x=>x.path.startsWith('/web/engine-remux/')));}
 for(const [name,code] of [['corrupt-mediabunny','ASSET_LOAD_FAILED'],['missing-backup','DEPLOYMENT_UNAVAILABLE'],['source-denied','SOURCE_PERMISSION']]){const row=rows[name];assert.equal(row.terminalCode,code);assert.equal(row.remainingWorkers,0);assert.equal(row.remainingURLs,0);assert.ok(!row.deliveries.some(x=>x.path.startsWith('/web/engine-remux/')));}
 assert.ok(rows['missing-backup'].messages.some(x=>x.code==='PROVIDER_PROFILE_MISMATCH'||x.type==='preparation-result'&&x.prepared===false));return verifyReviewedComposition(value,candidate,deployment);
}
const composition=verify(receipt),coreFiles=await verifyPresenterInputs(root,composition.implementationIdentities['browser-prepared']);assert.ok(Object.keys(receipt.staticInputs??{}).length>10);assert.equal('sha256:'+receipt.staticInputs['/app.js']?.sha256,receipt.identities.presenter);
for(const [path,expected] of Object.entries(receipt.staticInputs)){if(path==='/app.js')continue;assert.ok(path.startsWith('/')&&!path.split('/').includes('..'));const bytes=await readFile(join(root,path.slice(1)));assert.equal(bytes.length,expected.bytes);assert.equal(hash(bytes),expected.sha256);}
const mutations=[v=>v.cases.pop(),v=>{v.cases.find(x=>x.name==='corrupt-mediabunny').terminalCode='DEPLOYMENT_UNAVAILABLE';},v=>{v.cases.find(x=>x.name==='missing-backup').messages=[];},v=>{v.cases[0].remainingWorkers=1;},v=>{v.cases[0].reviewedCompositions=[];},v=>{v.fixtures.ordinary.sha256='wrong';}];
if(receipt.cases.some(x=>x.name==='preferred-mediabunny'))mutations.push(v=>{v.cases.find(x=>x.name==='preferred-mediabunny').audio[0].rms=0;});
for(const mutate of mutations){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-webkit-selected-cases-verified-not-release',browser:receipt.browser,provider:candidate.providers[0].id,cases:receipt.requestedCases,coreFiles,staticInputs:Object.keys(receipt.staticInputs).length-1,negativeControls:mutations.length}));
