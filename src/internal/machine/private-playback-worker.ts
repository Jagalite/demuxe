// SPDX-License-Identifier: Apache-2.0
import {resolveDecodePolicy,mpvDecoderOptions,nextAdaptiveState,supportsEmergencyFrameDrop,adaptiveDecodeSignal} from './decode-policy.js';
import type {DecodeInput,DecodePolicy} from './decode-policy.js';
type AdaptiveSample=Readonly<{wall:number;position:number;decoderDrops:number;presentationDrops:number}>;
type AdaptiveRequest=Readonly<{id:number;load:number;candidate:DecodePolicy;reason:string;options:string}>;
/** Playback worker policy. Native queues, byte buffers and completion callbacks remain in the shell. */
type Deadline=Readonly<{id:number;load:number;deadline:number}>;
type Picture=Readonly<{id:number;load:number;generation:number;rendered:number}>;
type Fence=Readonly<{id:number;load:number;generation:number;rendered:number;deadline:number}>;
type LoadStage='received'|'destroying'|'source'|'creating'|'configuring'|'loaded';
export type PrivatePlaybackWorkerState=Readonly<{
 decodeInput:Readonly<DecodeInput>|null;decodePolicy:DecodePolicy|null;hybrid:boolean;adaptiveFrameDrop:boolean;adaptiveSerial:number;adaptiveRequest:AdaptiveRequest|null;adaptivePrevious:AdaptiveSample|null;adaptiveStreak:number;adaptiveDirection:string;adaptiveCooldown:number;adaptiveReason:string;
 rpcSerial:number;rpcs:readonly Readonly<{id:number;bytes:number}>[];
 phase:'new'|'initializing'|'ready'|'closing'|'closed';initialized:boolean;closeStarted:boolean;
 loadSerial:number;load:Readonly<{id:number;stage:LoadStage}>|null;replacing:boolean;generation:number;
 userPaused:boolean;contextRunning:boolean;settings:readonly (readonly [string,string])[];
 commandSerial:number;commands:readonly Deadline[];refreshSerial:number;refreshes:readonly Deadline[];
 pumping:boolean;pumpSerial:number;pumpLoad:number;target:number|null;opening:boolean;restarted:boolean;targetDrawBaseline:number;
 pictureSerial:number;capture:Picture|null;pendingPicture:Picture|null;sentDraws:number;presentedDraws:number;picturePaused:boolean;
 fenceSerial:number;fences:readonly Fence[];lastDraws:number;lastDiagnostics:number;subtitleCount:number;subtitleBytes:number;
}>;
export function createPrivatePlaybackWorker():PrivatePlaybackWorkerState{return Object.freeze({rpcSerial:0,rpcs:Object.freeze([]),decodeInput:null,decodePolicy:null,hybrid:false,adaptiveFrameDrop:false,adaptiveSerial:0,adaptiveRequest:null,adaptivePrevious:null,adaptiveStreak:0,adaptiveDirection:'',adaptiveCooldown:0,adaptiveReason:'disabled',phase:'new',initialized:false,closeStarted:false,loadSerial:0,load:null,replacing:false,generation:0,userPaused:true,contextRunning:false,settings:Object.freeze([]),commandSerial:1,commands:Object.freeze([]),refreshSerial:0,refreshes:Object.freeze([]),pumping:false,pumpSerial:0,pumpLoad:0,target:null,opening:false,restarted:false,targetDrawBaseline:0,pictureSerial:0,capture:null,pendingPicture:null,sentDraws:0,presentedDraws:0,picturePaused:false,fenceSerial:0,fences:Object.freeze([]),lastDraws:0,lastDiagnostics:0,subtitleCount:0,subtitleBytes:0});}
export function playbackWorkerAccepts(state:PrivatePlaybackWorkerState,op:string):boolean{return op==='close'||state.phase!=='closing'&&state.phase!=='closed';}
export function admitPlaybackWorkerInit(state:PrivatePlaybackWorkerState):Readonly<{state:PrivatePlaybackWorkerState;error:string|null}>{
 const error=state.initialized?'Playback host already initialized':state.phase!=='new'?'Playback host closed':null;
 return Object.freeze({state:error?state:Object.freeze({...state,phase:'initializing',initialized:true}),error});
}
export function playbackWorkerInitCurrent(state:PrivatePlaybackWorkerState):boolean{return state.phase==='initializing';}
export function finishPlaybackWorkerInit(state:PrivatePlaybackWorkerState,contextRunning:boolean):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{const accepted=state.phase==='initializing';return Object.freeze({state:accepted?Object.freeze({...state,phase:'ready',contextRunning}):state,accepted});}
export function receivePlaybackWorkerLoad(state:PrivatePlaybackWorkerState):Readonly<{state:PrivatePlaybackWorkerState;id:number|null;revoke:boolean}>{
 if(!playbackWorkerAccepts(state,'load'))return Object.freeze({state,id:null,revoke:false});
 const id=state.loadSerial+1;return Object.freeze({state:Object.freeze({...state,loadSerial:id,load:Object.freeze({id,stage:'received'}),replacing:true,commands:Object.freeze([]),refreshes:Object.freeze([]),fences:Object.freeze([]),capture:null}),id,revoke:true});
}
export function playbackWorkerLoadCurrent(state:PrivatePlaybackWorkerState,id:number):boolean{return state.phase==='ready'&&state.load?.id===id;}
export function beginPlaybackWorkerLoad(state:PrivatePlaybackWorkerState,id:number,generation:number,replace:boolean):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{
 const accepted=playbackWorkerLoadCurrent(state,id)&&state.load?.stage==='received';
 return Object.freeze({state:accepted?Object.freeze({...state,decodePolicy:state.decodeInput?privatePolicy(state.decodeInput,'normal'):state.decodePolicy,adaptivePrevious:null,adaptiveStreak:0,adaptiveDirection:'',adaptiveCooldown:0,adaptiveRequest:null,generation,load:Object.freeze({id,stage:replace?'destroying':'source'}),target:0,restarted:false,opening:true,targetDrawBaseline:0,lastDraws:0,sentDraws:0,presentedDraws:0,picturePaused:false,subtitleCount:0,subtitleBytes:0}):state,accepted});
}
export function advancePlaybackWorkerLoad(state:PrivatePlaybackWorkerState,id:number,input:'destroyed'|'opened'|'created'|'loaded'):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{
 const expected:Record<typeof input,LoadStage>={destroyed:'destroying',opened:'source',created:'creating',loaded:'configuring'},next:Record<typeof input,LoadStage>={destroyed:'source',opened:'creating',created:'configuring',loaded:'loaded'};
 const accepted=playbackWorkerLoadCurrent(state,id)&&state.load?.stage===expected[input];
 return Object.freeze({state:accepted?Object.freeze({...state,load:Object.freeze({id,stage:next[input]}),replacing:input==='created'?false:state.replacing}):state,accepted});
}
export function retirePlaybackWorker(state:PrivatePlaybackWorkerState):Readonly<{state:PrivatePlaybackWorkerState;revoke:boolean}>{
 const revoke=playbackWorkerAccepts(state,'retire');return Object.freeze({state:revoke?Object.freeze({...state,phase:'closing',load:null,commands:Object.freeze([]),refreshes:Object.freeze([]),fences:Object.freeze([]),capture:null,picturePaused:true}):state,revoke});
}
export function beginPlaybackWorkerClose(state:PrivatePlaybackWorkerState):PrivatePlaybackWorkerState{return state.closeStarted?state:Object.freeze({...state,closeStarted:true});}
export function finishPlaybackWorkerClose(state:PrivatePlaybackWorkerState):PrivatePlaybackWorkerState{return Object.freeze({...state,phase:'closed'});}
export function admitPlaybackWorkerCommand(state:PrivatePlaybackWorkerState,seek:boolean,now:number):Readonly<{state:PrivatePlaybackWorkerState;id:number|null;request:Deadline|null;error:string|null}>{
 const error=!playbackWorkerAccepts(state,'command')?'Playback host closing':state.replacing?'Source replaced':state.commandSerial>=0x3fffffff?'Command identity limit':state.commands.length>=128?'Native command capacity':null;
 if(error)return Object.freeze({state,id:null,request:null,error});
 const id=state.commandSerial,request=Object.freeze({id:seek?id+0x40000000:id,load:state.loadSerial,deadline:now+15000});
 return Object.freeze({state:Object.freeze({...state,commandSerial:id+1,commands:Object.freeze([...state.commands,request])}),id,request,error:null});
}
export function admitPlaybackWorkerRefresh(state:PrivatePlaybackWorkerState,load:number,now:number):Readonly<{state:PrivatePlaybackWorkerState;request:Deadline|null}>{
 if(!playbackWorkerLoadCurrent(state,load)||state.refreshes.length>=128||!Number.isSafeInteger(state.refreshSerial+1))return Object.freeze({state,request:null});
 const request=Object.freeze({id:state.refreshSerial+1,load,deadline:now+5000});return Object.freeze({state:Object.freeze({...state,refreshSerial:request.id,refreshes:Object.freeze([...state.refreshes,request])}),request});
}
export function settlePlaybackWorkerRequest(state:PrivatePlaybackWorkerState,kind:'command'|'refresh',id:number,input:Readonly<{kind:'reply'|'send-error'}|{kind:'deadline';now:number}>):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{
 const key=kind==='command'?'commands':'refreshes',request=state[key].find(entry=>entry.id===id);
 if(!request||input.kind==='deadline'&&input.now<request.deadline)return Object.freeze({state,accepted:false});
 return Object.freeze({state:Object.freeze({...state,[key]:Object.freeze(state[key].filter(entry=>entry.id!==id))}),accepted:true});
}
export function playbackWorkerSetting(state:PrivatePlaybackWorkerState,name:string,value:string):PrivatePlaybackWorkerState{
 const settings=state.settings.map(entry=>Object.freeze([entry[0],entry[0]===name?value:entry[1]]) as readonly [string,string]);if(!settings.some(entry=>entry[0]===name))settings.push(Object.freeze([name,value]));return Object.freeze({...state,settings:Object.freeze(settings)});
}
export function beginPlaybackWorkerControl(state:PrivatePlaybackWorkerState,kind:'pause'|'context',value:boolean):Readonly<{state:PrivatePlaybackWorkerState;paused:boolean;deviceFirst:boolean}>{
 let next=Object.freeze({...state,userPaused:kind==='pause'?value:state.userPaused,contextRunning:kind==='context'?value:state.contextRunning,picturePaused:kind==='pause'&&!value?false:state.picturePaused});
 if(kind==='pause')next=playbackWorkerSetting(next,'pause',value?'yes':'no');
 return Object.freeze({state:next,paused:next.userPaused||!next.contextRunning,deviceFirst:kind==='context'&&value});
}
export function preparePlaybackWorkerCommand(state:PrivatePlaybackWorkerState,args:readonly string[]):PrivatePlaybackWorkerState{
 const visual=args[0]==='set'?['pause','vd-lavc-o','vf','sid','sub-visibility','sub-delay','sub-font-size','sub-color','sub-border-size','sub-font'].includes(args[1]):['frame-step','frame-back-step','stop'].includes(args[0]);
 let next=visual?openPlaybackWorkerPresentation(state):state;
 if(args[0]==='set')next=playbackWorkerSetting(next,args[1],args[2]);return next;
}
export function openPlaybackWorkerPresentation(state:PrivatePlaybackWorkerState):PrivatePlaybackWorkerState{return state.picturePaused?Object.freeze({...state,picturePaused:false}):state;}
export function beginPlaybackWorkerSeek(state:PrivatePlaybackWorkerState,target:number,draws:number):PrivatePlaybackWorkerState{return Object.freeze({...state,target,restarted:false,opening:false,targetDrawBaseline:draws,picturePaused:false});}
export function acceptPlaybackWorkerSubtitle(state:PrivatePlaybackWorkerState,bytes:number):PrivatePlaybackWorkerState{return state.phase!=='ready'||state.replacing||!playbackWorkerSubtitleFits(state,bytes)?state:Object.freeze({...state,subtitleCount:state.subtitleCount+1,subtitleBytes:state.subtitleBytes+bytes});}
export function playbackWorkerSubtitleFits(state:PrivatePlaybackWorkerState,bytes:number):boolean{return bytes>0&&bytes<=16*1024*1024&&state.subtitleBytes+bytes<=16*1024*1024&&state.subtitleCount<32;}
export function beginPlaybackWorkerPump(state:PrivatePlaybackWorkerState):Readonly<{state:PrivatePlaybackWorkerState;id:number|null}>{
 if(state.phase!=='ready'||state.replacing||state.pumping)return Object.freeze({state,id:null});
 const id=state.pumpSerial+1;return Object.freeze({state:Object.freeze({...state,pumping:true,pumpSerial:id,pumpLoad:state.loadSerial}),id});
}
export function playbackWorkerPumpCurrent(state:PrivatePlaybackWorkerState,id:number):boolean{return state.phase==='ready'&&!state.replacing&&state.pumping&&state.pumpSerial===id&&state.pumpLoad===state.loadSerial;}
export function finishPlaybackWorkerPump(state:PrivatePlaybackWorkerState,id:number):Readonly<{state:PrivatePlaybackWorkerState;schedule:boolean}>{
 if(state.pumpSerial!==id)return Object.freeze({state,schedule:false});return Object.freeze({state:Object.freeze({...state,pumping:false}),schedule:state.phase==='ready'&&!state.replacing});
}
export function observePlaybackWorkerRestart(state:PrivatePlaybackWorkerState):PrivatePlaybackWorkerState{return state.restarted?state:Object.freeze({...state,restarted:true});}
export function observePlaybackWorkerOutput(state:PrivatePlaybackWorkerState,input:Readonly<{hasVideo:boolean;audioReady:boolean;position:number;draws:number}>):PrivatePlaybackWorkerState{
 return state.target!==null&&state.restarted&&(state.opening||Math.abs(input.position-state.target)<.15)&&(input.hasVideo?input.draws>state.targetDrawBaseline:input.audioReady)?Object.freeze({...state,target:null,opening:false}):state;
}
export function beginPlaybackWorkerCapture(state:PrivatePlaybackWorkerState,draws:number):Readonly<{state:PrivatePlaybackWorkerState;picture:Picture|null}>{
 if(state.phase!=='ready'||state.replacing||state.picturePaused||state.capture||state.pendingPicture||draws<=state.sentDraws)return Object.freeze({state,picture:null});
 const picture=Object.freeze({id:state.pictureSerial+1,load:state.loadSerial,generation:state.generation,rendered:draws});return Object.freeze({state:Object.freeze({...state,pictureSerial:picture.id,capture:picture}),picture});
}
export function finishPlaybackWorkerCapture(state:PrivatePlaybackWorkerState,id:number):Readonly<{state:PrivatePlaybackWorkerState;picture:Picture|null}>{
 const picture=state.capture;if(!picture||picture.id!==id)return Object.freeze({state,picture:null});
 const accepted=state.phase==='ready'&&!state.replacing&&picture.load===state.loadSerial&&!state.picturePaused;
 return Object.freeze({state:Object.freeze({...state,capture:null,...accepted?{pendingPicture:picture,sentDraws:picture.rendered}:{}}),picture:accepted?picture:null});
}
export function acknowledgePlaybackWorkerPicture(state:PrivatePlaybackWorkerState,id:number):Readonly<{state:PrivatePlaybackWorkerState;resolved:readonly number[]}>{
 const picture=state.pendingPicture;if(!picture||picture.id!==id)return Object.freeze({state,resolved:Object.freeze([])});
 const presentedDraws=picture.load===state.loadSerial&&picture.generation===state.generation?Math.max(state.presentedDraws,picture.rendered):state.presentedDraws;
 const resolved=state.fences.filter(fence=>fence.load===state.loadSerial&&fence.rendered<=presentedDraws).map(fence=>fence.id);
 return Object.freeze({state:Object.freeze({...state,pendingPicture:null,presentedDraws,picturePaused:state.picturePaused||resolved.length>0,fences:Object.freeze(state.fences.filter(fence=>!resolved.includes(fence.id)))}),resolved:Object.freeze(resolved)});
}
export function pausePlaybackWorkerPresentation(state:PrivatePlaybackWorkerState,draws:number,now:number):Readonly<{state:PrivatePlaybackWorkerState;fence:Fence|null;error:string|null}>{
 if(state.phase!=='ready'||state.replacing)return Object.freeze({state,fence:null,error:'Playback presentation retired'});
 if(state.picturePaused||state.presentedDraws>=draws)return Object.freeze({state:state.picturePaused?state:Object.freeze({...state,picturePaused:true}),fence:null,error:null});
 if(state.fences.length>=128||!Number.isSafeInteger(state.fenceSerial+1))return Object.freeze({state,fence:null,error:'Playback presentation capacity'});
 const fence=Object.freeze({id:state.fenceSerial+1,load:state.loadSerial,generation:state.generation,rendered:draws,deadline:now+15000});return Object.freeze({state:Object.freeze({...state,fenceSerial:fence.id,fences:Object.freeze([...state.fences,fence])}),fence,error:null});
}
export function expirePlaybackWorkerPresentation(state:PrivatePlaybackWorkerState,id:number,now:number,failed=false):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{
 const fence=state.fences.find(entry=>entry.id===id);if(!fence||!failed&&now<fence.deadline)return Object.freeze({state,accepted:false});return Object.freeze({state:Object.freeze({...state,fences:Object.freeze(state.fences.filter(entry=>entry.id!==id))}),accepted:true});
}
export function publishPlaybackWorkerOutput(state:PrivatePlaybackWorkerState,draws:number):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{const accepted=draws>state.lastDraws;return Object.freeze({state:accepted?Object.freeze({...state,lastDraws:draws}):state,accepted});}
export function publishPlaybackWorkerDiagnostics(state:PrivatePlaybackWorkerState,now:number,force=false):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{const accepted=force||now-state.lastDiagnostics>=100;return Object.freeze({state:accepted?Object.freeze({...state,lastDiagnostics:now}):state,accepted});}

