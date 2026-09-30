// SPDX-License-Identifier: Apache-2.0
import {qualifiedAudioFilter} from './playback-plans.js';
import type {Probe} from './selection.js';

export type PrivatePlaybackAssets={codecProfile:'playback'|'playback-full';retainedDecoder:boolean;decoders:string[];filters?:string[];features?:string[];maxHeapBytes?:number};
export function privatePlaybackAssets(value:unknown,runtime:string):PrivatePlaybackAssets|undefined {
  if(!value||typeof value!=='object')return;
  const v=value as Record<string,unknown>;
  if(v.schema!==1||v.backend!==runtime||v.profile!=='playback'||!['playback','playback-full'].includes(String(v.codecProfile))||typeof v.retainedDecoder!=='boolean'||!Array.isArray(v.decoders)||!v.decoders.length||v.decoders.some(d=>typeof d!=='string'||!/^[a-z0-9_]+$/.test(d)))return;
  if(v.filters!==undefined&&(!Array.isArray(v.filters)||v.filters.some(f=>typeof f!=='string'||!/^[a-z0-9_]+$/.test(f))))return;
  if(v.features!==undefined&&(!Array.isArray(v.features)||v.features.some(f=>typeof f!=='string'||!['track-switch-seek','gamma-lut','inverse-gamma-lut'].includes(f))))return;
  if(v.maxHeapBytes!==undefined&&(typeof v.maxHeapBytes!=='number'||![134217728,536870912].includes(v.maxHeapBytes)))return;
  return {...(v.features===undefined?{}:{features:[...v.features as string[]]}),...(v.filters===undefined?{}:{filters:[...v.filters as string[]]}),...(v.maxHeapBytes===undefined?{}:{maxHeapBytes:v.maxHeapBytes as number}),codecProfile:v.codecProfile as PrivatePlaybackAssets['codecProfile'],retainedDecoder:v.retainedDecoder,decoders:[...v.decoders]};
}

/** Admission matches the installed playback codec profile and tested workload. */
export function privatePlaybackRejection(probe:Probe|undefined, source:{finite:boolean;bytes?:number}, features:{vf:string;af:string;toneMapping:string;audioOutput:string;gain:number;speed:number;externalSubtitles:boolean;customFonts:boolean;subtitleStyle:boolean}, assets?:PrivatePlaybackAssets, mode:'software'|'hybrid'='software') {
  const extended=assets?.codecProfile==='playback-full';
  if(!source.finite)return 'Private Software requires a finite random-access file';
  if(!probe)return 'Private Software requires source inspection';
  if(!Number.isSafeInteger(source.bytes)||source.bytes!<=0||(!extended&&source.bytes!>64*1024*1024))return extended?'Private playback requires a finite nonempty source size':'Private Software requires a source within 64 MiB';
  // A finite file can have unknown duration (for example raw SBC). Byte bounds
  // remain authoritative; only the legacy prototype requires a known timeline.
  if(!Number.isFinite(probe.duration)||probe.duration<0||(!extended&&(probe.duration===0||probe.duration>60)))return extended?'Private playback requires valid finite duration metadata':'Private Software currently requires a duration within 60 seconds';
  const videos=probe.tracks.filter(t=>t.type==='video'&&!t.attachedPicture), audio=probe.tracks.filter(t=>t.type==='audio');
  const codecs=mode==='hybrid'?['h264','hevc','vp8','vp9','av1']:['mpeg2video','mpeg4','prores'];
  if(mode==='hybrid'&&!assets?.retainedDecoder)return 'Private Hybrid requires retained decoder assets';
  if(videos.length>1||!videos.length&&(!extended||!audio.length)||videos.some(t=>(mode==='hybrid'||!extended)&&!codecs.includes(t.codec)))return 'Video codec is outside the private Software playback profile';
  const decodePixels=extended&&assets?.maxHeapBytes===536870912?8294400:2073600;
  if(videos.some(t=>!Number.isInteger(t.width)||!Number.isInteger(t.height)||t.width!<1||t.height!<1||t.width!*t.height!>decodePixels||!extended&&(t.width!>1920||t.height!>1080)))return `Private playback decode dimensions exceed the installed ${decodePixels}-pixel profile`;
  if(mode==='software'&&assets&&videos.some(t=>!assets.decoders.includes(t.codec==='av1'?'libdav1d':t.codec)))return 'Installed private playback video decoder is unavailable';
  const audioCodecs=['ac3','mp2','mp3','pcm_s16le'];
  const audioDecoder=(codec:string)=>({dts:'dca',amr_nb:'amrnb',amr_wb:'amrwb'} as Record<string,string>)[codec]??codec;
  if(assets&&audio.some(t=>!assets.decoders.includes(audioDecoder(t.codec))&&!(['mp1','mp2','mp3'].includes(t.codec)&&assets.decoders.includes(t.codec+'float'))))return 'Installed private playback audio decoder is unavailable';
  if(audio.length>(extended&&assets?.features?.includes('track-switch-seek')?64:1)||audio.some(t=>(!extended&&!audioCodecs.includes(t.codec))||(extended?(!Number.isInteger(t.channels)||t.channels!<1||t.channels!>64||!Number.isInteger(t.sampleRate)||t.sampleRate!<1||t.sampleRate!>2147483647):(t.channels!==2||t.sampleRate!==48000))))return 'Audio track count, channel layout or sample rate is outside the installed playback profile';
  if(features.toneMapping!=='off'||features.vf&&(!extended||mode==='hybrid')||features.af&&(!extended||mode==='hybrid'&&!qualifiedAudioFilter(features.af)))return 'Requested filters or tone mapping are outside the installed playback profile';
  if(!(extended?['stereo','5.1','7.1','auto']:['stereo']).includes(features.audioOutput)||features.gain>1||features.speed<0.5||features.speed>2)return 'Requested audio layout, gain or rate is outside the private Software profile';
  const subtitles=probe.tracks.filter(t=>t.type==='sub');
  if(!extended&&(features.externalSubtitles||features.customFonts||features.subtitleStyle||subtitles.length))return 'Private Software subtitle and font features are not qualified';
  if(subtitles.some(t=>!['ass','ssa','subrip','webvtt','mov_text','hdmv_pgs_subtitle','dvd_subtitle'].includes(t.codec)))return 'Subtitle codec is outside the installed playback profile';
}

/** Bound manifest bytes before JSON allocation, including chunked responses. */
export async function readPrivatePlaybackAssets(response:Response,runtime:string):Promise<PrivatePlaybackAssets|undefined>{
 const reader=response.body?.getReader();if(!reader)return;
 const bytes=new Uint8Array(64*1024);let length=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;if(value.byteLength>bytes.length-length)throw Error('Private playback manifest byte limit');bytes.set(value,length);length+=value.byteLength;}
  return privatePlaybackAssets(JSON.parse(new TextDecoder().decode(bytes.subarray(0,length))),runtime);
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
