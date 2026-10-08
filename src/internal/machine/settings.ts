// SPDX-License-Identifier: Apache-2.0
import type {BufferingPolicy,LoopPolicy,PlaybackRange,QualityPolicy,SubtitleStyle,ToneMapping,PlaybackMode,TrackTypePolicy} from '../../types.js';
import type {PlayerControlState} from './state.js';
import {copyData} from './data.js';
import {decideTrackSelection,decideSubtitleVisibility,type TrackSelectionFacts,type TrackSelectionDecision} from './track-selection.js';
import {rangeRequirement,type RangeFacts} from './playback-boundary.js';
import {featureRejection} from './playback-plans.js';
/** Accepted values only. Desired transaction values remain detached until the
 * source/settings acceptance transition commits them together. */
export type PlaybackSettings={pause:boolean;volume:number;speed:number;aid:string;sid:string;subtitles:boolean;vf:string;af:string;gain:number};
export type SettingsInput=Readonly<{type:'settings.accept';value:Readonly<PlaybackSettings>}>|Readonly<{type:'settings.change';value:Readonly<Partial<PlaybackSettings>>}>;
export function initialSettings():Readonly<PlaybackSettings>{return Object.freeze({pause:true,volume:100,speed:1,aid:'auto',sid:'auto',subtitles:true,vf:'',af:'',gain:1});}
export function transitionSettings(state:Readonly<PlaybackSettings>,input:SettingsInput):Readonly<PlaybackSettings>{return Object.freeze(input.type==='settings.accept'?{...input.value}:{...state,...input.value});}

export type PlayerPreferences=Readonly<{
  publicSelections:Readonly<Partial<Record<'audio'|'sub',string>>>;outputSize:Readonly<{width:number;height:number}>;muted:boolean;outputDeviceId:string;buffering:BufferingPolicy;toneMapping:ToneMapping;
  subtitleDelay:number;audioDelay:number;subtitleStyle:Readonly<SubtitleStyle>;
  playbackRange:Readonly<PlaybackRange>|null;loopPolicy:LoopPolicy;qualityPolicy:QualityPolicy|null;
}>;
export function initialPreferences():PlayerPreferences{return Object.freeze({publicSelections:Object.freeze({}),outputSize:Object.freeze({width:640,height:360}),muted:false,outputDeviceId:'',buffering:Object.freeze({preload:'auto',profile:'balanced'}),toneMapping:'off',subtitleDelay:0,audioDelay:0,subtitleStyle:Object.freeze({}),playbackRange:null,loopPolicy:false,qualityPolicy:null});}
export function effectiveVideoFilters(settings:Readonly<PlaybackSettings>,preferences:PlayerPreferences):string{
  const tone=preferences.toneMapping==='hdr-to-sdr'?'zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=mobius:desat=0,zscale=transfer=bt709:matrix=bt709:range=limited,format=yuv420p':'';
  return [tone?`lavfi=[${tone}]`:'',settings.vf].filter(Boolean).join(',');
}
export function validOutputSize(width:number,height:number):boolean{return Number.isInteger(width)&&Number.isInteger(height)&&width>=1&&height>=1&&width<=1920&&height<=1080;}
export function changePreferences(state:PlayerPreferences,value:Partial<PlayerPreferences>):PlayerPreferences{return copyData({...state,...value});}
export function clearSourcePreferences(state:PlayerPreferences):PlayerPreferences{return Object.freeze({...state,publicSelections:Object.freeze({}),playbackRange:null,loopPolicy:false,qualityPolicy:null});}
export type SettingCommand=
  | Readonly<{kind:'automatic';value:boolean}>
  | Readonly<{kind:'mode';value:PlaybackMode}>
  | Readonly<{kind:'routedGain';value:number;plan?:string;direct:boolean}>
  | Readonly<{kind:'volume'|'rate'|'gain';value:number}>
  | Readonly<{kind:'mute'|'subtitles';value:boolean}>
  | Readonly<{kind:'pause'}>
  | Readonly<{kind:'track';track:'audio'|'sub';value:string;verify?:boolean;clearPublicSelection?:boolean}>
  | Readonly<{kind:'publicTrack';track:'audio'|'sub';id:string|null;facts:TrackSelectionFacts}>
  | Readonly<{kind:'visibility';value:boolean;facts:Readonly<{policy:TrackTypePolicy|undefined;hasTracks:boolean;surfaceLocked:boolean;plan:string|undefined}>}>
  | Readonly<{kind:'buffering';value:BufferingPolicy}>
  | Readonly<{kind:'output';value:string}>
  | Readonly<{kind:'quality';value:QualityPolicy;previous:QualityPolicy}>
  | Readonly<{kind:'subtitleDelay'|'audioDelay';value:number}>
  | Readonly<{kind:'subtitleStyle';value:SubtitleStyle}>
  | Readonly<{kind:'filters';key:'vf'|'af';value:string}>
  | Readonly<{kind:'toneMapping';value:ToneMapping}>
  | Readonly<{kind:'range';value:PlaybackRange|null;facts:RangeFacts}>
  | Readonly<{kind:'loop';value:LoopPolicy;facts:RangeFacts}>;
