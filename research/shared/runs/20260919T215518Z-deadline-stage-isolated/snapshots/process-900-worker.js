// SPDX-License-Identifier: GPL-3.0-or-later
import {videoCodecConfig,vp9RemuxConfig} from './video-codec-config.js';
import {remuxPackaging} from './remux-packaging.js';
let engine,chunks=[],bytes=0,emptyBatches=0,negotiation,splitter,timing;
const stats={calls:0,remuxMs:0,generatedBytes:0,peakBatchBytes:0,heapBytes:0};
const flush=()=>{const sole=chunks.length===1?chunks[0]:null;const reuse=sole&&sole.buffer instanceof ArrayBuffer&&sole.byteOffset===0&&sole.byteLength===sole.buffer.byteLength;const output=reuse?sole:new Uint8Array(bytes);if(!reuse){let at=0;for(const b of chunks){output.set(b,at);at+=b.length;}}stats.gatherCopiedBytes=(stats.gatherCopiedBytes||0)+(reuse?0:bytes);stats.reusedOwnedBatches=(stats.reusedOwnedBatches||0)+(reuse?1:0);chunks=[];bytes=0;stats.generatedBytes+=output.length;stats.peakBatchBytes=Math.max(stats.peakBatchBytes,output.length);return output;};
const adaptationABI=()=>{if(engine.preparationInterface!==2)throw Error('Audio preparation initialization interface mismatch; install matching runtime assets');};
const check=n=>{if(n<0)throw Error(`FFmpeg error ${n}: ${engine.UTF8ToString(engine._rm_error())}`);return n;};
self.onmessage=async({data})=>{if(data.type==='init'){const start=performance.timeOrigin+performance.now();await new Promise(r=>setTimeout(r,900));postMessage({researchBoundary:{stage:'process',start,end:performance.timeOrigin+performance.now()}});}
 try{
  const start=performance.now();
  if(data.type==='init'||data.type==='probe'){
   const {default:createRemux}=await import(data.audioAdaptation?'./engine-adaptation/remux.mjs':'./engine-remux/remux.mjs');
   engine=await createRemux({printErr:message=>postMessage({type:'log',message})});engine.parseVP9=vp9RemuxConfig;engine.io=data.mailbox;engine.raps=[];engine.tracks=[];
   if(data.type==='probe'){if(data.audioAdaptation){check(engine._rm_adapt_audio(1));adaptationABI();}check(engine._rm_probe(data.size));postMessage({type:'probed',tracks:engine.tracks,duration:engine._rm_duration(),format:engine.format});return;}
   engine.emit=b=>{bytes+=b.length;if(bytes>8*1024*1024)throw Error('Fragment budget exceeded');chunks.push(b);};
   if(data.audioAdaptation){if(!['flac','opus'].includes(data.audioAdaptation))throw Error('Unsupported adaptation profile');if(typeof engine._rm_adapt_audio!=='function')throw Error('Audio adaptation ABI unavailable');check(engine._rm_adapt_audio(data.audioAdaptation==='opus'?2:1));adaptationABI();}
   check(engine._rm_open(data.size,data.videoTrack??-1,data.audioTrack??-1));let duration=engine._rm_duration();
   const video=engine.videoConfig?videoCodecConfig({...engine.videoConfig,maxWidth:8192,maxHeight:8192}).configuration.codec:engine.UTF8ToString(engine._rm_video_codec());
   const audio=engine.UTF8ToString(engine._rm_audio_codec());
   const bounds=engine.trackBounds;
   if(data.audioAdaptation&&bounds?.videoEnd>0&&bounds?.audioEnd>0)duration=Math.max(bounds.videoEnd,bounds.audioEnd);
   if(data.audioAdaptation==='flac'&&bounds?.videoEnd>0&&bounds?.audioEnd>0&&Math.abs(bounds.videoEnd-bounds.audioEnd)>1){
    if(!engine.tracks.some(t=>t.selected&&t.type==='audio'&&['pcm_s16le','pcm_s24le'].includes(t.codec))||!engine.tracks.some(t=>t.selected&&t.type==='video'&&t.codec==='h264'))throw Error('Unsupported unequal-tail Native configuration; qualified H264 and PCM16/24 are required');
    const {SplitMP4}=await import('./split-mp4.js');splitter=new SplitMP4();engine.windowedTails=true;
   }
   const candidates=remuxPackaging(video,audio,engine.container);
   if(!candidates.length)throw Error('Selected codecs have no common browser remux packaging');
   negotiation={candidates,duration,target:data.target||0};stats.remuxMs+=performance.now()-start;
   postMessage({type:'negotiate',candidates,duration,windowed:!!splitter,trackBounds:bounds,lanes:splitter?[`video/mp4; codecs="${video}"`,`audio/mp4; codecs="${audio}"`]:undefined});
  }else if(data.type==='select-container'){
   const selected=negotiation?.candidates.find(c=>c.container===data.container);
   if(!selected)throw Error('Invalid remux container selection');
   const {duration,target}=negotiation;negotiation=null;
   if(engine.preparationInterface===2&&selected.container!=='webm'){const {MP4VideoTiming}=await import('./split-mp4.js');timing=new MP4VideoTiming();}
   check(engine._rm_set_container(selected.container==='webm'?1:0));
   check(engine._rm_start(target));const buffer=flush().buffer;stats.remuxMs+=performance.now()-start;stats.heapBytes=engine.HEAPU8.byteLength;
   const presentationFrames=timing?.read(buffer),buffers=splitter?splitter.split(buffer):undefined;
   postMessage({type:'ready',presentationFrames,duration,mime:selected.mime,tracks:engine.tracks,buffer:buffers?undefined:buffer,buffers,stats:{...stats}},buffers??[buffer]);
  }else if(data.type==='next'){
   const more=check(engine._rm_step()),buffer=flush().buffer;if(engine.adaptation)stats.adaptation={...engine.adaptation};stats.calls++;stats.remuxMs+=performance.now()-start;stats.heapBytes=engine.HEAPU8.byteLength;
   emptyBatches=buffer.byteLength?0:emptyBatches+1;
   if(more&&emptyBatches>24)throw Error('Remux random-access interval exceeds fragment production budget');
   const frames=engine.videoFrames?.splice(0)??[],raps=engine.raps.splice(0),presentationFrames=timing?.read(buffer),buffers=splitter?splitter.split(buffer):undefined;postMessage({type:'fragment',id:data.id,more,frames,presentationFrames,buffer:buffers?undefined:buffer,buffers,raps,stats:{...stats}},buffers??[buffer]);
  }else if(data.type==='close'){engine?._rm_close();postMessage({type:'closed'});close();}
 }catch(e){postMessage({type:'error',message:`${e.message||e}\n${e.stack||''}`});}
};
