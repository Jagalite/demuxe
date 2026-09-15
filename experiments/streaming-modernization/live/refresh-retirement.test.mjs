import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {ResourceLoader}=await import(pathToFileURL(process.env.RESOURCE_LOADER).href);
function setup(t){
 const old=globalThis.fetch;let version='a',serial=0;const requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url:String(url),match:options.headers.get('If-Match')});
  if(new URL(url).pathname==='/segment')return new Response('',{status:401});
  return new Response(new Uint8Array(1024),{headers:{'Content-Length':'1024',ETag:'"'+version+'"'}});
 };
 const loader=new ResourceLoader({url:'https://media.test/master.m3u8',streaming:{integrated:true}},async()=>({url:`https://media.test/signed-${++serial}`}));
 t.after(()=>{loader.close();globalThis.fetch=old;});return {loader,requests,set version(v){version=v;}};
}
test('refreshed fetch URLs retain one logical identity and drain pending opens',async t=>{
 const {loader}=setup(t),a=await loader.open('/segment'),b=await loader.open('/segment');
 assert.notEqual(a.url,b.url);assert.equal(loader.openUrls.size,0);assert.equal(loader.identities.size,1);
 loader.retireIdentity('/segment');loader.closeHandle(a.id);assert.equal(loader.identities.size,1);
 loader.closeHandle(b.id);assert.equal(loader.identities.size,0);assert.equal(loader.retired.size,0);
});
test('authorization URL rotation cannot admit a changed representation',async t=>{
 const s=setup(t),a=await s.loader.open('/segment');s.loader.closeHandle(a.id);s.version='b';
 await assert.rejects(s.loader.open('/segment'),e=>e.kind==='identity');
 assert.equal(s.loader.openUrls.size,0);assert.equal(s.loader.stats.handles,0);
});
test('retirement during authorization refresh waits for the logical open',async t=>{
 const s=setup(t);let release;s.loader.transport.refresh=()=>new Promise(r=>release=()=>r({url:'https://media.test/refreshed'}));
 const pending=s.loader.open('/segment');while(!release)await new Promise(r=>setImmediate(r));
 s.loader.retireIdentity('/segment');release();const handle=await pending;
 assert.equal(s.loader.identities.size,1);s.loader.closeHandle(handle.id);
 assert.equal(s.loader.identities.size,0);assert.equal(s.loader.openUrls.size,0);assert.equal(s.loader.retired.size,0);
});
