// SPDX-License-Identifier: Apache-2.0
import type {CapabilityRequest} from './execution-capabilities.js';
import type {ResolvableRecipe} from './provider-resolution.js';
/** Maintained packet compositions, separate from ordered playback policy.
 * They are usable only with composition evidence for the exact source envelope,
 * browser, implementation set and ABI. No package may extend this table. */
const read = {capability:'container.read.matroska',version:1,profile:'finite-clear-av'} as const;
const mux = {capability:'container.mux.fmp4',version:1,profile:'explicit-timeline-av'} as const;
const opusEncode = {capability:'audio.encode.opus',version:1,profile:'48khz-mono-stereo'} as const;
const encode = {capability:'audio.encode.flac',version:1,profile:'48khz-s24'} as const;
const decode = {
 ac3:{capability:'audio.decode.ac3',version:1,profile:'48khz-fltp'},
 eac3:{capability:'audio.decode.eac3',version:1,profile:'48khz-fltp'},
 'dts-core':{capability:'audio.decode.dts',version:1,profile:'core-48khz-fltp'},
 truehd:{capability:'audio.decode.truehd',version:1,profile:'48khz-integer'},
 mlp:{capability:'audio.decode.mlp',version:1,profile:'48khz-integer'},
 'dts-hd':{capability:'audio.decode.dts',version:1,profile:'ma-48khz-s32p'},
 aac:{capability:'audio.decode.aac',version:1,profile:'lc-48khz-stereo'},
 opus:{capability:'audio.decode.opus',version:1,profile:'48khz-stereo'},
 vorbis:{capability:'audio.decode.vorbis',version:1,profile:'48khz-stereo'},
 flac:{capability:'audio.decode.flac',version:1,profile:'48khz-integer'},
 alac:{capability:'audio.decode.alac',version:1,profile:'48khz-integer'},
 mp3:{capability:'audio.decode.mp3',version:1,profile:'48khz-stereo'},
 'pcm-s16le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-s24le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-s32le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-f32le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-f64le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
} as const satisfies Record<string,CapabilityRequest>;
export type ComponentAudioCodec = keyof typeof decode;
export function audioRepairRecipe(codec: ComponentAudioCodec, channels: 2|6|8 = 2, output: 'flac'|'opus' = 'flac'): ResolvableRecipe {
 if(!Object.prototype.hasOwnProperty.call(decode,codec))throw Error('No maintained audio repair recipe');
 const integer=['truehd','mlp','dts-hd'].includes(codec);
 if(output!=='flac'&&output!=='opus')throw Error('Unknown audio output policy');
 if(output==='opus'&&channels!==2)throw Error('Opus composition requires stereo');
 const encoding=output==='opus'?opusEncode:encode;
 if(!(codec==='truehd'?[2,6,8]:codec==='mlp'?[2,6]:codec==='dts-hd'?[8]:[2]).includes(channels))throw Error('No maintained audio channel recipe');
 const decoding=decode[codec];
 const decoderId=codec==='dts-core'?'audio-dts':codec==='dts-hd'?'audio-dts-hd':integer?'audio-truehd-mlp':codec==='aac'?'audio-aac':['opus','vorbis'].includes(codec)?'audio-opus-vorbis':['flac','alac'].includes(codec)?'audio-lossless':codec==='mp3'?'audio-mp3':codec.startsWith('pcm-')?'audio-pcm':'audio-ac3';
 return {id:'matroska-'+(output==='opus'?'opus':'flac24')+'-'+(channels===2?'stereo48':channels+'ch48')+'-'+codec,requirements:[read,mux,decoding,encoding],bindings:[
  {id:'fine',assignments:[{providerId:'ts-container',requirements:[read,mux]},
   {providerId:decoderId,requirements:[decoding]},
   {providerId:output==='opus'?'audio-opus-encoder':'audio-flac',requirements:[encoding]}]},
  ...(output==='flac'&&['ac3','eac3','dts-core'].includes(codec) ? [{id:'common',assignments:[{providerId:'ts-container',requirements:[read,mux]},
   {providerId:'audio-common',requirements:[decoding,encode]}]}] : []),
 ]};
}

export function packetCopyRecipe(): ResolvableRecipe {
 return {id:'matroska-avc-hevc-aac-copy',requirements:[read,mux],bindings:[{id:'typescript',assignments:[{providerId:'ts-container',requirements:[read,mux]}]}]};
}
