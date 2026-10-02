// SPDX-License-Identifier: Apache-2.0
import type {BufferingPolicy,LoopPolicy,PlaybackRange,QualityPolicy,SubtitleStyle} from '../../types.js';
import type {PlayerControlState} from './state.js';
import {copyData} from './data.js';
/** Accepted values only. Desired transaction values remain detached until the
 * source/settings acceptance transition commits them together. */
export type PlaybackSettings={pause:boolean;volume:number;speed:number;aid:string;sid:string;subtitles:boolean;vf:string;af:string;gain:number};
export type SettingsInput=Readonly<{type:'settings.accept';value:Readonly<PlaybackSettings>}>|Readonly<{type:'settings.change';value:Readonly<Partial<PlaybackSettings>>}>;
export function initialSettings():Readonly<PlaybackSettings>{return Object.freeze({pause:true,volume:100,speed:1,aid:'auto',sid:'auto',subtitles:true,vf:'',af:'',gain:1});}
export function transitionSettings(state:Readonly<PlaybackSettings>,input:SettingsInput):Readonly<PlaybackSettings>{return Object.freeze(input.type==='settings.accept'?{...input.value}:{...state,...input.value});}

export type PlayerPreferences=Readonly<{
  muted:boolean;outputDeviceId:string;buffering:BufferingPolicy;
  subtitleDelay:number;audioDelay:number;subtitleStyle:Readonly<SubtitleStyle>;
  playbackRange:Readonly<PlaybackRange>|null;loopPolicy:LoopPolicy;qualityPolicy:QualityPolicy|null;
}>;
export function initialPreferences():PlayerPreferences{return Object.freeze({muted:false,outputDeviceId:'',buffering:Object.freeze({preload:'auto',profile:'balanced'}),subtitleDelay:0,audioDelay:0,subtitleStyle:Object.freeze({}),playbackRange:null,loopPolicy:false,qualityPolicy:null});}
export function changePreferences(state:PlayerPreferences,value:Partial<PlayerPreferences>):PlayerPreferences{return copyData({...state,...value});}
export function clearSourcePreferences(state:PlayerPreferences):PlayerPreferences{return Object.freeze({...state,playbackRange:null,loopPolicy:false,qualityPolicy:null});}
export type SettingCommand=
  | Readonly<{kind:'volume'|'rate'|'gain';value:number}>
  | Readonly<{kind:'mute'|'subtitles';value:boolean}>
  | Readonly<{kind:'pause'}>
  | Readonly<{kind:'track';track:'audio'|'sub';value:string;verify?:boolean}>
  | Readonly<{kind:'buffering';value:BufferingPolicy}>
  | Readonly<{kind:'output';value:string}>
  | Readonly<{kind:'quality';value:QualityPolicy;previous:QualityPolicy}>
  | Readonly<{kind:'subtitleDelay'|'audioDelay';value:number}>
  | Readonly<{kind:'subtitleStyle';value:SubtitleStyle}>;
export type SettingEffect=
  | Readonly<{kind:'volume'|'rate'|'gain';value:number}>
  | Readonly<{kind:'subtitles';value:boolean}>
  | Readonly<{kind:'pause'|'play'}>
  | Readonly<{kind:'track';track:'audio'|'sub';value:string}>
  | Readonly<{kind:'track.verify';track:'audio'|'sub';value:string;settings:Readonly<PlaybackSettings>}>
  | Readonly<{kind:'buffering';value:BufferingPolicy}>
  | Readonly<{kind:'output';value:string}>
  | Readonly<{kind:'quality';value:QualityPolicy}>
  | Readonly<{kind:'source.reconfigure';settings:Readonly<PlaybackSettings>}>;
export type SettingTransaction=Readonly<{id:number;operation:number;epoch:number;session:number|null;phase:'applying'|'compensating'|'accepted';reconfigure:boolean;settings:Readonly<PlaybackSettings>;preferences:PlayerPreferences;settingsPatch:Readonly<Partial<PlaybackSettings>>;preferencesPatch:Readonly<Partial<PlayerPreferences>>;rollback:readonly SettingEffect[]}>;
export type SettingsTransactions=Readonly<{serial:number;pending:SettingTransaction|null;degraded:Readonly<{id:number;operation:number;session:number|null}>|null}>;
export function initialSettingsTransactions():SettingsTransactions{return Object.freeze({serial:0,pending:null,degraded:null});}
export type SettingTransactionInput=
  | Readonly<{type:'preferences.change';value:Partial<PlayerPreferences>}>
  | Readonly<{type:'setting.begin';command:SettingCommand;hasBackend:boolean;hasSource?:boolean}>
  | Readonly<{type:'setting.accept'|'setting.failed'|'setting.restored'|'setting.degraded';id:number}>;
