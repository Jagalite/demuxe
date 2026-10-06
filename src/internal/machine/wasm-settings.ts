// SPDX-License-Identifier: Apache-2.0
import type {BufferingPolicy,AudioOutput} from '../../types.js';
import {mpvBufferingOptions} from './buffering-policy.js';
export type WasmTiming=Readonly<{latencyUs:number;running:boolean}>;
export type WasmSettings=Readonly<{buffering:BufferingPolicy;bufferingSettings:Readonly<Record<string,string>>;volume:number;gain:number;decoderOutput:boolean;timing:WasmTiming|null}>;
export const cloneWasmBuffering=(policy:BufferingPolicy):BufferingPolicy=>Object.freeze({...policy});
export function createWasmSettings(decoderOutput=true):WasmSettings{return Object.freeze({buffering:Object.freeze({preload:'auto',profile:'balanced'}),bufferingSettings:Object.freeze({}),volume:100,gain:1,decoderOutput,timing:null});}
export type WasmSettingInput=Readonly<{kind:'buffer-policy';policy:BufferingPolicy}|{kind:'buffer-setting';key:string;value:string}|{kind:'volume';value:number}|{kind:'gain';value:number}|{kind:'watchdog';decoderOutput:boolean}|{kind:'timing';latencyUs:number;running:boolean;force:boolean}>;
export function validWasmVolume(value:number):boolean{return Number.isFinite(value)&&value>=0&&value<=100;}
export function validWasmGain(value:number):boolean{return Number.isFinite(value)&&value>=0&&value<=1;}
export function effectiveWasmGain(state:WasmSettings,gain=state.gain):number{return state.volume===0?0:gain;}
export function planWasmGain(state:WasmSettings,value:number,hasStage:boolean):Readonly<{valid:boolean;createStage:boolean;effective:number}>{return Object.freeze({valid:validWasmGain(value),createStage:!hasStage&&(value!==1||state.volume===0),effective:effectiveWasmGain(state,value)});}
export function updateWasmSettings(state:WasmSettings,input:WasmSettingInput):Readonly<{state:WasmSettings;accepted:boolean;send:boolean}>{
 if(input.kind==='volume'||input.kind==='gain'){
  if(!(input.kind==='volume'?validWasmVolume(input.value):validWasmGain(input.value)))return Object.freeze({state,accepted:false,send:false});
  return Object.freeze({state:Object.freeze({...state,[input.kind]:input.value}),accepted:true,send:false});
 }
 if(input.kind==='buffer-policy')return Object.freeze({state:Object.freeze({...state,buffering:cloneWasmBuffering(input.policy)}),accepted:true,send:false});
 if(input.kind==='buffer-setting')return Object.freeze({state:Object.freeze({...state,bufferingSettings:Object.freeze({...state.bufferingSettings,[input.key]:input.value})}),accepted:true,send:false});
 if(input.kind==='watchdog')return Object.freeze({state:Object.freeze({...state,decoderOutput:input.decoderOutput}),accepted:true,send:true});
 const unchanged=state.timing?.latencyUs===input.latencyUs&&state.timing.running===input.running;
 return unchanged&&!input.force?Object.freeze({state,accepted:true,send:false}):Object.freeze({state:Object.freeze({...state,timing:Object.freeze({latencyUs:input.latencyUs,running:input.running})}),accepted:true,send:true});
}
export function planWasmBuffering(state:WasmSettings,input:Readonly<{kind:'configure';preparing:boolean}|{kind:'update';policy:BufferingPolicy;paused:boolean}>):Readonly<Record<string,string>>{
 if(input.kind==='configure')return Object.freeze({...mpvBufferingOptions(state.buffering,input.preparing)});
 return Object.freeze({...mpvBufferingOptions(input.policy,input.paused),'cache-secs':input.policy.preload==='auto'||!input.paused?'3600000':'1'});
}
export function planWasmAudioOutput(requested:AudioOutput,available:number,fallback:'stereo'|'reject'):Readonly<{channels:number;unavailable:boolean}>{
 const wanted=requested==='auto'?(available>=8?8:available>=6?6:2):requested==='7.1'?8:requested==='5.1'?6:2;
 return Object.freeze({channels:wanted<=available?wanted:2,unavailable:wanted>available&&fallback==='reject'});
}
