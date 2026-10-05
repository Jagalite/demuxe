// SPDX-License-Identifier: Apache-2.0
import {beginWait,observeWait,type WaitState} from './async-policy.js';
import type {BufferingPolicy,AudioOutput} from '../../types.js';
export type PrivateSoftwareLoad=Readonly<{id:number;generation:number;phase:'preparing'|'loading'|'ready'}>;
export type PrivateSoftwareControl=Readonly<{id:number;generation:number;kind:'play'|'pause'|'seek'}>;
export type PrivateSoftwareAttachment=Readonly<{id:number;generation:number;attachmentId:string|undefined}>;
export type PrivateSoftwareState=Readonly<{
 waits:readonly Readonly<{generation:number;wait:WaitState}>[];stopped:boolean;serial:number;generation:number;load:PrivateSoftwareLoad|null;
 playback:PrivateSoftwareControl|null;seek:PrivateSoftwareControl|null;
 userPaused:boolean;gain:number;outputVerified:boolean;presentedDraws:number;
 attachments:readonly PrivateSoftwareAttachment[];buffering:BufferingPolicy|undefined;
}>;
export type PrivateSoftwareFacts=Readonly<{tracksKnown:boolean;trackCount:number;video:boolean;audio:boolean;audioCodec:boolean;audioWritten:number;audioConsumed:number;seeking:boolean;rendered:number;position:number}>;
export function initialPrivateSoftware(buffering?:BufferingPolicy):PrivateSoftwareState{return Object.freeze({waits:Object.freeze([]),stopped:false,serial:0,generation:0,load:null,playback:null,seek:null,userPaused:true,gain:1,outputVerified:false,presentedDraws:0,attachments:Object.freeze([]),buffering:buffering?Object.freeze({...buffering}):undefined});}
export function privateSoftwareSourceCurrent(state:PrivateSoftwareState,generation:number):boolean{return !state.stopped&&state.generation===generation;}
export function privateSoftwareLoadCurrent(state:PrivateSoftwareState,load:PrivateSoftwareLoad):boolean{return !state.stopped&&state.load?.id===load.id;}
export function beginPrivateSoftwareLoad(state:PrivateSoftwareState):Readonly<{state:PrivateSoftwareState;load:PrivateSoftwareLoad|null}>{
 if(state.stopped)return Object.freeze({state,load:null});
 const load=Object.freeze({id:state.serial+1,generation:state.generation+1,phase:'preparing' as const});
 return Object.freeze({state:Object.freeze({...state,serial:load.id,load}),load});
}
export function startPrivateSoftwareLoad(state:PrivateSoftwareState,load:PrivateSoftwareLoad):PrivateSoftwareState{
 if(!privateSoftwareLoadCurrent(state,load)||state.load?.phase!=='preparing')return state;
 return Object.freeze({...state,waits:Object.freeze([]),generation:load.generation,load:Object.freeze({...load,phase:'loading'}),playback:null,seek:null,outputVerified:false,presentedDraws:0,attachments:Object.freeze([])});
}
export function finishPrivateSoftwareLoad(state:PrivateSoftwareState,load:PrivateSoftwareLoad):PrivateSoftwareState{return privateSoftwareLoadCurrent(state,load)&&state.load?.phase==='loading'?Object.freeze({...state,load:Object.freeze({...load,phase:'ready'})}):state;}
export function privateSoftwareControlCurrent(state:PrivateSoftwareState,control:PrivateSoftwareControl):boolean{return privateSoftwareSourceCurrent(state,control.generation)&&(control.kind==='seek'?state.seek:state.playback)?.id===control.id;}
export function beginPrivateSoftwareControl(state:PrivateSoftwareState,kind:PrivateSoftwareControl['kind']):Readonly<{state:PrivateSoftwareState;control:PrivateSoftwareControl|null}>{
 if(state.stopped)return Object.freeze({state,control:null});
 const control=Object.freeze({id:state.serial+1,generation:state.generation,kind});
 return Object.freeze({state:Object.freeze({...state,serial:control.id,...kind==='seek'?{seek:control}:{playback:control}}),control});
}
export function startPrivateSoftwareControl(state:PrivateSoftwareState,control:PrivateSoftwareControl):PrivateSoftwareState{return !privateSoftwareControlCurrent(state,control)||control.kind==='seek'?state:Object.freeze({...state,userPaused:control.kind==='pause'});}
export function finishPrivateSoftwareControl(state:PrivateSoftwareState,control:PrivateSoftwareControl):PrivateSoftwareState{return privateSoftwareControlCurrent(state,control)?Object.freeze({...state,...control.kind==='seek'?{seek:null}:{playback:null}}):state;}
export function acceptPrivateSoftwarePicture(state:PrivateSoftwareState,generation:number,rendered:number):PrivateSoftwareState{return privateSoftwareSourceCurrent(state,generation)?Object.freeze({...state,presentedDraws:rendered}):state;}
export function privateSoftwareEvidence(state:PrivateSoftwareState,facts:PrivateSoftwareFacts):Readonly<{metadata:boolean;audioDecoderConfigured:boolean;audioDecoded:boolean;audioProgress:boolean;videoPresented:boolean;decoderOutput:boolean}>{
 const videoPresented=facts.video&&state.presentedDraws>0;
 return Object.freeze({metadata:facts.tracksKnown,audioDecoderConfigured:facts.audioCodec,audioDecoded:facts.audioWritten>0,audioProgress:facts.audioConsumed>0,videoPresented,decoderOutput:videoPresented||facts.audioWritten>0});
}
export function privateSoftwareReady(state:PrivateSoftwareState,facts:PrivateSoftwareFacts,kind:'load'|'output'|'seek',target=0):boolean{
 if(kind==='load')return facts.trackCount>0&&!facts.seeking&&(facts.video?state.presentedDraws>0:facts.audio&&facts.audioCodec);
 if(kind==='seek')return (!facts.video||state.presentedDraws>=facts.rendered&&state.presentedDraws>0)&&!facts.seeking&&Math.abs(facts.position-target)<.15;
 const evidence=privateSoftwareEvidence(state,facts);return (facts.video||facts.audio)&&(!facts.video||evidence.videoPresented)&&(!facts.audio||evidence.audioDecoded);
}
export function acceptPrivateSoftwareOutput(state:PrivateSoftwareState,generation:number):PrivateSoftwareState{return privateSoftwareSourceCurrent(state,generation)?Object.freeze({...state,outputVerified:true}):state;}
export function privateSoftwareWait(state:PrivateSoftwareState,generation:number,now:number,deadline:number,ready:boolean):'wait'|'ready'|'retired'|'closed'|'timeout'{
 if(now>=deadline)return 'timeout';if(state.stopped)return 'closed';if(state.generation!==generation)return 'retired';return ready?'ready':'wait';
}
export function beginPrivateSoftwareAttachment(state:PrivateSoftwareState,attachmentId:string|undefined):Readonly<{state:PrivateSoftwareState;attachment:PrivateSoftwareAttachment|null;previous:number}>{
 if(state.stopped)return Object.freeze({state,attachment:null,previous:state.attachments.length});
 const attachment=Object.freeze({id:state.serial+1,generation:state.generation,attachmentId});
 return Object.freeze({state:Object.freeze({...state,serial:attachment.id,attachments:Object.freeze([...state.attachments,attachment])}),attachment,previous:state.attachments.length});
}
export function removePrivateSoftwareAttachment(state:PrivateSoftwareState,attachment:PrivateSoftwareAttachment):PrivateSoftwareState{return privateSoftwareSourceCurrent(state,attachment.generation)&&state.attachments.some(item=>item.id===attachment.id)?Object.freeze({...state,attachments:Object.freeze(state.attachments.filter(item=>item.id!==attachment.id))}):state;}
export function acceptPrivateSoftwareSettings(state:PrivateSoftwareState,generation:number,settings:Readonly<{gain?:number;buffering?:BufferingPolicy}>):PrivateSoftwareState{return privateSoftwareSourceCurrent(state,generation)?Object.freeze({...state,...settings.gain===undefined?{}:{gain:settings.gain},...settings.buffering===undefined?{}:{buffering:Object.freeze({...settings.buffering})}}):state;}
export function retirePrivateSoftware(state:PrivateSoftwareState):PrivateSoftwareState{return state.stopped?state:Object.freeze({...state,waits:Object.freeze([]),stopped:true,load:null,playback:null,seek:null,attachments:Object.freeze([])});}
export function privateSoftwareAudioLayout(requested:AudioOutput,deviceChannels:number,rejectFallback:boolean):Readonly<{channels:2|6|8;reject:boolean}>{const wanted=requested==='auto'?(deviceChannels>=8?8:deviceChannels>=6?6:2):requested==='7.1'?8:requested==='5.1'?6:2;return Object.freeze({channels:wanted<=deviceChannels?wanted:2,reject:wanted>deviceChannels&&rejectFallback});}

