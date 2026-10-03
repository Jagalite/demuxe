// SPDX-License-Identifier: Apache-2.0
import type {PlayerControlState} from './state.js';
import type {PlayerControlDecision} from './transition.js';
import {recoveryRoute,type RouteRequirements} from './route-recovery.js';
type Phase='verifying'|'seeking'|'selecting'|'restoring'|'retrying'|'resuming'|'finished';
type Work=Readonly<{id:number;epoch:number;operation:number;session:number;kind:'play'|'seek';phase:Phase;intent:number;target:number;previous:number;wasPaused:boolean;trialSame:boolean;trialVerified:boolean;bounded:boolean;local:boolean;inconclusive:boolean;backendPlan:string|undefined;nativeRemux:'auto'|'never'|'always'}>;
export type PlayerTransportState=Readonly<{serial:number;pending:Work|null}>;
export type TransportEffect=Readonly<{kind:'verify'|'seek'|'fallback'|'restore'|'resume'|'pause'|'reject'|'ignore';target?:number;budget?:number;start?:number;requirements?:RouteRequirements}>;
export type PlayerTransportInput=
 |Readonly<{type:'transport.play.begin';intent:number;position:number;trialSame:boolean;trialVerified:boolean;local:boolean;backendPlan:string|undefined;nativeRemux:'auto'|'never'|'always';fallbackAvailable:boolean}>
 |Readonly<{type:'transport.seek.begin';intent:number;target:number;previous:number;sourceId?:number|null;seekable:readonly Readonly<{start:number;end:number}>[]|null}>
 |Readonly<{type:'transport.play.failed';id:number;compatible:boolean;inconclusive:boolean;streaming:boolean}>
 |Readonly<{type:'transport.play.fallback-failed';id:number;compatible:boolean;code:string}>
 |Readonly<{type:'transport.play.restored';id:number}>
 |Readonly<{type:'transport.seek.failed';id:number;boundary:boolean;terminal:boolean;code:string;invalidPosition:boolean;streaming:boolean}>
 |Readonly<{type:'transport.seek.restore-failed';id:number;terminal?:boolean;code?:string}>
 |Readonly<{type:'transport.seek.restored'|'transport.seek.resumed'|'transport.complete'|'transport.finished';id:number}>;
