// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {ResourceLoader}=await import(pathToFileURL(process.env.RESOURCE_LOADER).href);
const url='https://media.test/master.m3u8';
function setup(t){const fetch=globalThis.fetch;let version='a';
 globalThis.fetch=async(_url,options)=>{if(options.headers.get('If-Match')&&options.headers.get('If-Match')!=='"'+version+'"')return new Response('',{status:412});return new Response(new Uint8Array(1024),{headers:{'Content-Length':'1024',ETag:'"'+version+'"'}});};
 const loader=new ResourceLoader({url,streaming:{integrated:true}},null);t.after(()=>{loader.close();globalThis.fetch=fetch;});return {loader,set version(v){version=v;}};}
test('retirement waits for all active handles and keeps their validator',async t=>{
 const s=setup(t),a=await s.loader.open('/segment'),b=await s.loader.open('/segment');
 s.loader.retireIdentity('/segment');assert.equal(s.loader.identities.size,1);
 s.version='b';await assert.rejects(s.loader.open('/segment'));
 s.loader.closeHandle(a.id);assert.equal(s.loader.identities.size,1);
 s.loader.closeHandle(b.id);assert.equal(s.loader.identities.size,0);assert.equal(s.loader.retired.size,0);
 const next=await s.loader.open('/segment');assert.equal(s.loader.identities.get(next.url).etag,'"b"');
});
test('manifest retirement does not disappear behind an outstanding open',async t=>{
 const {loader}=setup(t);let release;const fetch=globalThis.fetch;
 globalThis.fetch=(...args)=>new Promise(resolve=>{release=()=>resolve(fetch(...args));});
 const pending=loader.open('/late');await new Promise(r=>setImmediate(r));loader.retireIdentity('/late');release();
 const handle=await pending;assert.equal(loader.identities.size,1);loader.closeHandle(handle.id);
 assert.equal(loader.identities.size,0);assert.equal(loader.openUrls.size,0);assert.equal(loader.retired.size,0);
});
test('a rolling source has bounded identity history beyond the old lifetime cap',async t=>{
 const {loader}=setup(t);loader.opens=9998;
 for(let i=0;i<1100;i++){const h=await loader.open('/segment-'+i);loader.closeHandle(h.id);loader.retireIdentity('/segment-'+i);}
 assert.equal(loader.identities.size,0);assert.equal(loader.stats.handles,0);assert.equal(loader.openUrls.size,0);assert.equal(loader.retired.size,0);assert.ok(loader.opens>10000);
});
test('retirement cannot bypass origin policy',t=>{const {loader}=setup(t);assert.throws(()=>loader.retireIdentity('https://other.test/x'),e=>e.kind==='policy');});
