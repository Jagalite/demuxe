// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode} from '../../types.js';
import type {PlaybackSettings} from './settings.js';
export type SourcePositioningCommand=
 |Readonly<{kind:'settled'|'seek';target:number}>
 |Readonly<{kind:'previous.pause'|'previous.time'|'monitor.release'|'position'|'positioned'|'candidate.error'|'plan'|'volume.observe'|'ready'}>
 |Readonly<{kind:'play';native:boolean}>
 |Readonly<{kind:'volume';value:number}>
 |Readonly<{kind:'reject';message:string}>;
export type SourcePositioningEffect=SourcePositioningCommand&Readonly<{step:number}>;
export type SourcePositioning=Readonly<{commands:readonly SourcePositioningCommand[];cursor:number;pending:number|null;target:number;volume:number;planId:string;planMatches:boolean}>;
export type SourcePositioningObservation=Readonly<{kind:'time';value:number}|{kind:'plan';actual:string|null;eligible:boolean}|{kind:'muted';value:boolean}>;
export function initialSourcePositioning(facts:Readonly<{mode:PlaybackMode;planId:string;target:number;overlapping:boolean;settings:Readonly<PlaybackSettings>}>):SourcePositioning{
 const commands:SourcePositioningCommand[]=[{kind:'settled',target:0}];
 if(facts.overlapping)commands.push({kind:'previous.pause'},{kind:'previous.time'},{kind:'monitor.release'});
 commands.push({kind:'position'},{kind:'positioned'},{kind:'candidate.error'},{kind:'plan'});
 if(!facts.settings.pause)commands.push({kind:'play',native:facts.mode==='native'});
 if(facts.overlapping)commands.push({kind:'volume.observe'});
 commands.push({kind:'ready'});
 return Object.freeze({commands:Object.freeze(commands.map(command=>Object.freeze({...command}))),cursor:0,pending:null,target:facts.target,volume:facts.settings.volume,planId:facts.planId,planMatches:false});
}
export function claimSourcePositioning(state:SourcePositioning):Readonly<{state:SourcePositioning;accepted:boolean;effect?:SourcePositioningEffect}>{
 if(state.pending!==null)return Object.freeze({state,accepted:false});const command=state.commands[state.cursor];
 return command?Object.freeze({state:Object.freeze({...state,pending:state.cursor}),accepted:true,effect:Object.freeze({...command,step:state.cursor})}):Object.freeze({state,accepted:true});
}
export function sourcePositioningDone(state:SourcePositioning):boolean{return state.pending===null&&state.cursor===state.commands.length;}
export function completeSourcePositioning(state:SourcePositioning,step:number,observation?:SourcePositioningObservation):Readonly<{state:SourcePositioning;accepted:boolean;positioned?:boolean}>{
 const command=state.commands[state.cursor],no=()=>Object.freeze({state,accepted:false});if(state.pending!==step||state.cursor!==step||!command||command.kind==='reject')return no();
 const insert:SourcePositioningCommand[]=[];let target=state.target,planMatches=state.planMatches;
 if(command.kind==='previous.time'){if(observation?.kind!=='time')return no();target=Math.max(0,observation.value||0);}
 else if(command.kind==='position'&&target>0)insert.push({kind:'seek',target},{kind:'settled',target});
 else if(command.kind==='plan'){
  if(observation?.kind!=='plan')return no();planMatches=observation.actual===state.planId&&observation.eligible;
  if(!planMatches)insert.push({kind:'reject',message:'The prepared components do not match an admitted complete playback plan'});
 }else if(command.kind==='volume.observe'){if(observation?.kind!=='muted')return no();insert.push({kind:'volume',value:observation.value?0:state.volume});}
 const cursor=state.cursor+1,commands=insert.length?Object.freeze([...state.commands.slice(0,cursor),...insert.map(command=>Object.freeze({...command})),...state.commands.slice(cursor)]):state.commands;
 return Object.freeze({state:Object.freeze({...state,commands,cursor,pending:null,target,planMatches}),accepted:true,...(command.kind==='positioned'?{positioned:true}:{})});
}
