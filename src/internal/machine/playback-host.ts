// SPDX-License-Identifier: Apache-2.0
export type PlaybackHostWork=Readonly<{id:number;epoch:number;cleanup:boolean}>;
export type PlaybackHostState=Readonly<{workSerial:number;queue:readonly PlaybackHostWork[];activeWork:PlaybackHostWork|null;phase:'active'|'closing'|'closed';epoch:number;creating:boolean;created:boolean;duration:number|null;seekPreroll:number;sourceFailed:boolean;renderWidth:number|null;renderHeight:number|null;draws:number;events:number;fatalCommandErrors:boolean;channels:number}>;
export function initialPlaybackHost(channels=2,fatalCommandErrors=true):PlaybackHostState{
 if(![2,6,8].includes(channels))throw Error('Invalid private audio channel count');
 return Object.freeze({workSerial:0,queue:Object.freeze([]),activeWork:null,phase:'active',epoch:0,creating:false,created:false,duration:null,seekPreroll:2,sourceFailed:false,renderWidth:null,renderHeight:null,draws:0,events:0,fatalCommandErrors,channels});
}
export function playbackHostCurrent(state:PlaybackHostState,epoch:number):boolean{return state.phase==='active'&&state.epoch===epoch;}
export function beginPlaybackHostCreate(state:PlaybackHostState,epoch:number):PlaybackHostState{
 if(!playbackHostCurrent(state,epoch))throw Error('Playback host closed or replaced');
 if(state.created||state.creating)throw Error('Playback host already created');
 return Object.freeze({...state,creating:true});
}
// Native success creates a cleanup obligation even when retirement happened while
// the native call was suspended. It never revives admission or output authority.
export function finishPlaybackHostCreate(state:PlaybackHostState,success:boolean):PlaybackHostState{return Object.freeze({...state,creating:false,created:state.created||success});}
export function playbackHostNativeDestroyed(state:PlaybackHostState):PlaybackHostState{return state.created?Object.freeze({...state,created:false}):state;}
export function resetPlaybackHostSource(state:PlaybackHostState):PlaybackHostState{
 if(state.phase!=='active')throw Error('Playback host closed');
 if(!Number.isSafeInteger(state.epoch+1))throw Error('Playback host identity exhausted');
 return Object.freeze({...state,epoch:state.epoch+1,queue:Object.freeze([]),duration:null,sourceFailed:false,draws:0,events:0,renderWidth:null,renderHeight:null});
}
export function setPlaybackHostPreroll(state:PlaybackHostState,duration:number):PlaybackHostState{return state.phase==='active'?Object.freeze({...state,seekPreroll:Number.isFinite(duration)&&duration>0?Math.min(60,duration):2}):state;}
export function playbackHostSeekPreroll(state:PlaybackHostState,position:number):number{return state.duration!==null&&state.duration>0&&state.duration<=60?Math.max(state.seekPreroll,Math.min(position+1,state.duration)):state.seekPreroll;}
export function observePlaybackHostEvent(state:PlaybackHostState,epoch:number,event:Readonly<{kind:string;name?:string;duration?:number;error?:string}>):Readonly<{state:PlaybackHostState;accepted:boolean;fatal:boolean;trim:boolean}>{
 if(!playbackHostCurrent(state,epoch))return Object.freeze({state,accepted:false,fatal:false,trim:false});
 const fatal=state.fatalCommandErrors&&event.kind==='command-reply'&&!!event.error&&event.error!=='success';
 if(fatal)return Object.freeze({state,accepted:false,fatal:true,trim:false});
 const duration=event.kind==='property-change'&&event.name==='duration'?(Number.isFinite(event.duration)?event.duration!:null):state.duration;
 return Object.freeze({state:Object.freeze({...state,duration,events:Math.min(256,state.events+1)}),accepted:true,fatal:false,trim:state.events===256});
}
export function playbackHostEventBudget():number{return 64;}
export function failPlaybackHostSource(state:PlaybackHostState,epoch:number):PlaybackHostState{return playbackHostCurrent(state,epoch)?Object.freeze({...state,sourceFailed:true}):state;}
export function beginPlaybackHostRender(state:PlaybackHostState,epoch:number,width:number,height:number,force:boolean):Readonly<{state:PlaybackHostState;accepted:boolean;force:boolean}>{
 if(!playbackHostCurrent(state,epoch))return Object.freeze({state,accepted:false,force:false});
 const resized=state.renderWidth!==width||state.renderHeight!==height;
 return Object.freeze({state:resized?Object.freeze({...state,renderWidth:width,renderHeight:height}):state,accepted:true,force:force||resized});
}
export function presentPlaybackHost(state:PlaybackHostState,epoch:number):PlaybackHostState{return playbackHostCurrent(state,epoch)?Object.freeze({...state,draws:Math.min(Number.MAX_SAFE_INTEGER,state.draws+1)}):state;}
export function closePlaybackHost(state:PlaybackHostState):PlaybackHostState{return state.phase==='active'?Object.freeze({...state,phase:'closing',queue:Object.freeze([])}):state;}
export function finishPlaybackHostClose(state:PlaybackHostState):PlaybackHostState{return state.phase==='closed'?state:Object.freeze({...state,phase:'closed',created:false,creating:false});}

export function playbackHostFailureCurrent(failureGeneration:number|undefined,generation:number|undefined):boolean{return failureGeneration===undefined||failureGeneration===generation;}

export function admitPlaybackHostWork(state:PlaybackHostState,cleanup=false):Readonly<{state:PlaybackHostState;work?:PlaybackHostWork;error?:string}>{
 if(cleanup?state.phase!=='closing'||state.queue.some(work=>work.cleanup)||state.activeWork?.cleanup:state.phase!=='active')return Object.freeze({state,error:'Playback host closed or replaced'});
 if(!cleanup&&state.queue.length+(state.activeWork?1:0)>=128)return Object.freeze({state,error:'Playback host queue capacity'});
 if(!cleanup&&!Number.isSafeInteger(state.workSerial+1))return Object.freeze({state,error:'Playback host work identity exhausted'});
 const work=Object.freeze({id:cleanup?0:state.workSerial+1,epoch:state.epoch,cleanup});
 return Object.freeze({state:Object.freeze({...state,workSerial:cleanup?state.workSerial:work.id,queue:Object.freeze([...state.queue,work])}),work});
}
export function startPlaybackHostWork(state:PlaybackHostState):Readonly<{state:PlaybackHostState;work?:PlaybackHostWork}>{
 if(state.activeWork||!state.queue.length)return Object.freeze({state});
 const work=state.queue[0];return Object.freeze({state:Object.freeze({...state,queue:Object.freeze(state.queue.slice(1)),activeWork:work}),work});
}
export function finishPlaybackHostWork(state:PlaybackHostState,id:number):PlaybackHostState{return state.activeWork?.id===id?Object.freeze({...state,activeWork:null}):state;}
