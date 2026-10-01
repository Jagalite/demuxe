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
 'adpcm-ima-qt':{capability:'audio.decode.adpcm-ima-qt',version:1,profile:'configured-integer'},
 'adpcm-g726':{capability:'audio.decode.adpcm-g726',version:1,profile:'configured-integer'},
 'adpcm-g726le':{capability:'audio.decode.adpcm-g726le',version:1,profile:'configured-integer'},
 'pcm-alaw':{capability:'audio.decode.pcm-alaw',version:1,profile:'configured-integer'},
 'pcm-mulaw':{capability:'audio.decode.pcm-mulaw',version:1,profile:'configured-integer'},
 'gsm':{capability:'audio.decode.gsm',version:1,profile:'configured-integer'},
 'gsm-ms':{capability:'audio.decode.gsm-ms',version:1,profile:'configured-integer'},
 'adpcm-ms':{capability:'audio.decode.adpcm-ms',version:1,profile:'configured-integer'},
 'adpcm-ima-wav':{capability:'audio.decode.adpcm-ima-wav',version:1,profile:'configured-integer'},
 shorten:{capability:'audio.decode.shorten',version:1,profile:'canonical-integer'},
 tak:{capability:'audio.decode.tak',version:1,profile:'canonical-integer'},
 tta:{capability:'audio.decode.tta',version:1,profile:'configured-integer'},
 ape:{capability:'audio.decode.ape',version:1,profile:'configured-integer'},
 wavpack:{capability:'audio.decode.wavpack',version:1,profile:'configured-integer'},
 mp2:{capability:'audio.decode.mp2',version:1,profile:'configured-pcm'},
 wmav1:{capability:'audio.decode.wmav1',version:1,profile:'configured-pcm'},
 wmav2:{capability:'audio.decode.wmav2',version:1,profile:'configured-pcm'},
 mp3:{capability:'audio.decode.mp3',version:1,profile:'48khz-stereo'},
 'pcm-u8':{capability:'audio.decode.pcm',version:1,profile:'integer-8bit'},
 'pcm-s8':{capability:'audio.decode.pcm',version:1,profile:'integer-8bit'},
 'pcm-s16le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-s24le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-s32le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-f32le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
 'pcm-f64le':{capability:'audio.decode.pcm',version:1,profile:'48khz-stereo'},
} as const satisfies Record<string,CapabilityRequest>;
export type ComponentAudioCodec = keyof typeof decode;
export function audioRepairRecipe(codec: ComponentAudioCodec, channels: 1|2|6|8 = 2, output: 'flac'|'opus' = 'flac', container: 'matroska'|'isobmff'|'wave-aiff'|'ogg'|'wavpack'|'ape'|'tta'|'tak'|'shorten'|'adpcm-wave'|'telephony'|'wave-g726' = 'matroska', sampleRate: 8000|16000|22050|32000|44100|48000|96000 = 48000, aacProfile: 'lc'|'he'|'he-v2'|'usac' = 'lc'): ResolvableRecipe {
 if(!Object.prototype.hasOwnProperty.call(decode,codec))throw Error('No maintained audio repair recipe');
 if(!['lc','he','he-v2','usac'].includes(aacProfile)||aacProfile!=='lc'&&(codec!=='aac'||container!=='isobmff'||(aacProfile==='usac'?output!=='flac'||!((channels===1&&sampleRate===48000)||(channels===2&&[32000,44100,48000].includes(sampleRate))):channels!==2||!(aacProfile==='he'?[48000]:[32000,44100]).includes(sampleRate))))throw Error('No maintained explicit AAC extension recipe');
 const pcm8=codec==='pcm-u8'||codec==='pcm-s8';
 if(pcm8&&(container!=='wave-aiff'||![1,2].includes(channels)||![44100,48000,96000].includes(sampleRate)||output!=='flac'))throw Error('No maintained eight-bit PCM recipe');
 const integer=['truehd','mlp','dts-hd'].includes(codec);
 if(output!=='flac'&&output!=='opus')throw Error('Unknown audio output policy');
 if(output==='opus'&&(channels!==2||sampleRate!==48000))throw Error('Opus composition requires stereo');
 if(!['matroska','isobmff','wave-aiff','ogg','wavpack','ape','tta','tak','shorten','adpcm-wave','telephony','wave-g726'].includes(container))throw Error('No maintained container recipe');
 if(![8000,16000,22050,32000,44100,48000,96000].includes(sampleRate))throw Error('No maintained audio rate recipe');
 if(codec==='ape'&&(container!=='ape'||channels!==2||sampleRate!==44100||output!=='flac'))throw Error('No maintained standalone APE recipe');
 if(container==='ape'&&codec!=='ape'||container==='wavpack'&&codec!=='wavpack')throw Error('Source container differs from archive recipe');
 if(codec==='tta'&&(container!=='tta'||![1,2,6].includes(channels)||![44100,48000].includes(sampleRate)))throw Error('No maintained standalone TTA recipe');
 if(container==='tta'&&codec!=='tta')throw Error('Source container differs from TTA recipe');
 if(codec==='tak'&&(container!=='tak'||channels!==1||sampleRate!==44100||output!=='flac'))throw Error('No maintained canonical TAK recipe');
 if(container==='tak'&&codec!=='tak')throw Error('Source container differs from TAK recipe');
 if(codec==='shorten'&&(container!=='shorten'||channels!==2||sampleRate!==44100||output!=='flac'))throw Error('No maintained canonical Shorten recipe');
 if(container==='shorten'&&codec!=='shorten')throw Error('Source container differs from Shorten recipe');
 const qt=codec==='adpcm-ima-qt';if(qt&&(container!=='isobmff'||![44100,48000].includes(sampleRate)||![1,2].includes(channels)||output!=='flac'))throw Error('No maintained MOV IMA-QT recipe');
 const adpcm=['adpcm-ms','adpcm-ima-wav'].includes(codec);
 if(adpcm&&(container!=='adpcm-wave'||![1,2].includes(channels)||![8000,16000,22050,32000,44100,48000].includes(sampleRate)||output!=='flac')||container==='adpcm-wave'&&!adpcm)throw Error('No maintained WAV ADPCM recipe');
 const g726=codec==='adpcm-g726'||codec==='adpcm-g726le';
 if(g726&&(codec!=='adpcm-g726'||container!=='wave-g726'||sampleRate!==8000||channels!==1||output!=='flac')||container==='wave-g726'&&!g726)throw Error('No maintained canonical G726 WAV recipe; raw requires explicit helper');
 const telephony=['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec);
 if(telephony&&(container!=='telephony'||output!=='flac'||(codec==='gsm'||codec==='gsm-ms'?sampleRate!==8000||channels!==1:![8000,16000].includes(sampleRate)||![1,2].includes(channels)))||container==='telephony'&&!telephony)throw Error('No maintained telephony recipe');
 const lowLegacy=['mp2','wmav1','wmav2'].includes(codec)&&sampleRate<44100;
 if(lowLegacy&&(container!=='matroska'||output!=='flac'))throw Error('No maintained lower-rate legacy transport/output');
 if(sampleRate<44100&&!adpcm&&!telephony&&!g726&&!lowLegacy&&!(codec==='aac'&&aacProfile!=='lc'))throw Error('No maintained low-rate audio recipe');
 const configured=!['ac3','eac3','dts-core'].includes(codec);
 if(integer&&(container!=='matroska'||codec==='dts-hd'&&!((sampleRate===48000&&[2,6,8].includes(channels))||(sampleRate===96000&&[6,8].includes(channels)))||sampleRate!==48000&&channels===8&&codec!=='dts-hd'))throw Error('No maintained header-owned lossless recipe');
 if(!configured&&sampleRate!==48000||codec==='opus'&&sampleRate!==48000||sampleRate===96000&&!['flac','alac','wavpack','truehd','mlp','dts-hd'].includes(codec)&&!codec.startsWith('pcm-'))throw Error('No maintained audio rate recipe');
 if(['mp2','wmav1','wmav2'].includes(codec)&&(![1,2].includes(channels)||!(codec==='mp2'?[32000,44100,48000]:[8000,16000,22050,32000,44100,48000]).includes(sampleRate)))throw Error('No maintained legacy audio recipe');
 if(codec==='wavpack'&&sampleRate===44100&&channels>2)throw Error('No maintained WavPack rate or channel recipe');
 if(container==='isobmff'&&!['adpcm-ima-qt','aac','flac','alac','pcm-f32le','pcm-f64le'].includes(codec))throw Error('No maintained MOV codec recipe');
 if(container==='isobmff'&&codec!=='flac'&&(channels>2||sampleRate===96000))throw Error('No maintained MOV rate or channel recipe');
 if(container==='wave-aiff'&&(!codec.startsWith('pcm-')||![1,2].includes(channels)))throw Error('No maintained WAV/AIFF recipe');
 if(container==='ogg'&&(!['opus','vorbis','flac'].includes(codec)||![1,2].includes(channels)))throw Error('No maintained Ogg recipe');
 const reading:CapabilityRequest=container==='wave-g726'?{capability:'container.read.g726',version:1,profile:'finite-clear-audio'}:['ape','wavpack','tta','tak','shorten','adpcm-wave','telephony','wave-g726'].includes(container)?{capability:('container.read.'+container) as 'container.read.ape'|'container.read.wavpack'|'container.read.tta'|'container.read.tak'|'container.read.shorten'|'container.read.adpcm-wave'|'container.read.telephony',version:1,profile:'finite-clear-audio'}:container==='ogg'?{capability:'container.read.ogg',version:1,profile:'finite-clear-audio'}:container==='wave-aiff'?{capability:'container.read.wave-aiff',version:1,profile:'finite-clear-audio'}:container==='isobmff'?{capability:'container.read.isobmff',version:1,profile:'finite-clear-av'}:read;
 const encoding:CapabilityRequest=output==='opus'?opusEncode:sampleRate<44100?{capability:'audio.encode.flac',version:1,profile:'low-rate-s24'}:sampleRate===48000?encode:{capability:'audio.encode.flac',version:1,profile:'configured-s24'};
 if(!(codec==='truehd'?[1,2,6,8]:codec==='mlp'?[1,2,6]:codec==='dts-hd'?[2,6,8]:configured&&codec!=='vorbis'&&codec!=='mp3'?[1,2,6,8]:codec==='mp3'?[1,2]:[2]).includes(channels))throw Error('No maintained audio channel recipe');
 const decoding:CapabilityRequest=lowLegacy?{...decode[codec],profile:'lower-rate-pcm'} as CapabilityRequest:aacProfile!=='lc'?{capability:'audio.decode.aac',version:1,profile:aacProfile==='usac'?(channels===1?'usac-mono48':'usac-stereo-configured'):aacProfile==='he'?'he-configured-float':sampleRate===32000?'he-v2-stereo32':'he-v2-stereo44100'}:['adpcm-ima-qt','adpcm-g726','adpcm-g726le','pcm-u8','pcm-s8','tak','shorten','adpcm-ms','adpcm-ima-wav','pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec)?decode[codec]:integer?{...decode[codec],profile:codec==='dts-hd'?(sampleRate===96000?'ma-high-rate-integer':channels===8?'ma-48khz-s32p':'ma-configured-integer'):sampleRate===48000&&channels!==1?'48khz-integer':'configured-integer'} as CapabilityRequest:sampleRate===48000&&channels===2?decode[codec]:configured?{...decode[codec],profile:codec==='aac'?'lc-configured':['flac','alac','wavpack','ape','tta','tak','shorten'].includes(codec)?'configured-integer':'configured-pcm'} as CapabilityRequest:decode[codec];
 const decoderId=codec==='dts-core'?'audio-dts':codec==='dts-hd'?'audio-dts-hd':integer?'audio-truehd-mlp':codec==='aac'?'audio-aac':['opus','vorbis'].includes(codec)?'audio-opus-vorbis':['flac','alac'].includes(codec)?'audio-lossless':codec==='mp3'?'audio-mp3':qt?'audio-adpcm-qt':g726?'audio-g726':telephony?'audio-telephony':adpcm?'audio-adpcm-wave':codec==='shorten'?'audio-archive-historical':codec==='tak'?'audio-archive-next':codec==='tta'?'audio-archive-more':['wavpack','ape'].includes(codec)?'audio-archive':['mp2','wmav1','wmav2'].includes(codec)?'audio-legacy':codec.startsWith('pcm-')?'audio-pcm':'audio-ac3';
 return {id:container+'-'+(output==='opus'?'opus':'flac24')+'-'+(sampleRate===48000?(channels===2?'stereo48':channels+'ch48'):channels+'ch'+sampleRate)+'-'+codec+(aacProfile==='lc'?'':'-'+aacProfile),requirements:[reading,mux,decoding,encoding],bindings:[
  {id:'fine',assignments:[{providerId:'ts-container',requirements:[reading,mux]},
   {providerId:decoderId,requirements:[decoding]},
   {providerId:output==='opus'?'audio-opus-encoder':'audio-flac',requirements:[encoding]}]},
  ...(output==='flac'&&['ac3','eac3','dts-core'].includes(codec) ? [{id:'common',assignments:[{providerId:'ts-container',requirements:[reading,mux]},
   {providerId:'audio-common',requirements:[decoding,encode]}]}] : []),
 ]};
}

export function packetCopyRecipe(): ResolvableRecipe {
 return {id:'matroska-avc-hevc-aac-copy',requirements:[read,mux],bindings:[{id:'typescript',assignments:[{providerId:'ts-container',requirements:[read,mux]}]}]};
}

export function webmPacketCopyRecipe(): ResolvableRecipe {
 const requirements=[{capability:'container.read.matroska',version:1,profile:'finite-clear-webm'},{capability:'container.mux.webm',version:1,profile:'explicit-timeline-av'}] as const;
 return {id:'webm-vpx-av1-opus-vorbis-copy',requirements,bindings:[{id:'typescript',assignments:[{providerId:'ts-container',requirements}]}]};
}

export type G726RawCodec='adpcm-g726'|'adpcm-g726le';
export type G726RawBits=2|3|4|5;
/** Raw G726 has no header: callers own codec packing and coded width explicitly. */
export function g726RawRepairRecipe(codec:G726RawCodec,bits:G726RawBits):ResolvableRecipe {
 if(!['adpcm-g726','adpcm-g726le'].includes(codec)||![2,3,4,5].includes(bits))throw Error('Explicit raw G726 codec and coded width required');
 const reading={capability:'container.read.g726',version:1,profile:'explicit-raw-audio'} as const,decoding=decode[codec],encoding={capability:'audio.encode.flac',version:1,profile:'low-rate-s24'} as const;
 return{id:'raw-g726-flac24-mono8k-'+codec+'-'+bits,requirements:[reading,mux,decoding,encoding],bindings:[{id:'fine',assignments:[{providerId:'ts-container',requirements:[reading,mux]},{providerId:'audio-g726',requirements:[decoding]},{providerId:'audio-flac',requirements:[encoding]}]}]};
}
