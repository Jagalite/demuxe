// SPDX-License-Identifier: Apache-2.0
import type {planAdmission} from './playback-plans.js';
import type {BrowserMediaCapability,DecodingEvidence} from './media-facts.js';
import {copyData} from './data.js';
export type RoutePlan=ReturnType<typeof planAdmission>[number]&{browserCapability?:BrowserMediaCapability};
export function routeCapabilityFamily(id:string):'selective'|'direct'|'flac'|'opus'|'remux'{return id.startsWith('native-video-mpv-audio')?'selective':id.startsWith('native-direct')?'direct':id.startsWith('native-flac')||id.startsWith('native-transcode')?'flac':id.startsWith('native-opus')?'opus':'remux';}
export function attachRouteDecoding(plans:readonly RoutePlan[],id:string,evidence:DecodingEvidence|undefined):readonly RoutePlan[]{return Object.freeze(plans.map(plan=>plan.browserCapability&&routeCapabilityFamily(plan.id)===routeCapabilityFamily(id)?copyData({...plan,browserCapability:{...plan.browserCapability,decodingInfo:evidence}}):plan));}
export type RouteAdmissionFacts=Readonly<{
  inspected:boolean;hybridRejection?:string;capabilities?:Readonly<{direct:BrowserMediaCapability;remux:BrowserMediaCapability;flac:BrowserMediaCapability;opus:BrowserMediaCapability;selective:BrowserMediaCapability}>;
  audioTrackCount:number;audioOff:boolean;selectedAudioKey?:string;defaultAudioKey?:string;failedPlans:readonly string[];
  timingControls:boolean;audioContextSinkUnavailable:boolean;
}>;
/** Applies semantic exclusions to the finite registry. Browser support answers
 * are observations; neither eligibility nor advisory decoding predicts output. */
export function refineRouteAdmission(plans:readonly RoutePlan[],facts:RouteAdmissionFacts):readonly RoutePlan[]{
  return Object.freeze(plans.map(original=>{
    let plan:RoutePlan={...original};
    const reject=(code:NonNullable<RoutePlan['code']>,reason:string|undefined)=>{plan={...plan,eligible:false,code,reason};};
    if(facts.inspected){
      if(plan.mode==='hybrid'&&plan.eligible&&facts.hybridRejection)reject('FEATURE_UNSUPPORTED',facts.hybridRejection);
      if(plan.id.startsWith('native-')){
        const capability=facts.capabilities![routeCapabilityFamily(plan.id)];
        plan={...plan,browserCapability:capability};
        if(plan.eligible&&plan.id.startsWith('native-direct')&&facts.audioTrackCount>1&&!facts.audioOff&&capability.status!=='supported')reject('SOURCE_UNSUPPORTED','Multiple audio streams require controlled selection when browser support is inconclusive');
        if(plan.eligible&&capability.status==='unsupported')reject('FEATURE_UNSUPPORTED',capability.reason);
      }
    }else if(plan.id.startsWith('native-'))plan={...plan,browserCapability:{status:'unknown',api:plan.id.startsWith('native-direct')?'canPlayType':'isTypeSupported',tracks:[],queries:[],reason:'Source track inspection is unavailable; codec support has not been established'}};
    if(facts.selectedAudioKey?.startsWith('audio:stream:')&&facts.selectedAudioKey!==facts.defaultAudioKey&&plan.id.startsWith('native-direct')&&plan.eligible)reject('SOURCE_UNSUPPORTED','Original Native has no proven source-stream identity selection contract for the requested alternate audio');
    if(plan.eligible&&facts.failedPlans.includes(plan.id))reject('QUALIFICATION_REQUIRED','This execution plan already failed for the current streaming source');
    if(facts.timingControls&&plan.mode==='native')reject('FEATURE_UNSUPPORTED','Requested timing/style controls require the mpv playback clock');
    if(facts.audioContextSinkUnavailable&&plan.eligible&&(plan.mode!=='native'||plan.id.startsWith('native-video-mpv-audio')||plan.id.endsWith('-gain')))reject('FEATURE_UNSUPPORTED','The requested output device requires AudioContext sink selection on this route');
    return copyData(plan);
  }));
}
export function applyDeploymentRejections(plans:readonly RoutePlan[],rejections:Readonly<Record<string,string|undefined>>):readonly RoutePlan[]{return Object.freeze(plans.map(plan=>plan.eligible&&rejections[plan.id]?copyData({...plan,eligible:false,code:'DEPLOYMENT_UNAVAILABLE' as const,reason:rejections[plan.id]}):plan));}
