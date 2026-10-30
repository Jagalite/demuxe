// SPDX-License-Identifier: Apache-2.0
// Verify finite forced-stall WebM startup and FFmpeg fallback evidence.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,deploymentPath]=process.argv.slice(2);if(!deploymentPath)throw Error('Pass receipt and deployment');
const root=resolve(deploymentPath),hash=x=>createHash('sha256').update(x).digest('hex'),mb=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(mb),receipt=JSON.parse(await readFile(receiptPath));
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/vp8-resource.webm',import.meta.url)),declined=Buffer.from(fixture);assert.equal(declined[349],0xa3);assert.equal(declined[357],0);declined[357]=1;
const harness=hash(await readFile(new URL('./browser-mediabunny-webm-startup.mjs',import.meta.url)));
function verify(value){
 assert.equal(value.status,'finite-packaged-webm-startup-passed-not-release');assert.ok(value.browser);assert.equal(value.harnessSHA256,harness);assert.equal(value.manifestSHA256,hash(mb));assert.equal(value.fixtureSHA256,hash(fixture));assert.equal(value.declinedSHA256,hash(declined));assert.equal(value.declinedMutation.offset,357);assert.equal(value.declinedMutation.to,1);
 assert.deepEqual(value.cases.map(x=>x.scenario),['preferred','decline']);
 for(const row of value.cases){
  assert.equal(row.forced,true);assert.equal(row.remainingWorkers,0);assert.ok(row.frame>1.25);assert.equal(row.referenceColor.length,4);assert.equal(row.color.length,4);assert.ok(row.color.every((value,i)=>Math.abs(value-row.referenceColor[i])<=2));
  const direct=row.trace.find(x=>x.event==='direct-load'),prefetch=row.trace.find(x=>x.event==='prefetch');assert.ok(direct&&prefetch&&prefetch.at-direct.at>=390);
  const sdk=manifest.assets.find(x=>x.path==='web/providers/mediabunny/webm.js');assert.ok(row.deliveries.some(x=>x.path==='/'+sdk.path&&x.bytes===sdk.bytes&&x.sha256===sdk.sha256));
  const ff=row.deliveries.filter(x=>x.path==='/web/engine-remux/remux.wasm');
  if(row.scenario==='preferred'){assert.equal(ff.length,0);assert.equal(row.ffmpegCalls,0);}
  else{const mismatch=row.messages.find(x=>x.prepared===false),declared=manifest.assets.find(x=>x.path==='web/engine-remux/remux.wasm');assert.ok(mismatch);assert.ok(row.ffmpegCalls>0);assert.equal(ff.length,1);assert.equal(ff[0].sha256,declared.sha256);assert.equal(ff[0].bytes,declared.bytes);assert.ok(ff[0].at>=mismatch.at-20);}
 }
 assert.ok(value.requests.some(x=>x.path==='/dist/index.js'));
}
verify(receipt);
for(const x of receipt.requests){assert.ok(x.path.startsWith('/')&&x.path.split('/').every(p=>p!=='.'&&p!=='..'));const b=await readFile(join(root,x.path.slice(1)));assert.equal(x.bytes,b.length);assert.equal(x.sha256,hash(b));}
const presenter=manifest.providers.find(x=>x.id==='browser-prepared'),coreFiles=await verifyPresenterInputs(root,presenter.implementationIdentity);
const mutations=[v=>{v.cases[0].deliveries.push({path:'/web/engine-remux/remux.wasm'});},v=>{v.cases[1].messages=[];},v=>{v.cases[1].ffmpegCalls=0;},v=>{v.cases[1].color[0]=0;},v=>{v.cases[0].remainingWorkers=1;},v=>{v.cases[0].trace=[];},v=>{v.declinedSHA256='wrong';}];
for(const mutate of mutations){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-packaged-webm-startup-verified-not-release',browser:receipt.browser,coreFiles,requests:receipt.requests.length,negativeControls:mutations.length}));
