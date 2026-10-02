// SPDX-License-Identifier: Apache-2.0
export type RetainedFrame=Readonly<{id:number;timestamp:number}>;
export type RetainedPending=Readonly<{serial:number;frame:number;due:number}>;
export type PrivateRetainedPresentationState=Readonly<{
 generation:number;serial:number;awaiting:boolean;epoch:number;frameSerial:number;seekTarget:number|null;seekGeneration:number|null;
 frames:readonly RetainedFrame[];held:RetainedFrame|null;pending:RetainedPending|null;selectionSerial:number;preparing:Readonly<{id:number;frame:number;serial:number;delay:number}>|null;
 received:number;presented:number;closed:number;dropped:number;peakFrames:number;
}>;
export function createPrivateRetainedPresentation():PrivateRetainedPresentationState{return Object.freeze({generation:-1,serial:-1,awaiting:true,epoch:0,frameSerial:0,seekTarget:null,seekGeneration:null,frames:Object.freeze([]),held:null,pending:null,selectionSerial:0,preparing:null,received:0,presented:0,closed:0,dropped:0,peakFrames:0});}
export function clearRetainedPresentation(state:PrivateRetainedPresentationState,target:number|null=null,generation=state.generation):Readonly<{state:PrivateRetainedPresentationState;close:readonly number[]}>{
 const close=[...state.frames.map(frame=>frame.id),...state.held?[state.held.id]:[]];
 return Object.freeze({state:Object.freeze({...state,epoch:state.epoch+1,seekGeneration:target===null?null:generation,seekTarget:target,frames:Object.freeze([]),held:null,pending:null,preparing:null,serial:-1,awaiting:true,closed:state.closed+close.length}),close:Object.freeze(close)});
}
/** Backpressure applies only to a new retained owner. Stale/preroll frames may
 * still be consumed and discarded; invalid/colliding frames keep explicit errors. */
