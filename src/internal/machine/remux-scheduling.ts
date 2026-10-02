// SPDX-License-Identifier: Apache-2.0
import type {RemuxBufferState} from './remux-buffer.js';
export type RemuxRange=readonly [number,number];
export type RemuxBuffering=Readonly<{preload?:string;forwardSeconds?:number;backwardSeconds?:number;forwardLimitBytes?:number}>;
export type RemuxSchedule=Readonly<{
 target:number;windowed:boolean;presentationFloor:number;primeVideo:boolean;trackBounds:Readonly<{videoEnd:number;audioEnd:number}>|null;
 raps:readonly number[];lastEviction:number;lastEvictions:readonly number[];buffering:RemuxBuffering|undefined;resumeSerial:number;resume:number|null;
}>;
export function initialRemuxSchedule():RemuxSchedule{return Object.freeze({target:0,windowed:false,presentationFloor:0,primeVideo:false,trackBounds:null,raps:Object.freeze([]),lastEviction:-Infinity,lastEvictions:Object.freeze([]),buffering:undefined,resumeSerial:0,resume:null});}
export function resetRemuxSchedule(state:RemuxSchedule,target=state.target):RemuxSchedule{return Object.freeze({...initialRemuxSchedule(),target,buffering:state.buffering,resumeSerial:state.resumeSerial});}
export function remuxBuffering(state:RemuxSchedule,policy:RemuxBuffering|undefined):RemuxSchedule{return Object.freeze({...state,buffering:policy?Object.freeze({preload:policy.preload,forwardSeconds:policy.forwardSeconds,backwardSeconds:policy.backwardSeconds,forwardLimitBytes:policy.forwardLimitBytes}):undefined});}
export type RemuxScheduleCommand=
 | Readonly<{type:'configure';windowed:boolean;trackBounds?:Readonly<{videoEnd:number;audioEnd:number}>}>
 | Readonly<{type:'raps';values:readonly number[]}>
 | Readonly<{type:'seek';target:number}>
 | Readonly<{type:'prime-finished'}>
 | Readonly<{type:'evict';lane:number;cut:number;allLanes:boolean}>
 | Readonly<{type:'resume'}>
 | Readonly<{type:'resumed';id:number}>;
