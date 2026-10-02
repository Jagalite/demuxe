// SPDX-License-Identifier: Apache-2.0
/** Queue source objects belong to the shell; only opaque IDs and display metadata live here. */
export type ElementQueueItem=Readonly<{id:number;name:string}>;
export type ElementQueueState=Readonly<{
  items:readonly ElementQueueItem[];index:number;revision:number;nextItem:number;nextOperation:number;
  operation:number|null;playIntent:boolean|undefined;sourceId:number|null;endedId:number|null;
}>;
export type ElementQueueFacts=Readonly<{terminal:boolean;pending:boolean}>;
export type ElementQueueCommand=
  | Readonly<{type:'reset'}>
  | Readonly<{type:'append';names:readonly string[];terminal:boolean}>
  | Readonly<{type:'start';index:number;terminal:boolean}>
  | Readonly<{type:'opened';operation:number;sourceId:number|null;defaultPlay:boolean}>
  | Readonly<{type:'settled';operation:number}>
  | Readonly<{type:'intent';play:boolean}>
  | Readonly<{type:'remove';index:number;sourceControls:boolean;pending:boolean}>
  | Readonly<{type:'advance';status:string;sourceId:number|null}&ElementQueueFacts>
  | Readonly<{type:'observe-source';sourceId:number|null}>;
export type ElementQueueDecision=Readonly<{
  state:ElementQueueState;accepted?:boolean;error?:'destroyed'|'superseded';operation?:number;
  itemId?:number;added?:readonly ElementQueueItem[];removedId?:number;activate?:number;play?:boolean;close?:boolean;reset?:boolean;
}>;
export function initialElementQueue():ElementQueueState {
  return Object.freeze({items:Object.freeze([]),index:-1,revision:0,nextItem:1,nextOperation:1,operation:null,playIntent:undefined,sourceId:null,endedId:null});
}
function reset(state:ElementQueueState):ElementQueueState {
  return Object.freeze({...state,items:Object.freeze([]),index:-1,revision:state.revision+1,operation:null,playIntent:undefined,sourceId:null,endedId:null});
}
export function transitionElementQueue(state:ElementQueueState,command:ElementQueueCommand):ElementQueueDecision {
  switch(command.type){
    case 'reset':return Object.freeze({state:reset(state),reset:true});
    case 'append':{
      if(command.terminal||command.names.length===0)return Object.freeze({state,accepted:false});
      const added=Object.freeze(command.names.map((name,index)=>Object.freeze({id:state.nextItem+index,name})));
      return Object.freeze({state:Object.freeze({...state,items:Object.freeze([...state.items,...added]),nextItem:state.nextItem+added.length,revision:state.revision+1}),accepted:true,added,activate:state.items.length===0?0:undefined});
    }
    case 'start':{
      if(command.terminal)return Object.freeze({state,accepted:false,error:'destroyed'});
      const item=state.items[command.index];if(!item)return Object.freeze({state,accepted:false});
      const operation=state.nextOperation;
      return Object.freeze({state:Object.freeze({...state,index:command.index,operation,nextOperation:operation+1,playIntent:undefined,sourceId:null,endedId:null}),accepted:true,operation,itemId:item.id});
    }
    case 'opened':{
      if(state.operation!==command.operation)return Object.freeze({state,accepted:false,error:'superseded'});
      return Object.freeze({state:Object.freeze({...state,sourceId:command.sourceId}),accepted:true,play:state.playIntent??command.defaultPlay});
    }
    case 'settled':return state.operation===command.operation?Object.freeze({state:Object.freeze({...state,operation:null}),accepted:true}):Object.freeze({state,accepted:false});
    case 'intent':return Object.freeze({state:state.operation===null?state:Object.freeze({...state,playIntent:command.play})});
    case 'remove':{
      if(!command.sourceControls||state.operation!==null||command.pending||command.index<0||command.index>=state.items.length)return Object.freeze({state,accepted:false});
      const items=Object.freeze(state.items.filter((_,index)=>index!==command.index)),wasCurrent=command.index===state.index;
      const next=Object.freeze({...state,items,revision:state.revision+1,index:command.index<state.index?state.index-1:state.index});
      return Object.freeze({state:next,accepted:true,removedId:state.items[command.index]!.id,close:items.length===0,activate:items.length&&wasCurrent?Math.min(command.index,items.length-1):undefined});
    }
    case 'advance':{
      if(command.terminal||state.operation!==null||command.pending||command.status!=='ended'||command.sourceId!==state.sourceId||state.endedId===command.sourceId||state.index>=state.items.length-1)return Object.freeze({state,accepted:false});
      return Object.freeze({state:Object.freeze({...state,endedId:command.sourceId}),accepted:true,activate:state.index+1});
    }
    case 'observe-source':return state.operation===null&&state.sourceId!==null&&state.sourceId!==command.sourceId?Object.freeze({state:reset(state),reset:true}):Object.freeze({state,reset:false});
  }
}
export function queueSelectionAllowed(state:ElementQueueState,facts:ElementQueueFacts):boolean {
  return !facts.terminal&&state.operation===null&&!facts.pending;
}
export function queueClosesRollback(state:ElementQueueState,operation:number,closePreviousOnFailure:boolean):boolean {
  return closePreviousOnFailure&&state.operation===operation&&state.sourceId===null;
}
