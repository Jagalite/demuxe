// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode,SnapshotOptions} from '../../types.js';
import {validOutputSize} from './settings.js';
import type {PlayerControlState} from './state.js';
import type {PlayerControlDecision} from './transition.js';

type Phase='pausing'|'stepping'|'sampling'|'waiting'|'verifying'|'capturing'|'live'|'finished';
export type SnapshotFacts=Readonly<{hasSurface:boolean;hasVideo:boolean;subtitle:boolean;readback:boolean;width:number;height:number}>;
export type SnapshotPlan=Readonly<{kind:'native'|'mpv';width:number;height:number;includesSubtitles:boolean}>;
export type PlayerActionState=Readonly<{serial:number;pending:Readonly<{id:number;operation:number;epoch:number;session:number;mode:PlaybackMode;phase:Phase;direction:1|-1;initial:number;deadline:number|null;target:number|null;snapshot:SnapshotPlan|null}>|null}>;
export type PlayerActionScope=Readonly<{epoch:number;session:number|null;operation:number|null}>;
export type PlayerActionInput=
 |Readonly<{type:'action.step';scope:PlayerActionScope;direction:1|-1;hasVideo:boolean;initial:number}>
 |Readonly<{type:'action.snapshot';scope:PlayerActionScope;options:Readonly<SnapshotOptions>;facts:SnapshotFacts}>
 |Readonly<{type:'action.live';scope:PlayerActionScope;supported:boolean}>
 |Readonly<{type:'action.completed';id:number;phase:Phase;now?:number}>
 |Readonly<{type:'action.sample';id:number;now:number;time:number}>
 |Readonly<{type:'action.finished';id:number}>;
export type PlayerActionEffect=
 |Readonly<{kind:'action.pause'}>
 |Readonly<{kind:'action.step';direction:1|-1}>
 |Readonly<{kind:'action.sample'}>
 |Readonly<{kind:'action.wait';milliseconds:20}>
 |Readonly<{kind:'action.verify';target:number}>
 |Readonly<{kind:'action.capture';plan:SnapshotPlan}>
 |Readonly<{kind:'action.live'}>;