export function transitionRemuxSchedule(state:RemuxSchedule,command:RemuxScheduleCommand):Readonly<{state:RemuxSchedule;accepted:boolean;id?:number}>{
 const result=(next:RemuxSchedule,accepted=true,id?:number)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...id===undefined?{}:{id}});
 if(command.type==='configure'){
  const trackBounds=command.trackBounds?Object.freeze({videoEnd:command.trackBounds.videoEnd,audioEnd:command.trackBounds.audioEnd}):null;
  return result({...state,windowed:command.windowed,trackBounds,presentationFloor:command.windowed&&trackBounds&&state.target>=Math.min(trackBounds.videoEnd,trackBounds.audioEnd)?Math.max(0,state.target-.5):0,primeVideo:!!(command.windowed&&trackBounds&&state.target>=trackBounds.videoEnd&&trackBounds.videoEnd<trackBounds.audioEnd)});
 }
 if(command.type==='raps')return result({...state,raps:Object.freeze([...state.raps,...command.values].slice(-256))});
 if(command.type==='seek')return result({...state,target:command.target});
 if(command.type==='prime-finished')return result({...state,primeVideo:false});
 if(command.type==='evict')return result(command.allLanes?{...state,lastEviction:command.cut}:{...state,lastEvictions:Object.freeze(Array.from({length:Math.max(command.lane+1,state.lastEvictions.length)},(_,lane)=>lane===command.lane?command.cut:(state.lastEvictions[lane]??-Infinity)))});
 if(command.type==='resumed')return state.resume===command.id?result({...state,resume:null}):result(state,false);
 if(state.resume!==null)return result(state,false);
 const id=state.resumeSerial+1;return result({...state,resumeSerial:id,resume:id},true,id);
}
export function remuxForwardSeconds(state:RemuxSchedule,paused:boolean,playbackRate:number):number{return (paused&&state.buffering?.preload!=='auto'&&state.buffering?1:(state.buffering?.forwardSeconds??5))*(paused?1:Math.max(1,playbackRate||1));}
export function remuxStartupCoverage(target:number,duration:number,ranges:readonly RemuxRange[]):boolean {
 const margin=Math.min(.02,Math.max(0,duration-target)/2);return ranges.some(([a,b])=>a<=target+.5&&b>target+margin);
}
export function remuxPlaybackEnded(state:RemuxSchedule,buffer:RemuxBufferState,facts:Readonly<{ended:boolean;position:number;duration:number;timelineBias:number}>):boolean{return facts.ended&&(!state.windowed||buffer.eof&&!buffer.pending&&!buffer.busy&&facts.position>=facts.duration+facts.timelineBias-.02);}
export type RemuxPumpHeadFacts=Readonly<{current:boolean;hasSourceBuffer:boolean;updating:boolean;mediaState:string;targetReady:boolean;playing:boolean}>;
export function selectRemuxPumpHead(state:RemuxSchedule,buffer:RemuxBufferState,facts:RemuxPumpHeadFacts):'wait'|'delivery'|'body'{
 if(!facts.current||!facts.hasSourceBuffer||buffer.busy||facts.updating||!['open',...state.windowed?['ended']:[]].includes(facts.mediaState))return 'wait';
 if(buffer.delivery.length)return 'delivery';
 if(buffer.pull!==null||state.windowed&&facts.targetReady&&!facts.playing)return 'wait';return 'body';
}
export type RemuxPumpFacts=Readonly<{
 targetReady:boolean;playing:boolean;position:number;paused:boolean;readyState:number;playbackRate:number;
 ranges:readonly RemuxRange[];laneStarts:readonly (number|null)[];audioAdaptation:boolean;adaptationEnd:number|undefined;duration:number;
}>;
type PumpMetrics=Readonly<{seconds:number;bytes:number}>;
export type RemuxPumpContinuation=Readonly<{now:number;ranges:readonly RemuxRange[];bytes:number;byteLimit:number}>;
type PumpTerminal=Readonly<{kind:'wait'}|{kind:'pull'}|{kind:'eof';duration?:number}|{kind:'fail';error:string}>;
export type RemuxPumpDecision=Readonly<{
 metrics:PumpMetrics;
 action:Readonly<{kind:'remove';lane:number;cut:number;allLanes:boolean}|{kind:'pending'}|{kind:'finish';clearPending:boolean;gap:Readonly<{from:number;to:number}>|null;continuation:RemuxPumpContinuation;next:PumpTerminal}>;
}>;
export function selectRemuxPump(state:RemuxSchedule,buffer:RemuxBufferState,facts:RemuxPumpFacts):RemuxPumpDecision {
 const now=facts.targetReady?Math.max(facts.position,state.target):state.target,ranges=facts.ranges;
 const bytes=buffer.segments.reduce((sum,segment)=>sum+segment.bytes,0),metrics=Object.freeze({seconds:ranges.reduce((sum,[a,b])=>sum+b-a,0),bytes}),byteLimit=state.buffering?.forwardLimitBytes??12*1024*1024;
 const result=(action:RemuxPumpDecision['action'])=>Object.freeze({metrics,action:Object.freeze({...action})});
 const pressured=bytes>=byteLimit,historyLimit=now-(pressured?0:(state.buffering?.backwardSeconds??3)),retainedRap=state.raps.filter(time=>time<=historyLimit).at(-1);
 if(state.windowed&&facts.targetReady&&state.trackBounds){
  for(let lane=0;lane<facts.laneStarts.length;lane++){
   const end=lane?state.trackBounds.audioEnd:state.trackBounds.videoEnd,laneLimit=lane&&pressured?(retainedRap??now-.5):historyLimit;
   const limit=Math.min(laneLimit,end-.5),cut=lane?limit:state.raps.filter(time=>time<=limit).at(-1),start=facts.laneStarts[lane];
   if(cut!==undefined&&start!==null&&start<cut-.001&&cut>(state.lastEvictions[lane]??-Infinity))return result({kind:'remove',lane,cut,allLanes:false});
  }
 }
 const cut=state.windowed?undefined:retainedRap;
 if(facts.targetReady&&cut!==undefined&&ranges.length&&ranges[0][0]<cut-.001&&cut>state.lastEviction)return result({kind:'remove',lane:0,cut,allLanes:true});
 if(buffer.pending?.some(resource=>resource.bytes>0))return result({kind:'pending'});
 const nextRange=ranges.find(([a])=>a>now+.001),gap=facts.targetReady&&!facts.paused&&facts.readyState<3&&nextRange&&nextRange[0]-now<=.5?Object.freeze({from:now,to:nextRange[0]}):null;
 const continuation=Object.freeze({now,ranges:Object.freeze(ranges.map(([a,b])=>Object.freeze([a,b]) as RemuxRange)),bytes,byteLimit});
 return result({kind:'finish',clearPending:buffer.pending!==null,gap,continuation,next:selectRemuxPumpContinuation(state,buffer.pending?Object.freeze({...buffer,pending:null}):buffer,facts,continuation)});
}
/** After a gap seek, preserve the original coverage/budget sample but observe
 * pause/rate/intent/policy again before deciding preparation, failure or refill. */
