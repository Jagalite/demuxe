// SPDX-License-Identifier: Apache-2.0
import {compareProviderPreferences,type ProviderPreferencesData} from './provider-runtime.js';
export type NativeLoadRequest=Readonly<{id:number;epoch:number;kind:'load'}>;
export type NativeLoadPolicy=Readonly<{requested:boolean;original:boolean;remux:'auto'|'never'|'always';requiresRemux:boolean;adaptation:'flac'|'opus'|'flac24'|undefined}>;
type Work=Readonly<{request:NativeLoadRequest;kind:'source'|'audio-track';phase:'plan'|'services'|'rollback'|'resuming';policy:NativeLoadPolicy;position:number;paused:boolean;attemptedAdaptation:boolean}>;
export type NativeLoadState=Readonly<{work:Work|null;adapted:boolean;directFailure:string|undefined}>;
export function initialNativeLoad():NativeLoadState{return Object.freeze({work:null,adapted:false,directFailure:undefined});}
export function nativeLoadOpening(state:NativeLoadState):boolean{return state.work?.phase==='plan'||state.work?.phase==='rollback';}
export function nativeLoadCurrent(state:NativeLoadState,request:NativeLoadRequest):boolean{return state.work?.request.id===request.id&&state.work.request.epoch===request.epoch;}
export function beginNativeLoad(state:NativeLoadState,request:NativeLoadRequest,kind:Work['kind'],policy:NativeLoadPolicy,position:number,paused:boolean):NativeLoadState{return Object.freeze({...state,work:Object.freeze({request:Object.freeze({...request}),kind,phase:'plan',policy:Object.freeze({...policy}),position,paused,attemptedAdaptation:false})});}
export function retireNativeLoad(state:NativeLoadState):NativeLoadState{return state.work?Object.freeze({...state,work:null}):state;}
export function selectNativeLoadRoute(policy:NativeLoadPolicy):Readonly<{route?:'direct'|'remux';error?:string}>{
 if(policy.requested)return Object.freeze({route:policy.original?'direct':'remux'});
 if(policy.remux!=='always'&&!policy.requiresRemux)return Object.freeze({route:'direct'});
 if(policy.remux==='never')return Object.freeze({error:'Native direct cannot enforce these source permissions; enable native remux or choose Hybrid'});
 return Object.freeze({route:'remux'});
}
export function selectNativePreparation(facts:Readonly<{providerPreferences?:ProviderPreferencesData;runtime?:'pthread'|'jspi'|'asyncify';broadAvailable?:boolean;codecEngine:boolean;file:boolean;adaptation:'flac'|'opus'|'flac24'|undefined;selectiveAudio:boolean;embeddedSubtitles:boolean;externalSubtitles:boolean;prepareAudio:boolean}>):Readonly<{audio:boolean;mp4:boolean}>{return Object.freeze({audio:!facts.codecEngine&&facts.file&&facts.adaptation==='flac24'&&!facts.selectiveAudio&&!facts.embeddedSubtitles&&!facts.externalSubtitles&&facts.prepareAudio,mp4:facts.file&&!facts.adaptation&&!facts.selectiveAudio&&!preferBroadRemux(facts)});}
export type NativeLoadEvent=
 |Readonly<{type:'direct-failed';code:number|undefined;reason:string}>
 |Readonly<{type:'projection-failed';reason:string}>
 |Readonly<{type:'attempt';adapted:boolean}>
 |Readonly<{type:'attempt-failed';reason:string}>
 |Readonly<{type:'services'}>
 |Readonly<{type:'track-failed'}>
 |Readonly<{type:'track-settled'}>
 |Readonly<{type:'finish'}>;
export type NativeLoadDecision=Readonly<{state:NativeLoadState;accepted:boolean;fallback?:boolean;rollback?:boolean;resume?:boolean;position?:number}>;
export function transitionNativeLoad(state:NativeLoadState,request:NativeLoadRequest,event:NativeLoadEvent):NativeLoadDecision{
 const result=(next:NativeLoadState,extra:Omit<NativeLoadDecision,'state'|'accepted'>={},accepted=true)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...extra});
 if(!nativeLoadCurrent(state,request))return result(state,{},false);
 const work=state.work!;
 if(event.type==='finish')return result({...state,work:null});
 if(event.type==='direct-failed'){
  const fallback=!work.policy.requested&&work.policy.remux!=='never'&&[3,4].includes(event.code??0);
  return fallback?result({...state,directFailure:event.reason},{fallback}):result(state,{fallback});
 }
 if(event.type==='projection-failed')return result({...state,directFailure:event.reason});
 if(event.type==='attempt')return result({...state,adapted:event.adapted,work:Object.freeze({...work,attemptedAdaptation:work.attemptedAdaptation||event.adapted})});
 if(event.type==='attempt-failed')return result(state,{fallback:!work.policy.requested&&!!work.policy.adaptation&&!work.attemptedAdaptation&&event.reason.includes('Audio codec has no browser MP4 packet contract')});
 if(event.type==='services')return result({...state,work:Object.freeze({...work,phase:'services'})});
 if(event.type==='track-failed')return work.kind==='audio-track'&&work.phase==='plan'?result({...state,work:Object.freeze({...work,phase:'rollback'})},{rollback:true,position:work.position}):result(state,{rollback:false});
 if(work.kind!=='audio-track'||work.phase==='resuming')return result(state,{},false);
 return result({...state,work:Object.freeze({...work,phase:'resuming'})},{resume:!work.paused});
}

function preferBroadRemux(facts:{providerPreferences?:ProviderPreferencesData;runtime?:'pthread'|'jspi'|'asyncify';broadAvailable?:boolean}):boolean{
 if(!facts.broadAvailable||!facts.providerPreferences?.length)return false;
 const assignment=(providerId:string)=>[{providerId,requirements:[{capability:'media.prepare.file',version:1,profile:'packet-copy'} as const]}];
 const broad='ffmpeg-file-preparation'+(!facts.runtime||facts.runtime==='pthread'?'':'-'+facts.runtime);
 return compareProviderPreferences(assignment(broad),assignment('selected-mp4-view'),facts.providerPreferences)<0;
}
