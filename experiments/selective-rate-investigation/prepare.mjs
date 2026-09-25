// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const video='build/selective-audio-sync/fixtures/h264-1080p60-video-only.mp4';
const fixture='build/selective-audio-sync/fixtures/rate-pulses.mkv';
const out='results/selective-rate-investigation';await fs.mkdir(out,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',video,'-f','lavfi','-i','aevalsrc=if(gte(t\\,1)*lt(mod(t\\,1)\\,0.01)\\,0.7*sin(2*PI*2000*t)\\,0):s=48000:d=30','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','ac3','-ac','2','-ar','48000','-b:a','192k','-t','30',fixture]);
const pcm=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',fixture,'-map','0:a:0','-ac','1','-ar','48000','-f','f32le','pipe:1'],{maxBuffer:16*1024*1024});
const pulses=[];let last=-48000;for(let i=0;i<pcm.length/4;i++)if(Math.abs(pcm.readFloatLE(i*4))>.12&&i-last>24000){pulses.push(i/48000);last=i;}
await fs.writeFile(out+'/pulse-reference.json',JSON.stringify(pulses,null,2)+'\n');
const packets=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,dts_time,size,data_hash','-show_data_hash','sha256','-of','json',file],{maxBuffer:16*1024*1024})).packets;
const a=packets(video),b=packets(fixture);const identical=a.length===b.length&&a.every((p,i)=>p.data_hash===b[i].data_hash&&p.size===b[i].size&&Math.abs(Number(p.pts_time)-Number(b[i].pts_time))<.0011&&(b[i].dts_time===undefined||Math.abs(Number(p.dts_time)-Number(b[i].dts_time))<.0011));
const proof={fixture,sha256:createHash('sha256').update(await fs.readFile(fixture)).digest('hex'),videoPackets:a.length,identicalPacketHashesSizesPtsAndAvailableDts:identical,missingRemuxDts:b.filter(p=>p.dts_time===undefined).length,pulseCount:pulses.length,firstPulse:pulses[0]};
await fs.writeFile(out+'/preparation.json',JSON.stringify(proof,null,2)+'\n');if(!identical)throw Error('Video identity failed');console.log(proof);
