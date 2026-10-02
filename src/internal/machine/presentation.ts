// SPDX-License-Identifier: Apache-2.0
import type {PlayerErrorCode} from '../../types.js';

type Request = Readonly<{id:number;retired:boolean}>;
export type PresentationState = Readonly<{
  disposed:boolean;
  nextRequest:number;
  targetOverride:boolean;
  fullscreen:Request|null;
  pip:(Request&Readonly<{kind:'video'|'document'}>)|null;
}>;
export type PresentationCommand =
  | Readonly<{type:'target';override:boolean;fullscreen:boolean;containsHost:boolean}>
  | Readonly<{type:'fullscreen.request';containsHost:boolean;supported:boolean}>
  | Readonly<{type:'fullscreen.check';id:number;containsHost:boolean}>
  | Readonly<{type:'fullscreen.settled';id:number}>
  | Readonly<{type:'fullscreen.exit'}>
  | Readonly<{type:'pip.request';kind:string;supported:boolean;eligible:boolean;documentOpen:boolean}>
  | Readonly<{type:'pip.check';id:number;sameSurface:boolean;subtitles:boolean}>
  | Readonly<{type:'pip.settled';id:number}>
  | Readonly<{type:'pip.exit'}>
  | Readonly<{type:'destroy'}>;
export type PresentationDecision = Readonly<{
  state:PresentationState;
  requestId?:number;
  retired?:boolean;
  error?:Readonly<{code:PlayerErrorCode;message:string}>;
}>;
export function initialPresentationState():PresentationState {
  return Object.freeze({disposed:false,nextRequest:1,targetOverride:false,fullscreen:null,pip:null});
}
function result(state:PresentationState):PresentationDecision {return Object.freeze({state:Object.freeze({...state})});}
function failure(state:PresentationState,code:PlayerErrorCode,message:string,retired=false):PresentationDecision {
  return Object.freeze({state,error:Object.freeze({code,message}),retired});
}
/** Browser observations are sampled by the caller immediately before admission
 * or completion. Requests stay pending after retirement until physical settlement. */
export function transitionPresentation(state:PresentationState,command:PresentationCommand):PresentationDecision {
  switch(command.type){
    case 'fullscreen.settled':return result(state.fullscreen?.id===command.id?{...state,fullscreen:null}:state);
    case 'pip.settled':return result(state.pip?.id===command.id?{...state,pip:null}:state);
    case 'fullscreen.check':return state.disposed||state.fullscreen?.id!==command.id||state.fullscreen.retired||!command.containsHost
      ?failure(state,'ABORTED','Fullscreen request was retired',true):result(state);
    case 'pip.check':return state.disposed||state.pip?.id!==command.id||state.pip.retired||state.pip.kind==='video'&&(!command.sameSurface||command.subtitles)
      ?failure(state,'ABORTED','Presentation request was retired',true):result(state);
    case 'destroy':return result(state.disposed?state:{...state,disposed:true,fullscreen:state.fullscreen?Object.freeze({...state.fullscreen,retired:true}):null,pip:state.pip?Object.freeze({...state.pip,retired:true}):null});
  }
  if(state.disposed)return failure(state,'ABORTED','Presentation controller is destroyed');
  switch(command.type){
    case 'target':
      if(state.fullscreen||command.fullscreen)return failure(state,'UNSUPPORTED_FEATURE','Exit fullscreen before changing its target');
      if(command.override&&!command.containsHost)return failure(state,'INVALID_ARGUMENT','Fullscreen target must contain the presentation host');
      return result({...state,targetOverride:command.override});
    case 'fullscreen.request':{
      if(state.fullscreen)return failure(state,'UNSUPPORTED_FEATURE','Fullscreen entry is already pending');
      if(!command.containsHost)return failure(state,'INVALID_ARGUMENT','Fullscreen target no longer contains the presentation host');
      if(!command.supported)return failure(state,'UNSUPPORTED_FEATURE','Fullscreen is unavailable');
      const id=state.nextRequest;
      return Object.freeze({state:Object.freeze({...state,nextRequest:id+1,fullscreen:Object.freeze({id,retired:false})}),requestId:id});
    }
    case 'fullscreen.exit':return result({...state,fullscreen:state.fullscreen?Object.freeze({...state.fullscreen,retired:true}):null});
    case 'pip.request':{
      if(command.kind!=='video'&&command.kind!=='document')return failure(state,'INVALID_ARGUMENT','Unknown Picture-in-Picture mode');
      if(state.pip)return failure(state,'UNSUPPORTED_FEATURE','Picture-in-Picture entry is already pending');
      if(command.kind==='document'&&!command.supported)return failure(state,'UNSUPPORTED_FEATURE','Document Picture-in-Picture is unavailable');
      if(command.kind==='video'&&(!command.supported||!command.eligible))return failure(state,'UNSUPPORTED_FEATURE','Video Picture-in-Picture requires a Native surface without subtitle composition');
      if(command.kind==='document'&&command.documentOpen)return result(state);
      const id=state.nextRequest;
      return Object.freeze({state:Object.freeze({...state,nextRequest:id+1,pip:Object.freeze({id,retired:false,kind:command.kind})}),requestId:id});
    }
    case 'pip.exit':return result({...state,pip:state.pip?Object.freeze({...state.pip,retired:true}):null});
  }
}

export type PresentationObservation=Readonly<{fullscreen:boolean;documentPiP:boolean;videoPiP:boolean;mediaSession:boolean}>;
export function projectPresentation(observation:PresentationObservation){
  return Object.freeze({fullscreen:observation.fullscreen,pictureInPicture:observation.documentPiP?'document' as const:observation.videoPiP?'video' as const:null,mediaSession:observation.mediaSession});
}
export function presentationLocksSurface(state:PresentationState,videoPiP:boolean):boolean {
  return state.pip?.kind==='video'||videoPiP;
}

/** One lease state per owning document; actual browser resources stay in shell.
 * Installation IDs fence release/reacquisition by the same Player instance. */
export type MediaSessionLease=Readonly<{nextOwner:number;serial:number;owner:number|null;phase:'idle'|'installing'|'active'}>;
export function initialMediaSessionLease():MediaSessionLease{return Object.freeze({nextOwner:1,serial:0,owner:null,phase:'idle'});}
export function allocateMediaSessionOwner(state:MediaSessionLease){return Object.freeze({state:Object.freeze({...state,nextOwner:state.nextOwner+1}),owner:state.nextOwner});}
export function ownsMediaSession(state:MediaSessionLease,owner:number,serial=state.serial):boolean{return state.owner===owner&&state.serial===serial;}
export function transitionMediaSession(state:MediaSessionLease,command:Readonly<{type:'acquire'|'activate'|'release';owner:number;serial?:number}>){
  if(command.type==='acquire'){
    if(state.owner!==null)return Object.freeze({state,outcome:state.owner===command.owner?'retained' as const:'denied' as const});
    return Object.freeze({state:Object.freeze({...state,serial:state.serial+1,owner:command.owner,phase:'installing' as const}),outcome:'acquired' as const});
  }
  if(!ownsMediaSession(state,command.owner,command.serial))return Object.freeze({state,outcome:'ignored' as const});
  return command.type==='activate'
    ?Object.freeze({state:Object.freeze({...state,phase:'active' as const}),outcome:'activated' as const})
    :Object.freeze({state:Object.freeze({...state,owner:null,phase:'idle' as const}),outcome:'released' as const});
}
