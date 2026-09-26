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
