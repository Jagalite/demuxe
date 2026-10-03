// SPDX-License-Identifier: Apache-2.0
export type LegacyRetainedFrame=Readonly<{id:number;key:number}>;
export type LegacyRetainedRequest=Readonly<{id:number;key:number;deadline:number;scheduled:boolean;epoch:number}>;
export type LegacyRetainedPresentation=Readonly<{
 epoch:number;generation:number;minGeneration:number;minPts:number;selectedSerial:number;closed:boolean;serial:number;
 frames:readonly LegacyRetainedFrame[];held:LegacyRetainedFrame|null;pending:readonly LegacyRetainedRequest[];
 drawing:Readonly<{id:number;frame:number;redraw:boolean}>|null;position:number|null;received:number;drawn:number;redraws:number;dropped:number;peakRetained:number;peakPending:number;missing:number;
}>;
export function initialLegacyRetainedPresentation():LegacyRetainedPresentation{return Object.freeze({epoch:0,generation:-1,minGeneration:-1,minPts:-Infinity,selectedSerial:0,closed:false,serial:0,frames:Object.freeze([]),held:null,pending:Object.freeze([]),drawing:null,position:null,received:0,drawn:0,redraws:0,dropped:0,peakRetained:0,peakPending:0,missing:0});}
export type LegacyRetainedInput=
 |Readonly<{type:'reset';target?:number;closed?:boolean}>
 |Readonly<{type:'receive';pts:number;generation:number;pendingTarget:number|null}>
 |Readonly<{type:'select';serial:number;key:number;now:number;delay:number;redraw:boolean}>
 |Readonly<{type:'schedule';key:number}>
 |Readonly<{type:'draw';id:number;epoch:number;now:number}>
 |Readonly<{type:'presented';id:number;epoch:number}>
 |Readonly<{type:'check';now:number}>;