export type SettingEffect=
  | Readonly<{kind:'volume'|'rate'|'gain';value:number}>
  | Readonly<{kind:'subtitles';value:boolean}>
  | Readonly<{kind:'pause'|'play'|'seek.resume'}>
  | Readonly<{kind:'track';track:'audio'|'sub';value:string}>
  | Readonly<{kind:'track.verify';track:'audio'|'sub';value:string;settings:Readonly<PlaybackSettings>}>
  | Readonly<{kind:'buffering';value:BufferingPolicy}>
  | Readonly<{kind:'output';value:string}>
  | Readonly<{kind:'quality';value:QualityPolicy}>
  | Readonly<{kind:'filter';key:'vf'|'af';value:string}>
  | Readonly<{kind:'promotion'|'gain.evidence'}>
  | Readonly<{kind:'mode.ready';mode:PlaybackMode}>
  | Readonly<{kind:'seek'|'seek.verify';value:number}>
  | Readonly<{kind:'source.reconfigure';settings:Readonly<PlaybackSettings>}>
  | Readonly<{kind:'source.replace';settings:Readonly<PlaybackSettings>;mode:PlaybackMode}>;
export type SettingTransaction=Readonly<{id:number;operation:number;epoch:number;session:number|null;phase:'applying'|'compensating'|'accepted';reconfigure:boolean;promote:boolean;mode?:PlaybackMode;automatic?:boolean;automaticDuringApply:boolean;resumeSuppressed?:boolean;after:readonly SettingEffect[];settings:Readonly<PlaybackSettings>;preferences:PlayerPreferences;settingsPatch:Readonly<Partial<PlaybackSettings>>;preferencesPatch:Readonly<Partial<PlayerPreferences>>;rollback:readonly SettingEffect[]}>;
export type SettingsTransactions=Readonly<{serial:number;pending:SettingTransaction|null;degraded:Readonly<{id:number;operation:number;session:number|null}>|null}>;
export function initialSettingsTransactions():SettingsTransactions{return Object.freeze({serial:0,pending:null,degraded:null});}
export type SettingTransactionInput=
  | Readonly<{type:'preferences.change';value:Partial<PlayerPreferences>}>
  | Readonly<{type:'setting.begin';command:SettingCommand;hasBackend:boolean;hasSource?:boolean;hybridAudioFilters?:boolean}>
  | Readonly<{type:'setting.resume'|'setting.accept'|'setting.failed'|'setting.restored'|'setting.degraded';id:number}>;
