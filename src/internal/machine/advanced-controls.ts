// SPDX-License-Identifier: Apache-2.0
import type {FeatureAvailability,FeatureName} from '../../types.js';

export type AdvancedControlsState=Readonly<{
  ownerId:number|null;sourceId:number|null;nextOwner:number;operation:number;busy:boolean;
  dirty:readonly string[];drafts:Readonly<Record<string,string>>;
  signatures:Readonly<Record<string,string>>;labels:Readonly<Record<string,string>>;
}>;
export type AdvancedOwner=Readonly<{ownerId:number|null;sourceId:number|null}>;
export type AdvancedControlsCommand=
  | Readonly<{type:'allocate-owner'}>
  | Readonly<{type:'reconcile'}&AdvancedOwner>
  | Readonly<{type:'start';destroyed:boolean;connected:boolean;pending:boolean}&AdvancedOwner>
  | Readonly<{type:'settled';operation:number}>
  | Readonly<{type:'dirty';field:string;value:string}>
  | Readonly<{type:'clean';fields:readonly string[];operation:number}>
  | Readonly<{type:'signature';field:string;value:string}>
  | Readonly<{type:'labels';labels:Readonly<Record<string,string>>}>;
export type AdvancedControlsDecision=Readonly<{state:AdvancedControlsState;accepted?:boolean;ownerId?:number;operation?:number;changed?:boolean}>;
export function initialAdvancedControls(labels:Readonly<Record<string,string>>):AdvancedControlsState {
  return Object.freeze({ownerId:null,sourceId:null,nextOwner:1,operation:0,busy:false,dirty:Object.freeze([]),drafts:Object.freeze({}),signatures:Object.freeze({}),labels:Object.freeze({...labels})});
}
function reconcile(state:AdvancedControlsState,owner:AdvancedOwner):AdvancedControlsState {
  return state.ownerId===owner.ownerId&&state.sourceId===owner.sourceId?state:Object.freeze({...state,ownerId:owner.ownerId,sourceId:owner.sourceId,operation:state.operation+1,busy:false,dirty:Object.freeze([]),drafts:Object.freeze({}),signatures:Object.freeze({})});
}
export function transitionAdvancedControls(state:AdvancedControlsState,command:AdvancedControlsCommand):AdvancedControlsDecision {
  switch(command.type){
    case 'allocate-owner':return Object.freeze({state:Object.freeze({...state,nextOwner:state.nextOwner+1}),ownerId:state.nextOwner});
    case 'reconcile':{const next=reconcile(state,command);return Object.freeze({state:next,changed:next!==state});}
    case 'start':{
      const current=reconcile(state,command);
      if(current.ownerId===null||command.destroyed||!command.connected||command.pending||current.busy)return Object.freeze({state:current,accepted:false});
      const operation=current.operation+1;
      return Object.freeze({state:Object.freeze({...current,operation,busy:true}),accepted:true,operation});
    }
    case 'settled':return state.operation===command.operation?Object.freeze({state:Object.freeze({...state,busy:false}),accepted:true}):Object.freeze({state,accepted:false});
    case 'dirty':return Object.freeze({state:Object.freeze({...state,dirty:state.dirty.includes(command.field)?state.dirty:Object.freeze([...state.dirty,command.field]),drafts:Object.freeze({...state.drafts,[command.field]:command.value})})});
    case 'clean':{
      if(state.operation!==command.operation)return Object.freeze({state,accepted:false});
      const drafts=Object.fromEntries(Object.entries(state.drafts).filter(([field])=>!command.fields.includes(field)));
      return Object.freeze({state:Object.freeze({...state,dirty:Object.freeze(state.dirty.filter(field=>!command.fields.includes(field))),drafts:Object.freeze(drafts)}),accepted:true});
    }
    case 'signature':return state.signatures[command.field]===command.value?Object.freeze({state,changed:false}):Object.freeze({state:Object.freeze({...state,signatures:Object.freeze({...state.signatures,[command.field]:command.value})}),changed:true});
    case 'labels':return Object.freeze({state:Object.freeze({...state,labels:Object.freeze({...command.labels}),signatures:Object.freeze({})})});
  }
}
export function advancedControlsBlocked(state:AdvancedControlsState,facts:Readonly<{destroyed:boolean;pending:boolean;sourceId:number|null}>):boolean {
  return facts.destroyed||state.busy||facts.pending||facts.sourceId===null;
}
export function advancedFeatureDisabled(blocked:boolean,name:FeatureName,capability:FeatureAvailability):boolean {
  return blocked||capability.availability==='unavailable'||capability.availability==='unknown'&&!['snapshot','audioOutputDevice'].includes(name);
}
export function advancedShouldSync(state:AdvancedControlsState,field:string,draft:boolean,focused:boolean,force:boolean):boolean {
  return !(draft&&state.dirty.includes(field)||!force&&focused);
}
export function advancedControlValue(state:AdvancedControlsState,field:string,observed:string):string {
  return state.dirty.includes(field)?state.drafts[field]??observed:observed;
}
