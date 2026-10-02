// SPDX-License-Identifier: Apache-2.0
import type {WatchdogPolicy} from '../../types.js';
export type NativeAudioPoint=Readonly<{kind:string;wallTime:number|null;mediaTime:number;rate:number;generation:number;epoch:number;audioFrame:number}>;
export type NativeAudioDomain='open'|'playback'|'seek'|'rate'|'context'|'eof'|'verify';
export type NativeAudioLease=Readonly<{epoch:number;id:number;domain:NativeAudioDomain}>;
export type NativeAudioRate=Readonly<{id:number;generation:number;rate:number;deadline:number;due:number|null}>;
export type NativeAudioPublication=Readonly<{id:number;generation:number;deadline:number;due:number|null;point:NativeAudioPoint|null}>;
export type NativeAudioDrift=Readonly<{lastObservation:number|null;sustained:number;release:number;soft:boolean;softCount:number;missingTimeline:number;largeError:number;hardCount:number;rateCount:number;errors:readonly number[];ordered:readonly number[]|null;maxAbsError:number}>;
export type NativeAudioState=Readonly<{epoch:number;serial:number;phase:'active'|'closed';frame:number|null;failed:boolean;generation:number;running:boolean;playbackIntent:'play'|'pause';contextPaused:boolean;requestedRate:number;effectiveRate:number;resumeRate:number|null;watchdogs:WatchdogPolicy;operations:Readonly<Record<NativeAudioDomain,number|null>>;waits:readonly Readonly<{id:number;deadline:number}>[];points:readonly NativeAudioPoint[];publication:NativeAudioPublication|null;rate:NativeAudioRate|null;drift:NativeAudioDrift}>;
export function initialNativeAudio(watchdogs:WatchdogPolicy):NativeAudioState{return Object.freeze({epoch:1,serial:0,phase:'active',frame:null,failed:false,generation:0,running:false,playbackIntent:'pause',contextPaused:false,requestedRate:1,effectiveRate:1,resumeRate:null,watchdogs:Object.freeze({...watchdogs}),operations:Object.freeze({open:null,playback:null,seek:null,rate:null,context:null,eof:null,verify:null}),waits:Object.freeze([]),points:Object.freeze([]),publication:null,rate:null,drift:Object.freeze({lastObservation:null,sustained:0,release:0,soft:false,softCount:0,missingTimeline:0,largeError:0,hardCount:0,rateCount:0,errors:Object.freeze([]),ordered:null,maxAbsError:0})});}
export function nativeAudioCurrent(state:NativeAudioState,lease:NativeAudioLease):boolean{return state.phase==='active'&&state.epoch===lease.epoch&&state.operations[lease.domain]===lease.id;}
export function nativeAudioAlive(state:NativeAudioState,epoch:number):boolean{return state.phase==='active'&&state.epoch===epoch;}
export function beginNativeAudio(state:NativeAudioState,domain:NativeAudioDomain):Readonly<{state:NativeAudioState;lease?:NativeAudioLease;retire:readonly number[]}>{
 if(state.phase!=='active')return Object.freeze({state,retire:Object.freeze([])});
 const id=state.serial+1,domains:readonly NativeAudioDomain[]=domain==='open'?['open','playback','seek','rate','context','eof','verify']:domain==='seek'?['seek','playback','rate','eof','verify']:domain==='playback'?['playback','seek','eof']:[domain],retire=Object.freeze(domains.flatMap(key=>state.operations[key]===null?[]:[state.operations[key]!]));
 const operations=Object.freeze({...state.operations,...Object.fromEntries(domains.map(key=>[key,null])),[domain]:id});
 return Object.freeze({state:Object.freeze({...state,serial:id,operations,waits:Object.freeze(state.waits.filter(wait=>!retire.includes(wait.id))),publication:state.publication&&retire.includes(state.publication.id)?null:state.publication,rate:state.rate&&retire.includes(state.rate.id)?null:state.rate}),lease:Object.freeze({epoch:state.epoch,id,domain}),retire});
}
export function finishNativeAudio(state:NativeAudioState,lease:NativeAudioLease):NativeAudioState{return nativeAudioCurrent(state,lease)?Object.freeze({...state,operations:Object.freeze({...state.operations,[lease.domain]:null}),waits:Object.freeze(state.waits.filter(wait=>wait.id!==lease.id)),publication:state.publication?.id===lease.id?null:state.publication,rate:state.rate?.id===lease.id?null:state.rate}):state;}
export function closeNativeAudio(state:NativeAudioState):NativeAudioState{return state.phase==='closed'?state:Object.freeze({...state,epoch:state.epoch+1,phase:'closed',frame:null,running:false,playbackIntent:'pause',publication:null,rate:null,waits:Object.freeze([]),operations:Object.freeze({open:null,playback:null,seek:null,rate:null,context:null,eof:null,verify:null})});}
export function failNativeAudio(state:NativeAudioState):Readonly<{state:NativeAudioState;notify:boolean}>{return state.phase!=='active'||state.failed?Object.freeze({state,notify:false}):Object.freeze({state:Object.freeze({...state,failed:true}),notify:true});}
export function nativeAudioEstimate(state:NativeAudioState,now:number,origin:number):number|null{
 let latest:NativeAudioPoint|undefined;for(const point of state.points)if(point.generation===state.generation&&point.wallTime!==null&&point.wallTime-origin<=now&&(!latest||point.wallTime>latest.wallTime!))latest=point;
 if(!latest)return null;const age=now-(latest.wallTime!-origin);return age>250?null:latest.mediaTime+(state.running?age*latest.rate/1000:0);
}
export type NativeAudioDriftFacts=Readonly<{now:number;paused:boolean;seeking:boolean;ended:boolean;readyState:number;contextRunning:boolean;hidden:boolean;position:number|null;videoTime:number}>;
export function observeNativeAudioDrift(state:NativeAudioState,facts:NativeAudioDriftFacts):Readonly<{state:NativeAudioState;failure?:'missing'|'drift';rate?:number}>{
 if(state.phase!=='active')return Object.freeze({state});
 let drift=state.drift;if(drift.lastObservation!==null&&facts.now-drift.lastObservation>1500)drift=Object.freeze({...drift,missingTimeline:0,largeError:0});drift=Object.freeze({...drift,lastObservation:facts.now});
 if(!state.running||state.rate||facts.paused||facts.seeking||facts.ended||facts.readyState<3||!facts.contextRunning)return Object.freeze({state:Object.freeze({...state,drift:Object.freeze({...drift,missingTimeline:0,largeError:0})})});
 const watch=state.watchdogs.selectiveAudio&&!facts.hidden;if(!watch)drift=Object.freeze({...drift,missingTimeline:0,largeError:0});
 if(facts.position===null){const missingTimeline=drift.missingTimeline+(watch?1:0);return Object.freeze({state:Object.freeze({...state,drift:Object.freeze({...drift,missingTimeline})}),...(watch&&missingTimeline>=8?{failure:'missing' as const}:{})});}
 const error=(facts.position-facts.videoTime)*1000,absolute=Math.abs(error),largeError=watch&&absolute>250?drift.largeError+1:0,sustained=absolute>50?drift.sustained+1:0,release=absolute<30?drift.release+1:0;
 let soft=drift.soft;if(sustained>=3)soft=true;if(release>=3)soft=false;
 const trim=soft?Math.max(-.005,Math.min(.005,-error/1000*.1)):0,rate=state.requestedRate*(1+trim),changed=Math.abs(rate-state.effectiveRate)>.001;
 return Object.freeze({state:Object.freeze({...state,...changed?{effectiveRate:rate}:{},drift:Object.freeze({...drift,missingTimeline:0,largeError,sustained,release,soft,softCount:drift.softCount+(changed?1:0),errors:Object.freeze([...drift.errors,absolute].slice(-1200)),ordered:null,maxAbsError:Math.max(drift.maxAbsError,absolute)})}),...(watch&&largeError>=8?{failure:'drift' as const}:{}),...changed?{rate}:{} });
}
export function observeNativeAudioPoint(state:NativeAudioState,point:NativeAudioPoint,origin:number):Readonly<{state:NativeAudioState;publication?:number;rate?:number}>{
 if(state.phase!=='active'||point.kind!=='timeline'&&point.kind!=='rate-boundary'||point.wallTime===null||point.generation!==state.generation)return Object.freeze({state});
 const copied=Object.freeze({kind:point.kind,wallTime:point.wallTime,mediaTime:point.mediaTime,rate:point.rate,generation:point.generation,epoch:point.epoch,audioFrame:point.audioFrame}),publication=point.kind==='timeline'&&state.publication?.generation===state.generation&&state.publication.point===null?Object.freeze({...state.publication,point:copied}):state.publication;
 const rate=point.kind==='rate-boundary'&&state.rate&&state.rate.due===null&&state.rate.generation===state.generation&&Math.abs(point.rate-state.rate.rate)<1e-5?Object.freeze({...state.rate,due:point.wallTime-origin}):state.rate;
 return Object.freeze({state:Object.freeze({...state,points:Object.freeze([...state.points,copied].slice(-300)),publication,rate}),...publication!==state.publication?{publication:publication!.id}:{},...rate!==state.rate?{rate:rate!.id}:{} });
}
export type NativeAudioCommand=
 |Readonly<{type:'watchdogs';policy:WatchdogPolicy}>
 |Readonly<{type:'playback.intent';intent:'play'|'pause'}>
 |Readonly<{type:'paused';context?:boolean}>
 |Readonly<{type:'running';value:boolean}>
 |Readonly<{type:'context.clear'}>
 |Readonly<{type:'seek.reset'}>
 |Readonly<{type:'seek.complete'}>
 |Readonly<{type:'rate.request';rate:number}>
 |Readonly<{type:'rate.resume';rate:number|null}>
 |Readonly<{type:'publication.begin';lease:NativeAudioLease;now:number}>
 |Readonly<{type:'publication.clear';id:number}>
 |Readonly<{type:'publication.schedule';id:number;origin:number;videoTime:number;rate:number}>
 |Readonly<{type:'rate.begin';lease:NativeAudioLease;rate:number;now:number}>
 |Readonly<{type:'rate.clear';id:number;applied?:boolean}>
 |Readonly<{type:'frame.request'}>
 |Readonly<{type:'wait.begin';lease:NativeAudioLease;now:number;timeout:number}>
 |Readonly<{type:'wait.finish';id:number}>
 |Readonly<{type:'diagnostics'}>;
