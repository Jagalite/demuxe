// SPDX-License-Identifier: Apache-2.0
import {videoCodecConfig} from './video-codec-config.js';

// Rejection only: acceptance still requires the playback worker's actual output.
// Ambiguous tracks, missing metadata, exceptions and deadlines stay unknown.
export async function hybridPreflight(tracks,decoder=globalThis.VideoDecoder,timeoutMs=200){
 const videos=tracks.filter(t=>t.type==='video'&&!t.attachedPicture);
 if(videos.length!==1||!videos[0].browserConfig)return;
 let timer;
 try{
  const {configuration}=videoCodecConfig(videos[0].browserConfig);
  if(!decoder?.isConfigSupported)return 'Hybrid VideoDecoder is unavailable';
  const support=await Promise.race([
   decoder.isConfigSupported(configuration),
   new Promise(resolve=>{timer=setTimeout(()=>resolve(undefined),timeoutMs);}),
  ]);
  if(support?.supported===false)return `Hybrid browser configuration unsupported: ${configuration.codec} (${configuration.codedWidth} × ${configuration.codedHeight})`;
 }catch{/* Unknown is not a compatibility rejection. */}
 finally{clearTimeout(timer);}
}