export function settingAutomaticSelection(state:PlayerControlState):boolean{const pending=state.settingsTransactions.pending;return pending?.phase==='applying'&&pending.automaticDuringApply&&pending.automatic!==undefined?pending.automatic:state.source.automatic;}
export function settingAuthority(state:PlayerControlState,id:number):boolean{
  const pending=state.settingsTransactions.pending,operation=state.operations.entries.find(entry=>entry.id===state.operations.active);
  return !!pending&&pending.id===id&&!state.operations.terminal&&pending.epoch===state.operations.epoch&&pending.session===state.source.acceptedSession&&operation?.id===pending.operation&&!operation.cancelled&&operation.phase==='active';
}
export function transitionSettingTransaction(state:PlayerControlState,input:SettingTransactionInput){
  const empty=Object.freeze([]) as readonly SettingEffect[];
  const result=(next:PlayerControlState,accepted:boolean,id?:number,effects:readonly SettingEffect[]=empty,message?:string,rejection:'invalid'|'unsupported'='unsupported')=>Object.freeze({state:next===state?state:Object.freeze({...next,revision:state.revision+1}),accepted,id,effects,message,reason:accepted?undefined:message?rejection:'retired' as const,retire:Object.freeze([]) as readonly number[]});
  if(input.type==='preferences.change')return result({...state,preferences:changePreferences(state.preferences,input.value)},true);
  if(input.type==='setting.begin'){
    const operation=state.operations.entries.find(entry=>entry.id===state.operations.active);
    if(state.operations.terminal||!operation||operation.cancelled||operation.epoch!==state.operations.epoch||state.settingsTransactions.pending||state.attachments.pending)return result(state,false);
    let settings=state.settings,preferences=state.preferences,effect:SettingEffect,rollback:SettingEffect,reconfigure=false,promote=false,noop=false,mode:PlaybackMode|undefined,selection:TrackSelectionDecision|undefined,verifyTrack:'audio'|'sub'|undefined,automatic:boolean|undefined;const after:SettingEffect[]=[];
    const command=input.command;
    const context={sourceId:state.source.serial,session:state.source.acceptedSession,mode:state.source.mode,automatic:state.source.automatic,hasSource:!!input.hasSource,hasBackend:input.hasBackend};
    switch(command.kind){
      case 'automatic':automatic=command.value;noop=!command.value||!input.hasSource;reconfigure=command.value;effect={kind:'source.reconfigure',settings};rollback=effect;break;
      case 'mode':{
        const rejection=featureRejection(command.value,{...settings,toneMapping:preferences.toneMapping,hybridAudioFilters:input.hybridAudioFilters});
        if(rejection)return result(state,false,undefined,empty,rejection);
        automatic=false;mode=command.value;noop=mode===state.source.mode;reconfigure=true;effect={kind:'source.replace',mode,settings};rollback=effect;
        if(!noop&&!input.hasSource)after.push({kind:'mode.ready',mode});break;
      }
      case 'routedGain':{
        noop=command.value===settings.gain;settings=Object.freeze({...settings,gain:command.value});
        reconfigure=!!input.hasSource&&(!command.direct||command.plan==='remux-mpv'&&command.value!==1);
        effect=reconfigure?{kind:'source.reconfigure',settings}:{kind:'gain',value:command.value};rollback={kind:'gain',value:state.settings.gain};
        if(!noop&&!reconfigure&&input.hasSource&&command.direct)after.push({kind:'gain.evidence'});break;
      }

      case 'publicTrack':{
        selection=decideTrackSelection(settings,context,command.track,command.id,command.facts);
        if(selection.rejection)return result(state,false,undefined,empty,selection.rejection.message,selection.rejection.reason);
        noop=selection.action==='none'||selection.action==='remember';
        if(selection.action!=='none'){
          const publicSelections={...preferences.publicSelections};if(selection.key===null)delete publicSelections[command.track];else publicSelections[command.track]=selection.key;
          preferences=changePreferences(preferences,{publicSelections});
        }
        if(!noop)settings=Object.freeze({...settings,[command.track==='audio'?'aid':'sid']:selection.value});
        reconfigure=selection.action==='select'||selection.action==='replace';promote=selection.action==='direct';
        effect=selection.action==='select'?{kind:'source.reconfigure',settings}:selection.action==='replace'?{kind:'source.replace',settings,mode:state.source.mode}:{kind:'track',track:command.track,value:selection.value};
        rollback={kind:'track',track:command.track,value:state.settings[command.track==='audio'?'aid':'sid']};
        if(selection.action==='direct')verifyTrack=command.track;
        break;
      }
      case 'visibility':{
        const visibility=decideSubtitleVisibility(settings,context,command.value,command.facts);
        if(visibility.rejection)return result(state,false,undefined,empty,visibility.rejection);
        noop=visibility.action==='none';reconfigure=visibility.action==='select';promote=visibility.promote;
        settings=Object.freeze({...settings,subtitles:command.value});effect=reconfigure?{kind:'source.reconfigure',settings}:{kind:'subtitles',value:command.value};rollback={kind:'subtitles',value:state.settings.subtitles};break;
      }
      case 'range':case 'loop':{
        const requirement=rangeRequirement(command.kind,command.value,preferences.playbackRange,preferences.loopPolicy,command.facts);
        if(requirement.rejection)return result(state,false,undefined,empty,requirement.rejection.message,requirement.rejection.reason);
        preferences=changePreferences(preferences,command.kind==='range'?{playbackRange:command.value as PlaybackRange|null}:{loopPolicy:command.value as LoopPolicy});
        noop=requirement.seek===undefined;effect={kind:'seek',value:requirement.seek??command.facts.time};rollback={kind:'seek',value:command.facts.time};break;
      }
      case 'volume':settings=Object.freeze({...settings,volume:command.value});effect={kind:'volume',value:preferences.muted?0:command.value};rollback={kind:'volume',value:preferences.muted?0:state.settings.volume};break;
      case 'mute':preferences=changePreferences(preferences,{muted:command.value});effect={kind:'volume',value:command.value?0:settings.volume};rollback={kind:'volume',value:state.preferences.muted?0:settings.volume};break;
      case 'rate':settings=Object.freeze({...settings,speed:command.value});effect=command;rollback={kind:'rate',value:state.settings.speed};break;
      case 'gain':settings=Object.freeze({...settings,gain:command.value});effect=command;rollback={kind:'gain',value:state.settings.gain};break;
      case 'pause':settings=Object.freeze({...settings,pause:true});effect={kind:'pause'};rollback={kind:state.settings.pause?'pause':'play'};break;
      case 'track':if(command.clearPublicSelection){const publicSelections={...preferences.publicSelections};delete publicSelections[command.track];preferences=changePreferences(preferences,{publicSelections});promote=true;}if(command.verify)verifyTrack=command.track;settings=Object.freeze({...settings,[command.track==='audio'?'aid':'sid']:command.value});effect=command;rollback={kind:'track',track:command.track,value:state.settings[command.track==='audio'?'aid':'sid']};break;
      case 'subtitles':settings=Object.freeze({...settings,subtitles:command.value});effect={kind:'subtitles',value:command.value};rollback={kind:'subtitles',value:state.settings.subtitles};break;
      case 'buffering':preferences=changePreferences(preferences,{buffering:command.value});effect={kind:'buffering',value:preferences.buffering};rollback={kind:'buffering',value:state.preferences.buffering};break;
      case 'output':preferences=changePreferences(preferences,{outputDeviceId:command.value});effect=command;rollback={kind:'output',value:state.preferences.outputDeviceId};break;
      case 'quality':preferences=changePreferences(preferences,{qualityPolicy:command.value});effect={kind:'quality',value:preferences.qualityPolicy!};rollback={kind:'quality',value:copyData(command.previous)};break;
      case 'subtitleDelay':case 'audioDelay':case 'subtitleStyle':preferences=changePreferences(preferences,{[command.kind]:command.value});effect={kind:'source.reconfigure',settings};rollback=effect;reconfigure=true;break;
      case 'filters':{
        settings=Object.freeze({...settings,[command.key]:command.value});
        const rejection=!state.source.automatic&&featureRejection(state.source.mode,{...settings,toneMapping:preferences.toneMapping,hybridAudioFilters:input.hybridAudioFilters});
        if(rejection)return result(state,false,undefined,empty,rejection);
        noop=command.value===state.settings[command.key];
        const direct=!command.value&&state.source.automatic&&input.hasBackend&&state.source.mode!=='native'&&preferences.toneMapping==='off';
        reconfigure=!direct;promote=!!direct&&!noop;
        effect=direct?{kind:'filter',key:command.key,value:''}:{kind:'source.reconfigure',settings};
        rollback={kind:'filter',key:command.key,value:command.key==='vf'?effectiveVideoFilters(state.settings,state.preferences):state.settings.af};
        if(!noop&&!input.hasSource&&state.source.automatic&&(settings.vf||settings.af))mode=featureRejection('hybrid',{...settings,toneMapping:preferences.toneMapping,hybridAudioFilters:input.hybridAudioFilters})?'software':'hybrid';
        break;
      }
      case 'toneMapping':{
        preferences=changePreferences(preferences,{toneMapping:command.value});noop=command.value===state.preferences.toneMapping;
        const direct=command.value==='off'&&state.source.automatic&&input.hasBackend&&state.source.mode==='software';
        reconfigure=!direct;promote=!!direct&&!noop;
        effect=direct?{kind:'filter',key:'vf',value:settings.vf}:{kind:'source.reconfigure',settings};rollback={kind:'filter',key:'vf',value:effectiveVideoFilters(state.settings,state.preferences)};
        if(!noop&&!input.hasSource){
          if(state.source.automatic&&command.value!=='off')mode='software';
          else {const rejection=featureRejection(state.source.mode,{...settings,toneMapping:command.value,hybridAudioFilters:input.hybridAudioFilters});if(rejection)return result(state,false,undefined,empty,rejection);}
        }
        break;
      }
    }
    const effects:SettingEffect[]=!noop&&(reconfigure?input.hasSource:input.hasBackend)?[copyData(effect)]:[],restore:SettingEffect[]=!noop&&input.hasBackend&&!reconfigure?[copyData(rollback)]:[];
    if(!noop&&(command.kind==='range'||command.kind==='loop')&&input.hasBackend&&effect.kind==='seek'){
      effects.push(Object.freeze({kind:'seek.verify',value:effect.value}));restore.push(Object.freeze({kind:'seek.verify',value:command.facts.time}));
      if(state.source.mode!=='native'&&!state.settings.pause){
        effects.unshift(Object.freeze({kind:'pause'}));restore.unshift(Object.freeze({kind:'pause'}));
        effects.push(Object.freeze({kind:'seek.resume'}));restore.push(Object.freeze({kind:'seek.resume'}));
      }
    }
    if(input.hasBackend&&verifyTrack){effects.push(Object.freeze({kind:'track.verify',track:verifyTrack,value:settings[verifyTrack==='audio'?'aid':'sid'],settings}));restore.push(Object.freeze({kind:'track.verify',track:verifyTrack,value:state.settings[verifyTrack==='audio'?'aid':'sid'],settings:state.settings}));}
    const settingKey:keyof PlaybackSettings|undefined=command.kind==='volume'?'volume':command.kind==='rate'?'speed':command.kind==='gain'||command.kind==='routedGain'?'gain':command.kind==='pause'?'pause':command.kind==='subtitles'||command.kind==='visibility'?'subtitles':command.kind==='track'||command.kind==='publicTrack'&&!noop?(command.track==='audio'?'aid':'sid'):command.kind==='filters'?command.key:undefined;
    const preferenceKey:keyof PlayerPreferences|undefined=command.kind==='publicTrack'&&selection?.action!=='none'||command.kind==='track'&&command.clearPublicSelection?'publicSelections':command.kind==='mute'?'muted':command.kind==='buffering'?'buffering':command.kind==='output'?'outputDeviceId':command.kind==='quality'?'qualityPolicy':command.kind==='range'?'playbackRange':command.kind==='loop'?'loopPolicy':command.kind==='subtitleDelay'||command.kind==='audioDelay'||command.kind==='subtitleStyle'||command.kind==='toneMapping'?command.kind:undefined;
    const settingsPatch=Object.freeze(settingKey?{[settingKey]:settings[settingKey]}:{}),preferencesPatch=copyData(preferenceKey?{[preferenceKey]:preferences[preferenceKey]}:{});
    const id=state.settingsTransactions.serial+1,transaction:SettingTransaction=Object.freeze({id,operation:operation.id,epoch:operation.epoch,session:state.source.acceptedSession,phase:'applying',reconfigure,promote,mode,automatic,automaticDuringApply:command.kind==='automatic',after:Object.freeze(after.map(effect=>Object.freeze({...effect}))),settings,preferences,settingsPatch,preferencesPatch,rollback:Object.freeze(restore)});
    return result({...state,settingsTransactions:Object.freeze({...state.settingsTransactions,serial:id,pending:transaction})},true,id,Object.freeze(effects));
  }
  if(!settingAuthority(state,input.id))return result(state,false,input.id);
  const pending=state.settingsTransactions.pending!;
  if(input.type==='setting.resume')return result(state,true,input.id,!pending.resumeSuppressed&&!state.settings.pause?[Object.freeze({kind:'play'})]:empty);
  if(input.type==='setting.failed'){
    if(pending.phase!=='applying')return result(state,false,input.id);
    return result({...state,settingsTransactions:Object.freeze({...state.settingsTransactions,pending:Object.freeze({...pending,phase:'compensating'})})},true,input.id,pending.rollback);
  }
  if(input.type==='setting.accept'&&pending.phase==='compensating'||input.type!=='setting.accept'&&pending.phase!=='compensating')return result(state,false,input.id);
  const degraded=input.type==='setting.degraded'?Object.freeze({id:pending.id,operation:pending.operation,session:pending.session}):state.settingsTransactions.degraded;
  // Apply only the fields this command owns. Independent accepted observations
  // (for example an emergency pause) may arrive while its I/O is pending.
  const commit=input.type==='setting.accept'&&pending.phase!=='accepted';
  return result({...state,source:input.type==='setting.accept'&&(pending.mode!==undefined||pending.automatic!==undefined)?Object.freeze({...state.source,...(pending.mode===undefined?{}:{mode:pending.mode}),...(pending.automatic===undefined?{}:{automatic:pending.automatic})}):state.source,settings:commit?Object.freeze({...state.settings,...pending.settingsPatch}):state.settings,preferences:commit?changePreferences(state.preferences,pending.preferencesPatch):state.preferences,settingsTransactions:Object.freeze({...state.settingsTransactions,pending:null,degraded})},true,input.id,input.type==='setting.accept'?Object.freeze([...pending.after,...(pending.promote?[{kind:'promotion' as const}]:[])]):empty);
}
