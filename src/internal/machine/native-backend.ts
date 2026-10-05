// SPDX-License-Identifier: Apache-2.0
import {initialNativeCaptions,queueNativeCaptionEffect,finishNativeCaptionEffect,beginNativeCaptionSelection,nativeCaptionCurrent,beginNativeCaption,acceptNativeCaption,finishNativeCaption,removeNativeCaption,retireNativeCaptions,updateNativeCaptionSelection,nativeCaptionRemaining,type NativeCaptionEffect,type NativeCaptions,type NativeCaptionRequest,type NativeCaptionKind} from './native-captions.js';
import {beginNativeEventWait,nativeEventWaitCurrent,nativeEventWaitDeadline,type NativeEventRequest,type NativeEventWait} from './native-wait.js';
import type {BufferingPolicy} from '../../types.js';
import {initialNativeControls,queueNativeSink,finishNativeSink,nativeControlCurrent,beginNativeActivation,nativeActivationRemaining,beginNativeControl,retireNativeControls,finishNativeControl,acceptNativeControl,type NativeControls,type NativeControlDomain,type NativeControlRequest,type NativeControlValue} from './native-controls.js';
import type {CapabilityEvidenceData} from './routing.js';
import {initialNativeLoad,beginNativeLoad,retireNativeLoad,transitionNativeLoad,type NativeLoadState,type NativeLoadRequest,type NativeLoadPolicy,type NativeLoadEvent} from './native-load.js';

