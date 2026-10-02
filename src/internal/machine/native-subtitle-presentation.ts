// SPDX-License-Identifier: Apache-2.0
export type SubtitleScheduler='deadline'|'animated'|'fallback';
export type SubtitlePlaybackFacts=Readonly<{paused:boolean;ended:boolean;hidden:boolean}>;
export type SubtitleRender=Readonly<{id:number;revision:number;key:string;seconds:number;width:number;height:number;sourceWidth:number;sourceHeight:number;force:boolean}>;
export type SubtitlePresentationStats=Readonly<{position:number;renders:number;bitmapUpdates:number;bytes:number;peakBytes:number;discarded:number;stateUpdates:number;scheduler:string}>;
export type NativeSubtitlePresentation=Readonly<{serial:number;revision:number;timingEpoch:number;deadlineEpoch:number;mode:SubtitleScheduler;enabled:boolean;changing:boolean;frame:number|null;interval:number|null;pump:Readonly<{id:number;revision:number}>|null;render:SubtitleRender|null;last:string;lastRevision:number;stats:SubtitlePresentationStats}>;
export function initialNativeSubtitlePresentation():NativeSubtitlePresentation{return Object.freeze({serial:0,revision:0,timingEpoch:0,deadlineEpoch:-1,mode:'fallback',enabled:false,changing:false,frame:null,interval:null,pump:null,render:null,last:'',lastRevision:-1,stats:Object.freeze({position:-1,renders:0,bitmapUpdates:0,bytes:0,peakBytes:0,discarded:0,stateUpdates:0,scheduler:'frame'})});}
export type SubtitlePresentationChange=
 |Readonly<{kind:'mode';mode:unknown}>|Readonly<{kind:'enabled';value:boolean}>|Readonly<{kind:'changing';value:boolean;revise:boolean}>
 |Readonly<{kind:'invalidate'}>|Readonly<{kind:'timing';epoch:number}>|Readonly<{kind:'deadline';epoch:number}>
 |Readonly<{kind:'frame.request'}>|Readonly<{kind:'frame.take';id:number}>
 |Readonly<{kind:'interval';facts:SubtitlePlaybackFacts}>
 |Readonly<{kind:'pump.begin';facts:SubtitlePlaybackFacts}>|Readonly<{kind:'pump.finish';id:number}>|Readonly<{kind:'pump.accept';id:number;deadlineEpoch:number}>
 |Readonly<{kind:'render.begin';seconds:number;width:number;height:number;sourceWidth:number;sourceHeight:number}>
 |Readonly<{kind:'render.discard';id:number}>|Readonly<{kind:'render.accept';id:number;unchanged:boolean;size:number}>|Readonly<{kind:'render.finish';id:number}>
 |Readonly<{kind:'retire'}>;
