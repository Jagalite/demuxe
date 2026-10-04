// SPDX-License-Identifier: Apache-2.0
// Requires the explicitly prepared optional Shaka provider assets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ProviderRuntime} from '../web/generated/internal/provider-runtime.js';

test('maintained Shaka identity admits the exact optional runtime and preserves declared asset failures',async t=>{
 const pin=JSON.parse(await readFile('third_party/shaka-player.json'));
 const qualified=JSON.parse(await readFile('licensing/provider-runtime-qualification.json'));
 const artifacts=Object.fromEntries(Object.entries(pin.files).sort(([a],[b])=>a.localeCompare(b)).map(([name,fact])=>['runtime/'+name,fact.sha256]));
 const identity='sha256:'+createHash('sha256').update(JSON.stringify(artifacts,null,2)+'\n').digest('hex');
 assert.equal(qualified.providers['shaka-adaptive'],identity,'Pinned provider must be present in maintained admission registry');
 const declaration={schema:1,providerContractVersion:1,revision:'shaka',assets:Object.entries(pin.files).map(([name,fact])=>({id:name,path:name,bytes:fact.bytes,sha256:fact.sha256})),providers:[{id:'shaka-adaptive',implementationIdentity:identity,technology:'mixed',delivery:['optional-assets'],assetIds:Object.keys(pin.files),offers:[{capability:'media.play.adaptive',version:1,profile:'authorized-manifest'}]}]};
 let status=200;
 t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.json')?Response.json(declaration):new Response(status===200?await readFile('web/vendor/shaka-player.js'):'',{status}));
 const runtime=new ProviderRuntime(new URL('https://example.test/'),qualified.providers);
 try{await runtime.load();assert.equal(runtime.rejection('shaka-mse',{},'clear-manifest'),undefined);assert.equal(runtime.hasOffer('shaka-adaptive','authorized-manifest'),true);assert.equal((await runtime.bytes('web/vendor/shaka-player.js')).byteLength,pin.files['web/vendor/shaka-player.js'].bytes);}finally{await runtime.destroy();}
 status=404;const missing=new ProviderRuntime(new URL('https://example.test/'),qualified.providers);
 try{await assert.rejects(missing.bytes('web/vendor/shaka-player.js'),{code:'ASSET_LOAD_FAILED'});}finally{await missing.destroy();}
});
