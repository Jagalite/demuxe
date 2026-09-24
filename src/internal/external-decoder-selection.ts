// SPDX-License-Identifier: Apache-2.0
import {webgpuDecoderSupported} from './webgpu-codecs.js';

// Internal video component choice; this never creates a public playback mode.
// Unknown WebCodecs support keeps the existing Hybrid trial.
export function chooseExternalDecoderBackend(webcodecsSupported:boolean|undefined,gpuQualified:boolean):'webcodecs'|'webgpu'|null {
  if(webcodecsSupported!==false)return 'webcodecs';
  return gpuQualified?'webgpu':null;
}
export function selectExternalDecoderBackend(codec:string,webcodecsSupported:boolean|undefined):'webcodecs'|'webgpu'|null {
  return chooseExternalDecoderBackend(webcodecsSupported,webgpuDecoderSupported(codec));
}
