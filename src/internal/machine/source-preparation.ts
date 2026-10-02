// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode,SubtitleStyle} from '../../types.js';
import type {PlaybackSettings} from './settings.js';
/** Source bytes, options, backend methods and promise instances stay in the adapter. */
export type SourcePreparationFacts=Readonly<{
 mode:PlaybackMode;settings:Readonly<PlaybackSettings>;videoFilters:string;
 subtitleDelay:number;audioDelay:number;subtitleStyle:Readonly<SubtitleStyle>;
 overlapping:boolean;muted:boolean;
}>;
export type SourcePreparationCommand=
 |Readonly<{kind:'ready'|'configured'|'open'}>
 |Readonly<{kind:'command';property:string;value:string}>
 |Readonly<{kind:'gain'|'volume'|'rate';value:number}>
 |Readonly<{kind:'track';track:'audio'|'sub';value:string}>
 |Readonly<{kind:'subtitles';value:boolean}>;
export type SourcePreparationEffect=SourcePreparationCommand&Readonly<{step:number}>;
export type SourcePreparation=Readonly<{commands:readonly SourcePreparationCommand[];cursor:number;pending:number|null}>;
export function initialSourcePreparation():SourcePreparation{return Object.freeze({commands:Object.freeze([Object.freeze({kind:'ready' as const})]),cursor:0,pending:null});}
/** A claim advances authority before same-stack adapter calls. A second claimant
 * cannot issue the same command while its physical result is outstanding. */
export function claimSourcePreparation(state:SourcePreparation):Readonly<{state:SourcePreparation;accepted:boolean;effect?:SourcePreparationEffect}>{
 if(state.pending!==null)return Object.freeze({state,accepted:false});
 const command=state.commands[state.cursor];if(!command)return Object.freeze({state,accepted:true});
 return Object.freeze({state:Object.freeze({...state,pending:state.cursor}),accepted:true,effect:Object.freeze({...command,step:state.cursor})});
}
export function completeSourcePreparation(state:SourcePreparation,step:number,facts?:SourcePreparationFacts):Readonly<{state:SourcePreparation;accepted:boolean;phase?:'opening'|'applying'}>{
 const command=state.commands[state.cursor];
 if(state.pending!==step||state.cursor!==step||!command||command.kind==='ready'&&!facts)return Object.freeze({state,accepted:false});
 const commands=command.kind==='ready'?sourcePreparationCommands(facts!):state.commands;
 return Object.freeze({state:Object.freeze({commands,cursor:state.cursor+1,pending:null}),accepted:true,...(command.kind==='configured'?{phase:'opening' as const}:command.kind==='open'?{phase:'applying' as const}:{})});
}
export function sourcePreparationDone(state:SourcePreparation):boolean{return state.pending===null&&state.cursor===state.commands.length;}
function sourcePreparationCommands(facts:SourcePreparationFacts):readonly SourcePreparationCommand[]{
 const {settings,mode}=facts,commands:SourcePreparationCommand[]=[{kind:'ready'}];
 if(facts.videoFilters)commands.push({kind:'command',property:'vf',value:facts.videoFilters});
 if(mode!=='native'){
  if(settings.af)commands.push({kind:'command',property:'af',value:settings.af});
  commands.push({kind:'command',property:'sub-delay',value:String(facts.subtitleDelay)},{kind:'command',property:'audio-delay',value:String(facts.audioDelay)});
  const names={fontSize:'sub-font-size',color:'sub-color',borderSize:'sub-border-size',fontFamily:'sub-font'};
  for(const [key,value]of Object.entries(facts.subtitleStyle))commands.push({kind:'command',property:names[key as keyof SubtitleStyle],value:String(value)});
 }
 commands.push({kind:'gain',value:settings.gain},{kind:'volume',value:facts.overlapping||facts.muted?0:settings.volume},{kind:'rate',value:settings.speed});
 if(mode!=='native')commands.push({kind:'track',track:'audio',value:settings.aid},{kind:'track',track:'sub',value:settings.sid},{kind:'subtitles',value:settings.subtitles});
 commands.push({kind:'configured'},{kind:'open'});
 return Object.freeze(commands.map(command=>Object.freeze({...command})));
}