type Expected=Readonly<{video:boolean;audio:boolean}>;
export type NativeRequest=Readonly<{id:number;epoch:number;kind:'verification'|'seek'|'load'}>|NativeControlRequest|NativeCaptionRequest|NativeEventRequest;
type Verification=Readonly<{
 request:NativeRequest;output:boolean;budget:number;expected:Expected|undefined;phase:'preflight'|'sampling'|'classifying'|'audio'|'complete';
 deadline:number;previouslyVerified:boolean;active:Expected;initialTime:number;initialFrames:number;initialAudioBytes:number|undefined;
 metadataPreparation:boolean;presented:boolean;selectiveAudio:boolean;
}>;
type Seek=Readonly<{
 request:NativeRequest;target:number;mediaTarget:number;correlated:boolean;deadline:number;accepted:boolean;completed:boolean;presented:boolean;retried:boolean;retryAt:number|undefined;
}>;
export type NativeBackendState=Readonly<{
 epoch:number;serial:number;stopped:boolean;expected:Expected|undefined;capability:CapabilityEvidenceData;
 verification:Verification|null;seek:Seek|null;seekPresentationRetries:number;load:NativeLoadState;controls:NativeControls;loadPlaybackSerial:number;waits:readonly NativeEventWait[];captions:NativeCaptions;
}>;
export function initialNativeBackend(buffering?:BufferingPolicy):NativeBackendState{return Object.freeze({epoch:0,serial:0,stopped:false,expected:undefined,capability:Object.freeze({}),verification:null,seek:null,seekPresentationRetries:0,load:initialNativeLoad(),controls:initialNativeControls(buffering),loadPlaybackSerial:0,waits:Object.freeze([]),captions:initialNativeCaptions()});}
export function nativeRequestCurrent(state:NativeBackendState,request:NativeRequest):boolean{return !state.stopped&&state.epoch===request.epoch&&(request.kind==='event'?nativeEventWaitCurrent(state.waits,request):request.kind==='caption'?nativeCaptionCurrent(state.captions,request):request.kind==='control'?nativeControlCurrent(state.controls,request):(request.kind==='verification'?state.verification:request.kind==='seek'?state.seek:state.load.work)?.request.id===request.id);}
export type NativeAudioFacts=Readonly<{decodedBytes:number|undefined;present:boolean|undefined;tracksPresent:boolean;enabledTrack:boolean}>;
export function nativeAudioEvidence(facts:NativeAudioFacts,advancing:boolean):Readonly<{adapter:string;ready:boolean;strength:'unknown'|'presence'|'decoded'}>{
 if(typeof facts.decodedBytes==='number')return Object.freeze({adapter:'decoded-byte-counter',ready:facts.decodedBytes>0,strength:facts.decodedBytes>0?'decoded':'unknown'});
 if(typeof facts.present==='boolean')return Object.freeze({adapter:'browser-audio-presence-and-clock',ready:facts.present&&advancing,strength:facts.present?'presence':'unknown'});
 return Object.freeze({adapter:facts.tracksPresent?'enabled-browser-audio-track-and-clock':'unobservable',ready:facts.enabledTrack&&advancing,strength:facts.enabledTrack?'presence':'unknown'});
}
export type NativeVerificationFacts=Readonly<{
 now:number;readyState:number;videoWidth:number;time:number;frames:number;decodedFrames:number|undefined;
 seeking:boolean;paused:boolean;ended:boolean;audio:NativeAudioFacts;
}>;
type SeekFacts=Readonly<{position:number;seeking:boolean}>;
export type NativeBackendCommand=
 |Readonly<{type:'source'}>|Readonly<{type:'stop'}>
 |Readonly<{type:'event.begin';event:string;now:number;loadBudget:number;prefetchAfterMs?:number}>
 |Readonly<{type:'event.deadline';request:NativeEventRequest;now:number}>
 |Readonly<{type:'event.prefetch';request:NativeEventRequest;now:number}>
 |Readonly<{type:'event.finish';request:NativeEventRequest}>
 |Readonly<{type:'caption.effect.begin'|'caption.effect.finished';request:NativeCaptionEffect}>
 |Readonly<{type:'caption.begin';kind:NativeCaptionKind;attachmentId?:string;now:number}>
 |Readonly<{type:'caption.accept';request:NativeCaptionRequest;publicId:string|null;select:boolean}>
 |Readonly<{type:'caption.finish'|'caption.remove';request:NativeCaptionRequest}>
 |Readonly<{type:'caption.deadline';request:NativeCaptionRequest;now:number}>
 |Readonly<{type:'caption.selection';request:NativeControlRequest;selected?:string;visible?:boolean}>
 |Readonly<{type:'control.begin';domain:NativeControlDomain;paused?:boolean}>
 |Readonly<{type:'control.value';request:NativeControlRequest;change:NativeControlValue}>
 |Readonly<{type:'control.finish';request:NativeControlRequest}>
 |Readonly<{type:'control.activation'|'control.deadline';request:NativeControlRequest;now:number}>
 |Readonly<{type:'control.sink.begin'|'control.sink.finished';request:NativeControlRequest}>
 |Readonly<{type:'load.begin';kind:'source'|'audio-track';policy:NativeLoadPolicy;position:number;paused:boolean}>
 |Readonly<{type:'load.event';request:NativeLoadRequest;event:NativeLoadEvent}>
 |Readonly<{type:'metadata';epoch:number}>|Readonly<{type:'api-hint';epoch:number;value:string}>
 |Readonly<{type:'verify.begin';output:boolean;budget:number;expected?:Expected}>
 |Readonly<{type:'verify.start';request:NativeRequest;now:number;time:number;frames:number;audioBytes:number|undefined;videoWidth:number;selectiveAudio:boolean;metadataPreparation:boolean;videoEnd?:number;audioEnd?:number;timelineBias:number}>
 |Readonly<{type:'verify.sample';request:NativeRequest;facts:NativeVerificationFacts}>
 |Readonly<{type:'verify.presented';request:NativeRequest}>
 |Readonly<{type:'verify.classify';request:NativeRequest}>
 |Readonly<{type:'verify.deadline';request:NativeRequest;now:number;readyState:number;videoWidth:number;audioBytes:number|undefined;hasAudio:boolean|undefined}>
 |Readonly<{type:'verify.audio';request:NativeRequest}>
 |Readonly<{type:'verify.finish';request:NativeRequest;failed:boolean}>
 |Readonly<{type:'seek.begin';target:number;mediaTarget:number;correlated:boolean;now:number}>
 |Readonly<{type:'seek.frame';request:NativeRequest;facts:SeekFacts;mediaTime:number;matches:boolean}>
 |Readonly<{type:'seek.seeked';request:NativeRequest;facts:SeekFacts;now:number}>
 |Readonly<{type:'seek.retry';request:NativeRequest;facts:SeekFacts;now:number;paused:boolean;buffered:boolean}>
 |Readonly<{type:'seek.completed';request:NativeRequest}>
 |Readonly<{type:'seek.deadline';request:NativeRequest;now:number}>
 |Readonly<{type:'seek.finish';request:NativeRequest}>;
