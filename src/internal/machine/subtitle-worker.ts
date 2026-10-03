// SPDX-License-Identifier: Apache-2.0
export type SubtitleWorkerRequest=Readonly<{id:number;epoch:number;method:string;clientId:number|string|null}>;
export type SubtitleWorkerRefresh=Readonly<{id:string;epoch:number;deadline:number}>;
export type SubtitleWorkerOpenWait=Readonly<{id:number;epoch:number;deadline:number}>;
export type SubtitleVisualSchedule=Readonly<{mode:'deadline'|'animated'|'fallback';unstable:boolean;next:number|null;epoch:number}>;
export type SubtitleDeadline=Readonly<{epoch:number;lifetime:number;target:number;due:number}>;
export type SubtitleAttachment=Readonly<{id:number;path:string;bytes:number}>;
export type SubtitleWorkerTimeline=Readonly<{selected:boolean;lastTime:number;continuousFromStart:boolean;deadlineEpoch:number;deadline:SubtitleDeadline|null;lastTimingEpoch:number;nextRenderBoundary:number|null;scheduler:Readonly<{stateUpdates:number;nativeUpdateCalls:number;fullRenders:number;deadlineWakes:number}>}>;
export type SubtitleAttachmentCatalog=Readonly<{sequence:number;bytes:number;entries:readonly SubtitleAttachment[];pending:Readonly<{request:number;path:string;bytes:number}>|null}>;
const initialTimeline=():SubtitleWorkerTimeline=>Object.freeze({selected:false,lastTime:0,continuousFromStart:true,deadlineEpoch:0,deadline:null,lastTimingEpoch:-1,nextRenderBoundary:null,scheduler:Object.freeze({stateUpdates:0,nativeUpdateCalls:0,fullRenders:0,deadlineWakes:0})});
export type SubtitleWorkerState=Readonly<{timeline:SubtitleWorkerTimeline;attachments:SubtitleAttachmentCatalog;phase:'active'|'closing'|'closed';epoch:number;serial:number;initialized:boolean;failed:boolean;queue:readonly SubtitleWorkerRequest[];active:SubtitleWorkerRequest|null;openWait:SubtitleWorkerOpenWait|null;refreshSerial:number;refreshes:readonly SubtitleWorkerRefresh[]}>;
export function initialSubtitleWorker():SubtitleWorkerState{return Object.freeze({timeline:initialTimeline(),attachments:Object.freeze({sequence:0,bytes:0,entries:Object.freeze([]),pending:null}),phase:'active',epoch:1,serial:0,initialized:false,failed:false,queue:Object.freeze([]),active:null,openWait:null,refreshSerial:0,refreshes:Object.freeze([])});}
export function subtitleWorkerAlive(state:SubtitleWorkerState,epoch:number):boolean{return state.phase==='active'&&state.epoch===epoch;}
export function subtitleWorkerCurrent(state:SubtitleWorkerState,request:SubtitleWorkerRequest):boolean{return subtitleWorkerAlive(state,request.epoch)&&state.active?.id===request.id;}
export function admitSubtitleWorker(state:SubtitleWorkerState,method:string,clientId:number|string|null):Readonly<{state:SubtitleWorkerState;request?:SubtitleWorkerRequest;error?:'capacity'|'invalid'}>{
 if(state.phase!=='active')return Object.freeze({state});
 if(typeof method!=='string'||method.length>64||!(clientId===null||typeof clientId==='string'&&clientId.length<=256||typeof clientId==='number'&&Number.isSafeInteger(clientId)))return Object.freeze({state,error:'invalid'});
 if(state.queue.length+(state.active?1:0)>=128)return Object.freeze({state,error:'capacity'});
 const request=Object.freeze({id:state.serial+1,epoch:state.epoch,method,clientId});
 return Object.freeze({state:Object.freeze({...state,serial:request.id,queue:Object.freeze([...state.queue,request])}),request});
}
export function startSubtitleWorker(state:SubtitleWorkerState,request:SubtitleWorkerRequest):Readonly<{state:SubtitleWorkerState;accepted:boolean;error?:'initialized'}>{
 if(!subtitleWorkerAlive(state,request.epoch)||state.active||state.queue[0]?.id!==request.id)return Object.freeze({state,accepted:false});
 const duplicate=request.method==='init'&&state.initialized;
 return Object.freeze({state:Object.freeze({...state,initialized:state.initialized||request.method==='init',active:request,queue:Object.freeze(state.queue.slice(1))}),accepted:true,...duplicate?{error:'initialized' as const}:{}});
}
export function finishSubtitleWorker(state:SubtitleWorkerState,request:SubtitleWorkerRequest):SubtitleWorkerState{return subtitleWorkerCurrent(state,request)?Object.freeze({...state,active:null,attachments:state.attachments.pending?.request===request.id?Object.freeze({...state.attachments,pending:null}):state.attachments}):state;}
export function failSubtitleWorker(state:SubtitleWorkerState,request:SubtitleWorkerRequest):SubtitleWorkerState{return subtitleWorkerCurrent(state,request)&&!state.failed?Object.freeze({...state,failed:true}):state;}
export function closeSubtitleWorker(state:SubtitleWorkerState):Readonly<{state:SubtitleWorkerState;accepted:boolean;refreshes:readonly SubtitleWorkerRefresh[]}>{return state.phase!=='active'?Object.freeze({state,accepted:false,refreshes:Object.freeze([])}):Object.freeze({state:Object.freeze({...state,phase:'closing',timeline:Object.freeze({...state.timeline,deadline:null}),attachments:Object.freeze({...state.attachments,pending:null}),epoch:state.epoch+1,active:null,openWait:null,queue:Object.freeze([]),refreshes:Object.freeze([])}),accepted:true,refreshes:state.refreshes});}
export function closedSubtitleWorker(state:SubtitleWorkerState):SubtitleWorkerState{return state.phase==='closing'?Object.freeze({...state,phase:'closed'}):state;}
export function admitSubtitleRefresh(state:SubtitleWorkerState,epoch:number,now:number):Readonly<{state:SubtitleWorkerState;request?:SubtitleWorkerRefresh;error?:'capacity'}>{
 if(!subtitleWorkerAlive(state,epoch))return Object.freeze({state});
 if(state.refreshes.length>=128)return Object.freeze({state,error:'capacity'});
 const serial=state.refreshSerial+1,request=Object.freeze({id:`subtitle:${epoch}:${serial}`,epoch,deadline:now+5000});
 return Object.freeze({state:Object.freeze({...state,refreshSerial:serial,refreshes:Object.freeze([...state.refreshes,request])}),request});
}
export function subtitleRefreshCurrent(state:SubtitleWorkerState,request:SubtitleWorkerRefresh):boolean{return subtitleWorkerAlive(state,request.epoch)&&state.refreshes.some(entry=>entry.id===request.id);}
export function settleSubtitleRefresh(state:SubtitleWorkerState,id:string,now?:number):Readonly<{state:SubtitleWorkerState;request?:SubtitleWorkerRefresh;remaining?:number}>{
 const request=state.refreshes.find(entry=>entry.id===id);if(!request||!subtitleRefreshCurrent(state,request))return Object.freeze({state});
 if(now!==undefined&&now<request.deadline)return Object.freeze({state,remaining:request.deadline-now});
 return Object.freeze({state:Object.freeze({...state,refreshes:Object.freeze(state.refreshes.filter(entry=>entry.id!==id))}),request});
}
export function beginSubtitleOpenWait(state:SubtitleWorkerState,request:SubtitleWorkerRequest,now:number):SubtitleWorkerState{return subtitleWorkerCurrent(state,request)&&!state.openWait?Object.freeze({...state,openWait:Object.freeze({id:request.id,epoch:request.epoch,deadline:now+20000})}):state;}
export function settleSubtitleOpenWait(state:SubtitleWorkerState,id:number,now?:number):Readonly<{state:SubtitleWorkerState;accepted:boolean;remaining?:number}>{const wait=state.openWait;if(!wait||wait.id!==id||!subtitleWorkerAlive(state,wait.epoch))return Object.freeze({state,accepted:false});if(now!==undefined&&now<wait.deadline)return Object.freeze({state,accepted:false,remaining:wait.deadline-now});return Object.freeze({state:Object.freeze({...state,openWait:null}),accepted:true});}
export function failSubtitleWorkerLifetime(state:SubtitleWorkerState,epoch:number):SubtitleWorkerState{return subtitleWorkerAlive(state,epoch)&&!state.failed?Object.freeze({...state,failed:true}):state;}

