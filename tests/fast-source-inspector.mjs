// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectFastSource} from '../web/fast-source-inspector.js';

const mp4=await readFile(new URL('../fixtures/example.mp4',import.meta.url));
const mkv=await readFile(new URL('../fixtures/m0.mkv',import.meta.url));
const file=(bytes,name)=>new File([bytes],name,{type:'application/octet-stream'});

test('one Fast Inspector qualifies simple MP4 and recognized MKV subtitles',async()=>{
 const movie=await inspectFastSource(file(mp4,'misleading.mkv'));
 assert.equal(movie.status,'qualified');
 assert.deepEqual(movie.evidence.tracks.map(t=>[t.type,t.codec]),[['video','h264'],['audio','aac']]);
 assert.ok(movie.bytesRead<mp4.length);
 const subtitles=await inspectFastSource(file(mkv,'m0.mkv'));
 assert.equal(subtitles.status,'qualified');
 assert.ok(subtitles.evidence.tracks.some(t=>t.type==='sub'&&t.codec==='ass'));
 assert.ok(subtitles.evidence.attachments?.present);
});

test('malformed and unrecognized input declines within the read budget',async()=>{
 for(const bytes of [Buffer.from('not media'),Buffer.from([255,255,255,255,109,111,111,118])]){
  const result=await inspectFastSource(file(bytes,'wrong.mp4'));
  assert.equal(result.status,'unknown');
  assert.ok(result.bytesRead<=2*1024*1024);
 }
});

test('MP4 external data references decline before Direct admission',async()=>{
 const changed=Buffer.from(mp4),at=changed.indexOf('url ',100);
 assert.ok(at>0);
 changed[at+7]=0;
 const result=await inspectFastSource(file(changed,'external.mp4'));
 assert.equal(result.status,'unknown');
 assert.match(result.reason,/External ISO data reference/);
});

test('MP4 codec-private AAC extensions and audio-entry versions require FFmpeg',async()=>{
 const extended=Buffer.from(mp4),extension=extended.indexOf(Buffer.from([0x56,0xe5,0]));
 assert.ok(extension>0);
 extended[extension+2]=0x80;
 assert.equal((await inspectFastSource(file(extended,'complex-aac.mp4'))).status,'unknown');
 const versioned=Buffer.from(mp4),entry=versioned.indexOf('mp4a',100);
 assert.ok(entry>0);
 versioned[entry+12]=1;
 assert.equal((await inspectFastSource(file(versioned,'versioned-audio.mp4'))).status,'unknown');
});

test('abort prevents Fast Inspector admission',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>inspectFastSource(file(mp4,'example.mp4'),{signal:controller.signal}),{name:'AbortError'});
});

// A compact, valid metadata-only Matroska file, plus arbitrary later elements.
const element=(id,data)=>{const size=Buffer.alloc(4);size.writeUInt32BE(0x10000000+data.length);return Buffer.concat([Buffer.from(id,'hex'),size,data]);};
const smallMKV=(later=[])=>{
 const header=element('1a45dfa3',element('4282',Buffer.from('matroska')));
 const video=element('ae',Buffer.concat([
  element('83',Buffer.from([1])),element('86',Buffer.from('V_MPEG4/ISO/AVC')),
  element('63a2',Buffer.from([1,100,0,31,255,225,0])),
  element('e0',Buffer.concat([element('b0',Buffer.from([2,128])),element('ba',Buffer.from([1,104]))])),
 ]));
 const tracks=element('1654ae6b',video);
 return Buffer.concat([header,element('18538067',Buffer.concat([tracks,...later.map(x=>x==='duplicate-tracks'?tracks:x)]))]);
};

