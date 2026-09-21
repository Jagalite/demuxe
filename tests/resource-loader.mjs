// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {ResourceLoader} from '../web/resource-loader.js';
const encode=s=>new TextEncoder().encode(s);
const options={url:'https://media.example/catalog/root.m3u8',format:'hls'};
const playlist='#EXTM3U\n#EXTINF:2,\npart.ts\n#EXT-X-ENDLIST\n';
const originalFetch=globalThis.fetch;
function mock(fn){globalThis.fetch=fn;}
test.afterEach(()=>{globalThis.fetch=originalFetch;});
test('ordinary 200 resource, relative URL, bounded reads and close accounting',async()=>{
  mock(async(url,init)=>{assert.equal(url,'https://media.example/catalog/part.ts');assert.equal(init.headers.has('Range'),false);return new Response(encode('abcdef'));});
  const loader=new ResourceLoader(options);const info=await loader.open('part.ts');
  assert.equal(info.size,'6');assert.equal(new TextDecoder().decode(loader.read(info.id,2n,2)),'cd');
  assert.equal(loader.read(info.id,6n,2).length,0);assert.equal(loader.stats.retainedBytes,6);
  loader.closeHandle(info.id);assert.equal(loader.stats.handles,0);assert.equal(loader.stats.retainedBytes,0);loader.close();
});
test('explicit range preserves absolute resource offsets and total size',async()=>{
  mock(async(url,init)=>{assert.equal(init.headers.get('Range'),'bytes=10-13');return new Response('abcd',{status:206,headers:{'Content-Range':'bytes 10-13/100','Content-Length':'4'}});});
  const loader=new ResourceLoader(options);const info=await loader.open('part.m4s',{start:10n,end:14n});
  assert.equal(info.size,'100');assert.equal(new TextDecoder().decode(loader.read(info.id,11n,2)),'bc');
  assert.throws(()=>loader.read(info.id,0n,1));loader.close();
});
test('requested ranges reject 200, malformed ranges and changed lengths',async()=>{
  for(const response of [new Response('abcd'),new Response('abcd',{status:206,headers:{'Content-Range':'bytes 9-12/100'}}),new Response('abcd',{status:206,headers:{'Content-Range':'bytes 10-13/100','Content-Length':'3'}})]){
    mock(async()=>response);const loader=new ResourceLoader(options);await assert.rejects(loader.open('x',{start:10n,end:14n}));loader.close();
  }
});
test('origin, protocol, embedded credentials and URL length are checked before fetch',async()=>{
  let requests=0;mock(async()=>{requests++;return new Response('x');});const loader=new ResourceLoader(options);
  for(const value of ['https://evil.example/x','file:///x','data:text/plain,x','https://u:p@media.example/x','x'.repeat(4097)])await assert.rejects(loader.open(value));
  assert.equal(requests,0);loader.close();
});
test('nested authorization refresh receives resource URL and updates only that request',async()=>{
  const urls=[];mock(async(url,init)=>{urls.push(url);return init.headers.get('Authorization')==='Bearer new'?new Response('ok'):new Response('no',{status:401});});
  const loader=new ResourceLoader(options,async resource=>{assert.equal(resource.url,'https://media.example/catalog/part.ts');return {headers:{Authorization:'Bearer new'}};});
  await loader.open('part.ts');assert.deepEqual(urls,['https://media.example/catalog/part.ts','https://media.example/catalog/part.ts']);loader.close();
});
test('refresh cannot redirect credentials to an unapproved origin',async()=>{
  mock(async()=>new Response('no',{status:401}));const loader=new ResourceLoader(options,async()=>({url:'https://evil.example/part.ts'}));
  await assert.rejects(loader.open('part.ts'),/not allowed/);loader.close();
});
test('bounded transient HTTP retry and truncation recovery',async()=>{
  let calls=0;mock(async()=>++calls===1?new Response('retry',{status:503}):calls===2?new Response('x',{headers:{'Content-Length':'2'}}):new Response('ok'));
  const loader=new ResourceLoader(options);const info=await loader.open('part.ts');assert.equal(info.length,2);assert.equal(loader.stats.retries,2);loader.close();
});
test('unknown-length bodies cannot exceed media resource cap',async()=>{
  mock(async()=>new Response(new Uint8Array(8*1024*1024+1)));const loader=new ResourceLoader(options);
  await assert.rejects(loader.open('part.ts'),/size limit/);assert.equal(loader.stats.retainedBytes,0);loader.close();
});
test('aggregate retention limit is enforced across handles and reclaimed on close',async()=>{
  mock(async()=>new Response(new Uint8Array(8*1024*1024)));const loader=new ResourceLoader(options);
  const a=await loader.open('a.ts');await loader.open('b.ts');await assert.rejects(loader.open('c.ts'),/memory budget/);
  loader.closeHandle(a.id);await loader.open('c.ts');assert.equal(loader.stats.peakRetainedBytes,16*1024*1024);loader.close();assert.equal(loader.stats.retainedBytes,0);
});
test('handle count is bounded independently of body size',async()=>{
  mock(async()=>new Response('x'));const loader=new ResourceLoader(options);for(let i=0;i<16;i++)await loader.open(`${i}.ts`);
  await assert.rejects(loader.open('next.ts'),/count limit/);loader.close();
});
test('destroy cancels pending authorization and rejects stale completion',async()=>{
  mock(async()=>new Response('no',{status:401}));let refreshStarted;const started=new Promise(r=>refreshStarted=r);
  const loader=new ResourceLoader(options,()=>{refreshStarted();return new Promise(()=>{});});
  const request=loader.open('part.ts');await started;loader.close();await assert.rejects(request,{name:'AbortError'});assert.equal(loader.stats.handles,0);
});
test('epoch cancellation discards a response even if transport ignores abort',async()=>{
  let respond;mock(()=>new Promise(r=>respond=r));const loader=new ResourceLoader(options);const request=loader.open('part.ts');
  loader.beginEpoch();respond(new Response('late'));await assert.rejects(request,{name:'AbortError'});assert.equal(loader.stats.handles,0);loader.close();
});
test('live sessions keep per-open budgets without a finite lifetime request cap',async()=>{
 mock(async()=>new Response('part'));const live=new ResourceLoader({...options,streaming:{live:true}});live.stats.opens=10000;const info=await live.open('part.ts');assert.equal(info.length,4);live.close();
 const vod=new ResourceLoader(options);vod.stats.opens=10000;await assert.rejects(vod.open('part.ts'),/count limit/);vod.close();
});

