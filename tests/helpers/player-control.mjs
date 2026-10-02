// SPDX-License-Identifier: Apache-2.0
// Projection fixtures supply physical backend handles separately. Advance the
// real control transition through acceptance instead of mutating its counters.
export function acceptSourceIdentity(player,serial,{timing}={}){
  while(player.sourceSerial<serial){
    const {id:attempt}=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:player.mode,preserve:false,planId:'fixture'});
    for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])player.dispatchControl({type,attempt});
    player.dispatchControl({type:'source.accept',attempt,operationEpoch:player.operationEpoch,settings:player.settings,planMatches:true,timing});
    player.dispatchControl({type:'source.finished',attempt});
  }
}

// Supply detached media observations through the real composed publication
// boundary for adapter fixtures that deliberately silence DOM publication.
export function publishControlSnapshot(player,{currentTime=0,duration=null,seekable=null,status='paused'}={}){
 const pause=status==='paused';player.dispatchControl({type:'settings.change',value:{pause}});
 const {settings,preferences,source}=player.control,mode=source.mode,sourceId=source.acceptedSession===null?null:source.serial;
 const input={sourceId,sourcePresent:sourceId!==null,requestedLive:false,mode,automaticSelection:source.automatic,pause,subtitlesVisible:settings.subtitles??true,volumePercent:settings.volume??100,muted:preferences.muted,playbackRate:settings.speed??1,pendingOperation:null,error:null,observedPlaying:status==='playing',observedWaiting:status==='buffering',busy:false,operationActive:false,
  observation:{time:currentTime,duration,nativeLive:false,eof:status==='ended',paused:pause,pausedForCache:false,nativeWaiting:false,seekable:true,nativeSeekable:seekable,nativeBuffered:null,cacheSeekable:seekable,cached:null},
  media:{mode,videoSurface:null,videoOutput:null,videoInput:null,selectedRawVideo:null,chapters:null,tags:null,chapterCoverage:'complete',tagCoverage:'complete',duration},tracks:[],
  timing:{subtitleDelay:preferences.subtitleDelay,audioDelay:preferences.audioDelay,effectiveSubtitleDelay:preferences.subtitleDelay,effectiveAudioDelay:preferences.audioDelay,subtitleStyle:preferences.subtitleStyle,styleScope:'plain-text'},loop:preferences.loopPolicy,playbackRange:preferences.playbackRange,streaming:null,audioOutputDevice:preferences.outputDeviceId,trackPolicy:{},
  capabilityFacts:{backendPlan:'direct',nativeASS:false,privateRemux:false,privateFull:false,providerRuntime:false,hybridAudioFilters:false,nativeRemux:'never',canInspectFFmpeg:false,remoteFormat:null,backendMpvSubtitles:false,backendSetQuality:false,backendSeekToLive:false,isolated:false,webCodecs:false,mediaSource:false,webAudio:false,bufferingBackend:'browser',bufferingControl:'hint'}};
 const id=player.dispatchControl({type:'publication.begin'}).id;
 player.dispatchControl({type:'publication.prepare',id,captureRevision:player.control.captureRevision,input});
 player.dispatchControl({type:'publication.commit',id,captureRevision:player.control.captureRevision,timestamps:[]});
}
