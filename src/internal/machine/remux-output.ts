// SPDX-License-Identifier: Apache-2.0
type Frame=readonly [number,number];
type Prime=Readonly<{id:number;target:number;expected:number;deadline:number;presented:number|undefined}>;
export type RemuxOutput=Readonly<{frames:readonly Frame[];muxedFrames:boolean;position:number|undefined;progressAt:number|undefined;waiting:boolean;primeSerial:number;prime:Prime|null}>;
export function initialRemuxOutput():RemuxOutput{return Object.freeze({frames:Object.freeze([]),muxedFrames:false,position:undefined,progressAt:undefined,waiting:false,primeSerial:0,prime:null});}
export function resetRemuxOutput(state:RemuxOutput,clearFrames=false):RemuxOutput{return Object.freeze({...initialRemuxOutput(),frames:clearFrames?Object.freeze([]):state.frames,muxedFrames:!clearFrames&&state.muxedFrames,primeSerial:state.primeSerial});}
export function expectedRemuxVideoFrame(state:RemuxOutput,target:number):number|undefined{return state.frames.reduce<number|undefined>((found,[pts])=>pts<=target+.000001&&(found===undefined||pts>found)?pts:found,undefined);}
export function matchesRemuxVideoFrame(state:RemuxOutput,target:number,mediaTime:number,timelineBias:number):boolean|undefined {
 if(!state.muxedFrames)return undefined;
 const epsilon=.000001;return state.frames.some(([pts,duration])=>target>=pts-epsilon&&target<pts+duration+epsilon&&mediaTime>=pts+timelineBias-epsilon&&mediaTime<=target+timelineBias+epsilon);
}
export type RemuxOutputCommand=
 | Readonly<{type:'frames';presentation?:readonly Frame[];frames?:readonly Frame[];timelineBias:number}>
 | Readonly<{type:'starvation';active:boolean;position:number;sourceTime:number;pulling:boolean;ranges:readonly Frame[];rate:number;now:number}>
 | Readonly<{type:'prime';enabled:boolean;updating:boolean;videoEnd:number;bufferEnd:number|undefined;audioRanges:readonly Frame[];timelineBias:number;now:number}>
 | Readonly<{type:'presented';id:number;mediaTime?:number;position:number;seeking:boolean;timelineBias:number}>
 | Readonly<{type:'prime-deadline';id:number;now:number}>;
export type RemuxOutputDecision=Readonly<{state:RemuxOutput;accepted:boolean;changed?:boolean;id?:number;target?:number;completed?:boolean;presented?:number;error?:string;remaining?:number}>;
export function transitionRemuxOutput(state:RemuxOutput,command:RemuxOutputCommand):RemuxOutputDecision {
 const result=(next:RemuxOutput,extra:Omit<RemuxOutputDecision,'state'|'accepted'>={},accepted=true)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...extra});
 if(command.type==='frames')return result({...state,muxedFrames:state.muxedFrames||!!command.presentation,frames:Object.freeze([...state.frames,...(command.presentation??command.frames??[]).map(([pts,duration])=>Object.freeze([pts-(command.presentation?command.timelineBias:0),duration]) as Frame)].slice(-4096))});
 if(command.type==='starvation'){
  const progressAt=!command.active||command.position!==state.position?command.now:(state.progressAt??command.now),range=command.active?command.ranges.find(([a,b])=>a<=command.sourceTime+.05&&b>=command.sourceTime):undefined,ahead=range?range[1]-command.sourceTime:0;
  const waiting=!!(command.active&&command.pulling&&command.now-progressAt>=750&&ahead<=Math.max(1,command.rate||1));
  return result({...state,position:command.position,progressAt,waiting},{changed:waiting!==state.waiting});
 }
 if(command.type==='prime'){
  if(state.prime||!command.enabled||command.updating||command.bufferEnd===undefined||command.bufferEnd-command.timelineBias<command.videoEnd-.002)return result(state,{},false);
  const expected=expectedRemuxVideoFrame(state,command.videoEnd),target=command.bufferEnd-.001;
  if(expected===undefined||!command.audioRanges.some(([start,end])=>target>=start&&target<end))return result(state,{},false);
  const id=state.primeSerial+1;return result({...state,primeSerial:id,prime:Object.freeze({id,target,expected,deadline:command.now+10000,presented:undefined})},{id,target});
 }
 if(state.prime?.id!==command.id)return result(state,{},false);
 const prime=state.prime;
 if(command.type==='prime-deadline')return command.now<prime.deadline?result(state,{remaining:prime.deadline-command.now}):result({...state,prime:null},{error:'Completed video preroll did not present a frame'});
 const presented=command.mediaTime!==undefined&&command.mediaTime>=prime.expected+command.timelineBias-.001&&command.mediaTime<=prime.target+.001&&Math.abs(command.position-prime.target)<.002?command.mediaTime:prime.presented;
 if(presented!==undefined&&!command.seeking&&Math.abs(command.position-prime.target)<=.002)return result({...state,prime:null},{completed:true,presented});
 return result({...state,prime:Object.freeze({...prime,presented})});
}
