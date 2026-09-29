// SPDX-License-Identifier: Apache-2.0
import type {CapabilityRequest} from './execution-capabilities.js';
import type {ResolvableRecipe} from './provider-resolution.js';
/** Maintained packet compositions, separate from ordered playback policy.
 * They are usable only with composition evidence for the exact source envelope,
 * browser, implementation set and ABI. No package may extend this table. */
const read = {capability:'container.read.matroska',version:1,profile:'finite-clear-av'} as const;
const mux = {capability:'container.mux.fmp4',version:1,profile:'explicit-timeline-av'} as const;
const encode = {capability:'audio.encode.flac',version:1,profile:'48khz-s24'} as const;
const decode = {
 ac3:{capability:'audio.decode.ac3',version:1,profile:'48khz-fltp'},
 eac3:{capability:'audio.decode.eac3',version:1,profile:'48khz-fltp'},
 'dts-core':{capability:'audio.decode.dts',version:1,profile:'core-48khz-fltp'},
} as const satisfies Record<string,CapabilityRequest>;
export type ComponentAudioCodec = keyof typeof decode;
export function audioRepairRecipe(codec: ComponentAudioCodec): ResolvableRecipe {
 if(!Object.prototype.hasOwnProperty.call(decode,codec))throw Error('No maintained audio repair recipe');
 const decoding=decode[codec];
 return {id:'matroska-flac24-stereo48-'+codec,requirements:[read,mux,decoding,encode],bindings:[
  {id:'fine',assignments:[{providerId:'ts-container',requirements:[read,mux]},
   {providerId:codec==='dts-core'?'audio-dts':'audio-ac3',requirements:[decoding]},
   {providerId:'audio-flac',requirements:[encode]}]},
  {id:'common',assignments:[{providerId:'ts-container',requirements:[read,mux]},
   {providerId:'audio-common',requirements:[decoding,encode]}]},
 ]};
}

export function packetCopyRecipe(): ResolvableRecipe {
 return {id:'matroska-avc-hevc-aac-copy',requirements:[read,mux],bindings:[{id:'typescript',assignments:[{providerId:'ts-container',requirements:[read,mux]}]}]};
}