export function transitionNativeAudio(state:NativeAudioState,command:NativeAudioCommand):NativeAudioState{
 if(state.phase!=='active'&&command.type!=='diagnostics')return state;
 switch(command.type){
  case 'watchdogs':return Object.freeze({...state,watchdogs:Object.freeze({...command.policy}),drift:Object.freeze({...state.drift,missingTimeline:0,largeError:0})});
  case 'playback.intent':return Object.freeze({...state,playbackIntent:command.intent});
  case 'paused':return Object.freeze({...state,running:false,contextPaused:!!command.context});
  case 'running':return Object.freeze({...state,running:command.value});
  case 'context.clear':return Object.freeze({...state,contextPaused:false});
  case 'seek.reset':return Object.freeze({...state,generation:state.generation+1,running:false,resumeRate:null,publication:null,rate:null,points:Object.freeze([]),drift:Object.freeze({...state.drift,sustained:0,release:0,soft:false,missingTimeline:0,largeError:0})});
  case 'seek.complete':return Object.freeze({...state,drift:Object.freeze({...state.drift,hardCount:state.drift.hardCount+1})});
  case 'rate.request':return Object.freeze({...state,requestedRate:command.rate,drift:Object.freeze({...state.drift,sustained:0,release:0,soft:false})});
  case 'rate.resume':return Object.freeze({...state,resumeRate:command.rate});
  case 'publication.begin':return nativeAudioCurrent(state,command.lease)?Object.freeze({...state,publication:Object.freeze({id:command.lease.id,generation:state.generation,deadline:command.now+3000,due:null,point:null})}):state;
  case 'publication.schedule':{const publication=state.publication;return publication?.id===command.id&&publication.point?Object.freeze({...state,publication:Object.freeze({...publication,due:publication.point.wallTime!-command.origin+(command.videoTime-publication.point.mediaTime)/command.rate*1000})}):state;}
  case 'publication.clear':return state.publication?.id===command.id?Object.freeze({...state,publication:null}):state;
  case 'rate.begin':return nativeAudioCurrent(state,command.lease)?Object.freeze({...state,rate:Object.freeze({id:command.lease.id,generation:state.generation,rate:command.rate,deadline:command.now+3000,due:null})}):state;
  case 'rate.clear':return state.rate?.id===command.id?Object.freeze({...state,rate:null,...(command.applied?{effectiveRate:state.rate.rate,drift:Object.freeze({...state.drift,rateCount:state.drift.rateCount+1})}:{})}):state;
  case 'frame.request':return state.frame!==null?state:Object.freeze({...state,serial:state.serial+1,frame:state.serial+1});
  case 'wait.begin':return nativeAudioCurrent(state,command.lease)?Object.freeze({...state,waits:Object.freeze([...state.waits.filter(wait=>wait.id!==command.lease.id),Object.freeze({id:command.lease.id,deadline:command.now+command.timeout})])}):state;
  case 'wait.finish':return Object.freeze({...state,waits:Object.freeze(state.waits.filter(wait=>wait.id!==command.id))});
  case 'diagnostics':return state.drift.ordered?state:Object.freeze({...state,drift:Object.freeze({...state.drift,ordered:Object.freeze([...state.drift.errors].sort((a,b)=>a-b))})});
 }
}

