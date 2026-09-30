// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MatroskaReader,ContainerProfileError} from '../build/component-candidates/provider-container/src/matroska.js';
await mkdir('build/provider-container',{recursive:true});
const file='build/provider-container/copy.mkv';
execFileSync('ffmpeg',['-v','error','-y','-i','fixtures/example.mp4','-map','0:v:0','-map','0:a:0','-c','copy',file]);
const data=await readFile(file),controller=new AbortController();
const reader=await MatroskaReader.open(new Blob([data]),controller.signal);
const packets=[];for await(const p of reader.packets())packets.push(p);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',file],{maxBuffer:16*1024*1024}));
assert.equal(packets.length,probe.packets.length);
for(let i=0;i<packets.length;i++){
 const actual=packets[i],expected=probe.packets[i];
 assert.equal('SHA256:'+createHash('sha256').update(actual.data).digest('hex'),expected.data_hash);
 assert.ok(Math.abs(actual.timestampNs/1e9-Number(expected.pts_time))<1e-8);
 assert.equal(actual.track,expected.stream_index+1);
 assert.equal(actual.key,expected.flags.includes('K'));
}
controller.abort();await assert.rejects(async()=>{for await(const p of reader.packets())void p;},e=>e.name==='AbortError');
await assert.rejects(()=>MatroskaReader.open(new Blob([data.subarray(0,50)]),new AbortController().signal),ContainerProfileError);
const cancelled=new AbortController();cancelled.abort();await assert.rejects(()=>MatroskaReader.open(new Blob([data]),cancelled.signal),e=>e.name==='AbortError');
const result={scope:'finite local unlaced AVC/AAC Matroska packet equivalence only',passed:true,packets:packets.length,tracks:reader.tracks.map(t=>({number:t.number,codec:t.codec})),fixtureSHA256:createHash('sha256').update(data).digest('hex'),bytesRead:reader.bytesRead,cancelled:true,truncationRejected:true};
await mkdir('results/media-components/container-provider',{recursive:true});await writeFile('results/media-components/container-provider/packets.json',JSON.stringify(result,null,2)+'\n');console.log(result);