test('one block supplies compact Matroska metadata without weakening trailing checks',async()=>{
 const clean=await inspectFastSource(file(smallMKV(),'compact.mkv'));
 assert.equal(clean.status,'qualified');assert.equal(clean.reads,1);
 const duplicate=await inspectFastSource(file(smallMKV(['duplicate-tracks']),'duplicate.mkv'));
 assert.equal(duplicate.status,'unknown');assert.match(duplicate.reason,/Ambiguous/);assert.equal(duplicate.reads,1);
 const attachment=element('1941a469',element('61a7',Buffer.concat([
  element('466e',Buffer.from('cover.jpg')),element('4660',Buffer.from('image/jpeg')),element('465c',Buffer.from([1])),
 ])));
 const nonFont=await inspectFastSource(file(smallMKV([attachment]),'cover.mkv'));
 assert.equal(nonFont.status,'unknown');assert.match(nonFont.reason,/Non-font/);
});

test('long Cluster chains fall back after eight read requests, without admitting partial metadata',async()=>{
 const clusters=Array.from({length:12},()=>element('1f43b675',Buffer.alloc(70*1024)));
 const media=file(smallMKV([...clusters,'duplicate-tracks']),'long.mkv');
 let calls=0;const source={size:media.size,slice:(...args)=>{calls++;return media.slice(...args);}};
 const result=await inspectFastSource(source);
 assert.equal(result.status,'unknown');assert.match(result.reason,/Metadata read budget/);
 assert.equal(calls,8);assert.equal(result.reads,calls);assert.equal(result.bytesRead,8*64*1024);
});

test('I/O wait does not consume the parsing budget, and abort remains terminal',async()=>{
 const media=file(smallMKV([element('1549a966',Buffer.alloc(0))]),'slow.mkv');
 let calls=0;const controller=new AbortController();
 const source={size:media.size,slice:(...args)=>({arrayBuffer:async()=>{
  calls++;await new Promise(resolve=>setTimeout(resolve,120));return media.slice(...args).arrayBuffer();
 }})};
 const phases=[];
 const result=await inspectFastSource(source,{requirements:['tracks'],onProgress:p=>phases.push(p.phase)});
 assert.equal(result.status,'satisfied');assert.equal(calls,1);
 assert.ok(result.readMs>=100);assert.ok(result.parseMs<50);
 assert.deepEqual(phases,['reading','inspecting']);
 const pending=inspectFastSource(source,{signal:controller.signal});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
});

function indexedMKV({tail=[],badCue=false,partial=true,count=4}={}) {
 const small=smallMKV(),segmentAt=small.indexOf(Buffer.from('18538067','hex'));
 const header=small.subarray(0,segmentAt),tracks=small.subarray(segmentAt+8);
 const num=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
 const seek=at=>element('114d9b74',element('4dbb',Buffer.concat([
  element('53ab',Buffer.from('1c53bb6b','hex')),element('53ac',num(at)),
 ])));
 const clusters=Array.from({length:count},()=>element('1f43b675',Buffer.alloc(70*1024)));
 let at=seek(0).length+tracks.length;
 const offsets=clusters.map(c=>{const p=at;at+=c.length;return p;});
 const extras=tail.map(x=>x==='duplicate-tracks'?tracks:x);
 const cueAt=at+extras.reduce((n,b)=>n+b.length,0);
 const cues=element('1c53bb6b',Buffer.concat(offsets.filter((_,i)=>!partial||i%2===0).map((pos,i)=>
  element('bb',element('b7',element('f1',num(badCue&&i===1?pos+32:pos)))))));
 return Buffer.concat([header,element('18538067',Buffer.concat([seek(cueAt),tracks,...clusters,...extras,cues]))]);
}

test('indexed headers close unindexed Cluster gaps in batches and retain exact metadata',async()=>{
 const result=await inspectFastSource(file(indexedMKV(),'indexed.mkv'));
 assert.equal(result.status,'qualified');assert.ok(result.reads<=8);
 assert.ok(result.reads>result.batches);assert.ok(result.bytesRead<128*1024);
 assert.deepEqual(result.evidence.tracks,(await inspectFastSource(file(smallMKV(),'small.mkv'))).evidence.tracks);
});

