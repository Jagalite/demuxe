// SPDX-License-Identifier: Apache-2.0
import type {MediaTrack,PlaybackMode,PlayerState,TimeRange} from '../../types.js';
import {selectCapabilities,type CapabilityFacts} from './capabilities.js';
import {copyData} from './data.js';
import {selectMediaInfo,type MediaObservation} from './media-info.js';

/** Sampled data only. Null ranges mean unknown; [] means known empty.
 * Numeric time preserves the legacy projection's +Infinity behavior until an
 * explicit compatibility correction. No clock is read by this projection. */
export type PlaybackObservation=Readonly<{
  time:number; duration:number|null; nativeLive:boolean|null;
  eof:boolean; paused:boolean; pausedForCache:boolean; nativeWaiting:boolean;
  seekable:boolean|null;
  nativeSeekable:readonly TimeRange[]|null; nativeBuffered:readonly TimeRange[]|null;
  cacheSeekable:readonly TimeRange[]|null; cached:readonly TimeRange[]|null;
}>;
/** This is a projection input, not a second authoritative Player store. The
 * future composed transition will supply accepted control state and observations. */
export type PlayerProjectionInput=Readonly<{
  sourceId:number|null; sourcePresent:boolean; requestedLive:boolean;
  mode:PlaybackMode; automaticSelection:boolean;
  pause:boolean; subtitlesVisible:boolean; volumePercent:number; muted:boolean; playbackRate:number;
  pendingOperation:PlayerState['pendingOperation']; error:PlayerState['error'];
  observedPlaying:boolean; observedWaiting:boolean; busy:boolean; operationActive:boolean;
  observation:PlaybackObservation; media:MediaObservation; tracks:readonly MediaTrack[];
  timing:PlayerState['timing']; loop:PlayerState['loop']; playbackRange:PlayerState['playbackRange'];
  streaming:PlayerState['streaming']; audioOutputDevice:string; trackPolicy:PlayerState['trackPolicy'];
  capabilityFacts:Omit<CapabilityFacts,'mode'|'hasSession'|'automaticSelection'|'previousDuration'|'backendNativeLive'>;
}>;
export type PublicationEvent='statechange'|'sourcechange'|'durationchange'|'trackschange'|'capabilitieschange'|'volumechange'|'ratechange'|'timeupdate'|'play'|'playing'|'pause'|'waiting'|'ended';
export type PreviewProjection=Readonly<{playbackActive:boolean;suspended:boolean;duration:number|null;position:number}>;
export type PlayerProjection=Readonly<{
  state:PlayerState; changed:boolean; notifications:readonly PublicationEvent[];
  preview:PreviewProjection; enforceBoundary:boolean;
}>;
const different=(a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b);

/** Ordered names for a non-reentrant publication. Delivery, observer errors and
 * reconciliation after reentrant commands remain responsibilities of the shell. */
export function publicationEvents(previous:PlayerState|undefined,next:PlayerState,loopActive:boolean):readonly PublicationEvent[] {
  if(previous&&!different(previous,next))return Object.freeze([]);
  const events:PublicationEvent[]=['statechange'];
  if(!previous)return Object.freeze(events);
  for(const [event,a,b]of [
    ['sourcechange',previous.sourceId,next.sourceId],['durationchange',previous.duration,next.duration],
    ['trackschange',[previous.audioTracks,previous.subtitleTracks],[next.audioTracks,next.subtitleTracks]],
    ['capabilitieschange',previous.capabilities,next.capabilities],['volumechange',[previous.volume,previous.muted],[next.volume,next.muted]],
    ['ratechange',previous.playbackRate,next.playbackRate],['timeupdate',previous.currentTime,next.currentTime],
  ] as const)if(different(a,b))events.push(event);
  if(previous.playbackIntent!==next.playbackIntent&&next.playbackIntent==='play')events.push('play');
  if(previous.status!==next.status){
    const statusEvents:Partial<Record<PlayerState['status'],PublicationEvent>>={playing:'playing',paused:'pause',buffering:'waiting',ended:'ended'};
    const event=statusEvents[next.status];
    if(event&&!(event==='ended'&&loopActive))events.push(event);
  }
  return Object.freeze(events);
}

/** Inactive read-only candidate: no effects, subscriptions, clocks or resource
 * operations. Status, capabilities and event decisions share one input tuple. */
export function projectPlayer(previous:PlayerState|undefined,input:PlayerProjectionInput):PlayerProjection {
  const o=input.observation,hasSession=input.sourceId!==null;
  const list=hasSession?copyData(input.tracks):[];
  const live=o.nativeLive??input.requestedLive,duration=live?null:o.duration;
  const streamType=!input.sourcePresent?'unknown':live?'live':duration!==null?'vod':'unknown';
  const seekable=!hasSession?null:input.mode==='native'?o.nativeSeekable:live?o.cacheSeekable:o.seekable===false?[]:o.seekable===true&&duration!==null?[{start:0,end:duration}]:null;
  const audioTracks=list.filter(track=>track.type==='audio'),subtitleTracks=list.filter(track=>track.type==='subtitle');
  const capabilities=selectCapabilities({...input.capabilityFacts,mode:input.mode,hasSession,automaticSelection:input.automaticSelection,previousDuration:previous?.duration,backendNativeLive:o.nativeLive===true},seekable,audioTracks.length,subtitleTracks.length);
  const status=!hasSession?(input.error?'error':'idle'):input.error?'error':o.eof?'ended':input.pause||o.paused?'paused':input.observedWaiting||o.pausedForCache||o.nativeWaiting?'buffering':input.observedPlaying?'playing':'paused';
  const next:PlayerState={
    status,playbackIntent:input.pause?'pause':'play',pendingOperation:input.pendingOperation,sourceId:input.sourceId,
    currentTime:Math.max(0,o.time||0),duration,streamType,subtitlesVisible:input.subtitlesVisible,volume:input.volumePercent/100,muted:input.muted,playbackRate:input.playbackRate,
    activeMode:hasSession?input.mode:null,automaticSelection:input.automaticSelection,buffered:input.mode==='native'&&hasSession?o.nativeBuffered:null,seekable,
    cached:hasSession&&input.mode!=='native'?o.cached:null,
    timing:input.timing,loop:input.loop,playbackRange:input.playbackRange,streaming:input.streaming,audioOutputDevice:input.audioOutputDevice,trackPolicy:input.trackPolicy,
    audioTracks,subtitleTracks,mediaInfo:selectMediaInfo(input.media,list,input.sourceId),capabilities,error:input.error,
  };
  const changed=!previous||different(previous,next),state:PlayerState=previous&&!changed?previous:copyData(next);
  return Object.freeze({state,changed,notifications:changed?publicationEvents(previous,state,!!input.loop):Object.freeze([]),
    preview:Object.freeze({playbackActive:!input.pause,suspended:input.busy||input.operationActive||!input.pause&&(input.observedWaiting||o.pausedForCache||o.nativeWaiting),duration:hasSession&&!input.busy&&streamType==='vod'?duration:null,position:next.currentTime}),
    enforceBoundary:changed&&!!previous,
  });
}