export function initialPlayerTransport():PlayerTransportState{return Object.freeze({serial:0,pending:null});}
export function retirePlayerTransport(state:PlayerTransportState):PlayerTransportState{return state.pending?Object.freeze({...state,pending:null}):state;}
/** A queued Pause supersedes compensating resume without changing FIFO settings. */
export function pausePlayerTransport(state:PlayerTransportState):PlayerTransportState{return state.pending?.kind==='seek'&&!state.pending.wasPaused?Object.freeze({...state,pending:Object.freeze({...state.pending,wasPaused:true})}):state;}
export function playerTransportAuthority(state:PlayerControlState,id:number):boolean{
 const p=state.transport.pending;return !!p&&p.id===id&&!state.operations.terminal&&p.epoch===state.operations.epoch&&p.operation===state.operations.active&&(p.phase==='selecting'||state.source.acceptedSession===p.session&&state.source.acceptedEpoch===p.epoch)&&(p.kind!=='seek'||state.playback.seeks.includes(p.intent))&&state.operations.entries.some(e=>e.id===p.operation&&!e.cancelled&&e.epoch===p.epoch);
}
export function transitionPlayerTransport(state:PlayerControlState,input:PlayerTransportInput):PlayerControlDecision{
 const no=(reason='retired',message?:string):PlayerControlDecision=>Object.freeze({state,accepted:false,reason,message,retire:Object.freeze([])});
 const set=(pending:Work|null,effect?:TransportEffect,pause=false):PlayerControlDecision=>Object.freeze({state:Object.freeze({...state,revision:state.revision+1,transport:Object.freeze({serial:pending?.id??state.transport.serial,pending}),...(pause?{settings:Object.freeze({...state.settings,pause:true})}:{})}),accepted:true,id:pending?.id,retire:Object.freeze([]),transportEffect:effect?Object.freeze({...effect}):undefined});
 const old=state.transport.pending;
 if(input.type==='transport.finished')return old?.id===input.id?set(null):no();
 if(input.type==='transport.play.begin'||input.type==='transport.seek.begin'){
  const op=state.operations.entries.find(e=>e.id===state.operations.active);
  if(state.operations.terminal||!op||op.cancelled||op.epoch!==state.operations.epoch)return no();
  if(old)return no('busy');
  if(state.source.acceptedSession===null)return no('invalid','No source');
  if(state.source.acceptedEpoch!==state.operations.epoch)return no();
  if(!Number.isSafeInteger(state.transport.serial+1))return no('full');
  if(input.type==='transport.seek.begin'){
   if(!state.playback.seeks.includes(input.intent))return no();
   if(input.sourceId!==undefined&&input.sourceId!==state.source.serial)return no('invalid','Chapter belongs to a retired source');
   if(!Number.isFinite(input.target)||input.target<0)return no('invalid','Invalid seek time');
   const range=state.preferences.playbackRange;
   if(range&&(input.target<range.start||input.target>range.end))return no('invalid','Seek is outside the playback range');
   if(input.seekable&&!input.seekable.some(r=>input.target>=r.start&&input.target<=r.end))return no('invalid','Seek is outside the current seekable window');
  }else if(!state.playback.plays.includes(input.intent))return no();
  const play=input.type==='transport.play.begin';
  const bounded=play&&state.source.automatic&&input.local&&input.nativeRemux!=='never'&&!input.trialVerified&&['direct','direct-mpv'].includes(input.backendPlan??'')&&input.fallbackAvailable;
  const pending:Work=Object.freeze({id:state.transport.serial+1,epoch:op.epoch,operation:op.id,session:state.source.acceptedSession,kind:play?'play':'seek',phase:play?'verifying':'seeking',intent:input.intent,target:play?input.position:input.target,previous:play?input.position:input.previous,wasPaused:state.settings.pause,trialSame:play&&input.trialSame,trialVerified:play&&input.trialVerified,bounded,local:play&&input.local,inconclusive:false,backendPlan:play?input.backendPlan:undefined,nativeRemux:play?input.nativeRemux:'auto'});
  return set(pending,play?{kind:'verify',budget:bounded?1500:undefined}:{kind:'seek',target:input.target});
 }
 if(!old||!playerTransportAuthority(state,input.id))return no();
 const step=(phase:Phase,effect?:TransportEffect,patch:Partial<Work>={},pause=false)=>set(Object.freeze({...old,...patch,phase}),effect,pause);
 if(old.phase==='finished')return no();
 if(old.kind==='play'&&!state.playback.plays.includes(old.intent))return step('finished',{kind:'ignore'});
 if(input.type==='transport.complete')return ['verifying','retrying','selecting','seeking'].includes(old.phase)?step('finished'):no();
 if(input.type.startsWith('transport.play.')&&old.kind!=='play'||input.type.startsWith('transport.seek.')&&old.kind!=='seek')return no();
 if(input.type==='transport.play.failed'){
  if(!['verifying','retrying'].includes(old.phase))return no();
  if(!state.playback.plays.includes(old.intent))return step('finished',{kind:'ignore'});
  if(old.phase==='retrying')return step('finished',{kind:'reject'});
  const inconclusive=old.local&&input.inconclusive;
  if(state.source.automatic&&state.source.acceptedSession!==null&&(input.compatible||inconclusive)){
   const route=recoveryRoute({mode:state.source.mode,backendPlan:old.backendPlan,nativeRemux:old.nativeRemux,streaming:input.streaming,trigger:'play'});
   return step('selecting',{kind:'fallback',...route,target:old.trialSame&&!old.trialVerified?old.target:undefined},{inconclusive});
  }
  return step('finished',{kind:'pause'},{},true);
 }
 if(input.type==='transport.play.fallback-failed'){
  if(old.phase!=='selecting')return no();
  if(!old.bounded||!old.inconclusive||state.source.acceptedSession!==old.session||!(input.compatible||['ASSET_LOAD_FAILED','NETWORK_TIMEOUT','ISOLATION_REQUIRED'].includes(input.code)))return step('finished',{kind:'reject'});
  return old.trialSame&&!old.trialVerified?step('restoring',{kind:'restore',target:old.target}):step('retrying',{kind:'verify'});
 }
 if(input.type==='transport.play.restored')return old.phase==='restoring'?step('retrying',{kind:'verify'}):no();
 const seekRoute=(streaming=false)=>({kind:'fallback' as const,target:old.target,start:streaming||state.source.mode==='native'?0:state.source.mode==='hybrid'?2:3,requirements:Object.freeze({})});
 if(input.type==='transport.seek.failed'){
  if(old.phase!=='seeking')return no();
  if(input.boundary)return state.source.acceptedSession===old.session?step('restoring',{kind:'restore',target:old.previous}):step('finished',{kind:'reject'});
  if(['ABORTED','AUTOPLAY_BLOCKED','INVALID_ARGUMENT','SOURCE_PERMISSION','SOURCE_CHANGED'].includes(input.code)||!state.source.automatic||state.source.mode==='software'||input.terminal||input.invalidPosition)return step('finished',{kind:'reject'});
  return step('selecting',seekRoute(input.streaming));
 }
 if(input.type==='transport.seek.restore-failed'){
  if(!['restoring','resuming'].includes(old.phase))return no();
  if(input.terminal||['ABORTED','AUTOPLAY_BLOCKED','SOURCE_PERMISSION','SOURCE_CHANGED'].includes(input.code??''))return step('finished',{kind:'reject'});
  return state.source.automatic&&state.source.acceptedSession!==null?step('selecting',seekRoute()):step('finished',{kind:'reject'});
 }
 if(input.type==='transport.seek.restored')return old.phase==='restoring'?old.wasPaused?step('finished',{kind:'reject'}):step('resuming',{kind:'resume'}):no();
 if(input.type==='transport.seek.resumed')return old.phase==='resuming'?step('finished',{kind:'reject'}):no();
 return no();
}