test('indexes never hide unindexed duplicate tracks or unsupported attachments',async()=>{
 const duplicate=await inspectFastSource(file(indexedMKV({tail:['duplicate-tracks']}),'duplicate-indexed.mkv'));
 assert.equal(duplicate.status,'unknown');assert.match(duplicate.reason,/Ambiguous/);
 const badAttachment=element('1941a469',element('61a7',Buffer.concat([
  element('466e',Buffer.from('image.png')),element('4660',Buffer.from('image/png')),element('465c',Buffer.from([1])),
 ])));
 const attachment=await inspectFastSource(file(indexedMKV({tail:[badAttachment]}),'unindexed-cover.mkv'));
 assert.equal(attachment.status,'unknown');assert.match(attachment.reason,/Non-font/);
});

test('forged index targets and oversized index payloads never qualify',async()=>{
 const forged=await inspectFastSource(file(indexedMKV({badCue:true}),'forged.mkv'));
 assert.equal(forged.status,'unknown');
 const bytes=indexedMKV(),cue=bytes.lastIndexOf(Buffer.from('1c53bb6b','hex'));
 bytes.writeUInt32BE(0x10000000+300*1024,cue+4);
 const oversized=await inspectFastSource(file(bytes,'oversized.mkv'));
 assert.equal(oversized.status,'unknown');
});

test('large indexed files hand off before issuing scattered header reads',async()=>{
 const result=await inspectFastSource(file(indexedMKV({count:100}),'large-index.mkv'));
 assert.equal(result.status,'unknown');assert.match(result.reason,/Metadata read budget/);
 assert.equal(result.reads,2);assert.ok(result.bytesRead<128*1024);
});

test('browser deadline aborts an outstanding read instead of leaving work behind',async t=>{
 const original=globalThis.FileReader;let active=0,aborted=0;
 t.after(()=>{if(original===undefined)delete globalThis.FileReader;else globalThis.FileReader=original;});
 globalThis.FileReader=class {
  readyState=0;
  readAsArrayBuffer(){this.readyState=1;active++;}
  abort(){this.readyState=2;active--;aborted++;this.onabort?.();}
 };
 const result=await inspectFastSource(file(smallMKV(),'stalled.mkv'));
 assert.equal(result.status,'unknown');assert.match(result.reason,/Metadata I\/O timeout/);
 assert.equal(active,0);assert.equal(aborted,1);assert.equal(result.reads,1);
 const controller=new AbortController(),pending=inspectFastSource(file(smallMKV(),'cancel.mkv'),{signal:controller.signal});
 controller.abort();await assert.rejects(pending,{name:'AbortError'});
 assert.equal(active,0);assert.equal(aborted,2);
});

test('a failed header batch drains and aborts its other pending browser reads',async t=>{
 const original=globalThis.FileReader;let active=0,aborted=0,calls=0;
 t.after(()=>{if(original===undefined)delete globalThis.FileReader;else globalThis.FileReader=original;});
 globalThis.FileReader=class {
  readyState=0;
  readAsArrayBuffer(blob){
   this.readyState=1;active++;const call=++calls;
   if(call<=2)void blob.arrayBuffer().then(result=>{if(this.readyState!==1)return;this.result=result;this.readyState=2;active--;this.onload?.();});
   else if(call===3)queueMicrotask(()=>{this.error=Error('Injected read failure');this.readyState=2;active--;this.onerror?.();});
  }
  abort(){this.readyState=2;active--;aborted++;this.onabort?.();}
 };
 const result=await inspectFastSource(file(indexedMKV({partial:false}),'failed-batch.mkv'));
 assert.equal(result.status,'unknown');assert.match(result.reason,/Injected read failure/);
 assert.ok(aborted>0);assert.equal(active,0);
});

test('router checklist stops before Cluster traversal and unused attachments',async()=>{
 const info=element('1549a966',Buffer.alloc(0));
 const clusters=Array.from({length:100},()=>element('1f43b675',Buffer.alloc(70*1024)));
 const result=await inspectFastSource(file(smallMKV([info,...clusters,'duplicate-tracks']),'large.mkv'),{requirements:['container','tracks']});
 assert.equal(result.status,'satisfied');assert.equal(result.reads,1);
 assert.equal(result.evidence.tracks.some(t=>t.type==='sub'),false);
 assert.deepEqual(result.available,['container','tracks']);
 // Complete duration evidence is not inferred from missing Info fields.
 const finite=await inspectFastSource(file(smallMKV([info]),'no-duration.mkv'),{requirements:['container','tracks','duration']});
 assert.equal(finite.status,'incomplete');assert.deepEqual(finite.missing,['duration']);
});

