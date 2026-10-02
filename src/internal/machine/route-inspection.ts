// SPDX-License-Identifier: Apache-2.0
import {copyData} from './data.js';
import type {Probe} from './media-facts.js';
import type {PlaybackSettings} from './settings.js';
export type InspectionSettings=Readonly<Pick<PlaybackSettings,'aid'|'sid'|'subtitles'>>;
export type PlaybackAssetFacts=Readonly<{codecProfile:'playback'|'playback-full';retainedDecoder:boolean;decoders:string[];filters?:string[];features?:string[];maxHeapBytes?:number}>;
export type InspectionState=Readonly<{
  sourceSerial:number;errorSerial:number;
  probe:Readonly<{source:number;probe:Probe;settings:InspectionSettings}>|null;
  fastSource:number|null;lossless:Readonly<{source:number;reason?:string}>|null;
  subtitleAssets:boolean;selectiveAssets:boolean;selectiveChecked:boolean;
  transcodeAssets:boolean;transcodeChecked:boolean;playbackAvailable:boolean;
  playbackAssets:PlaybackAssetFacts|undefined;playbackFailure:number|null;
}>;
export function initialInspection():InspectionState{return Object.freeze({sourceSerial:0,errorSerial:0,probe:null,fastSource:null,lossless:null,subtitleAssets:false,selectiveAssets:false,selectiveChecked:false,transcodeAssets:false,transcodeChecked:false,playbackAvailable:false,playbackAssets:undefined,playbackFailure:null});}
export type InspectionChange=
  |Readonly<{kind:'probe';value:InspectionState['probe']}>
  |Readonly<{kind:'fast';source:number|null}>
  |Readonly<{kind:'lossless';value:InspectionState['lossless']}>
  |Readonly<{kind:'assets';value:Partial<Pick<InspectionState,'subtitleAssets'|'selectiveAssets'|'selectiveChecked'|'transcodeAssets'|'transcodeChecked'|'playbackAvailable'|'playbackAssets'>>}>
  |Readonly<{kind:'failure';failed:boolean}>
  |Readonly<{kind:'restore';value:InspectionState}>
  |Readonly<{kind:'source.allocate'}>
  |Readonly<{kind:'reset';scope:'initial'|'fallback'|'assets'}>
  |Readonly<{kind:'clear'}>;
export function transitionInspection(state:InspectionState,change:InspectionChange):InspectionState{
  switch(change.kind){
    case 'source.allocate':return Object.freeze({...state,sourceSerial:state.sourceSerial+1});
    case 'probe':return Object.freeze({...state,probe:copyData(change.value)});
    case 'fast':return Object.freeze({...state,fastSource:change.source});
    case 'lossless':return Object.freeze({...state,lossless:copyData(change.value)});
    case 'assets':return Object.freeze({...state,...copyData(change.value)});
    case 'failure':return Object.freeze({...state,errorSerial:state.errorSerial+Number(change.failed),playbackFailure:change.failed?state.errorSerial+1:null});
    case 'restore':return Object.freeze({...copyData(change.value),sourceSerial:state.sourceSerial,errorSerial:state.errorSerial});
    case 'reset':{
      const cleared={subtitleAssets:false,selectiveAssets:false,selectiveChecked:false,transcodeAssets:false,transcodeChecked:false};
      return Object.freeze({...state,...cleared,...(change.scope==='assets'?{playbackAvailable:false,playbackAssets:undefined,playbackFailure:null}:{probe:null}),...(change.scope==='initial'?{fastSource:null,lossless:null,playbackFailure:null}:{})});
    }
    case 'clear':return Object.freeze({...initialInspection(),sourceSerial:state.sourceSerial,errorSerial:state.errorSerial});
  }
}
/** Decisions consume normalized source/configuration facts, never File or DOM handles. */
export function fastInspectionAllowed(facts:Readonly<{local:boolean;privateDemuxer:boolean;preserve:boolean;componentRepairRetry:boolean;textTracks:number;aid:string;sid:string;filename:string}>):boolean{
  return facts.local&&!facts.privateDemuxer&&(!facts.preserve||facts.componentRepairRetry)&&!facts.textTracks&&facts.aid==='auto'&&facts.sid==='auto'&&!/\.(?:ogg|oga|opus|ts|m2ts)$/i.test(facts.filename);
}
export function inspectionSelection(probe:Probe,facts:Readonly<{settings:InspectionSettings;preserve:boolean;mode:string;hasSource:boolean;textTracks:number;remuxTracks:boolean;publicAudio?:string;publicSubtitle?:string}>):InspectionSettings{
  const {settings,preserve,mode}=facts;
  let aid=preserve&&(mode==='native'||settings.aid==='no')?settings.aid:!facts.hasSource?settings.aid:'auto';
  let sid=facts.textTracks?'no':preserve&&(mode==='native'||settings.sid==='no')?settings.sid:'auto';
  if(preserve&&mode==='native'&&facts.remuxTracks&&!['auto','no'].includes(aid))aid=probe.tracks.find(t=>t.type==='audio'&&t.index===Number(aid)-1)?.id??aid;
  const audio=preserve?/^audio:stream:(\d+)$/.exec(facts.publicAudio??''):null;
  const subtitle=preserve?/^sub:stream:(\d+)$/.exec(facts.publicSubtitle??''):null;
  if(subtitle)sid=probe.tracks.find(t=>t.type==='sub'&&t.index===Number(subtitle[1]))?.id??'missing';
  if(audio)aid=probe.tracks.find(t=>t.type==='audio'&&t.index===Number(audio[1]))?.id??'missing';
  return Object.freeze({aid,sid,subtitles:settings.subtitles});
}
export function initialInspectionPolicy(facts:Readonly<{automatic:boolean;mode:string;privateRemux:boolean;provider:boolean;canInspect:boolean;quality:string;adaptive:boolean;inspected:boolean;start:number;videoFilters:string;audioFilters:string;toneMapping:string;localDemuxer?:string;remoteDemuxer?:string;remoteFormat?:string}>):Readonly<{privateForced:boolean;qualityForced:boolean;normal:boolean;manifest:boolean}>{
  const explicit=!facts.automatic&&facts.mode!=='native';
  return Object.freeze({privateForced:explicit&&facts.privateRemux&&(!facts.provider||facts.canInspect)&&(facts.mode==='software'||facts.mode==='hybrid'),qualityForced:explicit&&(!facts.provider||facts.canInspect)&&facts.mode==='software'&&(facts.quality!=='exact'||facts.adaptive)&&!facts.inspected,normal:!explicit&&facts.start===0&&(facts.privateRemux||!(facts.videoFilters||facts.audioFilters||facts.toneMapping!=='off')),manifest:!facts.privateRemux&&!!(facts.localDemuxer||facts.remoteDemuxer)||!!facts.remoteFormat&&facts.remoteFormat!=='file'});
}
export function optionalInspectionFallback(facts:Readonly<{privateRemux:boolean;policy:string;preserve:boolean;inspectOnly:boolean;remote:boolean;identity:boolean;aid:string;sid:string;provider:boolean;retired:boolean;assetFailure:boolean;terminalSource:boolean;rangeReturnedWhole:boolean;directAdmitted:boolean}>):boolean{
  return facts.privateRemux&&facts.policy==='auto'&&!facts.preserve&&!facts.inspectOnly&&facts.remote&&!facts.identity&&facts.aid==='auto'&&facts.sid==='auto'&&!facts.provider&&!facts.retired&&(facts.assetFailure&&!facts.terminalSource||facts.rangeReturnedWhole)&&facts.directAdmitted;
}
