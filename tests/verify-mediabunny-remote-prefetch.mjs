// SPDX-License-Identifier: Apache-2.0
// Verify finite packaged remote-source startup-prefetch observations; not release qualification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,deploymentPath]=process.argv.slice(2);
if(!deploymentPath)throw Error('Pass receipt and composed deployment');
const root=resolve(deploymentPath),hash=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),receipt=JSON.parse(await readFile(receiptPath));
const harnessSHA=hash(await readFile(new URL('./browser-mediabunny-remote-prefetch.mjs',import.meta.url)));
const ffmpeg=manifest.assets.find(asset=>asset.path==='web/engine-remux/remux.wasm');assert.ok(ffmpeg);
function verify(value){
 assert.equal(value.status,'browser-packaged-remote-prefetch-cases-passed-not-release');assert.ok(value.browser);
 assert.equal(value.harnessSHA256,harnessSHA);assert.equal(value.manifestSHA256,hash(manifestBytes));
 const expected=['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].flatMap(sdk=>['mediabunny-first','unqualified','weak-identity','ffmpeg-first','default'].map(ordering=>({sdk,ordering})));
 assert.equal(value.cases.length,expected.length);
 for(let i=0;i<expected.length;i++){
  const row=value.cases[i];assert.equal(row.sdk,expected[i].sdk);assert.equal(row.ordering,expected[i].ordering);assert.equal(row.workers,0);
  assert.ok(Array.isArray(row.assets));assert.ok(!row.assets.some(asset=>asset.path.startsWith('/web/providers/mediabunny/')));
  if(row.ordering==='mediabunny-first')assert.deepEqual(row.assets,[]);
  else{assert.equal(row.assets.length,1);assert.equal(row.assets[0].path,'/'+ffmpeg.path);assert.equal(row.assets[0].sha256,ffmpeg.sha256);assert.equal(row.assets[0].bytes,ffmpeg.bytes);}
 }
 assert.ok(value.requests.some(item=>item.path==='/dist/index.js'));return value;
}
verify(receipt);
for(const item of receipt.requests){
 assert.ok(item.path.startsWith('/')&&item.path.split('/').every(part=>part!=='.'&&part!=='..'));
 const bytes=await readFile(join(root,item.path.slice(1)));assert.equal(item.bytes,bytes.length);assert.equal(item.sha256,hash(bytes));
}
const presenter=manifest.providers.find(provider=>provider.id==='browser-prepared');assert.ok(presenter);
const coreFiles=await verifyPresenterInputs(root,presenter.implementationIdentity);
const mutations=[
 value=>{value.cases[0].assets.push({path:'/web/engine-remux/remux.wasm'});},
 value=>{value.cases[1].assets=[];},
 value=>{value.cases[2].assets=[];},
 value=>{value.cases[0].workers=1;},
 value=>{value.cases.pop();},
 value=>{value.harnessSHA256='wrong';},
 value=>{value.manifestSHA256='wrong';},
];
for(const mutate of mutations){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-packaged-remote-prefetch-verified-not-release',browser:receipt.browser,coreFiles,requests:receipt.requests.length,negativeControls:mutations.length}));
