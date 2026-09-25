// SPDX-License-Identifier: Apache-2.0
// Clone the frozen runtime. This patches only the clone used by the experiment.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const base=path.resolve('build/hybrid-presentation-matrix/assets');
const out=path.resolve('build/selective-audio-poc/assets');
const source=path.resolve('results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures');
const hash=async f=>createHash('sha256').update(await fs.readFile(f)).digest('hex');
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Anchor mismatch: '+a);return s.replace(a,b)};
await fs.cp(base,out,{recursive:true});
const f=path.join(out,'fixtures');
await fs.copyFile(path.join(source,'h264-1080p60-ac3.mkv'),path.join(f,'h264-1080p60-ac3.mkv'));
const mp4=path.join(f,'h264-1080p60-video-only.mp4');
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(source,'h264-1080p60-ac3.mkv'),'-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',mp4],{stdio:'inherit'});
const web=path.join(out,'demuxe/web');
let worker=await fs.readFile(path.join(web,'filter-retained-engine-worker.js'),'utf8');
worker=replace(worker,"const attributionNoDraw=new URL(self.location.href).searchParams.get('attributionNoDraw')==='1';",
 "const attributionNoDraw=new URL(self.location.href).searchParams.get('attributionNoDraw')==='1';\nconst audioOnly=new URL(self.location.href).searchParams.get('audioOnly')==='1';");
worker=replace(worker,"    const renderStart=performance.now();\n    const ptr = engine._web_render",`    if(audioOnly){ticks++;
      if(performance.now()>=nextDiagnostics){nextDiagnostics=performance.now()+200;
        post({type:'diagnostics',data:{audioOnly:true,pumpTicks:ticks,decoder:'none',decoderBackend:'none',
          videoRenderCalls:0,videoDecoderWorker:false,visibleCanvas:false,presenter:null,
          io:ioStats,position,queuedFrames:(Atomics.load(audio,0)-Atomics.load(audio,1))>>>0}});}
      return;
    }
    const renderStart=performance.now();
    const ptr = engine._web_render`);
worker=replace(worker,"decoderBackend=data.decoder==='webgpu'?'webgpu':data.decoder==='webcodecs'?'webcodecs':'ffmpeg';",
 "decoderBackend=audioOnly?'ffmpeg':data.decoder==='webgpu'?'webgpu':data.decoder==='webcodecs'?'webcodecs':'ffmpeg';");
worker=replace(worker,"if(decoderBackend!=='webgpu'){", "if(!audioOnly&&decoderBackend!=='webgpu'){");
worker=replace(worker,"if(data.decoder==='webcodecs'){", "if(data.decoder==='webcodecs'&&!audioOnly){");
await fs.writeFile(path.join(web,'selective-audio-worker.js'),worker);
let player=await fs.readFile(path.join(web,'generated/internal/wasm-player.js'),'utf8');
player=replace(player,"mode === 'hybrid' ? `web/filter-retained-engine-worker.js?mode=retained&attributionNoDraw=${globalThis.__hybridGapNoDraw ? 1 : 0}`",
 "mode === 'hybrid' ? (globalThis.__selectiveAudioPoC ? 'web/selective-audio-worker.js?mode=retained&audioOnly=1' : `web/filter-retained-engine-worker.js?mode=retained&attributionNoDraw=${globalThis.__hybridGapNoDraw ? 1 : 0}`)");
await fs.writeFile(path.join(web,'generated/internal/wasm-player.js'),player);
const ffprobe=f=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,dts_time,size,flags,data_hash','-show_data_hash','sha256','-of','json',f],{maxBuffer:16*1024*1024}));
const left=ffprobe(path.join(source,'h264-1080p60-ac3.mkv')).packets,right=ffprobe(mp4).packets;
const failures=[];
if(left.length!==right.length)failures.push('packet count');
for(let i=0;i<Math.min(left.length,right.length);i++){
 for(const k of ['size','data_hash','flags'])if(left[i][k]!==right[i][k])failures.push(`${i}:${k}`);
 for(const k of ['pts_time','dts_time'])if(Math.abs(Number(left[i][k])-Number(right[i][k]))>.001)failures.push(`${i}:${k}`);
}
const proof={sourceSha256:await hash(path.join(source,'h264-1080p60-ac3.mkv')),
 aacSha256:await hash(path.join(source,'h264-1080p60-aac.mkv')),
 remuxSha256:await hash(mp4),sourcePackets:left.length,remuxPackets:right.length,mismatches:failures.slice(0,20),
 command:'ffmpeg -i h264-1080p60-ac3.mkv -map 0:v:0 -c:v copy -an -movflags +faststart h264-1080p60-video-only.mp4',
 runtime:{source:base,audioWorkerSha256:await hash(path.join(web,'selective-audio-worker.js')),
 playerShimSha256:await hash(path.join(web,'generated/internal/wasm-player.js')),
 unchangedHybridEngine:await hash(path.join(web,'engine-hybrid/player.wasm'))===await hash(path.join(base,'demuxe/web/engine-hybrid/player.wasm')),
 unchangedAudioWorklet:await hash(path.join(web,'audio-worklet.js'))===await hash(path.join(base,'demuxe/web/audio-worklet.js'))}};
await fs.writeFile('results/selective-audio-poc/preparation.json',JSON.stringify(proof,null,2)+'\n');
if(failures.length)throw Error('Video packet identity mismatch: '+failures.slice(0,5));
console.log(JSON.stringify(proof,null,2));
