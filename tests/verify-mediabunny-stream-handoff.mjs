// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,deployment]=process.argv.slice(2);assert.ok(receiptPath&&deployment);const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex'),manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),r=JSON.parse(await readFile(receiptPath)),harness=hash(await readFile(new URL('./browser-mediabunny-stream-handoff.mjs',import.meta.url)));
function verify(v){assert.equal(v.status,'packaged-stream-handoff-cases-passed-not-release');assert.ok(['chrome','firefox','webkit'].includes(v.browserEngine));assert.ok(v.browser);assert.equal(v.manifestSHA256,hash(manifestBytes));assert.equal(v.harnessSHA256,harness);assert.ok(v.requests.some(x=>x.path==='/web/generated/internal/stream-worker.js'));for(const mode of ['replace','gap'])assert.deepEqual(v.checks[mode],{old:[],next:[true],terminations:1,closes:1});assert.deepEqual(v.checks.terminate,{old:[],next:[],terminations:1,closes:1});}
verify(r);for(const x of r.requests){assert.ok(x.path.startsWith('/')&&!x.path.split('/').includes('..'));const data=await readFile(join(root,x.path.slice(1)));assert.equal(x.bytes,data.length);assert.equal(x.sha256,hash(data));}
const presenter=manifest.providers.find(x=>x.id==='browser-prepared'),coreFiles=await verifyPresenterInputs(root,presenter.implementationIdentity);
const mutations=[v=>v.checks.replace.old.push(true),v=>v.checks.gap.next=[],v=>v.checks.terminate.next.push(true),v=>v.checks.terminate.terminations=2,v=>v.manifestSHA256='wrong',v=>v.harnessSHA256='wrong'];for(const mutate of mutations){const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad));}
console.log(JSON.stringify({status:'packaged-stream-handoff-verified-not-release',browser:r.browser,coreFiles,negativeControls:mutations.length}));
