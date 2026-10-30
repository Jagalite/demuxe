// SPDX-License-Identifier: Apache-2.0
// Verify public custom-source failures against the exact candidate deployment.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,deployment]=process.argv.slice(2);assert.ok(receiptPath&&deployment);
const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),r=JSON.parse(await readFile(receiptPath));
const harness=hash(await readFile(new URL('./browser-mediabunny-custom-staging-errors.mjs',import.meta.url)));
function verify(v){
 assert.equal(v.status,'public-custom-staging-error-cases-passed-not-release');assert.ok(['chrome','firefox','webkit'].includes(v.browserEngine));assert.ok(v.browser);assert.equal(v.harnessSHA256,harness);assert.equal(v.manifestSHA256,hash(manifestBytes));
 assert.ok(v.requests.some(x=>x.path==='/dist/index.js'));assert.ok(!v.requests.some(x=>x.path.startsWith('/web/providers/mediabunny/')||x.path.startsWith('/web/engine-remux/')));
 assert.equal(v.checks.workers,0);for(const mode of ['failure','abort','cleanup']){assert.equal(v.checks[mode].resolved,false);assert.equal(v.checks[mode].closes,1);assert.equal(v.checks[mode].sourceId,null);}
 assert.equal(v.checks.failure.code,'SOURCE_PERMISSION');assert.match(v.checks.failure.message,/source permission denied/);assert.equal(v.checks.abort.code,'ABORTED');assert.match(v.checks.cleanup.message,/close failed/);
}
verify(r);
for(const item of r.requests){assert.ok(item.path.startsWith('/')&&!item.path.split('/').includes('..'));const data=await readFile(join(root,item.path.slice(1)));assert.equal(item.bytes,data.length);assert.equal(item.sha256,hash(data));}
const presenter=manifest.providers.find(x=>x.id==='browser-prepared'),coreFiles=await verifyPresenterInputs(root,presenter.implementationIdentity);
const mutations=[v=>v.checks.failure.code='DECODE_FAILED',v=>v.checks.abort.code='DECODE_FAILED',v=>v.checks.cleanup.resolved=true,v=>v.checks.failure.closes=2,v=>v.checks.workers=1,v=>v.requests.push({path:'/web/engine-remux/remux.wasm'}),v=>v.manifestSHA256='wrong'];
for(const mutate of mutations){const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad));}
console.log(JSON.stringify({status:'public-custom-staging-errors-verified-not-release',browser:r.browser,coreFiles,requests:r.requests.length,negativeControls:mutations.length}));
