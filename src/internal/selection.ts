// SPDX-License-Identifier: Apache-2.0
import type {RemoteSource} from '../types.js';
import type {Probe} from './machine/media-facts.js';
import {nativeRejection as decideNativeRejection,nativeManifestRejection as decideManifestRejection} from './machine/source-policy.js';
export type {Probe,ProbeTrack} from './machine/media-facts.js';
export type {SelectionAttempt} from './machine/source-policy.js';
export {losslessAdaptationRejection,audioTranscodeRejection,remuxRejection} from './machine/source-policy.js';
export function nativeRejection(probe:Probe,settings:{aid:string;sid:string;subtitles:boolean},_video?:HTMLVideoElement){return decideNativeRejection(probe,settings);}
export function nativeManifestRejection(source:RemoteSource,settings:{aid:string;sid:string;subtitles:boolean},browserNativeHLS=false){return decideManifestRejection({demuxer:source.demuxer,format:source.format,streaming:source.streaming?{live:source.streaming.live,maxBandwidth:source.streaming.maxBandwidth,representation:source.streaming.representation}:undefined},settings,browserNativeHLS);}
