// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode,QualityPolicy,TrackTypePolicy} from '../../types.js';
import type {PlaybackSettings} from './settings.js';
import {policyTrackAllowed,preferredTrackIndex,type PolicyTrack} from './track-policy.js';
export type SourceApplicationFacts=Readonly<{
 mode:PlaybackMode;preserve:boolean;planId:string;settings:Readonly<PlaybackSettings>;requestedTarget?:number;
 quality:QualityPolicy|null;outputDevice:string;attachments:number;nativeTracks:number;
 indexes:readonly Readonly<{type:'audio'|'sub';index:number}>[];externalSubtitleKey?:string;
 publicSelections:readonly Readonly<{type:'audio'|'sub';key:string}>[];audioPolicy:boolean;subtitlePolicy:boolean;
}>;
type Track='audio'|'sub';
export type SourceApplicationCommand=
 |Readonly<{kind:'target';target:number}>
 |Readonly<{kind:'quality.inspect'|'quality';policy:QualityPolicy}>
 |Readonly<{kind:'output.inspect'|'output';device:string}>
 |Readonly<{kind:'metadata.inspect'|'metadata'|'applied'}>
 |Readonly<{kind:'attachment'|'text';index:number}>
 |Readonly<{kind:'track'|'remember';type:Track;value:string;save:boolean}>
 |Readonly<{kind:'subtitles';value:boolean;save:boolean}>
 |Readonly<{kind:'resolve.index';type:Track;index:number}>
 |Readonly<{kind:'resolve.external';key:string}>
 |Readonly<{kind:'resolve.public';type:Track;key:string}>
 |Readonly<{kind:'policy';type:Track}>
 |Readonly<{kind:'verify';type:Track;value:string}>
 |Readonly<{kind:'reject';code:'INVALID_ARGUMENT'|'UNSUPPORTED_FEATURE'|null;message:string}>;
export type SourceApplicationEffect=SourceApplicationCommand&Readonly<{step:number}>;
export type SourceApplication=Readonly<{mode:PlaybackMode;preserve:boolean;commands:readonly SourceApplicationCommand[];cursor:number;pending:number|null;settings:Readonly<PlaybackSettings>}>;
export type SourceApplicationObservation=
 |Readonly<{kind:'target';duration:number|null;live:boolean}>
 |Readonly<{kind:'support';available:boolean}>
 |Readonly<{kind:'tracks';remux:boolean;tracks:readonly Readonly<{id:string;type:string;index:number|null;key:string;publicKey:string}>[]}>
 |Readonly<{kind:'policy';policy:TrackTypePolicy;tracks:readonly (PolicyTrack&Readonly<{backendId:string}>)[]}>;
