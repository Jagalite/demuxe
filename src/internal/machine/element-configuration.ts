// SPDX-License-Identifier: Apache-2.0
import type {PreviewOptions,TrackPolicy,WatchdogPolicy} from '../../types.js';
import {copyData} from './data.js';
export type ElementConfiguration=Readonly<{
 sourceControls:boolean;diagnosticsControl:boolean;fileDrop:boolean;seekStep:number;autoHideDelay:number;
 trackPolicy:TrackPolicy;watchdogs:WatchdogPolicy;labels:Readonly<Record<string,string>>;
 audioPlayback:'auto'|'worklet';preview:PreviewOptions|false|undefined;
 configuredAsset:string|null;reflectionDepth:number;
}>;
export type ElementConfigurationCommand=
 | Readonly<{type:'source-controls'|'diagnostics-control'|'file-drop';value:boolean}>
 | Readonly<{type:'seek-step'|'auto-hide-delay';value:number}>
 | Readonly<{type:'track-policy';value:TrackPolicy}>
 | Readonly<{type:'watchdogs';value:WatchdogPolicy;terminal:boolean}>
 | Readonly<{type:'labels';entries:readonly (readonly [string,unknown])[];keys:readonly string[]}>
 | Readonly<{type:'audio-playback';value:string;hasOwner:boolean}>
 | Readonly<{type:'preview';value:PreviewOptions|false|undefined;hasOwner:boolean}>
 | Readonly<{type:'asset-lock';value:string|null}>
 | Readonly<{type:'reflection';enter:boolean}>;
export type ElementConfigurationDecision=Readonly<{state:ElementConfiguration;error?:Readonly<{code:'INVALID_ARGUMENT'|'ABORTED';message:string}>}>;
export function initialElementConfiguration(watchdogs:WatchdogPolicy):ElementConfiguration {
 return copyData({sourceControls:true,diagnosticsControl:true,fileDrop:true,seekStep:10,autoHideDelay:2800,trackPolicy:{},watchdogs,labels:{},audioPlayback:'auto',preview:undefined,configuredAsset:null,reflectionDepth:0});
}
export function transitionElementConfiguration(state:ElementConfiguration,command:ElementConfigurationCommand):ElementConfigurationDecision {
 const invalid=(message:string,code:'INVALID_ARGUMENT'|'ABORTED'='INVALID_ARGUMENT')=>Object.freeze({state,error:Object.freeze({code,message})});
 switch(command.type){
  case 'source-controls':return Object.freeze({state:Object.freeze({...state,sourceControls:command.value})});
  case 'diagnostics-control':return Object.freeze({state:Object.freeze({...state,diagnosticsControl:command.value})});
  case 'file-drop':return Object.freeze({state:Object.freeze({...state,fileDrop:command.value})});
  case 'seek-step':return !Number.isFinite(command.value)||command.value<=0?invalid('seekStep must be a positive finite number'):Object.freeze({state:Object.freeze({...state,seekStep:command.value})});
  case 'auto-hide-delay':return !Number.isFinite(command.value)||command.value<0||command.value>2147483647?invalid('controlsAutoHideDelay must be between 0 and 2147483647 milliseconds'):Object.freeze({state:Object.freeze({...state,autoHideDelay:command.value})});
  case 'track-policy':return Object.freeze({state:Object.freeze({...state,trackPolicy:copyData(command.value)})});
  case 'watchdogs':return command.terminal?invalid('Player element is destroyed','ABORTED'):Object.freeze({state:Object.freeze({...state,watchdogs:copyData(command.value)})});
  case 'labels':{
   const entries=command.entries.filter(([key,text])=>command.keys.includes(key)&&text!==undefined);
   if(entries.some(([,text])=>typeof text!=='string'||text.length>1024))return invalid('Labels must be strings up to 1024 characters');
   return Object.freeze({state:Object.freeze({...state,labels:Object.freeze(Object.fromEntries(entries) as Record<string,string>)})});
  }
  case 'audio-playback':{
   if(command.hasOwner)return invalid('audioPlayback is fixed after initialization');
   if(command.value!=='auto'&&command.value!=='worklet')return invalid('audioPlayback must be auto or worklet');
   return Object.freeze({state:Object.freeze({...state,audioPlayback:command.value})});
  }
  case 'preview':return command.hasOwner?invalid('previewOptions is fixed after initialization'):Object.freeze({state:Object.freeze({...state,preview:copyData(command.value)})});
  case 'asset-lock':return Object.freeze({state:Object.freeze({...state,configuredAsset:command.value})});
  case 'reflection':return Object.freeze({state:Object.freeze({...state,reflectionDepth:Math.max(0,state.reflectionDepth+(command.enter?1:-1))})});
 }
}
export function elementLabels(defaults:Readonly<Record<string,string>>,state:ElementConfiguration):Readonly<Record<string,string>> {
 return Object.freeze({...defaults,back:`Seek backward ${state.seekStep} seconds`,forward:`Seek forward ${state.seekStep} seconds`,...state.labels});
}
export function elementPreviewEnabled(state:ElementConfiguration,attributeEnabled:boolean):boolean {return attributeEnabled&&state.preview!==false&&state.preview?.enabled!==false;}