export type LegacyRetainedDecision=Readonly<{state:LegacyRetainedPresentation;accepted:boolean;close:readonly number[];cancel:readonly number[];accept?:number;discard?:boolean;request?:LegacyRetainedRequest;frame?:number;redraw?:number;drawing?:number;error?:string}>;
const empty=Object.freeze([]) as readonly number[];
export function legacyRetainedNeedsPump(state:LegacyRetainedPresentation):boolean{return state.frames.length+(state.held?1:0)>=16;}
export function legacyRetainedRequestCurrent(state:LegacyRetainedPresentation,id:number,epoch:number):boolean{return !state.closed&&state.epoch===epoch&&state.pending.some(request=>request.id===id);}
export function transitionLegacyRetainedPresentation(state:LegacyRetainedPresentation,input:LegacyRetainedInput):LegacyRetainedDecision{
 const result=(next=state,extra:Partial<Omit<LegacyRetainedDecision,'state'>>={}):LegacyRetainedDecision=>Object.freeze({state:next,accepted:true,close:empty,cancel:empty,...extra});
 const patch=(value:Partial<LegacyRetainedPresentation>)=>Object.freeze({...state,...value});
 const clear=(next:LegacyRetainedPresentation,closed:boolean,minPts:number,minGeneration:number)=>Object.freeze({...next,epoch:Math.min(Number.MAX_SAFE_INTEGER,next.epoch+1),closed:closed||next.epoch>=Number.MAX_SAFE_INTEGER,minPts,minGeneration,frames:Object.freeze([]),held:null,pending:Object.freeze([]),drawing:null,position:null,selectedSerial:0});
 const ids=(next:LegacyRetainedPresentation)=>Object.freeze([...next.frames.map(f=>f.id),...next.held?[next.held.id]:[]]);
 if(input.type==='reset')return result(clear(state,!!input.closed,input.target===undefined?-Infinity:input.target*1e6-150000,state.generation+1),{close:ids(state),cancel:Object.freeze(state.pending.map(r=>r.id)),...state.epoch>=Number.MAX_SAFE_INTEGER?{error:'Retained epoch exhausted'}:{}});
 if(input.type==='receive'){
  let next=patch({received:state.received+1}),close=empty,cancel=empty;
  const discard=(error?:string)=>result(Object.freeze({...next,dropped:next.dropped+1}),{discard:true,close,cancel,...error?{error}:{}});
  if(!Number.isFinite(input.pts)||!Number.isSafeInteger(input.generation))return discard('Invalid retained frame metadata');
  const key=Math.round(input.pts);
  if(input.pts<state.minPts&&!state.pending.some(r=>r.key===key)||input.generation<state.minGeneration||state.closed)return discard();
  if(input.generation!==state.generation){
   // Before the first frame (including after an explicit source/seek reset),
   // native selection can arrive first. Its pending requests belong to this
   // presentation epoch; observing the expected generation must not erase them.
   if(state.generation===-1||state.minGeneration>state.generation)next=Object.freeze({...next,generation:input.generation,minGeneration:input.generation});
   else{close=ids(state);cancel=Object.freeze(state.pending.map(r=>r.id));next=Object.freeze({...clear(next,false,state.minPts,input.generation),generation:input.generation});if(next.closed)return discard('Retained epoch exhausted');}
  }
  if(input.pendingTarget!==null&&input.pts/1e6<input.pendingTarget-.15)return discard();
  if(next.frames.some(frame=>frame.key===key))return discard('Duplicate retained frame timestamp');
  if(legacyRetainedNeedsPump(next))return discard('Retained frame bound exceeded');
  if(!Number.isSafeInteger(next.serial+1))return discard('Retained identity exhausted');
  const frame=Object.freeze({id:next.serial+1,key}),frames=Object.freeze([...next.frames,frame]);
  return result(Object.freeze({...next,serial:frame.id,frames,peakRetained:Math.max(next.peakRetained,frames.length+(next.held?1:0))}),{close,cancel,accept:frame.id});
 }
 if(state.closed)return result(state,{accepted:false});
 if(input.type==='select'){
  if(!Number.isSafeInteger(input.serial)||!Number.isFinite(input.key)||!Number.isFinite(input.now)||!Number.isFinite(input.delay))return result(state,{accepted:false,error:'Invalid retained selection'});
  if(input.serial===state.selectedSerial)return result(state,{accepted:false});
  const minPts=Math.max(state.minPts,input.key),old=state.frames.filter(frame=>frame.key<minPts&&!state.pending.some(r=>r.key===frame.key)),frames=Object.freeze(state.frames.filter(frame=>!old.includes(frame))),close=Object.freeze(old.map(frame=>frame.id));
  const next=patch({minPts,selectedSerial:input.serial,frames});
  if(input.redraw&&state.held?.key===input.key){if(!Number.isSafeInteger(state.serial+1))return result(next,{close,error:'Retained identity exhausted'});const id=state.serial+1;return result(Object.freeze({...next,serial:id,drawing:Object.freeze({id,frame:state.held.id,redraw:true})}),{close,redraw:state.held.id,drawing:id});}
  if(input.key<0||state.pending.some(request=>request.key===input.key))return result(next,{close,accepted:false});
  if(state.pending.length>=8)return result(next,{close,error:'Pending presentation bound exceeded'});
  if(!Number.isSafeInteger(state.serial+1))return result(next,{close,error:'Retained identity exhausted'});
  const request=Object.freeze({id:state.serial+1,key:input.key,deadline:input.now+input.delay,scheduled:false,epoch:state.epoch}),pending=Object.freeze([...state.pending,request]);
  return result(Object.freeze({...next,serial:request.id,pending,peakPending:Math.max(next.peakPending,pending.length)}),{close,request});
 }
 if(input.type==='schedule'){
  const request=state.pending.find(request=>request.key===input.key);if(!request||request.scheduled||!state.frames.some(frame=>frame.key===input.key))return result(state,{accepted:false});
  const scheduled=Object.freeze({...request,scheduled:true});return result(patch({pending:Object.freeze(state.pending.map(item=>item===request?scheduled:item))}),{request:scheduled});
 }
 if(input.type==='draw'){
  const request=state.pending.find(request=>request.id===input.id);if(input.epoch!==state.epoch||!request?.scheduled||input.now<request.deadline)return result(state,{accepted:false});
  const frame=state.frames.find(frame=>frame.key===request.key);if(!frame)return result(state,{accepted:false,error:'Scheduled retained frame missing'});
  // Publish the held owner and consume the timer receipt before physical drawing.
  return result(patch({frames:Object.freeze(state.frames.filter(f=>f!==frame)),held:frame,pending:Object.freeze(state.pending.filter(r=>r!==request)),drawing:Object.freeze({id:request.id,frame:frame.id,redraw:false})}),{close:state.held?Object.freeze([state.held.id]):empty,frame:frame.id,request,drawing:request.id});
 }
 if(input.type==='presented'){const drawing=state.drawing;if(!drawing||drawing.id!==input.id||input.epoch!==state.epoch||state.held?.id!==drawing.frame)return result(state,{accepted:false});return result(patch({drawing:null,position:state.held.key/1e6,drawn:state.drawn+(drawing.redraw?0:1),redraws:state.redraws+(drawing.redraw?1:0)}));}
 const missing=state.pending.find(request=>input.now-request.deadline>500);
 return missing?result(patch({missing:state.missing+1}),{error:`Retained frame ${missing.key} did not arrive`}):result(state);
}