test('checklist preserves required metadata validation and reports unsupported facts',async()=>{
 const missing=await inspectFastSource(file(smallMKV(),'no-info.mkv'),{requirements:['tracks']});
 assert.equal(missing.status,'incomplete');assert.match(missing.reason,/Info absent/);
 const subtitle=await inspectFastSource(file(mkv,'m0.mkv'),{requirements:['container','tracks','duration']});
 assert.equal(subtitle.status,'satisfied');assert.equal(subtitle.reads,1);
 assert.ok(subtitle.evidence.tracks.some(t=>t.codec==='ass'));
 assert.equal(subtitle.evidence.attachments,undefined); // Not inventoried, not absence evidence.
 const config=await inspectFastSource(file(mkv,'m0.mkv'),{requirements:['decoder-config']});
 assert.equal(config.status,'incomplete');assert.deepEqual(config.missing,['decoder-config']);
});

test('processing time still has a budget after I/O completes',async t=>{
 let now=0;
 t.mock.method(performance,'now',()=>now);
 const result=await inspectFastSource(file(smallMKV([element('1549a966',Buffer.alloc(0))]),'parse-budget.mkv'),{
  requirements:['tracks'],onProgress:({phase})=>{
   if(phase==='inspecting'){
    // First call resumes the parsing clock; later checks observe elapsed work.
    let resumed=false;
    t.mock.method(performance,'now',()=>{if(!resumed){resumed=true;return now;}return now+60;});
   }
  },
 });
 assert.equal(result.status,'incomplete');assert.match(result.reason,/Metadata parsing budget/);
 assert.ok(result.parseMs>=50);
});

test('partial SeekHead cannot skip unindexed required metadata',async()=>{
 const minimal=smallMKV(),at=minimal.indexOf(Buffer.from('18538067','hex'));
 const header=minimal.subarray(0,at),tracks=minimal.subarray(at+8),info=element('1549a966',Buffer.alloc(0));
 const seek=(id,offset)=>{const n=Buffer.alloc(4);n.writeUInt32BE(offset);return element('114d9b74',element('4dbb',Buffer.concat([element('53ab',Buffer.from(id,'hex')),element('53ac',n)])));};
 for(const [id,first,last]of [['1654ae6b',info,tracks],['1549a966',tracks,info]]){
  const index=seek(id,seek(id,0).length+first.length);
  const bytes=Buffer.concat([header,element('18538067',Buffer.concat([index,first,last]))]);
  const result=await inspectFastSource(file(bytes,'partial-index.mkv'),{requirements:['container','tracks']});
  assert.equal(result.status,'satisfied',result.reason);assert.equal(result.reads,1);
 }
});

 test('Native timing evidence uses bounded tables rather than average FPS',async()=>{
  const result=await inspectFastSource(file(mp4,'sample.mp4'));
  const timing=result.evidence.tracks.find(t=>t.type==='video').frameTiming;
  assert.ok(timing.maxIntervalSeconds>0&&timing.maxIntervalSeconds<.2);
  assert.ok(timing.endTime>11&&timing.endTime<13);assert.equal(timing.startTime,0);
  for(const kind of ['oversized','zero delta','count mismatch','non-unit edit']){
   const changed=Buffer.from(mp4),stts=changed.indexOf('stts'),stsz=changed.indexOf('stsz'),elst=changed.indexOf('elst');
   if(kind==='oversized')changed.writeUInt32BE(4097,stts+8);
   if(kind==='zero delta')changed.writeUInt32BE(0,stts+16);
   if(kind==='count mismatch')changed.writeUInt32BE(1,stsz+12);
   if(kind==='non-unit edit')changed.writeUInt32BE(2<<16,elst+20);
   const probe=await inspectFastSource(file(changed,kind+'.mp4'));
   assert.equal(probe.status,'qualified',kind);assert.equal(probe.evidence.tracks.find(t=>t.type==='video').frameTiming,undefined,kind);
  }
 });
