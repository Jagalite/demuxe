import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const base=process.env.TRANSPORT_WEB;
if(!base)throw Error('Set TRANSPORT_WEB to the web directory of a prepared snapshot');
const {ResourceLoader}=await import(pathToFileURL(resolve(base,'resource-loader.js')));
const options={url:'https://media.example/root.m3u8',format:'hls'};
const encode=s=>new TextEncoder().encode(s), decode=b=>new TextDecoder().decode(b);
function mock(t, fn){const old=globalThis.fetch;globalThis.fetch=fn;t.after(()=>globalThis.fetch=old);}
function loader(t,opts=options){const item=new ResourceLoader(opts);t.after(()=>item.close());return item;}
const playlist='#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\npart.ts\n#EXT-X-ENDLIST\n';
test('many short reads assemble a bounded body and release scratch reservations',async t=>{
 const size=128*1024;let remaining=size;
 mock(t,async()=>new Response(new ReadableStream({pull(c){if(!remaining)return c.close();remaining--;c.enqueue(Uint8Array.of(120));}},{highWaterMark:0})));
 const l=loader(t);const bytes=await l.readAll(options.url);
 assert.equal(bytes.length,size);assert.ok(bytes.every(b=>b===120));
 assert.equal(l.stats.scratchReservedBytes,0);assert.equal(l.stats.handles,0);
 assert.ok(l.stats.peakScratchReservedBytes<=2*1024*1024);
 assert.ok(l.stats.peakBudgetedBytes<=16*1024*1024);
});
test('manifest scratch shares the retained resource budget before allocating',async t=>{
 mock(t,async()=>new Response(new ReadableStream({pull(c){c.enqueue(Uint8Array.of(120));c.close();}},{highWaterMark:0})));
 const l=loader(t);l.materialize('https://media.example/held',new Uint8Array(15*1024*1024));
 await assert.rejects(l.readAll(options.url),/budget/);
 assert.equal(l.stats.scratchReservedBytes,0);assert.equal(l.transport.stats.handles,0);
});
test('short chunks recognize a manifest without a filename extension',async t=>{
 const body=encode(playlist);let at=0;
 mock(t,async()=>new Response(new ReadableStream({pull(c){if(at===body.length)c.close();else c.enqueue(body.slice(at,++at));}},{highWaterMark:0})));
 const l=loader(t);const info=await l.open('/signed');assert.equal(info.seekable,true);
 assert.ok(decode(await l.read(info.id,0n,262144)).includes('part.ts'));
});
test('media opens before body completion and remains forward-only',async t=>{
 let finish,cancelled=false;
 mock(t,async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(1024));finish=()=>c.close();},cancel(){cancelled=true;}},{highWaterMark:0})));
 const l=loader(t),info=await l.open('/part.ts');assert.equal(info.size,'-1');assert.equal(info.seekable,false);
 assert.equal((await l.read(info.id,0n,512)).length,512);
 await assert.rejects(l.read(info.id,0n,512),/forward-only/);
 assert.equal((await l.read(info.id,512n,512)).length,512);
 finish();assert.equal((await l.read(info.id,1024n,512)).length,0);
 l.close();assert.equal(l.stats.retainedBytes,0);assert.equal(l.stats.handles,0);
});
test('bounded progressive media larger than former 8 MiB cap',async t=>{
 let remaining=12*1024*1024;
 mock(t,async()=>new Response(new ReadableStream({pull(c){if(!remaining)return c.close();const n=Math.min(65536,remaining);remaining-=n;c.enqueue(new Uint8Array(n));}},{highWaterMark:0})));
 const l=loader(t),info=await l.open('/large.m4s');let n=0;
 for(;;){const b=await l.read(info.id,BigInt(n),262144);if(!b.length)break;n+=b.length;}
 assert.equal(n,12*1024*1024);assert.ok(l.stats.peakRetainedBytes<=66048);l.close();assert.equal(l.stats.retainedBytes,0);
});
test('native ranges retain absolute offsets without random access',async t=>{
 mock(t,async()=>new Response('abcd',{status:206,headers:{'Content-Range':'bytes 10-13/100','Content-Length':'4'}}));
 const l=loader(t),info=await l.open('/part.m4s',{start:10n,end:14n});
 assert.equal(info.size,'100');assert.equal(info.start,'10');assert.equal(info.seekable,false);
 assert.equal(decode(await l.read(info.id,10n,4)),'abcd');assert.equal((await l.read(info.id,14n,4)).length,0);
});
test('materialized manifests and virtual subtitles retain bounded seeking',async t=>{
 mock(t,async()=>new Response(playlist));const l=loader(t),info=await l.open(options.url,{manifest:true});
 assert.equal(info.seekable,true);assert.equal(decode(await l.read(info.id,0n,7)),'#EXTM3U');
 assert.equal(decode(await l.read(info.id,1n,3)),'EXT');
 l.storeVirtual([['https://media.example/a.vtt',encode('abcdef')]]);
 const sub=await l.open('/a.vtt',{start:2n,end:5n});assert.equal(decode(await l.read(sub.id,2n,20)),'cde');
 assert.throws(()=>l.storeVirtual([['https://media.example/b',new Uint8Array(4*1024*1024)]]),/budget/);assert.equal(l.virtual.size,1);
});
test('segmented subtitle compatibility preserves timestamp mapping',async t=>{
 const master='#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",URI="subs.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,SUBTITLES="s"\nvideo.m3u8\n';
 const sub='#EXTM3U\n#EXTINF:2,\nfirst.vtt\n#EXTINF:2,\nsecond.vtt\n#EXT-X-ENDLIST\n';
 mock(t,async url=>new Response(url.endsWith('root.m3u8')?master:url.endsWith('subs.m3u8')?sub:`WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:${url.endsWith('first.vtt')?0:180000}\n\n00:00:00.100 --> 00:00:01.900\nCaption\n`));
 const l=loader(t);await l.open(options.url,{manifest:true});const info=await l.open('/subs.m3u8');
 const uri=decode(await l.read(info.id,0n,262144)).split('\n').find(l=>l.startsWith('https:'));
 const combined=await l.open(uri),text=decode(await l.read(combined.id,0n,262144));
 assert.ok(text.includes('00:00:02.100'));assert.equal(text.match(/Caption/g).length,2);
});
test('epoch cancellation rejects pending reads and does not accept late bytes',async t=>{
 let push;mock(t,async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(512));push=c;}},{highWaterMark:0})));
 const l=loader(t),info=await l.open('/part.ts');await l.read(info.id,0n,512);
 const before=l.stats.consumedBytes,pending=l.read(info.id,512n,10);l.beginEpoch();
 await assert.rejects(pending,e=>e.kind==='cancelled');assert.equal(l.stats.consumedBytes,before);
 l.close();assert.equal(l.stats.retainedBytes,0);assert.equal(l.stats.handles,0);
});
test('destroy during initial sniff closes both resource identities',async t=>{
 let started;const ready=new Promise(r=>started=r);
 mock(t,async()=>new Response(new ReadableStream({pull(){started();return new Promise(()=>{});}},{highWaterMark:0})));
 const l=loader(t),pending=l.open('/part.ts');await ready;l.close();await assert.rejects(pending,e=>e.kind==='cancelled');
 assert.equal(l.stats.handles,0);assert.equal(l.transport.stats.handles,0);assert.equal(l.stats.retainedBytes,0);
});
test('partial declared resource never becomes successful EOF',async t=>{
 mock(t,async()=>new Response(new Uint8Array(1024),{headers:{'Content-Length':'2048'}}));
 const l=loader(t),info=await l.open('/part.ts');await l.read(info.id,0n,512);await l.read(info.id,512n,512);
 await assert.rejects(l.read(info.id,1024n,512),e=>e.kind==='truncated');
});

