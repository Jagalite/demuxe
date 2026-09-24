// SPDX-License-Identifier: Apache-2.0
import {videoCodecConfig} from './video-codec-config.js';
import {webgpuDecoderSupported} from './generated/internal/webgpu-codecs.js';

// Rejection only: acceptance still requires the playback worker's actual output.
// Ambiguous tracks, missing metadata, exceptions and deadlines stay unknown.
export async function hybridPreflight(tracks,decoder=globalThis.VideoDecoder,timeoutMs=200,gpuQualified=webgpuDecoderSupported){
 const videos=tracks.filter(t=>t.type==='video'&&!t.attachedPicture);
 if(videos.length!==1)return;
 if(!videos[0].browserConfig){
  // A registered external codec can proceed without a WebCodecs bitstream
  // configuration. The adapter receives mpv's codec parameters instead.
  if(gpuQualified(videos[0].codec))videos[0].webCodecsSupported=false;
  return;
 }
 let timer;
 try{
  const {configuration}=videoCodecConfig(videos[0].browserConfig);
  if(!decoder?.isConfigSupported){videos[0].webCodecsSupported=false;return gpuQualified(videos[0].codec)?undefined:'Hybrid VideoDecoder is unavailable';}
  const support=await Promise.race([
   decoder.isConfigSupported(configuration),
   new Promise(resolve=>{timer=setTimeout(()=>resolve(undefined),timeoutMs);}),
  ]);
  if(typeof support?.supported==='boolean')videos[0].webCodecsSupported=support.supported;
  if(support?.supported===false&&!gpuQualified(videos[0].codec))return `Hybrid browser configuration unsupported: ${configuration.codec} (${configuration.codedWidth} × ${configuration.codedHeight})`;
 }catch{/* Unknown is not a compatibility rejection. */}
 finally{clearTimeout(timer);}
}
