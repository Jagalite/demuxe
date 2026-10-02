// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode,TrackTypePolicy} from '../../types.js';
import type {PlaybackSettings} from './settings.js';
import {preferredTrackIndex,trackSelectionRejection,type PolicyTrack} from './track-policy.js';
export type TrackSelectionFacts=Readonly<{
  sourceId:number;session:number|null;inventory:readonly (PolicyTrack&Readonly<{backendId:string;key:string}>)[];
  policy:TrackTypePolicy|undefined;plan:string|undefined;surfaceLocked:boolean;automaticLossless:boolean;
}>;
type Context=Readonly<{mode:PlaybackMode;automatic:boolean;hasSource:boolean;hasBackend:boolean;sourceId:number;session:number|null}>;
export type TrackSelectionDecision=Readonly<{action:'none'|'direct'|'select'|'replace'|'remember';value:string;key:string|null;rejection?:Readonly<{reason:'invalid'|'unsupported';message:string}>}>;
export function decideTrackSelection(settings:Readonly<PlaybackSettings>,context:Context,type:'audio'|'sub',id:string|null,facts:TrackSelectionFacts):TrackSelectionDecision{
  const reject=(reason:'invalid'|'unsupported',message:string):TrackSelectionDecision=>Object.freeze({action:'none',value:'auto',key:null,rejection:Object.freeze({reason,message})});
  if(!context.hasBackend)return reject('invalid','No source');
  if(facts.sourceId!==context.sourceId||facts.session!==context.session)return reject('invalid','Unknown or stale public track ID');
  let selected=facts.inventory.find(track=>track.id===id);
  if(id!==null&&id!=='auto'&&!selected)return reject('invalid','Unknown or stale public track ID');
  const rejection=trackSelectionRejection(facts.policy,id,selected);if(rejection)return reject('unsupported',rejection);
  if(id==='auto'&&facts.policy){const choice=preferredTrackIndex(facts.inventory,facts.policy);if(choice.rejection)return reject('unsupported',choice.rejection);selected=facts.inventory[choice.index];id=selected?.id??null;}
  const value=id===null?'no':id==='auto'?'auto':selected!.backendId,key=selected?.key??null;
  if(type==='sub'&&value!=='no'&&facts.inventory.length&&settings.subtitles&&facts.surfaceLocked)return reject('unsupported','Exit video Picture-in-Picture before enabling subtitles');
  const result=(action:TrackSelectionDecision['action']):TrackSelectionDecision=>Object.freeze({action,value,key});
  if(settings[type==='audio'?'aid':'sid']===value&&(!selected||selected.selected))return result('none');
  if(type==='sub'&&context.mode==='native'&&context.automatic&&context.hasSource&&settings.subtitles&&value!=='no'&&!['shaka-mse','remux-mpv','direct-mpv'].includes(facts.plan??''))return result('select');
  if(type==='audio'&&facts.plan!=='shaka-mse'&&context.hasSource&&(facts.automaticLossless||context.mode==='native')&&selected)return result(selected.selected?'remember':context.automatic?'select':'replace');
  return result('direct');
}
export function decideSubtitleVisibility(settings:Readonly<PlaybackSettings>,context:Context,value:boolean,facts:Readonly<{policy:TrackTypePolicy|undefined;hasTracks:boolean;surfaceLocked:boolean;plan:string|undefined}>):Readonly<{action:'none'|'direct'|'select';promote:boolean;rejection?:string}>{
  const rejection=value!==settings.subtitles?trackSelectionRejection(facts.policy,value?'visible':null):undefined;
  if(rejection)return Object.freeze({action:'none',promote:false,rejection});
  if(value===settings.subtitles)return Object.freeze({action:'none',promote:!value});
  if(value&&settings.sid!=='no'&&facts.hasTracks&&facts.surfaceLocked)return Object.freeze({action:'none',promote:false,rejection:'Exit video Picture-in-Picture before enabling subtitles'});
  return context.automatic&&context.hasSource&&context.mode==='native'&&!['shaka-mse','remux-mpv','direct-mpv'].includes(facts.plan??'')&&value&&!settings.subtitles?Object.freeze({action:'select',promote:false}):Object.freeze({action:'direct',promote:!value});
}