export function beginPrivateOutputWait(state:PrivateSoftwareState,generation:number,now:number):Readonly<{state:PrivateSoftwareState;id:number|null}>{
 if(!privateSoftwareSourceCurrent(state,generation)||state.waits.length>=128||state.serial>=Number.MAX_SAFE_INTEGER)return {state,id:null};
 const id=state.serial+1,wait=beginWait(id,now,'private-output');return {state:Object.freeze({...state,serial:id,waits:Object.freeze([...state.waits,Object.freeze({generation,wait})])}),id};
}
export function observePrivateOutputWait(state:PrivateSoftwareState,id:number,now:number,ready:boolean):Readonly<{state:PrivateSoftwareState;outcome:'wait'|'ready'|'retired'|'timeout'}>{
 const entry=state.waits.find(entry=>entry.wait.id===id);if(!entry||!privateSoftwareSourceCurrent(state,entry.generation))return {state,outcome:'retired'};
 const wait=observeWait(entry.wait,{id,now,kind:ready?'ready':'deadline'});
 if(wait.phase==='waiting')return {state,outcome:'wait'};
 return {state:finishPrivateOutputWait(state,id),outcome:wait.phase==='ready'?'ready':'timeout'};
}
export function finishPrivateOutputWait(state:PrivateSoftwareState,id:number):PrivateSoftwareState{return Object.freeze({...state,waits:Object.freeze(state.waits.filter(entry=>entry.wait.id!==id))});}