export type NativeBackendDecision=Readonly<{
 state:NativeBackendState;accepted:boolean;request?:NativeRequest;retired?:NativeRequest;completed?:boolean;sample?:boolean;armFrame?:boolean;retry?:boolean;remaining?:number;
 prefetch?:boolean;eventTimeout?:Readonly<{event:string;loading:boolean;budget:number}>;captionStart?:NativeCaptionEffect;sinkStart?:NativeControlRequest;fallback?:boolean;rollback?:boolean;resume?:boolean;position?:number;
 failure?:'event-capacity'|'caption-capacity'|'identity-exhausted'|'missing-audio'|'missing-output'|'verification-timeout'|'seek-timeout'|'activation-timeout'|'caption-timeout';
}>;
function evidence(value:CapabilityEvidenceData):CapabilityEvidenceData{return Object.freeze({...value,...value.timing?{timing:Object.freeze({...value.timing})}:{},...value.audioObservation?{audioObservation:Object.freeze({...value.audioObservation})}:{}});}
export function transitionNativeBackend(state:NativeBackendState,command:NativeBackendCommand):NativeBackendDecision{
 const result=(next:NativeBackendState,extra:Omit<NativeBackendDecision,'state'|'accepted'>={},accepted=true)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...extra});
 if(command.type==='caption.effect.finished'){const ids=state.captions.queued.filter(request=>nativeRequestCurrent(state,request)).map(request=>request.id),effect=finishNativeCaptionEffect(state.captions,command.request,ids);return effect.state===state.captions?result(state,{},false):result({...state,captions:effect.state},{captionStart:effect.start});}
 if(command.type==='control.sink.finished'){const sink=finishNativeSink(state.controls,command.request);return sink.accepted?result({...state,controls:sink.state},{sinkStart:sink.start}):result(state,{},false);}
 if(command.type==='stop')return state.stopped?result(state,{},false):result({...state,epoch:state.epoch+1,stopped:true,verification:null,seek:null,load:retireNativeLoad(state.load),controls:retireNativeControls(state.controls),captions:retireNativeCaptions(state.captions),waits:Object.freeze([])});
 if(state.stopped)return result(state,{},false);
 if(command.type==='source')return result({...state,epoch:state.epoch+1,expected:undefined,capability:Object.freeze({}),verification:null,seek:null,load:retireNativeLoad(state.load),controls:retireNativeControls(state.controls),captions:retireNativeCaptions(state.captions),waits:Object.freeze([])});
 if(command.type==='metadata'||command.type==='api-hint')return command.epoch!==state.epoch?result(state,{},false):result({...state,capability:evidence({...state.capability,...command.type==='metadata'?{metadata:true}:{apiHint:command.value}})});
 if(['event.begin','caption.begin','control.begin','load.begin','verify.begin','seek.begin'].includes(command.type)&&!Number.isSafeInteger(state.serial+1))return result(state,{failure:'identity-exhausted'},false);
 if(command.type==='event.begin'&&state.waits.length>=128)return result(state,{failure:'event-capacity'},false);
 if(command.type==='caption.begin'&&state.captions.attachments.length>=16)return result(state,{failure:'caption-capacity'},false);
 if(command.type==='event.begin'){const request=Object.freeze({id:state.serial+1,epoch:state.epoch,kind:'event' as const});return result({...state,serial:request.id,waits:Object.freeze([...state.waits,beginNativeEventWait(request,command.event,command.now,command.loadBudget,command.prefetchAfterMs)])},{request});}
 if(command.type==='caption.begin'){const request=Object.freeze({id:state.serial+1,epoch:state.epoch,kind:'caption' as const});return result({...state,serial:request.id,captions:beginNativeCaption(state.captions,request,command.kind,command.attachmentId,command.now)},{request});}
 if(command.type==='control.begin'){const request=Object.freeze({id:state.serial+1,epoch:state.epoch,kind:'control' as const,domain:command.domain});return result({...state,serial:request.id,controls:beginNativeControl(state.controls,request,command.paused),captions:command.domain==='subtitles'?beginNativeCaptionSelection(state.captions,request.id):state.captions},{request});}
 if(command.type==='load.begin'){
  const source=command.kind==='source',epoch=state.epoch+(source?1:0),request=Object.freeze({id:state.serial+1,epoch,kind:'load' as const});
  return result({...state,serial:request.id,epoch,...source?{expected:undefined,capability:Object.freeze({})}:{},verification:null,seek:null,load:beginNativeLoad(state.load,request,command.kind,command.policy,command.position,command.paused),loadPlaybackSerial:state.controls.playbackSerial,controls:source?retireNativeControls(state.controls):state.controls,captions:source?retireNativeCaptions(state.captions):state.captions,waits:source?Object.freeze([]):state.waits},{request,retired:state.load.work?.request});
 }
 if(command.type==='verify.begin'){
  const request=Object.freeze({id:state.serial+1,epoch:state.epoch,kind:'verification' as const});
  const verification=Object.freeze({request,output:command.output,budget:command.budget,expected:command.expected?Object.freeze({...command.expected}):undefined,phase:'preflight' as const,deadline:0,previouslyVerified:false,active:Object.freeze({video:false,audio:false}),initialTime:0,initialFrames:0,initialAudioBytes:undefined,metadataPreparation:false,presented:false,selectiveAudio:false});
  return result({...state,serial:request.id,verification},{request,retired:state.verification?.request});
 }
 if(command.type==='seek.begin'){
  const request=Object.freeze({id:state.serial+1,epoch:state.epoch,kind:'seek' as const});
  const seek=Object.freeze({request,target:command.target,mediaTarget:command.mediaTarget,correlated:command.correlated,deadline:command.now+10000,accepted:false,completed:false,presented:false,retried:false,retryAt:undefined});
  return result({...state,serial:request.id,seek},{request,retired:state.seek?.request});
 }
 if(!nativeRequestCurrent(state,command.request)||(command.type.startsWith('verify.')&&command.request.kind!=='verification')||(command.type.startsWith('seek.')&&command.request.kind!=='seek'))return result(state,{},false);
 if(command.type==='event.prefetch'){const wait=state.waits.find(value=>value.request.id===command.request.id);if(!wait||wait.prefetched||wait.prefetchDeadline===undefined)return result(state,{},false);if(command.now<wait.prefetchDeadline)return result(state,{remaining:wait.prefetchDeadline-command.now});return result({...state,waits:Object.freeze(state.waits.map(value=>value===wait?Object.freeze({...wait,prefetched:true}):value))},{prefetch:true});}
 if(command.type==='event.finish')return result({...state,waits:Object.freeze(state.waits.filter(wait=>wait.request.id!==command.request.id))});
 if(command.type==='event.deadline'){const wait=nativeEventWaitDeadline(state.waits,command.request,command.now);return !wait?result(state,{},false):result(state,wait.remaining!==undefined?{remaining:wait.remaining}:{eventTimeout:{event:wait.event!,loading:wait.loading!,budget:wait.budget!}});}
 if(command.type==='caption.effect.begin'){if(command.request.kind==='control'&&command.request.domain!=='subtitles')return result(state,{},false);const ids=state.captions.queued.filter(request=>nativeRequestCurrent(state,request)).map(request=>request.id),effect=queueNativeCaptionEffect(state.captions,command.request,ids);return effect.state===state.captions?result(state,{},false):result({...state,captions:effect.state},{captionStart:effect.start});}
 if(command.type==='caption.selection'){if(command.request.domain!=='subtitles'&&command.request.domain!=='subtitle-visibility')return result(state,{},false);return result({...state,captions:updateNativeCaptionSelection(state.captions,{selected:command.selected,visible:command.visible})});}
 if(command.type==='caption.deadline'){const remaining=nativeCaptionRemaining(state.captions,command.request,command.now);return remaining===undefined?result(state,{},false):result(state,remaining>0?{remaining}:{failure:'caption-timeout'});}
 if(command.type==='caption.accept'||command.type==='caption.finish'||command.type==='caption.remove'){const captions=command.type==='caption.accept'?acceptNativeCaption(state.captions,command.request,command.publicId,command.select):command.type==='caption.remove'?removeNativeCaption(state.captions,command.request):finishNativeCaption(state.captions,command.request);return captions===state.captions?result(state,{},false):result({...state,captions});}
 if(command.type==='control.sink.begin'){const sink=queueNativeSink(state.controls,command.request);return sink.accepted?result({...state,controls:sink.state},{sinkStart:sink.start}):result(state,{},false);}
 if(command.type==='control.activation')return result({...state,controls:beginNativeActivation(state.controls,command.request,command.now)});
 if(command.type==='control.deadline'){const remaining=nativeActivationRemaining(state.controls,command.request,command.now);return remaining===undefined?result(state,{},false):result(state,remaining>0?{remaining}:{failure:'activation-timeout'});}
 if(command.type==='control.value'||command.type==='control.finish'){const controls=command.type==='control.finish'?finishNativeControl(state.controls,command.request):acceptNativeControl(state.controls,command.request,command.change);return controls===state.controls?result(state,{},false):result({...state,controls});}
 if(command.type==='load.event'){const decision=transitionNativeLoad(state.load,command.request,command.event);if(!decision.accepted)return result(state,{},false);return result({...state,load:decision.state},{fallback:decision.fallback,rollback:decision.rollback,resume:decision.resume&&(state.loadPlaybackSerial===state.controls.playbackSerial||!state.controls.paused),position:decision.position},decision.accepted);}
 if(command.type.startsWith('verify.')){
  const verification=state.verification!;
  if(command.type==='verify.finish')return result({...state,verification:null,capability:command.failed&&verification.output?evidence({...state.capability,outputVerified:false}):state.capability});
  if(command.type==='verify.start'){
   if(verification.phase!=='preflight')return result(state,{},false);
   const expected=verification.expected??state.expected,selected=command.selectiveAudio?{video:true,audio:false}:expected,previouslyVerified=state.capability.outputVerified===true,position=command.time-command.timelineBias;
   const active=Object.freeze({video:(selected?.video??command.videoWidth>0)&&!(verification.output&&previouslyVerified&&command.videoEnd!==undefined&&command.videoEnd>=0&&position>=command.videoEnd-.01),audio:(selected?.audio??false)&&!(verification.output&&previouslyVerified&&command.audioEnd!==undefined&&command.audioEnd>=0&&position>=command.audioEnd-.01)});
   const capability=evidence({...state.capability,...verification.output?{completedAtEOF:false,outputVerified:false,videoPresented:false,playbackReady:false,audioProgress:false,audioEvidenceStrength:'unknown' as const,audioDecoded:false}:{},timing:{...state.capability.timing,[verification.output?'outputRequested':'preparationRequested']:command.now}});
   return result({...state,expected,capability,verification:Object.freeze({...verification,phase:'sampling',deadline:command.now+(verification.output?verification.budget:10000),previouslyVerified,active,initialTime:command.time,initialFrames:command.frames,initialAudioBytes:command.audioBytes,metadataPreparation:command.metadataPreparation,selectiveAudio:command.selectiveAudio})});
  }
  if(command.type==='verify.audio')return verification.phase!=='audio'?result(state,{},false):result({...state,capability:evidence({...state.capability,audioProgress:true,audioEvidence:'mpv-pcm-worklet-consumption',audioEvidenceStrength:'consumed',audioDecoded:true})},{completed:true});
  if(command.type==='verify.classify')return verification.phase!=='sampling'?result(state,{},false):result({...state,verification:Object.freeze({...verification,phase:'classifying'})});
  if(command.type==='verify.deadline'){
   if(verification.phase==='preflight'||verification.phase==='audio'||verification.phase==='complete')return result(state,{},false);
   if(command.now<verification.deadline)return result(state,{remaining:verification.deadline-command.now});
   const missing=command.readyState>=3&&((verification.active.video&&!command.videoWidth)||(verification.output&&verification.active.audio&&(command.audioBytes===0||command.hasAudio===false)));
   // Fast recovery deadlines are not enough evidence to reject a codec.
   return result(state,{failure:missing&&(!verification.output||verification.budget>=10000)?'missing-output':'verification-timeout'});
  }
  if(verification.phase!=='sampling')return result(state,{},false);
  if(command.type==='verify.presented')return result({...state,verification:Object.freeze({...verification,presented:true})},{sample:true});
  if(command.type!=='verify.sample')return result(state,{},false);
  const facts=command.facts,timing={...state.capability.timing};
  let capability:CapabilityEvidenceData={...state.capability,metadata:facts.readyState>=1};
  if(capability.metadata)timing.metadata??=facts.now;
  if(facts.frames>0||(facts.decodedFrames??0)>0)capability={...capability,decoderOutput:true};
  const update=(extra:Omit<NativeBackendDecision,'state'|'accepted'>={},next=verification)=>result({...state,capability:evidence({...capability,timing}),verification:next},extra);
  if(verification.output&&verification.previouslyVerified&&facts.ended){capability={...capability,completedAtEOF:true,outputVerified:true};timing.outputAccepted=facts.now;return update({completed:true},Object.freeze({...verification,phase:verification.selectiveAudio?'audio':'complete'}));}
  const ready=facts.readyState>=(!verification.output&&verification.metadataPreparation?1:3)&&!facts.seeking&&(!verification.active.video||facts.videoWidth>0);
  if(!ready)return update();
  if(verification.active.audio)capability={...capability,audioObservation:{initialBytes:verification.initialAudioBytes,decodedBytes:facts.audio.decodedBytes,delta:typeof verification.initialAudioBytes==='number'&&typeof facts.audio.decodedBytes==='number'?facts.audio.decodedBytes-verification.initialAudioBytes:undefined,present:facts.audio.present,enabledTrack:facts.audio.tracksPresent?facts.audio.enabledTrack:undefined,clockAdvanced:facts.time>verification.initialTime+.02}};
  if(verification.active.audio&&facts.readyState>=3&&facts.audio.present===false)return update({failure:'missing-audio'});
  capability={...capability,prepared:true};timing.ready??=facts.now;
  if(!verification.output)return update({completed:true},Object.freeze({...verification,phase:'complete'}));
  const advancing=(!facts.paused||facts.ended)&&facts.time>verification.initialTime+(facts.ended?0:.02);
  if(verification.presented||facts.frames>verification.initialFrames){capability={...capability,videoPresented:true};timing.firstFrame??=facts.now;}
  const audio=nativeAudioEvidence(facts.audio,advancing),audioReady=!verification.active.audio||audio.ready;
  if(verification.active.audio)capability={...capability,audioEvidenceStrength:audio.strength,audioEvidence:audio.adapter,audioDecoded:audio.strength==='decoded',audioProgress:audioReady&&advancing};
  if(advancing&&(!verification.active.video||capability.videoPresented)&&audioReady){capability={...capability,playbackReady:true,outputVerified:true};timing.outputAccepted=facts.now;return update({completed:true},Object.freeze({...verification,phase:verification.selectiveAudio?'audio':'complete'}));}
  return update();
 }
 const seek=state.seek!,atTarget=(command.type==='seek.frame'||command.type==='seek.seeked'||command.type==='seek.retry')&&!command.facts.seeking&&Math.abs(command.facts.position-seek.mediaTarget)<.001;
 if(command.type==='seek.finish')return result({...state,seek:null});
 if(command.type==='seek.deadline')return command.now<seek.deadline?result(state,{remaining:seek.deadline-command.now}):result(state,{failure:'seek-timeout'});
 if(command.type==='seek.completed')return result({...state,seek:Object.freeze({...seek,completed:true})},{completed:seek.accepted});
 if(command.type==='seek.frame'){
  const presented=seek.presented||(seek.correlated&&command.matches&&Math.abs(command.facts.position-seek.mediaTarget)<.001),accepted=atTarget&&(seek.correlated?presented:command.mediaTime<=seek.mediaTarget+.001);
  return result({...state,seek:Object.freeze({...seek,presented,accepted:seek.accepted||accepted})},{completed:accepted&&seek.completed,armFrame:!accepted});
 }
 if(command.type==='seek.seeked'){
  if(seek.correlated&&seek.presented&&atTarget)return result({...state,seek:Object.freeze({...seek,accepted:true})},{completed:seek.completed});
  if(!seek.presented&&atTarget&&!seek.retried&&seek.retryAt===undefined)return result({...state,seek:Object.freeze({...seek,retryAt:command.now+100})},{remaining:100});
  return result(state);
 }
 if(command.type==='seek.retry'){
  if(seek.retryAt===undefined)return result(state,{},false);
  if(command.now<seek.retryAt)return result(state,{remaining:seek.retryAt-command.now});
  const retry=!seek.presented&&atTarget&&command.paused&&command.buffered;
  return result({...state,seek:Object.freeze({...seek,retryAt:undefined,retried:seek.retried||retry}),seekPresentationRetries:state.seekPresentationRetries+(retry?1:0)},{retry});
 }
 return result(state,{},false);
}