test('HLS and DASH reach FFmpeg byte-for-byte without selecting variants',async()=>{
 const manifests=[
  ['hls','#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\na.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2\nb.m3u8\n'],
  ['dash','<MPD type="static"><Period><AdaptationSet><Representation id="low"/><Representation id="high"/></AdaptationSet></Period></MPD>']
 ];
 for(const [format,text] of manifests){
  mock(async()=>new Response(text));const loader=new ResourceLoader({...options,format});
  const info=await loader.open(options.url,{manifest:true});assert.deepEqual(loader.read(info.id,0n,262144),encode(text));loader.close();
 }
});
test('manifest transport has a smaller resource budget and validates extensionless manifests',async()=>{
 mock(async()=>new Response(new Uint8Array(1024*1024+1)));const loader=new ResourceLoader(options);
 await assert.rejects(loader.open(options.url,{manifest:true}),/size limit/);
 mock(async()=>new Response(playlist.replace('#EXT-X-ENDLIST','')));
 await assert.rejects(loader.open('manifest?token=x'),/streaming.live/);loader.close();
});
test('fallback rejects quality constraints before any request or credential use',()=>{
 let calls=0;mock(async()=>{calls++;return new Response(playlist);});
 for(const streaming of [{representation:'0'},{maxBandwidth:1000000}])assert.throws(()=>new ResourceLoader({...options,streaming}),/cannot preserve/);
 assert.equal(calls,0);
});
test('retired subtitle stitching is rejected without prefetching media',async()=>{
 const master='#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",URI="subs.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,SUBTITLES="s"\nvideo.m3u8\n';
 let calls=0;mock(async()=>{calls++;return new Response(master);});const loader=new ResourceLoader(options);
 await assert.rejects(loader.open(options.url,{manifest:true}),/subtitle semantics/);assert.equal(calls,1);assert.equal(loader.stats.handles,0);loader.close();
});

test('preview resource fetch retains low priority and independent ownership',async()=>{
  const priorities=[];mock(async(url,init)=>{priorities.push(init.priority);return new Response('ok');});
  const playback=new ResourceLoader(options),preview=new ResourceLoader({...options,priority:'low'});
  await playback.open('playback.ts');await preview.open('preview.ts');preview.close();
  assert.deepEqual(priorities,['auto','low']);assert.equal(playback.stats.retainedBytes,2);playback.close();
});
