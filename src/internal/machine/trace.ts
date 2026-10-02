// SPDX-License-Identifier: Apache-2.0
import {resourceAvailable} from './resource-ledger.js';
import type {Effect} from './protocol.js';
import type {PlayerControlState} from './state.js';
import type {PlayerControlInput,PlayerControlDecision} from './transition.js';
/** Bounded, data-only diagnostic history. This is deliberately not a serializer
 * for Player inputs: private source/filter/attachment graphs are omitted. */
export type TraceScope=Readonly<{lifetime:number;sourceId:number|null;sessionId:number|null;operationId:number|null}>;
export type TraceStatus='idle'|'paused'|'playing'|'buffering'|'ended'|'error'|'unknown';
export type TraceMode='auto'|'native'|'hybrid'|'software';
export type TraceControl=
  | Readonly<{name:'play'|'pause'|'close'|'destroy'}>
  | Readonly<{name:'seek'|'volume'|'rate'|'gain';value:number}>
  | Readonly<{name:'mute'|'loop'|'subtitle-visible';value:boolean}>
  | Readonly<{name:'mode';value:TraceMode}>;
export type TraceInput=Readonly<{scope:TraceScope}> & (
  | Readonly<{kind:'control';control:TraceControl}>
  | Readonly<{kind:'observation';status:TraceStatus;currentTime:number;duration:number|null}>
  | Readonly<{kind:'effect';effectId:number;name:'backend.play'|'backend.pause'|'resource.release'|'timer.wait';phase:'issued'|'completed'|'failed'|'retired'}>
  | Readonly<{kind:'resource';resourceId:number;phase:'acquired'|'retired'|'released'|'failed'|'detached'}>
  | Readonly<{kind:'omitted';category:'source'|'filters'|'attachments'|'tracks'|'other';reason?:'private-payload'|'unsupported-input'|'compound-settings'|'lifetime-only'|'missing-payload'}>
);
export type TraceDecision=Readonly<{accepted:boolean;status:TraceStatus;effectCount:number;pendingCount:number;reason:'none'|'aborted'|'unsupported'|'invalid'|'failed'|'stale'|'full'|'unknown'}>;
export type TraceEntry=Readonly<{sequence:number;tick:number;input:TraceInput;decision:TraceDecision;replay:'control'|'observation'|'metadata'|'omitted'}>;
export type TraceState=Readonly<{schema:1;capacity:number;nextSequence:number;dropped:number;entries:readonly TraceEntry[]}>;
const identity=(value:number|null):number|null=>Number.isSafeInteger(value)&&value!==null&&value>=0?value:null;
const count=(value:number):number=>Number.isSafeInteger(value)&&value>=0?value:0;
const status=(value:TraceStatus):TraceStatus=>['idle','paused','playing','buffering','ended','error'].includes(value)?value:'unknown';
function scope(input:TraceScope):TraceScope{return Object.freeze({lifetime:count(input.lifetime),sourceId:identity(input.sourceId),sessionId:identity(input.sessionId),operationId:identity(input.operationId)});}
function sanitize(input:TraceInput):TraceInput {
  const copiedScope=scope(input.scope);
  if(input.kind==='control'){
    const control=input.control;
    if(control.name==='play'||control.name==='pause'||control.name==='close'||control.name==='destroy')return Object.freeze({scope:copiedScope,kind:'control',control:Object.freeze({name:control.name})});
    if((control.name==='seek'||control.name==='volume'||control.name==='rate'||control.name==='gain')&&typeof control.value==='number'&&Number.isFinite(control.value))return Object.freeze({scope:copiedScope,kind:'control',control:Object.freeze({name:control.name,value:control.value})});
    if((control.name==='mute'||control.name==='loop'||control.name==='subtitle-visible')&&typeof control.value==='boolean')return Object.freeze({scope:copiedScope,kind:'control',control:Object.freeze({name:control.name,value:control.value})});
    if(control.name==='mode'&&['auto','native','hybrid','software'].includes(control.value))return Object.freeze({scope:copiedScope,kind:'control',control:Object.freeze({name:'mode',value:control.value})});
  }
  if(input.kind==='observation'&&Number.isFinite(input.currentTime)&&(input.duration===null||Number.isFinite(input.duration)))return Object.freeze({scope:copiedScope,kind:'observation',status:status(input.status),currentTime:input.currentTime,duration:input.duration});
  if(input.kind==='effect'&&identity(input.effectId)!==null&&['backend.play','backend.pause','resource.release','timer.wait'].includes(input.name)&&['issued','completed','failed','retired'].includes(input.phase))return Object.freeze({scope:copiedScope,kind:'effect',effectId:input.effectId,name:input.name,phase:input.phase});
  if(input.kind==='resource'&&identity(input.resourceId)!==null&&['acquired','retired','released','failed','detached'].includes(input.phase))return Object.freeze({scope:copiedScope,kind:'resource',resourceId:input.resourceId,phase:input.phase});
  const category=input.kind==='omitted'&&['source','filters','attachments','tracks','other'].includes(input.category)?input.category:'other';
  const reason=input.kind==='omitted'&&['private-payload','unsupported-input','compound-settings','lifetime-only','missing-payload'].includes(input.reason??'')?input.reason!:'unsupported-input';
  return Object.freeze({scope:copiedScope,kind:'omitted',category,reason});
}
export function createTrace(capacity=256):TraceState {
  if(!Number.isSafeInteger(capacity)||capacity<1||capacity>4096)throw new RangeError('Invalid trace capacity');
  return Object.freeze({schema:1,capacity,nextSequence:1,dropped:0,entries:Object.freeze([])});
}
/** All time is explicit. Inputs must be normalized DTOs, never host objects or
 * accessors. Unknown fields are never traversed or retained. */
