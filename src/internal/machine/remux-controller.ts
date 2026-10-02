// SPDX-License-Identifier: Apache-2.0
export type RemuxData=null|undefined|boolean|number|string|bigint|readonly RemuxData[]|Readonly<{[key:string]:RemuxData}>;
export type RemuxOwnerObservation=Readonly<{duration?:number;generation?:number;eof?:boolean;muxedFrames?:boolean;waitingForMedia?:boolean;frames?:readonly (readonly [number,number])[];snapshot?:Readonly<{[key:string]:RemuxData}>}>;
type Owner=Readonly<{id:number;kind:'worker'|'local';phase:'booting'|'ready'}>;
type Operation=Readonly<{id:number;kind:'open'|'seek';sourceKey:string|null}>;
export type RemuxOwnerRequest=Readonly<{id:number;owner:number;method:string;deadline:number}>;
export type RemuxController=Readonly<{destroyed:boolean;cleanupFailures:number;ownerSerial:number;owner:Owner|null;operationSerial:number;operation:Operation|null;sourceSerial:number;sourceKey:string|null;requestSerial:number;requests:readonly RemuxOwnerRequest[];intent:boolean|null;observation:RemuxOwnerObservation;observationSerial:number;tracksToken:number|null;buffering:RemuxData;configuration:Readonly<{[key:string]:RemuxData}>}>;
export type RemuxControllerCommand=
 | Readonly<{type:'boot'}>|Readonly<{type:'booted';owner:number}>
 | Readonly<{type:'begin';kind:'open'|'seek'}>|Readonly<{type:'finish';id:number}>
 | Readonly<{type:'local';operation:number;reason:'boot'|'source';message:string}>
 | Readonly<{type:'release';owner:number}>
 | Readonly<{type:'request';owner:number;method:string;now:number}>
 | Readonly<{type:'reply';owner:number;id:number}>
 | Readonly<{type:'deadline';owner:number;id:number;now:number}>
 | Readonly<{type:'observe';owner:number;observation:RemuxOwnerObservation;tracks:boolean}>
 | Readonly<{type:'buffering';owner:number;value:RemuxData}>
 | Readonly<{type:'intent';playing:boolean}>|Readonly<{type:'destroy'}>|Readonly<{type:'cleanup-failed'}>;
