// SPDX-License-Identifier: Apache-2.0
export type ShakaRuntimeLoad=Readonly<{id:number;key:string;phase:'pending'|'ready'|'failed';deadline:number;consumers:readonly number[]}>;
export type ShakaRuntimeState=Readonly<{nextLoad:number;nextConsumer:number;loads:readonly ShakaRuntimeLoad[]}>;
export function createShakaRuntime():ShakaRuntimeState{return Object.freeze({nextLoad:1,nextConsumer:1,loads:Object.freeze([])});}
export function joinShakaRuntime(state:ShakaRuntimeState,key:string,now:number):Readonly<{state:ShakaRuntimeState;load:number;consumer:number;start:boolean}>{
 const previous=state.loads.find(load=>load.key===key&&load.phase!=='failed'),consumer=state.nextConsumer;
 const load:ShakaRuntimeLoad=previous?Object.freeze({...previous,consumers:Object.freeze([...previous.consumers,consumer])}):Object.freeze({id:state.nextLoad,key,phase:'pending',deadline:now+15000,consumers:Object.freeze([consumer])});
 return Object.freeze({state:Object.freeze({nextLoad:previous?state.nextLoad:state.nextLoad+1,nextConsumer:consumer+1,loads:Object.freeze(previous?state.loads.map(item=>item.id===load.id?load:item):[...state.loads,load])}),load:load.id,consumer,start:!previous});
}
export function shakaRuntimeLoad(state:ShakaRuntimeState,id:number):ShakaRuntimeLoad|undefined{return state.loads.find(load=>load.id===id);}
export function leaveShakaRuntime(state:ShakaRuntimeState,id:number,consumer:number):Readonly<{state:ShakaRuntimeState;accepted:boolean;cancel:boolean}>{
 const load=shakaRuntimeLoad(state,id);
 if(!load?.consumers.includes(consumer))return Object.freeze({state,accepted:false,cancel:false});
 const consumers=Object.freeze(load.consumers.filter(value=>value!==consumer)),remove=consumers.length===0&&load.phase!=='ready';
 return Object.freeze({state:Object.freeze({...state,loads:Object.freeze(remove?state.loads.filter(item=>item.id!==id):state.loads.map(item=>item.id===id?Object.freeze({...item,consumers}):item))}),accepted:true,cancel:remove&&load.phase==='pending'});
}
export function finishShakaRuntime(state:ShakaRuntimeState,id:number,success:boolean):Readonly<{state:ShakaRuntimeState;accepted:boolean}>{
 const load=shakaRuntimeLoad(state,id);
 if(load?.phase!=='pending')return Object.freeze({state,accepted:false});
 return Object.freeze({state:Object.freeze({...state,loads:Object.freeze(state.loads.map(item=>item.id===id?Object.freeze({...item,phase:success?'ready' as const:'failed' as const}):item))}),accepted:true});
}
export function shakaRuntimeDeadline(state:ShakaRuntimeState,id:number,now:number):Readonly<{current:boolean;remaining:number}>{
 const load=shakaRuntimeLoad(state,id);return Object.freeze({current:load?.phase==='pending',remaining:load?.phase==='pending'?Math.max(0,load.deadline-now):0});
}
