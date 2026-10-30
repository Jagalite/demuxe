// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {verifyComposition,verifyReviewedComposition,verifyPresenterInputs} from './verify-composition-evidence.mjs';
const [receiptPath,candidate,deployment]=process.argv.slice(2);if(!receiptPath||!candidate)throw Error('Pass receipt and candidate');
const receipt=JSON.parse(await readFile(receiptPath,'utf8')),manifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8')),worker=await readFile(join(candidate,manifest.assets[0].path));
verifyComposition(receipt,manifest,worker);
const changes=[
 value=>value.cases.pop(),
 value=>{value.identities.mediabunny='sha256:wrong';},
 value=>{value.cases.find(item=>item.name==='declined-mediabunny').ffmpegCalls=0;},
 value=>{value.cases.find(item=>item.name==='preferred-mediabunny').audio[0].rms=0;},
 value=>{value.cases.find(item=>item.name==='corrupt-mediabunny').terminalCode='DEPLOYMENT_UNAVAILABLE';},
 value=>{value.cases.find(item=>item.name==='direct').deliveries.push({path:'/unexpected'});},
 value=>{value.cases.find(item=>item.name==='preferred-mediabunny').remainingWorkers=1;},
 value=>{value.completeMatrix=false;},
];
for(const change of changes){const altered=structuredClone(receipt);change(altered);assert.throws(()=>verifyComposition(altered,manifest,worker));}
if(deployment){
 const deployed=JSON.parse(await readFile(join(deployment,'demuxe-providers.json'),'utf8'));
 verifyReviewedComposition(receipt,manifest,deployed);
 for(const change of [value=>{delete value.cases[0].reviewedCompositions;},value=>{value.cases[0].reviewedCompositions=[];},value=>{const record=value.cases[0].reviewedCompositions.find(item=>item.implementationIdentities[manifest.providers[0].id]);record.implementationIdentities['browser-prepared']='wrong';},value=>{const record=value.cases[0].reviewedCompositions.find(item=>item.implementationIdentities[manifest.providers[0].id]);record.implementationIdentities.extra='unreviewed';},value=>{const record=value.cases[0].reviewedCompositions.find(item=>item.implementationIdentities[manifest.providers[0].id]);record.sourceProfiles=[];}]){const altered=structuredClone(receipt);change(altered);assert.throws(()=>verifyReviewedComposition(altered,manifest,deployed));}
}
if(deployment){
 const temp=await mkdtemp(join(tmpdir(),'demuxe-presenter-identity-'));
 try{
  const map={'app.js':['Apache-2.0'],'license-map.json':['Apache-2.0']},hash=value=>createHash('sha256').update(value).digest('hex');
  await writeFile(join(temp,'app.js'),'presenter');await writeFile(join(temp,'license-map.json'),JSON.stringify(map));
  const inputs={'app.js':hash(await readFile(join(temp,'app.js'))),'license-map.json':hash(await readFile(join(temp,'license-map.json')))};
  const identity='sha256:'+hash(JSON.stringify(inputs,null,2)+'\n');
  assert.equal(await verifyPresenterInputs(temp,identity),2);
  await writeFile(join(temp,'app.js'),'changed presenter');await assert.rejects(verifyPresenterInputs(temp,identity));
 }finally{await rm(temp,{recursive:true,force:true});}
}
const badWorker=Buffer.from(worker);badWorker[badWorker.length-1]^=1;assert.throws(()=>verifyComposition(receipt,manifest,badWorker));
console.log(JSON.stringify({status:'finite-evidence-negative-controls-passed',controls:changes.length+1+(deployment?6:0)}));
