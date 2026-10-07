// SPDX-License-Identifier: Apache-2.0
// Experiment only: a deterministic schedule exercises resolution AND FPS changes.
// This is not a proposed production ABR algorithm.
export function defaultSwitchingPolicy(context){
 const target=context.candidates.find(v=>v.id===context.requestedId);
 if(context.pending||!target||target.id===context.currentId)return {type:'keep'};
 return {type:'switch',id:target.id,clearBuffer:false,safeMargin:0};
}
export function decide(context,select=defaultSwitchingPolicy){
 const snapshot=Object.freeze({...context,candidates:Object.freeze(context.candidates.map(v=>Object.freeze({...v})))});
 let decision;try{decision=select(snapshot);}catch{decision=defaultSwitchingPolicy(snapshot);}
 if(!decision||!['keep','switch'].includes(decision.type)||decision.type==='switch'&&(!snapshot.candidates.some(v=>v.id===decision.id)||typeof decision.clearBuffer!=='boolean'||!Number.isFinite(decision.safeMargin)||decision.safeMargin<0))decision=defaultSwitchingPolicy(snapshot);
 return decision;
}