function privatePolicy(input:Readonly<DecodeInput>,adaptiveState:DecodePolicy['adaptiveState']):DecodePolicy{
 const policy=resolveDecodePolicy({...input,adaptiveState});
 return Object.freeze({...policy,threads:1,shortcuts:Object.freeze([...policy.shortcuts]) as unknown as string[],ffmpegOptions:Object.freeze({...policy.ffmpegOptions})});
}
export function configurePlaybackWorkerDecode(state:PrivatePlaybackWorkerState,input:DecodeInput,hybrid:boolean,adaptiveFrameDrop:boolean):PrivatePlaybackWorkerState{
 const decodeInput=Object.freeze({...input}),enabled=adaptiveFrameDrop&&!hybrid;
 return Object.freeze({...state,decodeInput,decodePolicy:privatePolicy(decodeInput,'normal'),hybrid,adaptiveFrameDrop:enabled,adaptiveReason:enabled?'Waiting for sustained decoder pressure':'disabled'});
}
export function samplePlaybackWorkerAdaptive(state:PrivatePlaybackWorkerState,input:Readonly<{now:number;position:number;decoderDrops:number;presentationDrops:number;speed:number;avsync:number;pausedForCache:boolean}>):Readonly<{state:PrivatePlaybackWorkerState;request:AdaptiveRequest|null}>{
 const result=(next:PrivatePlaybackWorkerState,request:AdaptiveRequest|null=null)=>Object.freeze({state:next,request});
 const policy=state.decodePolicy;
 if(!state.adaptiveFrameDrop||state.hybrid||state.adaptiveRequest||state.replacing||state.phase!=='ready'||!policy||!state.decodeInput||input.now<state.adaptiveCooldown)return result(state);
 const previous=state.adaptivePrevious;if(previous&&input.now-previous.wall<2000)return result(state);
 const current=Object.freeze({wall:input.now,position:input.position,decoderDrops:input.decoderDrops,presentationDrops:input.presentationDrops});let next:PrivatePlaybackWorkerState=Object.freeze({...state,adaptivePrevious:current});
 if(!previous||state.userPaused||!state.contextRunning||state.target!==null||input.pausedForCache)return result(Object.freeze({...next,adaptiveStreak:0}));
 if(!supportsEmergencyFrameDrop(policy.codec))return result(Object.freeze({...next,adaptiveReason:'Codec has no qualified emergency frame skip'}));
 const {pressure,recovered}=adaptiveDecodeSignal({elapsedSeconds:(input.now-previous.wall)/1000,playbackSpeed:input.speed,advance:current.position-previous.position,decoderDrops:Math.max(0,current.decoderDrops-previous.decoderDrops),presentationDrops:Math.max(0,current.presentationDrops-previous.presentationDrops),avsync:input.avsync});
 const direction=pressure?'pressure':recovered?'recovery':'',streak=direction&&direction===state.adaptiveDirection?state.adaptiveStreak+1:direction?1:0;
 next=Object.freeze({...next,adaptiveStreak:streak,adaptiveDirection:direction});
 let adaptiveState=nextAdaptiveState(policy.adaptiveState,policy.codec,pressure,recovered,streak);if(pressure&&adaptiveState==='reduced-reconstruction'&&policy.skipLoopFilter==='noref')adaptiveState='drop-non-reference';
 if(adaptiveState===policy.adaptiveState)return result(next);
 const candidate=privatePolicy(state.decodeInput,adaptiveState),options=mpvDecoderOptions(candidate);
 if(options===mpvDecoderOptions(policy))return result(Object.freeze({...next,decodePolicy:candidate,adaptiveStreak:0}));
 const request=Object.freeze({id:state.adaptiveSerial+1,load:state.loadSerial,candidate,options,reason:pressure?'Sustained decoder pressure':'Sustained recovery with synchronized playback'});
 return result(Object.freeze({...next,adaptiveSerial:request.id,adaptiveRequest:request,adaptiveStreak:0,adaptiveCooldown:input.now+10000}),request);
}
export function settlePlaybackWorkerAdaptive(state:PrivatePlaybackWorkerState,id:number,success:boolean):Readonly<{state:PrivatePlaybackWorkerState;accepted:boolean}>{
 const request=state.adaptiveRequest;if(!request||request.id!==id)return Object.freeze({state,accepted:false});
 const accepted=state.phase==='ready'&&!state.replacing&&request.load===state.loadSerial;
 return Object.freeze({state:Object.freeze({...state,adaptiveRequest:null,...accepted&&success?{decodePolicy:request.candidate,adaptiveReason:request.reason}:{}}),accepted});
}

