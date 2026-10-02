// SPDX-License-Identifier: Apache-2.0
type Candidate=Readonly<{container:string;mime:string}>;
type Attempt=Candidate&Readonly<{rejected?:string;selected?:boolean}>;
type Track=Readonly<Record<string,string|number|boolean|null|undefined>>;
type WaitStage='sourceopen'|'source-init'|'target';
export type RemuxNegotiation=Readonly<{
 serial:number;id:number|null;index:number;selected:boolean;candidates:readonly Candidate[];lanes:readonly string[]|null;attempts:readonly Attempt[];
 mime:string|undefined;duration:number|undefined;tracks:readonly Track[]|undefined;apiHint:string|undefined;sourceBufferCreated:boolean;
 waitSerial:number;wait:Readonly<{id:number;stage:WaitStage;deadline:number}>|null;
}>;
export function initialRemuxNegotiation():RemuxNegotiation{return Object.freeze({serial:0,id:null,index:0,selected:false,candidates:Object.freeze([]),lanes:null,attempts:Object.freeze([]),mime:undefined,duration:undefined,tracks:undefined,apiHint:undefined,sourceBufferCreated:false,waitSerial:0,wait:null});}
export function retireRemuxNegotiation(state:RemuxNegotiation):RemuxNegotiation{return Object.freeze({...state,id:null,wait:null});}
export function resetRemuxNegotiation(state:RemuxNegotiation,sourceChanged=false):RemuxNegotiation{return Object.freeze({...initialRemuxNegotiation(),serial:state.serial,waitSerial:state.waitSerial,mime:state.mime,duration:sourceChanged?undefined:state.duration,tracks:state.tracks});}
export type RemuxNegotiationCommand=
 | Readonly<{type:'start';candidates:readonly Candidate[];windowed:boolean;lanes?:readonly string[];browserSupported:boolean}>
 | Readonly<{type:'candidate';id:number;rejected:readonly string[];support?:Readonly<{hint:boolean;type:boolean;lanes:boolean}>}>
 | Readonly<{type:'acquired';id:number}>
 | Readonly<{type:'rejected';id:number;message:string}>
 | Readonly<{type:'ready';target:number;duration:number;mime:string;tracks:readonly Track[];supported?:boolean}>
 | Readonly<{type:'duration';duration:number}>
 | Readonly<{type:'wait';stage:WaitStage;now:number}>
 | Readonly<{type:'wait-check';id:number;now:number;complete:boolean}>;
export type RemuxNegotiationDecision=Readonly<{state:RemuxNegotiation;accepted:boolean;id?:number;action?:'probe'|'acquire'|'skip'|'selected'|'waiting'|'complete';candidate?:Candidate;mimes?:readonly string[];error?:string;code?:string;remaining?:number}>;
export function transitionRemuxNegotiation(state:RemuxNegotiation,command:RemuxNegotiationCommand):RemuxNegotiationDecision {
 const result=(next:RemuxNegotiation,extra:Omit<RemuxNegotiationDecision,'state'|'accepted'>={},accepted=true)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...extra});
 if(command.type==='duration')return result({...state,duration:command.duration});
 if(command.type==='wait'){const id=state.waitSerial+1;return result({...state,waitSerial:id,wait:Object.freeze({id,stage:command.stage,deadline:command.now+(command.stage==='target'?20000:10000)})},{id});}
 if(command.type==='wait-check'){
  if(state.wait?.id!==command.id)return result(state,{},false);
  if(command.complete)return result({...state,wait:null},{action:'complete'});
  const remaining=state.wait.deadline-command.now;
  if(state.wait.stage==='target'?remaining>=0:remaining>0)return result(state,{action:'waiting',remaining});
  const error=state.wait.stage==='sourceopen'?'MSE sourceopen timeout':state.wait.stage==='source-init'?'Remux source initialization timed out':'Remux target buffer timeout';
  return result({...state,wait:null},{error});
 }
 if(command.type==='ready'){
  if(command.target<0||command.target>=command.duration)return result(state,{error:'Seek target out of range'},false);
  if(command.supported===undefined)return result(state,{action:'probe'});
  if(!command.supported)return result(state,{error:`Unsupported MSE ${command.mime}`},false);
  const tracks=Object.freeze(command.tracks.map(track=>Object.freeze({...track})));
  return result({...state,duration:command.duration,mime:command.mime,tracks});
 }
 if(command.type==='start'){
  if(command.windowed&&!command.browserSupported)return result(state,{error:'Long unequal-track Native adaptation is unsupported in this browser; use Hybrid',code:'UNSUPPORTED_TIMELINE'},false);
  const id=state.serial+1,candidates=Object.freeze(command.candidates.map(candidate=>Object.freeze({container:candidate.container,mime:candidate.mime}))),lanes=command.windowed?Object.freeze([...(command.lanes??[])]):null;
  return result({...state,serial:id,id,index:0,selected:false,candidates,lanes,attempts:Object.freeze([])},{id});
 }
 if(state.id!==command.id||state.selected)return result(state,{},false);
 const candidate=state.candidates[state.index];if(!candidate)return result(state,{error:'Unsupported MSE packaging for selected codecs'},false);
 const reject=(message:string,next=state)=>result({...next,index:state.index+1,attempts:Object.freeze([...state.attempts,Object.freeze({...candidate,rejected:message})])},{action:'skip'});
 if(command.type==='rejected')return reject(command.message);
 if(command.type==='acquired')return result({...state,selected:true,mime:candidate.mime,sourceBufferCreated:true,attempts:Object.freeze([...state.attempts,Object.freeze({...candidate,selected:true})])},{action:'selected',candidate});
 if(command.rejected.includes(candidate.mime))return reject('Initialization append failed');
 if(!command.support)return result(state,{action:'probe',candidate,mimes:state.lanes??Object.freeze([candidate.mime])});
 const next={...state,apiHint:`MediaSource.isTypeSupported(${candidate.mime})=${command.support.hint}`};
 if(!command.support.type)return reject('MSE type unsupported',next);
 if(!command.support.lanes||state.lanes?.length===0)return reject('Error: Unsupported selected track packaging',next);
 return result(next,{action:'acquire',candidate,mimes:state.lanes??Object.freeze([candidate.mime])});
}