export type RemuxControllerDecision=Readonly<{state:RemuxController;accepted?:boolean;error?:string;owner?:number;operation?:number;sourceKey?:string|null;request?:RemuxOwnerRequest;retire?:readonly RemuxOwnerRequest[];wait?:number}>;
function copy(value:RemuxData):RemuxData {
 if(Array.isArray(value))return Object.freeze(value.map(item=>copy(item)));
 if(value&&typeof value==='object')return Object.freeze(Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copy(item)])));
 return value;
}
export function initialRemuxController(buffering?:RemuxData,configuration:Readonly<{[key:string]:RemuxData}>={}):RemuxController{return Object.freeze({destroyed:false,cleanupFailures:0,ownerSerial:0,owner:null,operationSerial:0,operation:null,sourceSerial:0,sourceKey:null,requestSerial:0,requests:Object.freeze([]),intent:null,observation:Object.freeze({}),observationSerial:0,tracksToken:null,buffering:copy(buffering),configuration:copy(configuration) as Readonly<{[key:string]:RemuxData}>});}
export function remuxOwnerCurrent(state:RemuxController,id:number):boolean{return !state.destroyed&&state.owner?.id===id;}
export function remuxOperationCurrent(state:RemuxController,id:number):boolean{return !state.destroyed&&state.operation?.id===id;}
export function remuxFallbackAllowed(state:RemuxController,operation:number,reason:'boot'|'source',message:string):boolean {
 if(!remuxOperationCurrent(state,operation))return false;
 return reason==='boot'||!(state.observation.snapshot?.capability as Readonly<{[key:string]:RemuxData}>|undefined)?.sourceBufferCreated&&/Unsupported MSE|MSE sourceopen/.test(message);
}
export function remuxReleaseCurrent(state:RemuxController,owner:number,operationSerial:number):boolean{return !state.destroyed&&!state.owner&&state.ownerSerial===owner&&state.operationSerial===operationSerial;}
export function transitionRemuxController(state:RemuxController,command:RemuxControllerCommand):RemuxControllerDecision {
 const result=(next:RemuxController,extra:Omit<RemuxControllerDecision,'state'>={})=>Object.freeze({state:next===state?state:Object.freeze({...next}),...extra});
 if(command.type==='cleanup-failed')return result({...state,cleanupFailures:state.cleanupFailures+1},{accepted:true});
 if(command.type==='destroy')return state.destroyed?result(state):result({...state,destroyed:true,owner:null,operation:null,sourceKey:null,requests:Object.freeze([])},{accepted:true,retire:state.requests});
 if(state.destroyed)return result(state,{error:'Destroyed'});
 if(command.type==='begin'){
  const id=state.operationSerial+1,sourceSerial=state.sourceSerial+(command.kind==='open'?1:0),sourceKey=command.kind==='open'?String(sourceSerial):state.sourceKey,operation=Object.freeze({id,kind:command.kind,sourceKey});
  return result({...state,operationSerial:id,operation,sourceSerial,sourceKey},{accepted:true,operation:id,sourceKey});
 }
 if(command.type==='finish')return remuxOperationCurrent(state,command.id)?result({...state,operation:null},{accepted:true}):result(state);
 if(command.type==='intent')return result({...state,intent:command.playing},{accepted:true});
 if(command.type==='boot'){
  if(state.owner)return result(state,{owner:state.owner.id});
  const id=state.ownerSerial+1;return result({...state,ownerSerial:id,owner:Object.freeze({id,kind:'worker',phase:'booting'}),observation:Object.freeze({}),tracksToken:null},{accepted:true,owner:id});
 }
 if(command.type==='local'){
  if(!remuxOperationCurrent(state,command.operation)||state.owner)return result(state);
  if(!remuxFallbackAllowed(state,command.operation,command.reason,command.message))return result(state);
  const id=state.ownerSerial+1;return result({...state,ownerSerial:id,owner:Object.freeze({id,kind:'local',phase:'ready'}),observation:Object.freeze({}),tracksToken:null},{accepted:true,owner:id});
 }
 if(command.type==='release'){
  if(!remuxOwnerCurrent(state,command.owner))return result(state);
  return result({...state,owner:null,requests:Object.freeze([])},{accepted:true,retire:state.requests});
 }
 if(!remuxOwnerCurrent(state,command.owner))return result(state);
 if(command.type==='booted')return state.owner?.kind==='worker'&&state.owner.phase==='booting'?result({...state,owner:Object.freeze({...state.owner,phase:'ready'})},{accepted:true}):result(state);
 if(command.type==='observe'){
  const observationSerial=state.observationSerial+1,observation=copy(command.observation as RemuxData) as RemuxOwnerObservation;
  return result({...state,observation,observationSerial,tracksToken:command.tracks?observationSerial:null},{accepted:true});
 }
 if(command.type==='buffering')return result({...state,buffering:copy(command.value)},{accepted:true});
 if(command.type==='request'){
  if(state.owner?.kind!=='worker'||state.owner.phase!=='ready'&&command.method!=='boot')return result(state,{error:'Destroyed'});
  const request=Object.freeze({id:state.requestSerial+1,owner:command.owner,method:command.method,deadline:command.now+30000});
  return result({...state,requestSerial:request.id,requests:Object.freeze([...state.requests,request])},{accepted:true,request});
 }
 const request=state.requests.find(request=>request.id===command.id&&request.owner===command.owner);if(!request)return result(state);
 if(command.type==='deadline'&&command.now<request.deadline)return result(state,{wait:request.deadline-command.now});
 return result({...state,requests:Object.freeze(state.requests.filter(value=>value!==request))},{accepted:true,request});
}
