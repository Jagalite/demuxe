// SPDX-License-Identifier: Apache-2.0
// Verify finite packaged custom byte-source playback, not production qualification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {verifyPresenterInputs} from '../packages/provider-mediabunny/test/verify-composition-evidence.mjs';
const [receiptPath,deployment,fixturePath]=process.argv.slice(2);assert.ok(receiptPath&&deployment&&fixturePath);
const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex'),manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),fixture=await readFile(fixturePath),r=JSON.parse(await readFile(receiptPath));
const harness=hash(await readFile(new URL('./browser-mediabunny-custom-playback.mjs',import.meta.url)));
const provider=manifest.providers.find(p=>p.id===r.provider);assert.ok(provider&&['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].includes(provider.id));const asset=manifest.assets.find(a=>provider.assetIds.includes(a.id));assert.ok(asset);
function verify(v){
 assert.equal(v.status,'custom-byte-source-public-playback-passed-not-release');assert.ok(['chrome','firefox','webkit'].includes(v.browserEngine));assert.ok(v.browser);assert.equal(v.provider,provider.id);assert.equal(v.harnessSHA256,harness);assert.equal(v.manifestSHA256,hash(manifestBytes));assert.deepEqual(v.fixture,{bytes:fixture.length,sha256:hash(fixture)});
 assert.deepEqual(v.checks.map(c=>c.ownership),['owned','borrowed']);
 for(const c of v.checks){assert.ok(c.reads>0);assert.equal(c.readBytes,fixture.length);assert.equal(c.closes,c.ownership==='owned'?1:0);assert.ok(Math.abs(c.seek-1.25)<.05&&c.freshFrame>1.25);assert.ok(c.audio.length===2&&c.audio.every(a=>a.rms>.01&&a.expected>2*a.other));assert.ok(Math.abs(c.color[0]-224)<=20&&Math.abs(c.color[1]-32)<=20&&Math.abs(c.color[2]-64)<=20);if(provider.id==='mediabunny-mp4-file-preparation')assert.equal(c.profile,'mp4-h264-aac-av-v1');else assert.equal(c.profile,undefined);assert.equal(c.ffmpegCalls,0);assert.ok(c.createdWorkers>0);assert.equal(c.remainingWorkers,0);assert.equal(c.remainingURLs,0);assert.equal(c.sourceId,null);}
 const fetched=v.requests.filter(x=>x.path==='/'+asset.path);assert.equal(fetched.length,2);for(const x of fetched){assert.equal(x.sha256,asset.sha256);assert.equal(x.bytes,asset.bytes);}assert.ok(!v.requests.some(x=>x.path.startsWith('/web/engine-remux/')));
}
verify(r);
for(const item of r.requests){assert.ok(item.path.startsWith('/')&&!item.path.split('/').includes('..'));const bytes=await readFile(join(root,item.path.slice(1)));assert.equal(item.bytes,bytes.length);assert.equal(item.sha256,hash(bytes));}
const presenter=manifest.providers.find(p=>p.id==='browser-prepared'),coreFiles=await verifyPresenterInputs(root,presenter.implementationIdentity);
const mutations=[v=>v.checks[0].closes=0,v=>v.checks[1].closes=1,v=>v.checks[0].readBytes=0,v=>v.checks[0].audio[0].rms=0,v=>v.checks[0].remainingWorkers=1,v=>v.requests.push({path:'/web/engine-remux/remux.wasm'}),v=>v.fixture.sha256='wrong',v=>v.manifestSHA256='wrong'];
for(const mutate of mutations){const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad));}
console.log(JSON.stringify({status:'custom-byte-source-public-playback-verified-not-release',browser:r.browser,provider:r.provider,coreFiles,requests:r.requests.length,negativeControls:mutations.length}));
