// SPDX-License-Identifier: Apache-2.0
/** DOM connectivity and cancellation are observations; source/connection authority is pure. */
export type ElementLifecycleState=Readonly<{terminal:boolean;connection:number;source:number;attributeScheduled:boolean}>;
export type ElementLifecycleCommand=
 | Readonly<{type:'connect'|'disconnect'|'source-retire'|'destroy'|'schedule-attribute'}>
 | Readonly<{type:'connect-ready';connection:number;connected:boolean}>
 | Readonly<{type:'owner-ready';connected:boolean;sameOwner:boolean}>
 | Readonly<{type:'disconnect-ready';connection:number;connected:boolean}>
 | Readonly<{type:'source-start'}>
 | Readonly<{type:'flush-attribute';hasOwner:boolean}>;
export type ElementLifecycleDecision=Readonly<{state:ElementLifecycleState;accepted:boolean;connection?:number;source?:number}>;
export function initialElementLifecycle():ElementLifecycleState {
 return Object.freeze({terminal:false,connection:0,source:0,attributeScheduled:false});
}
export function transitionElementLifecycle(state:ElementLifecycleState,command:ElementLifecycleCommand):ElementLifecycleDecision {
 switch(command.type){
  case 'connect':case 'disconnect':return Object.freeze({state:Object.freeze({...state,connection:state.connection+1}),accepted:!state.terminal,connection:state.connection+1});
  case 'connect-ready':return Object.freeze({state,accepted:!state.terminal&&command.connected&&command.connection===state.connection});
  case 'owner-ready':return Object.freeze({state,accepted:!state.terminal&&command.connected&&command.sameOwner});
  case 'disconnect-ready':{
   const accepted=!state.terminal&&!command.connected&&command.connection===state.connection;
   return Object.freeze({state:accepted?Object.freeze({...state,source:state.source+1}):state,accepted});
  }
  case 'source-start':return state.terminal?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,source:state.source+1}),accepted:true,source:state.source+1});
  case 'source-retire':return Object.freeze({state:Object.freeze({...state,source:state.source+1}),accepted:true});
  case 'destroy':return state.terminal?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,terminal:true,connection:state.connection+1,source:state.source+1}),accepted:true});
  case 'schedule-attribute':return state.attributeScheduled?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,attributeScheduled:true}),accepted:true});
  case 'flush-attribute':return Object.freeze({state:Object.freeze({...state,attributeScheduled:false}),accepted:command.hasOwner&&!state.terminal});
 }
}
export function elementSourceCurrent(state:ElementLifecycleState,source:number,facts:Readonly<{aborted:boolean;sameOwner:boolean}>):boolean {
 return !state.terminal&&source===state.source&&!facts.aborted&&facts.sameOwner;
}

export type MediaElementBindingState=Readonly<{generation:number;bound:boolean;connection:number}>;
export type MediaElementBindingCommand=
 | Readonly<{type:'bind'|'dispose'|'connect'|'disconnect'}>
 | Readonly<{type:'disconnect-ready';connection:number;connected:boolean}>;
export function initialMediaElementBinding():MediaElementBindingState {return Object.freeze({generation:0,bound:false,connection:0});}
export function transitionMediaElementBinding(state:MediaElementBindingState,command:MediaElementBindingCommand):Readonly<{state:MediaElementBindingState;accepted:boolean}> {
 switch(command.type){
  case 'bind':return state.bound?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,generation:state.generation+1,bound:true}),accepted:true});
  case 'dispose':return Object.freeze({state:state.bound?Object.freeze({...state,generation:state.generation+1,bound:false}):state,accepted:state.bound});
  case 'connect':case 'disconnect':return Object.freeze({state:Object.freeze({...state,connection:state.connection+1}),accepted:true});
  case 'disconnect-ready':return Object.freeze({state,accepted:!command.connected&&command.connection===state.connection});
 }
}
export function mediaElementBindingCurrent(state:MediaElementBindingState,generation:number):boolean {return state.bound&&state.generation===generation;}
