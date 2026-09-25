// SPDX-License-Identifier: Apache-2.0
// Motion-bearing AAC fixture matrix; all three playback arms read one file per case.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const repo=path.resolve(import.meta.dirname,'../..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation-matrix/assets');
const fixtures=path.join(assets,'fixtures');
const resultRoot=path.resolve(process.env.RESULTS??'results/hybrid-presentation-matrix');
const source=path.join(repo,'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-aac.mkv');
const hevcSource=path.join(repo,'results/unsupported-audio-cpu/20260924-hevc-qualified/fixtures/hevc-main10-1080p30-aac.mkv');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=async(command,args)=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd:repo,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 child.stdout.on('data',bytes=>stdout+=bytes);child.stderr.on('data',bytes=>{stderr+=bytes;if(stderr.length>500000)stderr=stderr.slice(-500000);});
 child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(Error(`${command} exited ${code}: ${stderr.slice(-4000)}`)));
});
const ffprobe=async args=>JSON.parse(await run('ffprobe',['-v','error',...args,'-of','json']));
await fs.mkdir(fixtures,{recursive:true});await fs.mkdir(resultRoot,{recursive:true});
const cases=[
 {id:'h264-720p30',codec:'h264',resolution:[1280,720],fps:30,encode:['-vf','fps=30,scale=1280:720:flags=lanczos','-c:v','libx264','-preset','fast','-crf','20','-g','60','-keyint_min','60','-sc_threshold','0','-pix_fmt','yuv420p']},
 {id:'h264-1080p30',codec:'h264',resolution:[1920,1080],fps:30,encode:['-vf','fps=30','-c:v','libx264','-preset','fast','-crf','20','-g','60','-keyint_min','60','-sc_threshold','0','-pix_fmt','yuv420p']},
 {id:'h264-1080p60',codec:'h264',resolution:[1920,1080],fps:60,copy:source},
 {id:'hevc-main10-1080p30',codec:'hevc',resolution:[1920,1080],fps:30,copy:hevcSource},
 {id:'av1-1080p30',codec:'av1',resolution:[1920,1080],fps:30,encode:['-vf','fps=30','-c:v','libsvtav1','-preset','8','-crf','30','-g','60','-pix_fmt','yuv420p']},
];
const records=[];
for(const item of cases){
 const file=`${item.id}-aac.mkv`,target=path.join(fixtures,file);
 if(item.copy)await fs.copyFile(item.copy,target);
 else if(!(await fs.stat(target).catch(()=>null))){
  const args=['-hide_banner','-nostdin','-y','-i',source,'-map','0:v:0','-map','0:a:0','-t','30',...item.encode,'-c:a','copy','-map_metadata','-1','-map_chapters','-1','-f','matroska',target];
  console.log(`Encoding ${file}`);await run('ffmpeg',args);
 }
 const bytes=await fs.readFile(target);
 const media=await ffprobe(['-show_streams','-show_format',target]);
 const video=media.streams.find(stream=>stream.codec_type==='video'),audio=media.streams.find(stream=>stream.codec_type==='audio');
 if(video.codec_name!==item.codec||video.width!==item.resolution[0]||video.height!==item.resolution[1]||Math.abs(evalRate(video.avg_frame_rate)-item.fps)>.01)throw Error(`Video metadata mismatch: ${file}`);
 if(audio.codec_name!=='aac'||Number(audio.sample_rate)!==48000||audio.channels!==2)throw Error(`AAC format mismatch: ${file}`);
 const packetProbe=await ffprobe(['-select_streams','v:0','-show_packets','-show_data_hash','sha256',
  '-show_entries','packet=pts,dts,pts_time,dts_time,duration,duration_time,size,flags,data_hash',target]);
 const packets=packetProbe.packets,signature=packets.map(p=>[p.pts,p.dts,p.pts_time,p.dts_time,p.duration,p.duration_time,p.size,p.data_hash]);
 if(packets.length!==item.fps*30)throw Error(`Frame count mismatch: ${file}, ${packets.length}`);
 const videoSeconds=Math.max(...packets.map(p=>Number(p.pts_time)+Number(p.duration_time||0)))-Math.min(...packets.map(p=>Number(p.pts_time)));
 const videoPayloadBitrate=Math.round(packets.reduce((n,p)=>n+Number(p.size),0)*8/videoSeconds);
 records.push({id:item.id,file,bytes:bytes.length,sha256:sha(bytes),codec:item.codec,profile:video.profile,
  sourceWidth:video.width,sourceHeight:video.height,fps:item.fps,pixelFormat:video.pix_fmt,duration:Number(media.format.duration),
  videoPayloadBitrate,audioCodec:audio.codec_name,audioSampleRate:Number(audio.sample_rate),audioChannels:audio.channels,
  videoPacketCount:packets.length,videoPacketSignatureSha256:sha(Buffer.from(JSON.stringify(signature))),
  firstPtsDts:packets[0]&&[packets[0].pts,packets[0].dts],lastPtsDts:packets.at(-1)&&[packets.at(-1).pts,packets.at(-1).dts]});
 console.log(`${file}: ${packets.length} packets, ${records.at(-1).sha256}`);
}
function evalRate(rate){const [n,d]=rate.split('/').map(Number);return n/d;}
const manifest={schema:1,createdAt:new Date().toISOString(),assets,source,sourceSha256:sha(await fs.readFile(source)),
 hevcSource,hevcSourceSha256:sha(await fs.readFile(hevcSource)),ffmpegVersion:(await run('ffmpeg',['-version'])).split('\n')[0],
 fixtureRule:'A/B/C use the exact same file for each case; video and AAC packets are therefore byte-identical within a case.',cases:records};
await fs.writeFile(path.join(resultRoot,'fixtures.json'),JSON.stringify(manifest,null,2)+'\n');