export function subtitlePumpRunning(state:NativeSubtitlePresentation,facts:SubtitlePlaybackFacts):boolean{return state.mode!=='fallback'&&state.enabled&&!state.changing&&!facts.paused&&!facts.ended&&!facts.hidden;}
export function subtitleTickAllowed(state:NativeSubtitlePresentation,hidden:boolean):boolean{return state.enabled&&!state.changing&&!(state.mode==='deadline'&&hidden);}
export function subtitleRenderCurrent(state:NativeSubtitlePresentation,id:number):boolean{return state.render?.id===id&&state.enabled&&state.render.revision===state.revision;}
export function subtitlePumpCurrent(state:NativeSubtitlePresentation,id:number):boolean{return state.pump?.id===id&&state.pump.revision===state.revision;}
export function subtitleTimingStale(state:NativeSubtitlePresentation,revision:number,epoch:number,unstable:boolean):boolean{return !!unstable||revision!==state.revision||state.timingEpoch!==epoch&&((state.timingEpoch-epoch)>>>0)<0x80000000;}
export function subtitleFollowFrame(state:NativeSubtitlePresentation,paused:boolean,key:string):boolean{return state.mode!=='deadline'&&(!paused||state.render!==null||state.last!==key);}
export function subtitleRetryRender(state:NativeSubtitlePresentation,revision:number):boolean{return state.mode==='deadline'&&state.enabled&&revision!==state.revision;}
export function subtitleDeadlineActive(state:NativeSubtitlePresentation,epoch:number,facts:Readonly<{paused:boolean;hidden:boolean}>):boolean{return state.mode==='deadline'&&epoch===state.deadlineEpoch&&!facts.paused&&!facts.hidden;}
export function subtitleDeadlineDue(state:NativeSubtitlePresentation,epoch:number,facts:Readonly<{paused:boolean;hidden:boolean;seconds:number;target:number}>):'ignore'|'invalidate'|'pump'{return !subtitleDeadlineActive(state,epoch,facts)?'ignore':facts.seconds+.004>=facts.target?'invalidate':'pump';}
export function transitionSubtitlePresentation(state:NativeSubtitlePresentation,input:SubtitlePresentationChange):Readonly<{state:NativeSubtitlePresentation;accepted:boolean}>{
 const result=(next:NativeSubtitlePresentation,accepted=next!==state)=>Object.freeze({state:next,accepted});
 const patch=(value:Partial<NativeSubtitlePresentation>)=>result(Object.freeze({...state,...value}));
 switch(input.kind){
  case 'mode':{const mode=input.mode==='deadline'||input.mode==='animated'?input.mode:'fallback';return mode===state.mode?result(state):patch({mode,stats:Object.freeze({...state.stats,scheduler:mode==='fallback'?'frame':mode})});}
  case 'enabled':return patch({enabled:input.value});
  case 'changing':return patch({changing:input.value,revision:state.revision+(input.revise?1:0)});
  case 'invalidate':return patch({revision:state.revision+1,last:''});
  case 'timing':return patch({timingEpoch:input.epoch>>>0});
  case 'deadline':return patch({deadlineEpoch:input.epoch});
  case 'frame.request':return state.frame!==null?result(state):patch({serial:state.serial+1,frame:state.serial+1});
  case 'frame.take':return state.frame===input.id?patch({frame:null}):result(state);
  case 'interval':{const running=subtitlePumpRunning(state,input.facts);return running?(state.interval!==null?result(state):patch({serial:state.serial+1,interval:state.serial+1})):patch({interval:null,deadlineEpoch:-1});}
  case 'pump.begin':return state.pump!==null||!subtitlePumpRunning(state,input.facts)?result(state):patch({serial:state.serial+1,pump:Object.freeze({id:state.serial+1,revision:state.revision})});
  case 'pump.finish':return state.pump?.id===input.id?patch({pump:null}):result(state);
  case 'pump.accept':return !subtitlePumpCurrent(state,input.id)?result(state):patch({deadlineEpoch:input.deadlineEpoch,stats:Object.freeze({...state.stats,stateUpdates:state.stats.stateUpdates+1})});
  case 'render.begin':{const key=`${input.width}:${input.height}:${input.sourceWidth}:${input.sourceHeight}:${input.seconds}`;return !state.enabled||state.changing||state.render||state.last===key?result(state):patch({serial:state.serial+1,render:Object.freeze({id:state.serial+1,revision:state.revision,key,seconds:input.seconds,width:input.width,height:input.height,sourceWidth:input.sourceWidth,sourceHeight:input.sourceHeight,force:state.lastRevision!==state.revision})});}
  case 'render.discard':return state.render?.id===input.id?patch({stats:Object.freeze({...state.stats,discarded:state.stats.discarded+1})}):result(state);
  case 'render.accept':{const render=state.render;if(!render||!subtitleRenderCurrent(state,input.id))return result(state);return patch({lastRevision:render.revision,last:render.key,stats:Object.freeze({...state.stats,position:render.seconds,renders:state.stats.renders+1,...input.unchanged?{}:{bitmapUpdates:state.stats.bitmapUpdates+1,bytes:state.stats.bytes+input.size,peakBytes:Math.max(state.stats.peakBytes,input.size)}})});}
  case 'render.finish':return state.render?.id===input.id?patch({render:null}):result(state);
  case 'retire':return patch({revision:state.revision+1,frame:null,interval:null,pump:null,render:null});
 }
}
export type SubtitleLayoutFacts=Readonly<{left:number;top:number;width:number;height:number;parentLeft:number;parentTop:number;sourceWidth:number;sourceHeight:number}>;
export function subtitleLayout(facts:SubtitleLayoutFacts):Readonly<{left:number;top:number;width:number;height:number;renderWidth:number;renderHeight:number}>|null{
 const ratio=facts.sourceWidth/facts.sourceHeight;let width=facts.width,height=facts.height;
 if(Number.isFinite(ratio)){if(width/height>ratio)width=height*ratio;else height=width/ratio;}
 if(width<1||height<1)return null;
 const scale=Math.min(1,1920/width,1080/height);
 return Object.freeze({left:facts.left-facts.parentLeft+(facts.width-width)/2,top:facts.top-facts.parentTop+(facts.height-height)/2,width,height,renderWidth:Math.max(1,Math.round(width*scale)),renderHeight:Math.max(1,Math.round(height*scale))});
}