/** RPC slots retain physical chain obligations until completion, even after retirement. */
export function admitPlaybackWorkerRPC(state:PrivatePlaybackWorkerState,bytes:number,closing=false):Readonly<{state:PrivatePlaybackWorkerState;id?:number;error?:string}>{
 if(state.phase==='closing'||state.phase==='closed'||state.rpcs.some(entry=>entry.id===0))return Object.freeze({state,error:'Playback host closed'});
 if(!Number.isSafeInteger(bytes)||bytes<0||bytes>64*1024*1024)return Object.freeze({state,error:'Playback RPC byte capacity'});
 if(!closing&&(state.rpcs.length>=128||state.rpcs.reduce((sum,entry)=>sum+entry.bytes,0)+bytes>64*1024*1024))return Object.freeze({state,error:'Playback RPC capacity'});
 if(!closing&&!Number.isSafeInteger(state.rpcSerial+1))return Object.freeze({state,error:'Playback RPC identity exhausted'});
 const id=closing?0:state.rpcSerial+1;
 return Object.freeze({state:Object.freeze({...state,rpcSerial:closing?state.rpcSerial:id,rpcs:Object.freeze([...state.rpcs,Object.freeze({id,bytes})])}),id});
}
export function finishPlaybackWorkerRPC(state:PrivatePlaybackWorkerState,id:number):PrivatePlaybackWorkerState{return state.rpcs.some(entry=>entry.id===id)?Object.freeze({...state,rpcs:Object.freeze(state.rpcs.filter(entry=>entry.id!==id))}):state;}
