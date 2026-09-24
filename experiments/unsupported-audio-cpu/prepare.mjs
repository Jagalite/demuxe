// SPDX-License-Identifier: Apache-2.0
// Rebuild matched codec arms from one frozen 1080p source. This is research-only.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const repo=path.resolve(import.meta.dirname,'../..');
const out=path.resolve(process.env.OUT??'build/unsupported-audio-cpu-20260924');
const assets=path.join(out,'assets');
const fixtures=path.join(assets,'fixtures');
const source=path.resolve(process.env.SOURCE??'build/decoder-lowres/bbb-source.mp4');
const ffmpeg=process.env.FFMPEG??'ffmpeg';
const ffprobe=process.env.FFPROBE??'ffprobe';
const audios=(process.env.AUDIO_VARIANTS??'aac,ac3').split(',').map(value=>value.trim()).filter(Boolean);
const audioEncoders={aac:'aac',ac3:'ac3',eac3:'eac3',dts:'dca'};
const audioBitrates={aac:'192k',ac3:'192k',eac3:'192k',dts:'768k'};
for(const audio of audios)if(!audioEncoders[audio])throw Error(`Unsupported AUDIO_VARIANTS entry: ${audio}`);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

await fs.mkdir(fixtures,{recursive:true});
const run=(command,args,{capture=false}={})=>{
  const result=spawnSync(command,args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024});
  if(result.error||result.status!==0)throw Error(`${command} failed (${result.status}): ${result.error??result.stderr}`);
  return capture?result.stdout:result.stderr;
};
const probe=file=>JSON.parse(run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',file],{capture:true}));
const packetProbe=file=>JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256',
  '-show_entries','packet=pts,dts,pts_time,dts_time,duration,duration_time,size,flags,data_hash','-of','json',file],{capture:true})).packets;

const sourceInfo=probe(source);
const sourceVideo=sourceInfo.streams.find(stream=>stream.codec_type==='video');
if(!sourceVideo||sourceVideo.codec_name!=='h264'||sourceVideo.width!==1920||sourceVideo.height!==1080||sourceVideo.avg_frame_rate!=='60/1')
  throw Error(`Expected local 1080p60 H.264 source, got ${JSON.stringify(sourceVideo)}`);

const families=[];
if(process.env.SKIP_H264!=='1')families.push({name:'h264-1080p60',video:source,audioMap:'0:a:0',fps:'60/1'});
if(process.env.SKIP_HEVC!=='1'){
  const hevc=path.join(fixtures,'hevc-main10-1080p30-video.mkv');
  if(!(await fs.stat(hevc).catch(()=>null))){
    run(ffmpeg,['-hide_banner','-nostdin','-y','-i',source,'-map','0:v:0','-an','-vf','fps=30',
      '-c:v','libx265','-preset',process.env.HEVC_PRESET??'fast','-crf','23','-profile:v','main10','-pix_fmt','yuv420p10le',
      '-tag:v','hvc1','-x265-params','level-idc=4.1:repeat-headers=1:log-level=error',hevc]);
  }
  families.push({name:'hevc-main10-1080p30',video:hevc,audioMap:'1:a:0',fps:'30/1',separateAudio:true});
}

