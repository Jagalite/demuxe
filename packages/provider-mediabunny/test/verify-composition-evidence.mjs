// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Verify one complete recorded test composition; this does not qualify it. */
export function verifyComposition(receipt,manifest,worker){
 const hash=data=>createHash('sha256').update(data).digest('hex');
 const provider=manifest.providers[0],asset=manifest.assets[0];
 assert.ok(['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].includes(provider.id));
 assert.equal(worker.length,asset.bytes);assert.equal(hash(worker),asset.sha256);
 assert.equal(receipt.status,'finite-real-backup-composition-passed-not-release');assert.equal(receipt.completeMatrix,true);
 assert.equal(receipt.browserEngine,'chrome');assert.ok(receipt.browser);assert.equal(receipt.identities.mediabunny,provider.implementationIdentity);
 assert.ok(receipt.identities.presenter?.startsWith('sha256:'));assert.ok(receipt.identities.backup?.startsWith('sha256:'));
 const names=['direct','default-backup','preferred-mediabunny','declined-mediabunny','corrupt-mediabunny','missing-backup','source-denied'];
 assert.deepEqual(receipt.cases.map(item=>item.name),names);
 const cases=Object.fromEntries(receipt.cases.map(item=>[item.name,item]));
 assert.equal(cases.direct.deliveries.length,0);
 for(const name of ['default-backup','declined-mediabunny']){
  const item=cases[name];assert.ok(item.ffmpegCalls>0);assert.ok(item.deliveries.some(entry=>entry.path==='/web/engine-remux/remux.wasm'));
 }
 for(const name of ['direct','default-backup','preferred-mediabunny','declined-mediabunny']){
  const item=cases[name];assert.equal(item.remainingWorkers,0);assert.equal(item.remainingURLs,0);assert.ok(item.freshFrame>1.25);
  assert.ok(item.audio?.length===2&&item.audio.every(channel=>channel.rms>.01&&channel.expected>2*channel.other));
 }
 const sdk='/'+asset.path;
 assert.ok(cases['preferred-mediabunny'].deliveries.some(entry=>entry.path===sdk&&entry.sha256===asset.sha256));
 assert.ok(cases['declined-mediabunny'].deliveries.some(entry=>entry.path===sdk&&entry.sha256===asset.sha256));
 assert.ok(!cases['preferred-mediabunny'].deliveries.some(entry=>entry.path.startsWith('/web/engine-remux/')));
 for(const [name,code] of [['corrupt-mediabunny','ASSET_LOAD_FAILED'],['missing-backup','DEPLOYMENT_UNAVAILABLE'],['source-denied','SOURCE_PERMISSION']]){
  assert.equal(cases[name].terminalCode,code);assert.ok(!cases[name].deliveries.some(entry=>entry.path.startsWith('/web/engine-remux/')));
 }
 assert.ok(Object.keys(receipt.staticInputs??{}).length>10,'Packaged application input identities required');
 assert.equal('sha256:'+receipt.staticInputs['/app.js']?.sha256,receipt.identities.presenter,'Application wrapper identity');
 return {provider:provider.id,implementationIdentity:provider.implementationIdentity,presenter:receipt.identities.presenter,backup:receipt.identities.backup,fixture:receipt.fixtures.ordinary.sha256,browser:receipt.browser};
}
/** The application must have supplied the same whole binding for every case.
 * This is a finite harness assertion, not a production qualification grant. */
export function verifyReviewedComposition(receipt,candidate,deployment){
 const provider=candidate.providers[0],presenter=deployment.providers.find(item=>item.id==='browser-prepared');
 const binding={'mediabunny-mp4-file-preparation':'mediabunny-mp4','mediabunny-mp4-stream-preparation':'mediabunny-mp4-stream'}[provider.id];
 assert.ok(binding&&/^sha256:[0-9a-f]{64}$/.test(presenter?.implementationIdentity??''),'Presenter must identify exact core content');
 assert.equal(deployment.providers.find(item=>item.id===provider.id)?.implementationIdentity,provider.implementationIdentity);
 const profile=(receipt.remote?'remote:':'local:')+'pthread:'+(receipt.audioOnly?'mp4-mov-aac-':'mp4-mov-avc-aac-')+(receipt.audioChannels??2)+'ch';
 const expected={recipeId:'native-remux',bindingId:binding,sourceProfile:profile,implementationIdentities:{[provider.id]:provider.implementationIdentity,'browser-prepared':presenter.implementationIdentity}};
 for(const item of receipt.cases){
  assert.ok(Array.isArray(item.reviewedCompositions),'Missing actual composition records');
  assert.ok(item.reviewedCompositions.some(record=>{
   if(record.recipeId!==expected.recipeId||record.bindingId!==expected.bindingId||!record.implementationIdentities||!Array.isArray(record.sourceProfiles)||!record.sourceProfiles.includes(profile))return false;
   const ids=Object.keys(record.implementationIdentities);
   return ids.length===2&&Object.entries(expected.implementationIdentities).every(([id,identity])=>record.implementationIdentities[id]===identity);
  }),'Missing exact provider and presenter binding for '+item.name);
 }
 return expected;
}
/** Recompute the opt-in presenter identity from the deployed core inventory. */
export async function verifyPresenterInputs(root,expectedIdentity){
 const inventory=JSON.parse(await readFile(join(root,'license-map.json'),'utf8')),hash=data=>createHash('sha256').update(data).digest('hex'),inputs={};
 for(const name of Object.keys(inventory).sort()){
  assert.ok(name&&!name.startsWith('/')&&!name.includes('\\')&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'Invalid core inventory path');
  assert.deepEqual(inventory[name],['Apache-2.0']);inputs[name]=hash(await readFile(join(root,name)));
 }
 assert.equal('sha256:'+hash(JSON.stringify(inputs,null,2)+'\n'),expectedIdentity,'Presenter identity differs from deployed core bytes');
 return Object.keys(inputs).length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [receiptPath,candidate,deployment,requireReviewed]=process.argv.slice(2);if(!receiptPath||!candidate||!deployment)throw Error('Pass receipt, candidate and composed deployment directories');
 const manifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
 const receipt=JSON.parse(await readFile(receiptPath,'utf8')),worker=await readFile(join(candidate,manifest.assets[0].path));
 const facts=verifyComposition(receipt,manifest,worker),root=resolve(deployment);
 const deployed=JSON.parse(await readFile(join(root,'demuxe-providers.json'),'utf8'));
 if(requireReviewed==='--require-reviewed'||receipt.cases.some(item=>'reviewedCompositions' in item)){
  facts.reviewedComposition=verifyReviewedComposition(receipt,manifest,deployed);
  facts.checkedCoreFiles=await verifyPresenterInputs(root,facts.reviewedComposition.implementationIdentities['browser-prepared']);
 }else facts.reviewedComposition='not-recorded-in-historical-receipt';
 for(const [path,expected] of Object.entries(receipt.staticInputs)){
  if(path==='/app.js')continue;
  assert.ok(path.startsWith('/')&&!path.split('/').includes('..'),'Invalid recorded input path');
  const data=await readFile(join(root,path.slice(1)));assert.equal(data.length,expected.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),expected.sha256,path);
 }
 console.log(JSON.stringify({status:'finite-composition-evidence-verified-not-release',...facts,checkedPackagedInputs:Object.keys(receipt.staticInputs).length-1}));
}