export function canReceiveRetainedFrame(state:PrivateRetainedPresentationState,timestamp:number,generation:number):boolean{
 if(generation!==state.generation||state.seekGeneration!==null&&generation<=state.seekGeneration||!Number.isSafeInteger(timestamp)||state.seekTarget!==null&&timestamp/1e6<state.seekTarget-.15)return true;
 if(state.held?.timestamp===timestamp||state.frames.some(frame=>frame.timestamp===timestamp))return true;
 return state.frames.length+(state.held?1:0)<16;
}
export type RetainedFrameAdmission=Readonly<{state:PrivateRetainedPresentationState;id:number|null;close:readonly number[];closeInput:boolean;clearOverlay:boolean;error:string|null}>;
export function admitRetainedFrame(state:PrivateRetainedPresentationState,timestamp:number,generation:number):RetainedFrameAdmission{
 let next:PrivateRetainedPresentationState=Object.freeze({...state,received:state.received+1}),close:readonly number[]=Object.freeze([]),clearOverlay=false;
 const result=(id:number|null=null,closeInput=false,error:string|null=null):RetainedFrameAdmission=>Object.freeze({state:next,id,close,closeInput,clearOverlay,error});
 const discard=()=>{next=Object.freeze({...next,closed:next.closed+1,dropped:next.dropped+1});return result(null,true);};
 if(generation<next.generation||next.seekGeneration!==null&&generation<=next.seekGeneration)return discard();
 if(generation>next.generation){const cleared=clearRetainedPresentation(next,next.seekTarget);next=Object.freeze({...cleared.state,generation});close=cleared.close;clearOverlay=true;}
 if(!Number.isSafeInteger(timestamp))return result(null,false,'Invalid retained frame timestamp');
 if(next.seekTarget!==null&&timestamp/1e6<next.seekTarget-.15)return discard();
 if(next.frames.some(frame=>frame.timestamp===timestamp)||next.held?.timestamp===timestamp)return result(null,false,'Retained timestamp collision');
 if(next.frames.length+(next.held?1:0)>=16)return result(null,false,'Retained presentation frame budget');
 const frame=Object.freeze({id:next.frameSerial+1,timestamp});next=Object.freeze({...next,frameSerial:frame.id,frames:Object.freeze([...next.frames,frame]),peakFrames:Math.max(next.peakFrames,next.frames.length+1+(next.held?1:0))});return result(frame.id);
}
/** Failed physical ingress returns the input to its caller without closing it. */
export function returnRetainedFrame(state:PrivateRetainedPresentationState,id:number):PrivateRetainedPresentationState{
 if(!state.frames.some(frame=>frame.id===id))return state;
 return Object.freeze({...state,frames:Object.freeze(state.frames.filter(frame=>frame.id!==id))});
}
export function retainedFrameCurrent(state:PrivateRetainedPresentationState,id:number):boolean{return state.frames.some(frame=>frame.id===id)||state.held?.id===id;}
export type RetainedSelection=Readonly<{epoch:number;pts:number;delay:number;serial:number}>;
export function selectRetainedFrame(state:PrivateRetainedPresentationState,input:RetainedSelection):Readonly<{state:PrivateRetainedPresentationState;frame:number|null;close:readonly number[];error:string|null}>{
 const result=(next:PrivateRetainedPresentationState,frame:number|null=null,close:readonly number[]=Object.freeze([]),error:string|null=null)=>Object.freeze({state:next,frame,close,error});
 if(input.epoch!==state.epoch||!Number.isFinite(input.pts)||input.pts<0)return result(state);
 if(!Number.isFinite(input.delay))return result(state,null,Object.freeze([]),'Invalid retained presentation deadline');
 const stamp=Math.round(input.pts*1e6);
 const frame=state.held?.timestamp===stamp?state.held:state.frames.find(frame=>frame.timestamp===stamp)??state.frames.find(frame=>frame.timestamp===stamp-1)??state.frames.find(frame=>frame.timestamp===stamp+1);
 if(!frame)return state.awaiting?result(state):result(state,null,Object.freeze([]),'Selected retained frame is unavailable: '+stamp);
 const retired=state.frames.filter(item=>item.id!==frame.id&&item.timestamp<stamp-1),close=[...state.held&&frame.id!==state.held.id?[state.held.id]:[],...retired.map(frame=>frame.id)];
 const frames=state.frames.filter(item=>item.id!==frame.id&&!retired.some(old=>old.id===item.id));
 const preparing=Object.freeze({id:state.selectionSerial+1,serial:input.serial,frame:frame.id,delay:Math.max(0,input.delay)});
 return result(Object.freeze({...state,frames:Object.freeze(frames),held:frame,awaiting:false,seekTarget:null,pending:null,preparing,selectionSerial:preparing.id,serial:input.serial,closed:state.closed+close.length,dropped:state.dropped+retired.length+(state.pending&&state.pending.serial!==input.serial?1:0)}),frame.id,Object.freeze(close));
}
export function armRetainedDraw(state:PrivateRetainedPresentationState,id:number,now:number):Readonly<{state:PrivateRetainedPresentationState;accepted:boolean}>{
 const preparing=state.preparing;if(!preparing||preparing.id!==id)return Object.freeze({state,accepted:false});
 return Object.freeze({state:Object.freeze({...state,preparing:null,pending:Object.freeze({frame:preparing.frame,serial:preparing.serial,due:now+preparing.delay})}),accepted:true});
}
export function beginRetainedDraw(state:PrivateRetainedPresentationState,now:number):Readonly<{state:PrivateRetainedPresentationState;pending:RetainedPending|null}>{
 const pending=state.pending;if(!pending||now<pending.due)return Object.freeze({state,pending:null});
 // Transfer the pending draw before entering canvas/overlay callbacks. A
 // reentrant seek or newly selected frame cannot be cleared by old completion.
 return Object.freeze({state:Object.freeze({...state,pending:null}),pending});
}
export function finishRetainedDraw(state:PrivateRetainedPresentationState,epoch:number):PrivateRetainedPresentationState{return state.epoch===epoch?Object.freeze({...state,presented:state.presented+1}):state;}