const fixtureRecords=[];
for(const family of families){
  for(const audio of audios){
    const file=`${family.name}-${audio}.mkv`,target=path.join(fixtures,file);
    const args=['-hide_banner','-nostdin','-y','-i',family.video];
    if(family.separateAudio)args.push('-i',source);
    args.push('-map','0:v:0','-map',family.audioMap,'-t','30',
      '-c:v','copy','-fps_mode','passthrough','-c:a',audioEncoders[audio],'-b:a',audioBitrates[audio],'-ar','48000','-ac','2',
      ...(audio==='dts'?['-strict','-2']:[]),
      '-map_metadata','-1','-map_chapters','-1','-metadata:s:v:0','language=und','-metadata:s:a:0','language=eng',
      '-disposition:a:0','default','-max_interleave_delta','0','-f','matroska',target);
    const existing=await fs.stat(target).then(()=>true).catch(()=>false);
    if(!(process.env.REUSE_FIXTURES==='1'&&existing))run(ffmpeg,args);
    const bytes=await fs.readFile(target),media=probe(target);
    const video=media.streams.find(stream=>stream.codec_type==='video');
    const audioStream=media.streams.find(stream=>stream.codec_type==='audio');
    const packets=packetProbe(target);
    const videoDuration=Math.max(...packets.map(packet=>Number(packet.pts_time)+Number(packet.duration_time||0)));
    const audioPackets=JSON.parse(run(ffprobe,['-v','error','-select_streams','a:0','-show_packets','-show_data_hash','sha256',
      '-show_entries','packet=data_hash,size','-of','json',target],{capture:true})).packets;
    fixtureRecords.push({family:family.name,audio,file,bytes:bytes.length,sha256:sha(bytes),
      duration:Number(media.format.duration),video:{codec:video.codec_name,profile:video.profile,width:video.width,height:video.height,
        avgFrameRate:video.avg_frame_rate,frameRate:video.r_frame_rate,pixelFormat:video.pix_fmt,level:video.level,
        packetCount:packets.length,duration:videoDuration,videoBitrate:Math.round(packets.reduce((n,p)=>n+Number(p.size),0)*8/videoDuration),
        keyframes:packets.map((packet,index)=>packet.flags?.includes('K')?index:null).filter(index=>index!==null),
        packetSignatureSha256:sha(Buffer.from(JSON.stringify(packets.map(p=>[p.pts,p.dts,p.pts_time,p.dts_time,p.duration,p.duration_time,p.size,p.data_hash]))))},
      audioStream:{codec:audioStream.codec_name,profile:audioStream.profile,sampleRate:Number(audioStream.sample_rate),channels:audioStream.channels,
        channelLayout:audioStream.channel_layout,bitrate:Number(audioStream.bit_rate??0),packetCount:audioPackets.length,
        payloadBitrate:Math.round(audioPackets.reduce((n,p)=>n+Number(p.size),0)*8/videoDuration)}});
  }
}

