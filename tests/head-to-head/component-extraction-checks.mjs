// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {matroskaCaptions,mp4Captions} from './component-trials.mjs';
const assets=process.argv[2];
const results=[];
for(const [id,ext,parse] of [['h264-srt','mkv',matroskaCaptions],['h264-ass','mkv',matroskaCaptions],['h264-movtext','mp4',mp4Captions]]){
 const file=`${assets}/fixtures/${id}/index.${ext}`,b=await fs.readFile(file),bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.length),x=parse(bytes);
 const oracle=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','s:0','-show_packets','-show_data','-of','json',file],{encoding:'utf8'}));
 const packets=oracle.packets.filter(p=>Number(p.size)>2);
 assert.equal(x.cues.length,packets.length);
 for(let i=0;i<x.cues.length;i++){
  assert.ok(Math.abs(x.cues[i].start-Number(packets[i].pts_time))<.00001);
  assert.ok(Math.abs(x.cues[i].end-x.cues[i].start-Number(packets[i].duration_time))<.00001);
 }
 if(ext==='mkv'&&id==='h264-ass'){
  const reference=execFileSync('ffmpeg',['-nostdin','-v','error','-i',file,'-map','0:s:0','-c:s','ass','-f','ass','-'],{encoding:'utf8'});
  assert.equal(x.text.trim(),reference.trim());
 }else assert.equal(x.cues[0].text,'DE MUXE TEST 123');
 let negatives=0;
 for(const n of [0,1,8,Math.floor(b.length/2),b.length-1]){assert.throws(()=>parse(bytes.slice(0,n)));negatives++;}
 results.push({id,cues:x.cues,readBytes:x.readBytes,oracle,negativeTruncationsRejected:negatives,passed:true});
}
console.log(JSON.stringify({scope:'Finite authored fixture extraction; no general parser qualification',results},null,2));