export function selectRemuxPumpContinuation(state:RemuxSchedule,buffer:RemuxBufferState,facts:RemuxPumpFacts,context:RemuxPumpContinuation):PumpTerminal {
 const {now,ranges,bytes,byteLimit}=context,pressured=bytes>=byteLimit;
 const result=(next:PumpTerminal)=>Object.freeze({...next});
 const ahead=(ranges.find(([a,b])=>a<=now+.5&&now<=b)?.[1]??NaN)-now||0;
 if(ahead<5&&(ranges.at(-1)?.[1]??NaN)>now+12)return result({kind:'fail',error:'Remux timeline gap exceeds forward buffer budget'});
 if(buffer.eof&&!buffer.pending)return result({kind:'eof',...facts.audioAdaptation&&(facts.adaptationEnd??0)>0?{duration:facts.adaptationEnd}:{}});
 const preparedAhead=facts.audioAdaptation?Math.max(0,(facts.adaptationEnd??now)-now):0;
 if(!buffer.eof&&preparedAhead>=5&&ahead<.25&&!facts.paused)return result({kind:'fail',error:'Adapted track timelines cannot progress within the preparation budget; use Hybrid'});
 if(state.windowed&&!facts.targetReady&&!state.primeVideo&&remuxStartupCoverage(state.target,facts.duration,facts.ranges))return result({kind:'wait'});
 if(!buffer.eof&&facts.targetReady&&pressured&&ahead<=0&&(state.windowed?facts.playing:!facts.paused))return result({kind:'fail',error:'Remux cannot refill within the coded-data budget while preserving the current GOP'});
 const forward=remuxForwardSeconds(state,facts.paused,facts.playbackRate);
 return result({kind:!buffer.eof&&ahead<forward&&preparedAhead<forward&&bytes<byteLimit?'pull':'wait'});
}

export function selectRemuxWindowResume(state:RemuxSchedule,buffer:RemuxBufferState,facts:Readonly<{current:boolean;playing:boolean;paused:boolean;starting:boolean;seeking:boolean;ended:boolean;position:number;bufferEnd:number|undefined;duration:number;timelineBias:number}>):'wait'|'seek'|'play'{
 if(!facts.current||!state.windowed||!facts.playing||!facts.paused||facts.starting||facts.seeking||state.resume!==null)return 'wait';
 if(facts.ended)return remuxPlaybackEnded(state,buffer,facts)||facts.bufferEnd===undefined||facts.bufferEnd<=facts.position+.05?'wait':'seek';
 return 'play';
}
export function selectRemuxBufferedSeek(state:RemuxSchedule,target:number,facts:Readonly<{enabled:boolean;current:boolean;starting:boolean;targetReady:boolean;accepted:boolean;hasSourceBuffer:boolean;updating:boolean;mediaState:string;timelineBias:number;ranges:readonly RemuxRange[];mediaRanges:readonly RemuxRange[]}>):boolean{
 if(state.windowed&&state.trackBounds&&target>=state.trackBounds.videoEnd)return false;
 if(!facts.enabled||!Number.isFinite(target)||target<0||!facts.current||facts.starting||!facts.targetReady||!facts.accepted||!facts.hasSourceBuffer||facts.updating||!['open','ended'].includes(facts.mediaState))return false;
 const range=facts.ranges.find(([a,b])=>target>=a&&target+.25<b);if(!range)return false;
 const rap=state.raps.filter(time=>time<=target&&time>=range[0]-.001).at(-1);if(rap===undefined)return false;
 return facts.mediaRanges.some(([a,b])=>rap+facts.timelineBias>=a-.001&&target+facts.timelineBias+.25<b);
}