const byFamily=Object.groupBy(fixtureRecords,record=>record.family);
const packetIdentity={};
for(const [family,records] of Object.entries(byFamily)){
  const a=packetProbe(path.join(fixtures,records[0].file));
  const signature=p=>[p.pts,p.dts,p.pts_time,p.dts_time,p.duration,p.duration_time,p.size,p.data_hash];
  const compared=records.map(record=>({record,packets:packetProbe(path.join(fixtures,record.file))}));
  const videoComparisons=compared.map(({record,packets})=>{
    const mismatches=[];
    for(let i=0;i<Math.max(a.length,packets.length);i++)if(JSON.stringify(signature(a[i]??{}))!==JSON.stringify(signature(packets[i]??{})))mismatches.push(i);
    if(mismatches.length)throw Error(`${family}/${record.audio}: video packet mismatch count=${mismatches.length}; first=${mismatches.slice(0,8)}`);
    return {audio:record.audio,ptsDtsSizeHashMismatches:mismatches.length};
  });
  const audioFields='packet=pts,dts,pts_time,dts_time,duration,duration_time,size,flags,data_hash';
  const audioPackets=Object.fromEntries(records.map(record=>[record.audio,JSON.parse(run(ffprobe,['-v','error','-select_streams','a:0','-show_packets','-show_data_hash','sha256','-show_entries',audioFields,'-of','json',path.join(fixtures,record.file)],{capture:true})).packets]));
  const audioPayloadsDiffer=records.slice(1).every(record=>JSON.stringify(audioPackets[records[0].audio].map(p=>p.data_hash))!==JSON.stringify(audioPackets[record.audio].map(p=>p.data_hash)));
  packetIdentity[family]={videoPacketCount:a.length,ptsDtsSizeHashMismatches:videoComparisons.reduce((n,item)=>n+item.ptsDtsSizeHashMismatches,0),
    videoComparisons,
    packetSignatureSha256:records[0].video.packetSignatureSha256,videoBitrate:records.map(r=>r.video.videoBitrate),
    keyframesIdentical:records.every(record=>JSON.stringify(records[0].video.keyframes)===JSON.stringify(record.video.keyframes)),
    audioPacketCounts:Object.fromEntries(Object.entries(audioPackets).map(([codec,packets])=>[codec,packets.length])),
    audioPayloadsDiffer};
  if(!packetIdentity[family].audioPayloadsDiffer)throw Error(`${family}: encoded audio payloads unexpectedly match`);
  if(records.some(r=>r.audioStream.sampleRate!==48000||r.audioStream.channels!==2))throw Error(`${family}: audio is not matched 48k stereo`);
  if(Math.abs(records[0].duration-records[1].duration)>.050)throw Error(`${family}: container durations differ by >50ms`);
  const packetManifest={family,videoPacketCount:a.length,videoComparisons,
    ptsDtsSizeHashMismatches:packetIdentity[family].ptsDtsSizeHashMismatches,
    videoPacketIdentitySha256:packetIdentity[family].packetSignatureSha256,
    videoPackets:a.map((packet,index)=>({index,pts:packet.pts,dts:packet.dts,pts_time:packet.pts_time,dts_time:packet.dts_time,
      duration:packet.duration,duration_time:packet.duration_time,size:packet.size,data_hash:packet.data_hash,flags:packet.flags})),
    audioPackets:Object.fromEntries(Object.entries(audioPackets).map(([codec,packets])=>[codec,packets.map((packet,index)=>({index,...packet}))]))};
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,`${family}-packet-manifest.json`),JSON.stringify(packetManifest,null,2)+'\n');
}

const webDestination=path.join(assets,'demuxe','web');
await fs.mkdir(path.dirname(webDestination),{recursive:true});
await fs.cp(path.join(repo,'web'),webDestination,{recursive:true});
const demuxeFixtures=path.join(assets,'demuxe','fixtures');
await fs.mkdir(demuxeFixtures,{recursive:true});
for(const file of ['DejaVuSans.ttf','FONT-LICENSE.txt'])await fs.copyFile(path.join(repo,'fixtures',file),path.join(demuxeFixtures,file));
const revision=run('git',['rev-parse','HEAD'],{capture:true}).trim();
const runtimePaths=['generated/index.js','generated/unified-player.js','generated/internal/native-player.js','generated/internal/wasm-player.js',
  'filter-retained-engine-worker.js','retained-decoder-worker.js','retained-video.js','audio-worklet.js','engine-hybrid/player.wasm','engine-remux/remux.wasm'];
const runtime={revision,dirty:true,files:{}};
for(const relative of runtimePaths){
  const target=path.join(webDestination,relative);
  runtime.files[relative]=await fs.stat(target).then(async stat=>({bytes:stat.size,sha256:sha(await fs.readFile(target))})).catch(()=>null);
}
const result={schema:1,createdAt:new Date().toISOString(),host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},
  source:{path:source,bytes:(await fs.stat(source)).size,sha256:sha(await fs.readFile(source)),format:sourceInfo.format,video:sourceVideo},
  encoding:{audioSampleRate:48000,audioChannels:2,audioBitratesKbps:Object.fromEntries(audios.map(audio=>[audio,Number.parseInt(audioBitrates[audio],10)])),
    durationSeconds:30,videoPacketCopy:true},
  fixtures:fixtureRecords,packetIdentity,runtime};
const manifestPath=path.join(out,'fixtures.json');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(manifestPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,manifestPath,fixtures:fixtureRecords.map(record=>({file:record.file,sha256:record.sha256,duration:record.duration,
  video:record.video,audio:record.audioStream})),packetIdentity,runtime},null,2));