/** Native status and memory observations are captured scalars; no views enter the core. */
export function subtitleRawTiming(status:number,next:number,epoch:number){return Object.freeze({supported:status>=0,unstable:status===-2,next:status===1?next:null,epoch});}
export function subtitleVisualTiming(status:number,next:number,epoch:number,seconds:number):SubtitleVisualSchedule{return Object.freeze({mode:status===1?'deadline':status===2?'animated':'fallback',unstable:status===-2,next:status>0&&next>seconds?next:null,epoch});}
export function subtitleRecoverClock(state:SubtitleWorkerState,seconds:number):boolean {const last=state.timeline.lastTime;return !Number.isFinite(last)||seconds<last-.05||seconds>last+1;}
export function subtitleSeekStart(seconds:number,recovery:number):number{return recovery>=0&&recovery<seconds-.001?recovery:seconds;}
export function subtitleMayLearnProfile(state:SubtitleWorkerState):boolean{return state.timeline.continuousFromStart&&state.timeline.selected;}
export type SubtitleTimelineChange=Readonly<{type:'reset'}>|Readonly<{type:'select-begin'}>|Readonly<{type:'selected';trackId:number}>|Readonly<{type:'seeked';start:number}>|Readonly<{type:'time';seconds:number}>|Readonly<{type:'count';counter:'nativeUpdateCalls'|'stateUpdates'|'fullRenders'}>|Readonly<{type:'rendered';next:number|null;epoch:number}>;
export function changeSubtitleTimeline(state:SubtitleWorkerState,request:SubtitleWorkerRequest,change:SubtitleTimelineChange):SubtitleWorkerState {
 if(!subtitleWorkerCurrent(state,request))return state;
 const old=state.timeline;let timeline=old;
 switch(change.type){
 case 'reset':timeline=Object.freeze({...old,lastTimingEpoch:-1,nextRenderBoundary:null});break;
 case 'select-begin':timeline=Object.freeze({...old,lastTimingEpoch:-1,nextRenderBoundary:null,continuousFromStart:old.selected||old.lastTime!==0?false:old.continuousFromStart});break;
 case 'selected':timeline=Object.freeze({...old,selected:change.trackId>0,lastTime:0});break;
 case 'seeked':timeline=Object.freeze({...old,continuousFromStart:change.start===0});break;
 case 'time':timeline=Object.freeze({...old,lastTime:change.seconds});break;
 case 'count':timeline=Object.freeze({...old,scheduler:Object.freeze({...old.scheduler,[change.counter]:old.scheduler[change.counter]+1})});break;
 case 'rendered':timeline=Object.freeze({...old,nextRenderBoundary:change.next,lastTimingEpoch:change.epoch});break;
 }
 return Object.freeze({...state,timeline});
}
export function cancelSubtitleDeadline(state:SubtitleWorkerState):SubtitleWorkerState{return Object.freeze({...state,timeline:Object.freeze({...state.timeline,deadline:null,deadlineEpoch:state.timeline.deadlineEpoch+1})});}
export function armSubtitleDeadline(state:SubtitleWorkerState,request:SubtitleWorkerRequest,snapshot:SubtitleVisualSchedule,seconds:number,rate:number,running:boolean,now:number){
 const schedule=Object.freeze({mode:snapshot.mode,unstable:snapshot.unstable,next:snapshot.next,timingEpoch:snapshot.epoch,epoch:state.timeline.deadlineEpoch});
 if(!subtitleWorkerCurrent(state,request)||!running||snapshot.mode!=='deadline'||!(rate>0)||snapshot.next===null)return Object.freeze({state,schedule,deadline:null});
 const delay=Math.max(1,Math.ceil((snapshot.next-seconds)*1000/rate)+2),deadline=Object.freeze({epoch:state.timeline.deadlineEpoch,lifetime:state.epoch,target:snapshot.next,due:now+delay});
 return Object.freeze({state:Object.freeze({...state,timeline:Object.freeze({...state.timeline,deadline})}),schedule,deadline});
}
export function subtitleDeadlineCurrent(state:SubtitleWorkerState,deadline:SubtitleDeadline):boolean{return subtitleWorkerAlive(state,deadline.lifetime)&&state.timeline.deadline?.epoch===deadline.epoch;}
export function settleSubtitleDeadline(state:SubtitleWorkerState,deadline:SubtitleDeadline,now:number):Readonly<{state:SubtitleWorkerState;accepted:boolean;remaining?:number}>{
 if(!subtitleDeadlineCurrent(state,deadline))return Object.freeze({state,accepted:false});
 if(now<deadline.due)return Object.freeze({state,accepted:false,remaining:deadline.due-now});
 const old=state.timeline;return Object.freeze({state:Object.freeze({...state,timeline:Object.freeze({...old,deadline:null,scheduler:Object.freeze({...old.scheduler,deadlineWakes:old.scheduler.deadlineWakes+1})})}),accepted:true});
}
export function completeSubtitlePump(state:SubtitleWorkerState,request:SubtitleWorkerRequest,seconds:number,timingEpoch:number,recoveredClock:boolean){
 if(!subtitleWorkerCurrent(state,request))return Object.freeze({state,timingChanged:false});
 const old=state.timeline,crossed=old.nextRenderBoundary!==null&&seconds>=old.nextRenderBoundary;
 const timingChanged=recoveredClock||crossed||old.lastTimingEpoch>=0&&timingEpoch!==old.lastTimingEpoch;
 return Object.freeze({state:Object.freeze({...state,timeline:Object.freeze({...old,nextRenderBoundary:crossed?null:old.nextRenderBoundary,lastTimingEpoch:timingEpoch})}),timingChanged});
}
export function admitSubtitleAttachment(state:SubtitleWorkerState,request:SubtitleWorkerRequest,format:string,bytes:number,arrayBuffer:boolean):Readonly<{state:SubtitleWorkerState;path?:string;error?:'invalid'|'budget'}>{
 if(!subtitleWorkerCurrent(state,request))return Object.freeze({state});
 if(!['ass','ssa','srt','vtt'].includes(format)||!arrayBuffer)return Object.freeze({state,error:'invalid'});
 const old=state.attachments;if(old.pending||!Number.isSafeInteger(bytes)||bytes<=0||bytes>8*1024*1024||old.entries.length>=16||old.bytes+bytes>16*1024*1024)return Object.freeze({state,error:'budget'});
 const sequence=old.sequence+1,path='/subtitles/'+sequence+'.'+format,pending=Object.freeze({request:request.id,path,bytes});
 return Object.freeze({state:Object.freeze({...state,attachments:Object.freeze({...old,sequence,pending})}),path});
}
export function commitSubtitleAttachment(state:SubtitleWorkerState,request:SubtitleWorkerRequest,id:number):SubtitleWorkerState{
 const old=state.attachments,pending=old.pending;if(!subtitleWorkerCurrent(state,request)||pending?.request!==request.id||!Number.isSafeInteger(id)||id<=0||old.entries.some(entry=>entry.id===id))return state;
 const entry=Object.freeze({id,path:pending.path,bytes:pending.bytes}),entries=Object.freeze([...old.entries.filter(value=>value.id!==id),entry]);
 return Object.freeze({...state,attachments:Object.freeze({...old,pending:null,entries,bytes:old.bytes+pending.bytes})});
}
export function subtitleAttachment(state:SubtitleWorkerState,id:number):SubtitleAttachment|undefined{return state.attachments.entries.find(entry=>entry.id===id);}
export function removeSubtitleAttachment(state:SubtitleWorkerState,request:SubtitleWorkerRequest,id:number):SubtitleWorkerState {
 const entry=subtitleAttachment(state,id);if(!entry||!subtitleWorkerCurrent(state,request))return state;
 return Object.freeze({...state,attachments:Object.freeze({...state.attachments,entries:Object.freeze(state.attachments.entries.filter(value=>value.id!==id)),bytes:state.attachments.bytes-entry.bytes})});
}