export function appendTrace(trace:TraceState,input:TraceInput,decision:TraceDecision,explicitTick:number):TraceState {
  if(!Number.isFinite(explicitTick)||explicitTick<0||explicitTick<(trace.entries.at(-1)?.tick??0))throw new RangeError('Trace tick must be finite and monotonic');
  if(!Number.isSafeInteger(trace.nextSequence)||trace.nextSequence>=Number.MAX_SAFE_INTEGER)throw new RangeError('Trace sequence exhausted');
  const copied=sanitize(input),reason=['none','aborted','unsupported','invalid','failed','stale','full'].includes(decision.reason)?decision.reason:'unknown';
  const outcome:TraceDecision=Object.freeze({accepted:decision.accepted===true,status:status(decision.status),effectCount:count(decision.effectCount),pendingCount:count(decision.pendingCount),reason});
  const replay:TraceEntry['replay']=copied.kind==='control'?'control':copied.kind==='observation'?'observation':copied.kind==='omitted'?'omitted':'metadata';
  const entry:TraceEntry=Object.freeze({sequence:trace.nextSequence,tick:explicitTick,input:copied,decision:outcome,replay});
  const dropped=trace.entries.length>=trace.capacity?1:0;
  return Object.freeze({schema:1,capacity:trace.capacity,nextSequence:trace.nextSequence+1,dropped:trace.dropped+dropped,entries:Object.freeze([...trace.entries.slice(dropped),entry])});
}
/** Export remains data only. A consumer must use an explicitly simulated
 * executor: metadata/omitted entries cannot reconstruct external effects. */
export function selectTrace(trace:TraceState){
  return Object.freeze({schema:trace.schema,capacity:trace.capacity,dropped:trace.dropped,entries:trace.entries,
    omitted:trace.entries.filter(entry=>entry.replay==='omitted').length,
    replayableControls:trace.entries.filter(entry=>entry.replay==='control').length,
    completeControlHistory:trace.dropped===0&&trace.entries.every(entry=>entry.replay!=='omitted'),
    exactExternalReplay:false as const});
}

/** Safe production mapper. It records command data where the DTO is complete;
 * source graphs, compound settings and lifecycle-only notifications are marked
 * omitted. Public media status cannot be inferred from intent alone. */