const rejection=(code:'INVALID_ARGUMENT'|'UNSUPPORTED_FEATURE'|null,message:string):SourceApplicationCommand=>({kind:'reject',code,message});
function own(command:SourceApplicationCommand):SourceApplicationCommand{return Object.freeze({...command,...('policy' in command?{policy:Object.freeze({...command.policy})}:{})});}
export function initialSourceApplication(facts:SourceApplicationFacts):SourceApplication{
 const commands:SourceApplicationCommand[]=[],settings=Object.freeze({...facts.settings});
 if(!facts.preserve&&facts.requestedTarget!==undefined)commands.push({kind:'target',target:facts.requestedTarget});
 if(facts.preserve&&facts.quality)commands.push(facts.quality.mode==='manual'?rejection('UNSUPPORTED_FEATURE','A manual quality pin cannot be mapped across a replacement backend'):{kind:'quality.inspect',policy:facts.quality});
 if(facts.outputDevice)commands.push({kind:'output.inspect',device:facts.outputDevice});
 commands.push({kind:'metadata.inspect'});
 for(let index=0;index<facts.attachments;index++)commands.push({kind:'attachment',index});
 if(facts.mode!=='native'&&facts.attachments&&settings.sid!=='auto')commands.push({kind:'track',type:'sub',value:settings.sid,save:false});
 if(facts.mode==='native'){
  for(let index=0;index<facts.nativeTracks;index++)commands.push({kind:'text',index});
  commands.push({kind:'track',type:'audio',value:settings.aid,save:false},{kind:'track',type:'sub',value:settings.sid,save:false},{kind:'subtitles',value:settings.subtitles,save:false});
 }
 for(const item of facts.indexes)commands.push({kind:'resolve.index',type:item.type,index:item.index});
 if(facts.externalSubtitleKey)commands.push({kind:'resolve.external',key:facts.externalSubtitleKey});
 if(facts.preserve)for(const item of facts.publicSelections){
  if(item.type==='sub'&&!settings.subtitles)continue;
  commands.push(item.type==='audio'&&facts.planId.startsWith('native-direct')?{kind:'remember',type:'audio',value:'auto',save:true}:{kind:'resolve.public',type:item.type,key:item.key});
 }
 if(facts.audioPolicy)commands.push({kind:'policy',type:'audio'});
 if(facts.subtitlePolicy)commands.push({kind:'policy',type:'sub'});
 commands.push({kind:'applied'});
 return Object.freeze({mode:facts.mode,preserve:facts.preserve,settings,commands:Object.freeze(commands.map(own)),cursor:0,pending:null});
}
export function claimSourceApplication(state:SourceApplication):Readonly<{state:SourceApplication;accepted:boolean;effect?:SourceApplicationEffect}>{
 if(state.pending!==null)return Object.freeze({state,accepted:false});
 const command=state.commands[state.cursor];if(!command)return Object.freeze({state,accepted:true});
 return Object.freeze({state:Object.freeze({...state,pending:state.cursor}),accepted:true,effect:Object.freeze({...command,step:state.cursor})});
}
export function sourceApplicationDone(state:SourceApplication):boolean{return state.pending===null&&state.cursor===state.commands.length;}
export function completeSourceApplication(state:SourceApplication,step:number,observation?:SourceApplicationObservation):Readonly<{state:SourceApplication;accepted:boolean;applied?:boolean}>{
 const command=state.commands[state.cursor],no=()=>Object.freeze({state,accepted:false});
 if(state.pending!==step||state.cursor!==step||!command||command.kind==='reject')return no();
 const insert:SourceApplicationCommand[]=[];let settings=state.settings;
 if(command.kind==='target'){
  if(observation?.kind!=='target')return no();
  if(observation.live||observation.duration===null||!Number.isFinite(observation.duration)||observation.duration<=0||command.target>=observation.duration)insert.push(rejection('INVALID_ARGUMENT','startTime requires a target within finite VOD duration'));
 }else if(command.kind==='quality.inspect'||command.kind==='output.inspect'||command.kind==='metadata.inspect'){
  if(observation?.kind!=='support')return no();
  if(command.kind==='quality.inspect')insert.push(observation.available?{kind:'quality',policy:command.policy}:rejection('UNSUPPORTED_FEATURE','Fallback cannot preserve runtime quality policy'));
  else if(command.kind==='output.inspect')insert.push(observation.available?{kind:'output',device:command.device}:rejection('UNSUPPORTED_FEATURE','Output device cannot be preserved'));
  else if(observation.available)insert.push({kind:'metadata'});
 }else if(command.kind==='resolve.index'||command.kind==='resolve.external'||command.kind==='resolve.public'){
  if(observation?.kind!=='tracks')return no();
  const found=observation.tracks.find(track=>command.kind==='resolve.index'?track.type===command.type&&(state.mode==='native'?observation.remux&&Number(track.id)-1===command.index:track.index===command.index):command.kind==='resolve.external'?track.key===command.key:track.type===command.type&&track.publicKey===command.key);
  if(found)insert.push({kind:'track',type:command.kind==='resolve.external'?'sub':command.type,value:found.id,save:true});
  else insert.push(command.kind==='resolve.index'?rejection(null,'Cannot preserve selected track across playback modes'):command.kind==='resolve.external'?rejection(null,'Cannot preserve external subtitle identity'):rejection('UNSUPPORTED_FEATURE',`Cannot preserve explicit public track selection across playback modes (${command.key}; available ${observation.tracks.map(track=>track.publicKey).join(', ')})`));
 }else if(command.kind==='policy'){
  if(observation?.kind!=='policy')return no();
  const {tracks,policy}=observation,current=tracks.find(track=>track.selected),key=command.type==='audio'?'aid':'sid';
  if(!(state.preserve&&(current?policyTrackAllowed(current,policy):settings[key]==='no'&&policy.allowOff!==false))){
   const choice=preferredTrackIndex(tracks,policy),chosen=tracks[choice.index];
   if(choice.rejection)insert.push(rejection('UNSUPPORTED_FEATURE',choice.rejection));
   else{
    if(chosen&&command.type==='sub'&&!settings.subtitles)insert.push({kind:'subtitles',value:true,save:true});
    if(chosen&&chosen.id===current?.id)insert.push({kind:'remember',type:command.type,value:chosen.backendId,save:true});
    else{const value=chosen?.backendId??'no';insert.push({kind:'track',type:command.type,value,save:true},{kind:'verify',type:command.type,value});}
   }
  }
 }else if((command.kind==='track'||command.kind==='remember')&&command.save)settings=Object.freeze({...settings,[command.type==='audio'?'aid':'sid']:command.value});
 else if(command.kind==='subtitles'&&command.save)settings=Object.freeze({...settings,subtitles:command.value});
 const cursor=state.cursor+1,commands=insert.length?Object.freeze([...state.commands.slice(0,cursor),...insert.map(own),...state.commands.slice(cursor)]):state.commands;
 return Object.freeze({state:Object.freeze({...state,commands,cursor,pending:null,settings}),accepted:true,...(command.kind==='applied'?{applied:true}:{})});
}