test('random access is advertised only with length, byte ranges and a strong validator',async t=>{
 const calls=[],data=new Uint8Array(8192).map((_,i)=>i%251);
 mock(t,async(url,{headers})=>{const m=/^bytes=(\d+)-(\d+)$/.exec(headers.get('Range')??'');calls.push({range:headers.get('Range'),match:headers.get('If-Match')});const start=m?Number(m[1]):0,end=m?Number(m[2])+1:data.length;return new Response(data.slice(start,end),{status:m?206:200,headers:{ETag:'"v1"','Accept-Ranges':'bytes','Content-Length':String(end-start),...(m?{'Content-Range':`bytes ${start}-${end-1}/${data.length}`}:{})}});});
 const l=loader(t),info=await l.open('/range.mp4');assert.equal(info.seekable,true);
 const bytes=await l.read(info.id,4096n,128);assert.deepEqual(bytes,data.subarray(4096,4224));
 assert.deepEqual(calls[1],{range:'bytes=4096-8191',match:'"v1"'});
 await l.read(info.id,100n,128);assert.equal(calls[2].match,'"v1"');
});

test('a paused expired response resumes from consumed bytes with the same validator',async t=>{
 const calls=[];mock(t,async(url,{headers})=>{const start=Number(/^bytes=(\d+)-/.exec(headers.get('Range')??'')?.[1]??0);calls.push({start,match:headers.get('If-Match')});return new Response(start?new Uint8Array(4096-start).fill(8):new ReadableStream({start(c){c.enqueue(new Uint8Array(512).fill(8));}}),{status:start?206:200,headers:{ETag:'"fixed"','Accept-Ranges':'bytes','Content-Length':String(4096-start),...(start?{'Content-Range':`bytes ${start}-4095/4096`}:{})}});});
 const l=loader(t);l.transport.limits.absoluteMs=30;const info=await l.open('/range.mp4');await l.read(info.id,0n,512);
 await new Promise(r=>setTimeout(r,40));const bytes=await l.read(info.id,512n,128);assert.equal(bytes.length,128);assert.ok(bytes.every(x=>x===8));assert.deepEqual(calls[1],{start:512,match:'"fixed"'});
});

test('a range reopen rejects changed bytes identity before delivery',async t=>{
 let calls=0;mock(t,async(url,{headers})=>{calls++;const start=Number(/^bytes=(\d+)-/.exec(headers.get('Range')??'')?.[1]??0);return new Response(new Uint8Array(4096-start),{status:start?206:200,headers:{ETag:calls===1?'"v1"':'"v2"','Accept-Ranges':'bytes','Content-Length':String(4096-start),...(start?{'Content-Range':`bytes ${start}-4095/4096`}:{})}});});
 const l=loader(t),info=await l.open('/range.mp4');await assert.rejects(l.read(info.id,1024n,128),e=>e.kind==='identity');assert.equal(l.stats.consumedBytes,0);
});

test('rolling manifests are mutable and do not enter immutable media identity state',async t=>{
 let calls=0;mock(t,async()=>new Response(playlist+'\n'.repeat(++calls),{headers:{ETag:`"manifest-${calls}"`}}));
 const l=loader(t);await l.open(options.url,{manifest:true});await l.open(options.url,{manifest:true});assert.equal(l.stats.identityRecords,0);
});