export function settingAuthority(state:PlayerControlState,id:number):boolean{
  const pending=state.settingsTransactions.pending,operation=state.operations.entries.find(entry=>entry.id===state.operations.active);
  return !!pending&&pending.id===id&&!state.operations.terminal&&pending.epoch===state.operations.epoch&&pending.session===state.source.acceptedSession&&operation?.id===pending.operation&&!operation.cancelled&&operation.phase==='active';
}
export function transitionSettingTransaction(state:PlayerControlState,input:SettingTransactionInput){
  const empty=Object.freeze([]) as readonly SettingEffect[];
  const result=(next:PlayerControlState,accepted:boolean,id?:number,effects:readonly SettingEffect[]=empty)=>Object.freeze({state:next===state?state:Object.freeze({...next,revision:state.revision+1}),accepted,id,effects,reason:accepted?undefined:'retired' as const,retire:Object.freeze([]) as readonly number[]});
  if(input.type==='preferences.change')return result({...state,preferences:changePreferences(state.preferences,input.value)},true);
  if(input.type==='setting.begin'){
    const operation=state.operations.entries.find(entry=>entry.id===state.operations.active);
    if(state.operations.terminal||!operation||operation.cancelled||operation.epoch!==state.operations.epoch||state.settingsTransactions.pending)return result(state,false);
    let settings=state.settings,preferences=state.preferences,effect:SettingEffect,rollback:SettingEffect,reconfigure=false;
    const command=input.command;
    switch(command.kind){
      case 'volume':settings=Object.freeze({...settings,volume:command.value});effect={kind:'volume',value:preferences.muted?0:command.value};rollback={kind:'volume',value:preferences.muted?0:state.settings.volume};break;
      case 'mute':preferences=changePreferences(preferences,{muted:command.value});effect={kind:'volume',value:command.value?0:settings.volume};rollback={kind:'volume',value:state.preferences.muted?0:settings.volume};break;
      case 'rate':settings=Object.freeze({...settings,speed:command.value});effect=command;rollback={kind:'rate',value:state.settings.speed};break;
      case 'gain':settings=Object.freeze({...settings,gain:command.value});effect=command;rollback={kind:'gain',value:state.settings.gain};break;
      case 'pause':settings=Object.freeze({...settings,pause:true});effect={kind:'pause'};rollback={kind:state.settings.pause?'pause':'play'};break;
      case 'track':settings=Object.freeze({...settings,[command.track==='audio'?'aid':'sid']:command.value});effect=command;rollback={kind:'track',track:command.track,value:state.settings[command.track==='audio'?'aid':'sid']};break;
      case 'subtitles':settings=Object.freeze({...settings,subtitles:command.value});effect={kind:'subtitles',value:command.value};rollback={kind:'subtitles',value:state.settings.subtitles};break;
      case 'buffering':preferences=changePreferences(preferences,{buffering:command.value});effect={kind:'buffering',value:preferences.buffering};rollback={kind:'buffering',value:state.preferences.buffering};break;
      case 'output':preferences=changePreferences(preferences,{outputDeviceId:command.value});effect=command;rollback={kind:'output',value:state.preferences.outputDeviceId};break;
      case 'quality':preferences=changePreferences(preferences,{qualityPolicy:command.value});effect={kind:'quality',value:preferences.qualityPolicy!};rollback={kind:'quality',value:copyData(command.previous)};break;
      case 'subtitleDelay':case 'audioDelay':case 'subtitleStyle':preferences=changePreferences(preferences,{[command.kind]:command.value});effect={kind:'source.reconfigure',settings};rollback=effect;reconfigure=true;break;
    }
    const effects:SettingEffect[]=(reconfigure?input.hasSource:input.hasBackend)?[copyData(effect)]:[],restore:SettingEffect[]=input.hasBackend&&!reconfigure?[copyData(rollback)]:[];
    if(input.hasBackend&&command.kind==='track'&&command.verify){effects.push(Object.freeze({kind:'track.verify',track:command.track,value:command.value,settings}));restore.push(Object.freeze({kind:'track.verify',track:command.track,value:state.settings[command.track==='audio'?'aid':'sid'],settings:state.settings}));}
    const settingKey:keyof PlaybackSettings|undefined=command.kind==='volume'?'volume':command.kind==='rate'?'speed':command.kind==='gain'?'gain':command.kind==='pause'?'pause':command.kind==='subtitles'?'subtitles':command.kind==='track'?(command.track==='audio'?'aid':'sid'):undefined;
    const preferenceKey:keyof PlayerPreferences|undefined=command.kind==='mute'?'muted':command.kind==='buffering'?'buffering':command.kind==='output'?'outputDeviceId':command.kind==='quality'?'qualityPolicy':command.kind==='subtitleDelay'||command.kind==='audioDelay'||command.kind==='subtitleStyle'?command.kind:undefined;
    const settingsPatch=Object.freeze(settingKey?{[settingKey]:settings[settingKey]}:{}),preferencesPatch=copyData(preferenceKey?{[preferenceKey]:preferences[preferenceKey]}:{});
    const id=state.settingsTransactions.serial+1,transaction:SettingTransaction=Object.freeze({id,operation:operation.id,epoch:operation.epoch,session:state.source.acceptedSession,phase:'applying',reconfigure,settings,preferences,settingsPatch,preferencesPatch,rollback:Object.freeze(restore)});
    return result({...state,settingsTransactions:Object.freeze({...state.settingsTransactions,serial:id,pending:transaction})},true,id,Object.freeze(effects));
  }
  if(!settingAuthority(state,input.id))return result(state,false,input.id);
  const pending=state.settingsTransactions.pending!;
  if(input.type==='setting.failed'){
    if(pending.phase!=='applying')return result(state,false,input.id);
    return result({...state,settingsTransactions:Object.freeze({...state.settingsTransactions,pending:Object.freeze({...pending,phase:'compensating'})})},true,input.id,pending.rollback);
  }
  if(input.type==='setting.accept'&&pending.phase==='compensating'||input.type!=='setting.accept'&&pending.phase!=='compensating')return result(state,false,input.id);
  const degraded=input.type==='setting.degraded'?Object.freeze({id:pending.id,operation:pending.operation,session:pending.session}):state.settingsTransactions.degraded;
  // Apply only the fields this command owns. Independent accepted observations
  // (for example an emergency pause) may arrive while its I/O is pending.
  const commit=input.type==='setting.accept'&&pending.phase!=='accepted';
  return result({...state,settings:commit?Object.freeze({...state.settings,...pending.settingsPatch}):state.settings,preferences:commit?changePreferences(state.preferences,pending.preferencesPatch):state.preferences,settingsTransactions:Object.freeze({...state.settingsTransactions,pending:null,degraded})},true,input.id);
}
