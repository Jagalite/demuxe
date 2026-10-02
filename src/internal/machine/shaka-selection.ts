// SPDX-License-Identifier: Apache-2.0
import type {ShakaBackendState} from './shaka-backend.js';
export type ShakaAudioFacts=Readonly<{language?:string|null;originalLanguage?:string|null;label?:string|null;roles?:readonly string[]|null;spatialAudio?:boolean|null;accessibilityPurpose?:string|null;channelsCount?:number|null;codecs?:string|null;active?:boolean}>;
export type ShakaSelectionVariant=Readonly<{id:number;active?:boolean;audioLanguage?:string|null;language?:string|null;originalLanguage?:string|null;label?:string|null;audioRoles?:readonly string[]|null;spatialAudio?:boolean|null;accessibilityPurpose?:string|null;channelsCount?:number|null;audioCodec?:string|null;videoCodec?:string|null;originalVideoId?:string|null;originalAudioId?:string|null;bandwidth:number;height?:number|null}>;
const stableAudio=(track:ShakaAudioFacts)=>`shaka-audio-${encodeURIComponent(JSON.stringify([track.language,track.originalLanguage,track.label,track.roles,track.spatialAudio,track.accessibilityPurpose]))}`;
export function shakaAudioCatalog(tracks:readonly ShakaAudioFacts[]){return Object.freeze(tracks.map((track,index)=>{const base=stableAudio(track),ambiguous=tracks.filter(other=>stableAudio(other)===base).length>1;return Object.freeze({index,id:ambiguous?`${base}:ambiguous:${index}`:base,ambiguous});}));}
function audioKey(language:string|null|undefined,original:string|null|undefined,label:string|null|undefined,roles:readonly string[]|null|undefined,spatial:boolean|null|undefined,purpose:string|null|undefined){return JSON.stringify([language??'',original??'',label??'',roles??[],!!spatial,purpose??null]);}
function matchesAudio(track:ShakaAudioFacts,variant:ShakaSelectionVariant):boolean{return audioKey(track.language,track.originalLanguage,track.label,track.roles,track.spatialAudio,track.accessibilityPurpose)===audioKey(variant.audioLanguage??variant.language,variant.originalLanguage,variant.label,variant.audioRoles,variant.spatialAudio,variant.accessibilityPurpose)&&(!variant.channelsCount||!track.channelsCount||variant.channelsCount===track.channelsCount)&&(!variant.audioCodec||!track.codecs||variant.audioCodec===track.codecs);}
function matchesRepresentation(variant:ShakaSelectionVariant,representation:string):boolean{const token=/^variant:(\d+)$/.exec(representation);return token?String(variant.id)===token[1]:variant.originalVideoId===representation||(!variant.videoCodec&&variant.originalAudioId===representation);}
export type ShakaAudioSelection=Readonly<{kind:'disabled'}>|Readonly<{kind:'empty'}>|Readonly<{kind:'failure';reason:'identity'|'pin'|'constraints'}>|Readonly<{kind:'audio';index:number}>|Readonly<{kind:'variant';index:number;variant:number;commitQuality:boolean}>;
export function shakaRequestedAudio(tracks:readonly ShakaAudioFacts[],id:string):Readonly<{kind:'disabled'}>|Readonly<{kind:'empty'}>|Readonly<{kind:'failure';reason:'identity'}>|Readonly<{kind:'selected';index:number}>{
 if(id==='no')return Object.freeze({kind:'disabled'});
 const catalog=shakaAudioCatalog(tracks),candidates=id==='auto'?catalog.filter(entry=>tracks[entry.index].active):catalog.filter(entry=>entry.id===id);
 if(!tracks.length&&id==='auto')return Object.freeze({kind:'empty'});
 if(candidates.length!==1||(id!=='auto'&&candidates[0].ambiguous))return Object.freeze({kind:'failure',reason:'identity' as const});
 return Object.freeze({kind:'selected',index:candidates[0].index});
}
export function shakaSelectAudio(state:ShakaBackendState,tracks:readonly ShakaAudioFacts[],variants:readonly ShakaSelectionVariant[],id:string):ShakaAudioSelection{
 const request=shakaRequestedAudio(tracks,id);if(request.kind!=='selected')return request;
 const index=request.index,requested=tracks[index],representation=state.runtimeQuality&&state.quality.mode==='manual'?state.quality.id:state.source?.representation;
 if(representation){
  const matches=variants.filter(variant=>matchesRepresentation(variant,representation)&&variant.bandwidth<=(state.source?.maxBandwidth??Infinity)&&matchesAudio(requested,variant));
  return matches.length===1?Object.freeze({kind:'variant',index,variant:matches[0].id,commitQuality:!state.runtimeQuality}):Object.freeze({kind:'failure',reason:'pin'});
 }
 const policy=state.quality,allowed=variants.some(variant=>matchesAudio(requested,variant)&&variant.bandwidth<=Math.min(state.source?.maxBandwidth??Infinity,policy.mode==='auto'?(policy.maxBandwidth??Infinity):Infinity)&&(variant.height??0)<=(policy.mode==='auto'?(policy.maxHeight??Infinity):Infinity));
 return !allowed&&(state.runtimeQuality||state.source?.maxBandwidth!==undefined)?Object.freeze({kind:'failure',reason:'constraints'}):Object.freeze({kind:'audio',index});
}
export function shakaInitialRepresentation(variants:readonly ShakaSelectionVariant[],representation:string):number|null{
 const active=variants.find(track=>track.active),key=(track:ShakaSelectionVariant)=>JSON.stringify([track.audioLanguage??track.language,track.originalLanguage,track.label,track.audioRoles,track.channelsCount,track.audioCodec,track.spatialAudio,track.accessibilityPurpose]);
 const matches=variants.filter(track=>matchesRepresentation(track,representation)).filter(track=>!active||key(track)===key(active));return matches.length===1?matches[0].id:null;
}
export function shakaSelectText(tracks:readonly Readonly<{id:number;active?:boolean}>[],id:string):number|null{return (id==='auto'?tracks.find(track=>track.active)??tracks[0]:tracks.find(track=>`shaka-sub-${track.id}`===id))?.id??null;}
export function shakaExpectedOutput(variants:readonly ShakaSelectionVariant[],audioDisabled:boolean):Readonly<{video:boolean;audio:boolean}>{const active=variants.find(track=>track.active);return Object.freeze({video:!!active?.videoCodec,audio:!!active?.audioCodec&&!audioDisabled});}
