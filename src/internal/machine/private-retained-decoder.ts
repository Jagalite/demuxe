// SPDX-License-Identifier: Apache-2.0
export type RetainedDecoderScope=Readonly<{generation:number;decoder:number}>;
export type RetainedDecoderStatistics=Readonly<{submitted:number;received:number;delivered:number;closed:number;peakFrames:number;resets:number;blockedReceives:number;maxConsecutiveBlockedReceives:number;capacityResumes:number}>;
export type RetainedDecoderState=Readonly<{
 generation:number;decoderSerial:number;decoder:number|null;configuration:boolean;pending:boolean;checkSerial:number;check:number|null;
 frameSerial:number;frames:readonly number[];needsKey:boolean;draining:boolean;flushed:boolean;failed:boolean;blockedReceiveStreak:number;waitSerial:number;wait:Readonly<{id:number;generation:number}>|null;stats:RetainedDecoderStatistics;
}>;
export function initialRetainedDecoder():RetainedDecoderState{return Object.freeze({generation:0,decoderSerial:0,decoder:null,configuration:false,pending:false,checkSerial:0,check:null,frameSerial:0,frames:Object.freeze([]),needsKey:false,draining:false,flushed:false,failed:false,blockedReceiveStreak:0,waitSerial:0,wait:null,stats:Object.freeze({submitted:0,received:0,delivered:0,closed:0,peakFrames:0,resets:0,blockedReceives:0,maxConsecutiveBlockedReceives:0,capacityResumes:0})});}
export function retainedDecoderCurrent(state:RetainedDecoderState,scope:RetainedDecoderScope):boolean{return state.generation===scope.generation&&state.decoder===scope.decoder;}
export function retireRetainedDecoder(state:RetainedDecoderState,clearConfiguration=false):Readonly<{state:RetainedDecoderState;close:readonly number[]}>{return Object.freeze({state:Object.freeze({...state,generation:state.generation+1,decoder:null,configuration:clearConfiguration?false:state.configuration,pending:clearConfiguration?false:state.pending,check:null,frames:Object.freeze([]),draining:false,flushed:false,failed:false,blockedReceiveStreak:0,wait:null}),close:state.frames});}
export function resetRetainedDecoder(state:RetainedDecoderState,generation:number):RetainedDecoderState{return state.generation===generation?Object.freeze({...state,stats:Object.freeze({...state.stats,resets:state.stats.resets+1})}):state;}
export function pendingRetainedConfiguration(state:RetainedDecoderState,generation:number):RetainedDecoderState{return state.generation===generation?Object.freeze({...state,pending:true}):state;}
export function checkRetainedConfiguration(state:RetainedDecoderState,generation:number):Readonly<{state:RetainedDecoderState;id:number|null}>{
 if(state.generation!==generation)return Object.freeze({state,id:null});const id=state.checkSerial+1;return Object.freeze({state:Object.freeze({...state,configuration:true,checkSerial:id,check:id}),id});
}
export function activateRetainedDecoder(state:RetainedDecoderState,generation:number,check?:number):Readonly<{state:RetainedDecoderState;scope:RetainedDecoderScope|null}>{
 if(state.generation!==generation||generation<1||generation>2147483647||!state.configuration||check!==undefined&&state.check!==check)return Object.freeze({state,scope:null});
 const decoder=state.decoderSerial+1,scope=Object.freeze({generation,decoder});return Object.freeze({state:Object.freeze({...state,decoderSerial:decoder,decoder,pending:false,check:null,needsKey:true}),scope});
}
export function retainedSourcePolicy(source:Readonly<{width:number;height:number;kind:number;profile:number;depth:number;inBandHEVC:boolean}>,maxPixels:number):Readonly<{pending:boolean;error:string|null}>{
 if(source.width<1||source.height<1||source.width>8192||source.height>8192||source.width*source.height>maxPixels)return Object.freeze({pending:false,error:'Retained source dimensions exceed the decoder limit'});
 if(source.kind===2&&source.inBandHEVC)return Object.freeze({pending:false,error:'Retained HEVC in-band configuration requires Software'});
 return Object.freeze({pending:source.kind===4&&(source.profile<0||!source.depth),error:null});
}
export function acceptRetainedDecoderFrame(state:RetainedDecoderState,scope:RetainedDecoderScope):Readonly<{state:RetainedDecoderState;id:number|null;overflow:boolean}>{
 const stats={...state.stats,received:state.stats.received+1};
 if(!retainedDecoderCurrent(state,scope))return Object.freeze({state:Object.freeze({...state,stats:Object.freeze(stats)}),id:null,overflow:false});
 if(state.frames.length>=32||state.frameSerial>=2147483647)return Object.freeze({state:Object.freeze({...state,failed:true,stats:Object.freeze(stats)}),id:null,overflow:true});
 const id=state.frameSerial+1;return Object.freeze({state:Object.freeze({...state,frameSerial:id,frames:Object.freeze([...state.frames,id]),stats:Object.freeze({...stats,peakFrames:Math.max(stats.peakFrames,state.frames.length+1)})}),id,overflow:false});
}
export function closeRetainedDecoderFrame(state:RetainedDecoderState):RetainedDecoderState{return Object.freeze({...state,stats:Object.freeze({...state.stats,closed:state.stats.closed+1})});}
export function failRetainedDecoder(state:RetainedDecoderState,scope:RetainedDecoderScope):RetainedDecoderState{return retainedDecoderCurrent(state,scope)?Object.freeze({...state,failed:true}):state;}
export function retainedPacketPolicy(state:RetainedDecoderState,input:Readonly<{queuedPackets:number;size:number;timestamp:number;duration:number}>):'again'|'submit'|'invalid'{
 if(input.queuedPackets+state.frames.length>=8)return 'again';
 return !input.size||!Number.isSafeInteger(input.timestamp)||!Number.isSafeInteger(input.duration)||input.duration<0?'invalid':'submit';
}
export function submittedRetainedPacket(state:RetainedDecoderState,scope:RetainedDecoderScope):RetainedDecoderState{return retainedDecoderCurrent(state,scope)?Object.freeze({...state,needsKey:false,stats:Object.freeze({...state.stats,submitted:state.stats.submitted+1})}):state;}
export function drainRetainedDecoder(state:RetainedDecoderState):Readonly<{state:RetainedDecoderState;scope:RetainedDecoderScope|null}>{
 if(state.decoder===null||state.draining)return Object.freeze({state,scope:null});
 return Object.freeze({state:Object.freeze({...state,draining:true}),scope:Object.freeze({generation:state.generation,decoder:state.decoder})});
}
export function flushedRetainedDecoder(state:RetainedDecoderState,scope:RetainedDecoderScope):RetainedDecoderState{return retainedDecoderCurrent(state,scope)?Object.freeze({...state,flushed:true}):state;}
export function releaseRetainedDecoderCapacity(state:RetainedDecoderState,id:number):RetainedDecoderState{return state.wait?.id===id?Object.freeze({...state,wait:null}):state;}
export function receiveRetainedDecoderFrame(state:RetainedDecoderState,queuedPackets:number,capacity:boolean):Readonly<{state:RetainedDecoderState;id:number|null;wait:number|null;resumed:boolean;result:number}>{
 if(state.wait)return Object.freeze({state,id:null,wait:state.wait.id,resumed:false,result:0});
 if(state.frames.length&&!capacity){const streak=state.blockedReceiveStreak+1,id=state.waitSerial+1;return Object.freeze({state:Object.freeze({...state,waitSerial:id,wait:Object.freeze({id,generation:state.generation}),blockedReceiveStreak:streak,stats:Object.freeze({...state.stats,blockedReceives:state.stats.blockedReceives+1,maxConsecutiveBlockedReceives:Math.max(state.stats.maxConsecutiveBlockedReceives,streak)})}),id:null,wait:id,resumed:false,result:0});}
 const resumed=state.blockedReceiveStreak>0,id=state.frames[0]??null,next=Object.freeze({...state,blockedReceiveStreak:0,frames:id===null?state.frames:Object.freeze(state.frames.slice(1))});
 return Object.freeze({state:next,id,wait:null,resumed,result:id!==null?1:state.draining?(state.flushed?-541478725:0):queuedPackets>=8?0:-6});
}
export function retainedOutputValid(input:Readonly<{width:number;height:number;timestamp:number;duration:number}>,maxPixels:number):boolean{return !(input.width<1||input.height<1||input.width>8192||input.height>8192||input.width*input.height>maxPixels||!Number.isSafeInteger(input.timestamp)||!Number.isSafeInteger(input.duration)||input.duration<0);}
export function deliveredRetainedFrame(state:RetainedDecoderState,scope:RetainedDecoderScope,resumed:boolean):RetainedDecoderState{return retainedDecoderCurrent(state,scope)?Object.freeze({...state,stats:Object.freeze({...state.stats,delivered:state.stats.delivered+1,capacityResumes:state.stats.capacityResumes+Number(resumed)})}):state;}