export function nativeAudioWait(state:NativeAudioState,lease:NativeAudioLease,now:number):'retired'|'waiting'|'timeout'{const wait=state.waits.find(wait=>wait.id===lease.id);return !nativeAudioCurrent(state,lease)||!wait?'retired':now>=wait.deadline?'timeout':'waiting';}
export function nativeAudioTail(state:NativeAudioState,hasHeader:boolean,duration:number,mediaTime:number):boolean{return state.phase==='active'&&hasHeader&&state.running&&Number.isFinite(duration)&&mediaTime>=duration-.2;}
export function observeNativeAudioContext(state:NativeAudioState,running:boolean):Readonly<{state:NativeAudioState;action?:'pause'|'resume'}>{if(state.phase!=='active')return Object.freeze({state});if(!running&&(state.running||state.playbackIntent==='play'))return Object.freeze({state:transitionNativeAudio(state,{type:'paused',context:true}),action:'pause'});return Object.freeze({state,...running&&state.contextPaused?{action:'resume' as const}:{}});}
export function completeNativeAudioFrame(state:NativeAudioState,id:number,hasHeader:boolean,duration:number,mediaTime:number):Readonly<{state:NativeAudioState;accepted:boolean;tail:boolean}>{if(state.phase!=='active'||state.frame!==id)return Object.freeze({state,accepted:false,tail:false});return Object.freeze({state:Object.freeze({...state,frame:null}),accepted:true,tail:nativeAudioTail(state,hasHeader,duration,mediaTime)});}
