import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {SplitMP4} from '../web/split-mp4.js';
const dir=mkdtempSync(join(tmpdir(),'demuxe-split-'));
const run=(args)=>execFileSync('ffmpeg',['-v','error',...args],{maxBuffer:16*1024*1024});
const file=join(dir,'combined.mp4');
run(['-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=2','-f','lavfi','-i','sine=sample_rate=48000:duration=3.017','-c:v','libx264','-bf','2','-g','24','-c:a','flac','-strict','-2','-movflags','empty_moov+default_base_moof','-frag_duration','500000',file]);
const input=readFileSync(file),ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const packets=(file,selector)=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams',selector,'-show_packets','-show_data_hash','sha256','-of','json',file])).packets.map(({pts,dts,duration,size,flags,data_hash})=>({pts,dts,duration,size,flags,data_hash}));
test('split fragments preserve video decode order, PTS, DTS, samples and flags',()=>{
 const lanes=new SplitMP4().split(ab(input));
 for(let lane=0;lane<2;lane++){
  const output=join(dir,`lane-${lane}.mp4`);writeFileSync(output,Buffer.from(lanes[lane]));
  assert.deepEqual(packets(output,lane?'a':'v'),packets(file,lane?'a':'v'));
  if(lane)assert.deepEqual(run(['-i',output,'-f','s32le','-c:a','pcm_s32le','-']),run(['-i',file,'-map','0:a','-f','s32le','-c:a','pcm_s32le','-']));
 }
});
test('reject truncated boxes and oversized input',()=>{
 assert.throws(()=>new SplitMP4().split(ab(input.subarray(0,input.length-1))),/truncated/);
 assert.throws(()=>new SplitMP4().split(new ArrayBuffer(8*1024*1024+1)),/budget/);
});
test('initialization and fragments can arrive incrementally',()=>{
 const split=new SplitMP4(),lanes=[[],[]];let at=0;
 while(at<input.length){let end=at+input.readUInt32BE(at);if(input.toString('ascii',at+4,at+8)==='moof')end+=input.readUInt32BE(end);const output=split.split(ab(input.subarray(at,end)));output.forEach((b,i)=>lanes[i].push(Buffer.from(b)));at=end;}
 const full=new SplitMP4().split(ab(input));lanes.forEach((parts,i)=>assert.deepEqual(Buffer.concat(parts),Buffer.from(full[i])));
});

import {MP4VideoTiming} from '../web/split-mp4.js';
function verifyTiming(file,relative=false){
 const bytes=readFileSync(file),timing=new MP4VideoTiming(),frames=[];let at=0;
 while(at<bytes.length){const end=at+bytes.readUInt32BE(at);frames.push(...timing.read(ab(bytes.subarray(at,end))));at=end;}
 const reference=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v','-show_entries','packet=pts_time,duration_time','-of','json',file])).packets;
 assert.equal(frames.length,reference.length);
 frames.forEach(([pts,duration],i)=>{assert.ok(Math.abs((pts-(relative?frames[0][0]:0))-(Number(reference[i].pts_time)-(relative?Number(reference[0].pts_time):0)))<.000001);assert.ok(Math.abs(duration-Number(reference[i].duration_time))<.000001)});
 return frames;
}
test('actual muxed video intervals match decode-order packet timing',()=>{verifyTiming(file)});
test('signed composition offsets preserve presentation timing',()=>{
 const signed=join(dir,'signed.mp4');run(['-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=1','-c:v','libx264','-bf','2','-movflags','empty_moov+default_base_moof+negative_cts_offsets','-frag_duration','500000',signed]);const frames=verifyTiming(signed,true);assert.equal(frames[0][0],0);assert.ok(frames[2][0]<frames[1][0]);
});
test('timing parser rejects invalid time bases and sample/byte budgets',()=>{
 const invalid=Buffer.from(input),mdhd=invalid.indexOf(Buffer.from('mdhd'));invalid.writeUInt32BE(0,mdhd+(invalid[mdhd+4]===1?24:16));assert.throws(()=>new MP4VideoTiming().read(ab(invalid)),/time base/);
 const oversized=Buffer.from(input);oversized.writeUInt32BE(4097,oversized.indexOf(Buffer.from('trun'))+8);assert.throws(()=>new MP4VideoTiming().read(ab(oversized)),/sample budget/);
 assert.throws(()=>new MP4VideoTiming().read(new ArrayBuffer(8*1024*1024+1)),/input budget/);
 const free=Buffer.from([0,0,0,8,102,114,101,101]);assert.throws(()=>new MP4VideoTiming().read(Buffer.concat(Array(4097).fill(free))),/box budget/);
 assert.throws(()=>new MP4VideoTiming().read(ab(input.subarray(0,input.length-1))),/truncated/);
});

test('progressive Opus video edit mapping matches the demuxed presentation timeline',()=>{
 const edited=join(dir,'edited.mp4');run(['-f','lavfi','-i','testsrc2=size=160x90:rate=24:duration=2','-f','lavfi','-i','sine=sample_rate=48000:duration=2','-c:v','libx264','-bf','2','-c:a','libopus','-movflags','empty_moov+delay_moov+default_base_moof','-use_editlist','1','-frag_duration','500000',edited]);verifyTiming(edited);
});
