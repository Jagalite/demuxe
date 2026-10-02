// SPDX-License-Identifier: Apache-2.0
/** Data-only evidence. Prepared routes still need output verification on every
 * startup; previous success never bypasses admission or readiness. */
export type CapabilityEvidence={
  audioEvidenceStrength?:'unknown'|'presence'|'decoded'|'consumed';
  audioObservation?:{initialBytes?:number;decodedBytes?:number;delta?:number;present?:boolean;enabledTrack?:boolean;clockAdvanced:boolean};
  apiHint?:string;prepared?:boolean;completedAtEOF?:boolean;outputVerified?:boolean;audioEvidence?:string;timing?:Record<string,number>;
  metadata?:boolean;sourceBufferCreated?:boolean;initAccepted?:boolean;mediaAccepted?:boolean;decoderOutput?:boolean;
  videoPresented?:boolean;audioProgress?:boolean;audioDecoded?:boolean;audioDecoderConfigured?:boolean;playbackReady?:boolean;
};
export type CapabilityRecord={
  planId:string;sourceIdentity:string;eligible:boolean;state:'untested'|'probing'|'prepared'|'verified'|'failed';reason?:string;
  failureKind?:'compatibility'|'terminal';evidence?:CapabilityEvidence;previouslyVerified?:boolean;
};
export type CapabilityPlan=Readonly<{id:string;eligible:boolean;reason?:string}>;
export type CapabilityEvidenceData=Readonly<Omit<CapabilityEvidence,'audioObservation'|'timing'>> & Readonly<{
  audioObservation?:Readonly<NonNullable<CapabilityEvidence['audioObservation']>>;timing?:Readonly<Record<string,number>>;
}>;
export type CapabilityRecordData=Readonly<Omit<CapabilityRecord,'evidence'>> & Readonly<{evidence?:CapabilityEvidenceData}>;
export type CapabilityState=Readonly<{records:readonly CapabilityRecordData[];verified:readonly string[]}>;
export type CapabilityEvent=
  |{kind:'begin';sourceIdentity:string;plans:readonly CapabilityPlan[]}
  |{kind:'update';planId:string;state:CapabilityRecord['state'];evidence?:CapabilityEvidenceData;reason?:string;failureKind?:CapabilityRecord['failureKind']}
  |{kind:'admission';plans:readonly CapabilityPlan[]}|{kind:'clear'};

export function createCapabilities():CapabilityState{return Object.freeze({records:Object.freeze([]),verified:Object.freeze([])});}
export function capabilityUpdateEligible(state:CapabilityState,planId:string):boolean{return !!state.records.find(record=>record.planId===planId)?.eligible;}
function detachEvidence(evidence:CapabilityEvidenceData):CapabilityEvidenceData {
  return Object.freeze({...evidence,...(evidence.audioObservation?{audioObservation:Object.freeze({...evidence.audioObservation})}:{}),...(evidence.timing?{timing:Object.freeze({...evidence.timing})}:{})});
}
export function transitionCapabilities(state:CapabilityState,event:CapabilityEvent):CapabilityState {
  switch(event.kind){
    case 'clear':return createCapabilities();
    case 'begin':return Object.freeze({...state,records:Object.freeze(event.plans.map(plan=>Object.freeze({planId:plan.id,sourceIdentity:event.sourceIdentity,eligible:plan.eligible,state:'untested' as const,reason:plan.reason,previouslyVerified:state.verified.includes(`${event.sourceIdentity}:${plan.id}`)})))});
    case 'admission':{
      // Legacy admission updates only the first record for each matching plan.
      let records=[...state.records];
      for(const plan of event.plans){const index=records.findIndex(record=>record.planId===plan.id);if(index>=0&&records[index].state==='untested')records[index]=Object.freeze({...records[index],eligible:plan.eligible,reason:plan.reason});}
      return Object.freeze({...state,records:Object.freeze(records)});
    }
    case 'update':{
      const index=state.records.findIndex(record=>record.planId===event.planId),record=state.records[index];if(!record?.eligible)return state;
      const next=Object.freeze({...record,state:event.state,evidence:event.evidence?detachEvidence(event.evidence):record.evidence,reason:event.reason,failureKind:event.failureKind});
      const records=state.records.map((item,i)=>i===index?next:item),key=`${record.sourceIdentity}:${event.planId}`;
      const verified=event.state==='verified'?Object.freeze([...state.verified.filter(item=>item!==key),key].slice(-32)):event.state==='failed'?Object.freeze(state.verified.filter(item=>item!==key)):state.verified;
      return Object.freeze({records:Object.freeze(records),verified});
    }
  }
}
/** Public diagnostic copies remain mutable, but cannot modify retained evidence. */
export function selectCapabilities(state:CapabilityState):CapabilityRecord[]{
  return state.records.map(record=>({...record,evidence:record.evidence?{...record.evidence,
    ...(record.evidence.audioObservation?{audioObservation:{...record.evidence.audioObservation}}:{}),
    ...(record.evidence.timing?{timing:{...record.evidence.timing}}:{}),
  }:undefined}));
}

export type TierFailure=Readonly<{key:string;reason:string;until:number}>;
export type TierAttemptState=Readonly<{failures:readonly TierFailure[]}>;
export function createTierAttempts():TierAttemptState{return Object.freeze({failures:Object.freeze([])});}
export function recordTierFailure(state:TierAttemptState,key:string,reason:string,now:number):TierAttemptState {
  return Object.freeze({failures:Object.freeze([...state.failures.filter(entry=>entry.key!==key),Object.freeze({key,reason,until:now+60000})].slice(-64))});
}
/** Reading an expired key removes only that key and does not refresh recency. */
export function readTierFailure(state:TierAttemptState,key:string,now:number):Readonly<{state:TierAttemptState;reason:string|undefined}> {
  const entry=state.failures.find(item=>item.key===key);
  if(entry&&entry.until>now)return Object.freeze({state,reason:entry.reason});
  return Object.freeze({state:entry?Object.freeze({failures:Object.freeze(state.failures.filter(item=>item.key!==key))}):state,reason:undefined});
}
/** Indices preserve shell plan identity, including duplicate IDs, without ever
 * admitting provider objects or callbacks into this policy. */
export function preferredPlanIndices(plans:readonly Readonly<{id:string;eligible:boolean}>[],current:string):readonly number[]{
  const end=plans.findIndex(plan=>plan.id===current);if(end<0)return Object.freeze([]);
  return Object.freeze(plans.slice(0,end).flatMap((plan,index)=>plan.eligible?[index]:[]));
}
