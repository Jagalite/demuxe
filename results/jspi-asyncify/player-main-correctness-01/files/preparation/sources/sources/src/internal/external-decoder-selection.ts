// SPDX-License-Identifier: Apache-2.0
import {webgpuDecoderSupported} from './webgpu-codecs.js';

export type ExternalDecodeIntent=Readonly<{
  targetWidth:number|null;targetHeight:number|null;
  qualityMode:'exact'|'reduced';allowApproximation:boolean;
}>;
export const EXACT_DECODE_INTENT:ExternalDecodeIntent=Object.freeze({
  targetWidth:null,targetHeight:null,qualityMode:'exact',allowApproximation:false,
});
export function normalizeExternalDecodeIntent(intent:Partial<ExternalDecodeIntent>={}):ExternalDecodeIntent {
  if(intent===null||typeof intent!=='object'||Array.isArray(intent))throw Error('Invalid external decode intent');
  const targetWidth=intent.targetWidth??null,targetHeight=intent.targetHeight??null;
  if((targetWidth===null)!==(targetHeight===null)||
    targetWidth!==null&&(!Number.isSafeInteger(targetWidth)||targetWidth<1)||
    targetHeight!==null&&(!Number.isSafeInteger(targetHeight)||targetHeight<1)||
    !['exact','reduced'].includes(intent.qualityMode??'exact')||
    (intent.allowApproximation!==undefined&&typeof intent.allowApproximation!=='boolean'))
    throw Error('Invalid external decode intent');
  return Object.freeze({targetWidth,targetHeight,qualityMode:intent.qualityMode??'exact',
    allowApproximation:intent.allowApproximation??false});
}

// Internal video component choice; this never creates a public playback mode.
// Unknown WebCodecs support keeps the existing Hybrid trial.
export function chooseExternalDecoderBackend(webcodecsSupported:boolean|undefined,gpuQualified:boolean):'webcodecs'|'webgpu'|null {
  if(webcodecsSupported!==false)return 'webcodecs';
  return gpuQualified?'webgpu':null;
}
export function selectExternalDecoderBackend(codec:string,webcodecsSupported:boolean|undefined):'webcodecs'|'webgpu'|null {
  return chooseExternalDecoderBackend(webcodecsSupported,webgpuDecoderSupported(codec));
}
export function selectExternalDecoderConfiguration(codec:string,webcodecsSupported:boolean|undefined,intent?:Partial<ExternalDecodeIntent>){
  const backend=selectExternalDecoderBackend(codec,webcodecsSupported);
  return {backend,...(backend==='webgpu'?{decodeIntent:normalizeExternalDecodeIntent(intent)}:{})};
}