export function tracePlayerTransition(trace:TraceState,input:PlayerControlInput,before:PlayerControlState,decision:PlayerControlDecision,tick:number):TraceState {
  const state=decision.state,identities:TraceScope={lifetime:state.operations.epoch,sourceId:state.source.serial||null,sessionId:state.source.acceptedSession,operationId:state.operations.active??before.operations.active};
  let event:TraceInput={kind:'omitted',scope:identities,category:'other',reason:'unsupported-input'};
  if(input.type==='effect.event'&&input.input.type==='admit'&&decision.accepted)event=effectTrace(input.input.effect,'issued');
  else if(input.type==='resource.event'&&decision.accepted){
    const request=input.input,resourceId='id' in request?request.id:null,id=resourceId===null?null:numericResource(resourceId);
    if(id!==null){
      const metadata=state.resources.resources.find(entry=>entry.id===resourceId)??before.resources.resources.find(entry=>entry.id===resourceId);
      const phase=request.type==='register'?'acquired':request.type==='release'&&decision.resource?.start&&resourceAvailable(before.resources,resourceId!)&&!resourceAvailable(state.resources,resourceId!)?'retired':request.type==='deadline'&&decision.resource?.start?'detached':request.type==='physical-result'&&decision.resource?.start?(request.success?'released':'failed'):null;
      if(phase&&metadata)event={kind:'resource',scope:{...identities,sessionId:numericScope(metadata.scopeKey)},resourceId:id,phase};
    }
  }
  else if(input.type==='play.request')event={kind:'control',scope:identities,control:{name:'play'}};
  else if(input.type==='source.configure')event={kind:'control',scope:identities,control:{name:'mode',value:state.source.automatic?'auto':state.source.mode}};
  else if(input.type==='setting.begin'){
    const command=input.command;
    if(command.kind==='volume'||command.kind==='rate'||command.kind==='gain')event={kind:'control',scope:identities,control:{name:command.kind,value:command.value}};
    else if(command.kind==='mute'||command.kind==='subtitles')event={kind:'control',scope:identities,control:{name:command.kind==='mute'?'mute':'subtitle-visible',value:command.value}};
    else if(command.kind==='pause')event={kind:'control',scope:identities,control:{name:'pause'}};
    else event={kind:'omitted',scope:identities,category:command.kind==='track'?'tracks':'other',reason:'private-payload'};
  }else if(input.type==='settings.change'){
    const keys=Object.keys(input.value),value=input.value;
    if(keys.length===1){
      if(typeof value.pause==='boolean')event={kind:'control',scope:identities,control:{name:value.pause?'pause':'play'}};
      else if(typeof value.volume==='number')event={kind:'control',scope:identities,control:{name:'volume',value:value.volume}};
      else if(typeof value.speed==='number')event={kind:'control',scope:identities,control:{name:'rate',value:value.speed}};
      else if(typeof value.gain==='number')event={kind:'control',scope:identities,control:{name:'gain',value:value.gain}};
      else if(typeof value.subtitles==='boolean')event={kind:'control',scope:identities,control:{name:'subtitle-visible',value:value.subtitles}};
      else event={kind:'omitted',scope:identities,category:keys[0]==='vf'||keys[0]==='af'?'filters':'tracks',reason:'private-payload'};
    }else event={kind:'omitted',scope:identities,category:'other',reason:'compound-settings'};
  }else if(input.type==='settings.accept')event={kind:'omitted',scope:identities,category:'other',reason:'compound-settings'};
  else if(input.type.startsWith('source.'))event={kind:'omitted',scope:identities,category:'source',reason:'private-payload'};
  else if(input.type==='seek.request')event={kind:'omitted',scope:identities,category:'other',reason:'missing-payload'};
  else if(input.type==='preferences.change')event={kind:'omitted',scope:identities,category:'other',reason:'compound-settings'};
  else event={kind:'omitted',scope:identities,category:'other',reason:'lifetime-only'};
  const reason:TraceDecision['reason']=decision.accepted?'none':decision.reason==='retired'?'stale':decision.reason==='full'?'full':'unknown';
  const summary:TraceDecision={accepted:decision.accepted,status:'unknown',effectCount:(decision.effects?.length??0)+(decision.actionEffects?.length??0)+(decision.readinessEffects?.length??0)+(decision.execution?.execute?1:0)+(decision.preparationEffect?1:0),pendingCount:state.operations.entries.length,reason};
  let next=appendTrace(trace,event,summary,tick);
  for(const outcome of [...decision.execution?.outcomes??[],...decision.executionOutcomes??[]]){
    const effect=before.executor.pending.find(work=>work.effect.id===outcome.id)?.effect;
    if(effect)next=appendTrace(next,effectTrace(effect,outcome.kind),{...summary,accepted:outcome.kind==='completed',effectCount:0,reason:outcome.kind==='retired'?'stale':outcome.kind==='failed'?'failed':'none'},tick);
  }
  for(const resource of before.resources.resources){
    const id=numericResource(resource.id);
    if(id!==null&&resourceAvailable(before.resources,resource.id)&&!resourceAvailable(state.resources,resource.id)&&!(event.kind==='resource'&&event.resourceId===id&&event.phase==='retired'))next=appendTrace(next,{kind:'resource',scope:{...identities,sessionId:numericScope(resource.scopeKey)},resourceId:id,phase:'retired'},{...summary,effectCount:0},tick);
  }
  return next;
}

function numericResource(value:string):number|null{const match=/^resource:([1-9][0-9]*)$/.exec(value),id=match?Number(match[1]):null;return id!==null&&Number.isSafeInteger(id)?id:null;}
function numericScope(value:string):number|null{const match=/^scope:([1-9][0-9]*)$/.exec(value),id=match?Number(match[1]):null;return id!==null&&Number.isSafeInteger(id)?id:null;}
function effectTrace(effect:Effect,phase:'issued'|'completed'|'failed'|'retired'):TraceInput{return {kind:'effect',scope:{lifetime:effect.scope.lifetime,sourceId:effect.scope.sourceId,sessionId:effect.scope.sessionId,operationId:effect.scope.operationId},effectId:effect.id,name:effect.kind,phase};}