export function initialPlayerActions():PlayerActionState{return Object.freeze({serial:0,pending:null});}
export function retirePlayerActions(state:PlayerActionState):PlayerActionState{return state.pending?Object.freeze({...state,pending:null}):state;}
export function playerActionAuthority(state:PlayerControlState,id:number):boolean{
 const pending=state.actions.pending;
 return !!pending&&pending.id===id&&!state.operations.terminal&&pending.epoch===state.operations.epoch&&pending.operation===state.operations.active&&pending.session===state.source.acceptedSession&&state.source.acceptedEpoch===pending.epoch&&state.operations.entries.some(entry=>entry.id===pending.operation&&entry.epoch===pending.epoch&&!entry.cancelled);
}
export function transitionPlayerAction(state:PlayerControlState,input:PlayerActionInput):PlayerControlDecision{
 const no=(reason='retired',message?:string):PlayerControlDecision=>Object.freeze({state,accepted:false,reason,message,retire:Object.freeze([])});
 const set=(actions:PlayerActionState,effects:readonly PlayerActionEffect[]=[],paused=false):PlayerControlDecision=>Object.freeze({state:Object.freeze({...state,revision:state.revision+1,actions,settings:paused?Object.freeze({...state.settings,pause:true}):state.settings}),accepted:true,id:actions.pending?.id,retire:Object.freeze([]),actionEffects:Object.freeze(effects.map(effect=>Object.freeze({...effect})))});
 const pending=state.actions.pending;
 if(input.type==='action.finished')return pending?.id===input.id?set(retirePlayerActions(state.actions)):no();
 if(input.type==='action.step'||input.type==='action.snapshot'||input.type==='action.live'){
  if(input.scope.epoch!==state.operations.epoch||input.scope.operation!==state.operations.active||input.scope.session!==state.source.acceptedSession)return no();
  if(state.operations.terminal||state.operations.active===null||state.operations.entries.some(entry=>entry.id===state.operations.active&&entry.cancelled))return no();
  if(pending)return no('busy','A media action is already active');
  let phase:Phase,effect:PlayerActionEffect,snapshot:SnapshotPlan|null=null;
  if(input.type==='action.step'){
   if(state.source.acceptedSession===null||state.source.mode==='native'||!input.hasVideo)return no('unsupported','Frame stepping requires mpv video playback');
   if(input.direction<0&&input.initial<=0)return no('invalid','No previous frame at the start of the source');
   phase='pausing';effect={kind:'action.pause'};
  }else if(input.type==='action.live'){
   if(state.source.acceptedSession===null||!input.supported)return no('unsupported','This route has no live navigation');
   phase='live';effect={kind:'action.live'};
  }else{
   const {facts,options}=input,include=options.includeSubtitles??true;
   if(state.source.acceptedSession===null||!facts.hasSurface||!facts.hasVideo)return no('unsupported','No video presentation');
   if(state.source.mode!=='native'){
    if(facts.subtitle&&!include)return no('unsupported','The mpv surface already contains subtitles');
    if(options.width!==undefined||options.height!==undefined)return no('unsupported','mpv snapshots use the current presentation size');
    if(!facts.readback)return no('unsupported','Snapshot readback is unavailable');
    snapshot=Object.freeze({kind:'mpv',width:0,height:0,includesSubtitles:facts.subtitle});
   }else{
    if(facts.subtitle&&include)return no('unsupported','Native subtitle composition is not qualified for snapshots');
    const scale=Math.min(1,1920/facts.width,1080/facts.height);
    const width=options.width??Math.max(1,Math.round(facts.width*scale)),height=options.height??Math.max(1,Math.round(facts.height*scale));
    if(!validOutputSize(width,height))return no('invalid','Output dimensions must be within 1920×1080');
    snapshot=Object.freeze({kind:'native',width,height,includesSubtitles:false});
   }
   phase='capturing';effect={kind:'action.capture',plan:snapshot};
  }
  if(state.source.acceptedEpoch!==state.operations.epoch)return no();
  const id=state.actions.serial+1;
  return set(Object.freeze({serial:id,pending:Object.freeze({id,operation:state.operations.active,epoch:state.operations.epoch,session:state.source.acceptedSession!,mode:state.source.mode,phase,direction:input.type==='action.step'?input.direction:1,initial:input.type==='action.step'?input.initial:0,deadline:null,target:null,snapshot})}),[effect]);
 }
 if(!pending||!playerActionAuthority(state,input.id))return no();
 const advance=(phase:Phase,effects:readonly PlayerActionEffect[]=[],patch:Partial<NonNullable<PlayerActionState['pending']>>={},paused=false)=>set(Object.freeze({...state.actions,pending:Object.freeze({...pending,...patch,phase})}),effects,paused);
 if(input.type==='action.sample'){
  if(pending.phase!=='sampling'||pending.deadline===null)return no();
  if(input.now>=pending.deadline)return no('unsupported','No adjacent frame was presented within the stepping deadline');
  if(Number.isFinite(input.time)&&(pending.direction>0?input.time>pending.initial:input.time<pending.initial))return advance('verifying',[{kind:'action.verify',target:input.time}],{target:input.time});
  return advance('waiting',[{kind:'action.wait',milliseconds:20}]);
 }
 if(input.phase!==pending.phase)return no();
 switch(pending.phase){
  case 'pausing':return advance('stepping',[{kind:'action.step',direction:pending.direction}],{},true);
  case 'stepping':return typeof input.now==='number'&&Number.isFinite(input.now)?advance('sampling',[{kind:'action.sample'}],{deadline:input.now+25000}):no('invalid','A stepping completion requires a clock observation');
  case 'waiting':return advance('sampling',[{kind:'action.sample'}]);
  case 'verifying':case 'capturing':case 'live':return advance('finished');
  case 'sampling':case 'finished':return no();
 }
}
