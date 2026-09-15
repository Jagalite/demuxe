import type {QualityPolicy, QualityState} from '../types.js';
import {PlayerError} from './errors.js';
export type NativeQuality = {source:number; available:boolean; request:number; requested:number; preparing:number; demuxed:number; presented:number; error:number; qualities:Array<{index:number;width:number;height:number;bitrate:number}>};
export type QualityDiagnostics = {quality?:NativeQuality;adaptation?:{policy?:{mode?:string;maxBandwidth?:number;maxWidth?:number;maxHeight?:number}}};
const key=(source:number,index:number)=>`source:${source}:quality:${index}`;
export function qualityState(source:number|null, backend?:object):QualityState {
 const data=backend as QualityDiagnostics|undefined,q=data?.quality;
 const unavailable:QualityState={available:false,qualities:[],policy:null,requestedId:null,preparingId:null,demuxedId:null,presentedId:null,transitionError:null};
 if(source===null||!q?.available)return unavailable;
 const qualities=q.qualities.map(r=>({id:key(source,r.index),width:r.width,height:r.height,bandwidth:r.bitrate}));
 const id=(index:number)=>q.qualities.some(r=>r.index===index)?key(source,index):null;
 const requestedId=id(q.requested<0?q.demuxed:q.requested),p=data?.adaptation?.policy;
 const policy:QualityPolicy|null=p?.mode==='auto'?{mode:'auto',...Object.fromEntries(['maxBandwidth','maxWidth','maxHeight'].flatMap(n=>{const v=p[n as keyof typeof p];return typeof v==='number'&&Number.isFinite(v)?[[n,v]]:[];}))}:requestedId?{mode:'manual',qualityId:requestedId}:null;
 return {available:true,qualities,policy,requestedId,preparingId:id(q.preparing),demuxedId:id(q.demuxed),presentedId:id(q.presented),transitionError:q.error?'Representation transition failed; current playback remains active':null};
}
export function checkedQualityPolicy(value:QualityPolicy):QualityPolicy {
 if(!value||typeof value!=='object')throw new PlayerError('INVALID_ARGUMENT','Invalid quality policy');
 if(value.mode==='manual'){
  if(typeof value.qualityId!=='string'||!value.qualityId)throw new PlayerError('INVALID_ARGUMENT','A source quality ID is required');
  return {mode:'manual',qualityId:value.qualityId};
 }
 if(value.mode!=='auto')throw new PlayerError('INVALID_ARGUMENT','Invalid quality policy');
 const result:{mode:'auto';maxBandwidth?:number;maxWidth?:number;maxHeight?:number}={mode:'auto'};
 for(const name of ['maxBandwidth','maxWidth','maxHeight'] as const){const v=value[name];if(v!==undefined){if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw new PlayerError('INVALID_ARGUMENT','Invalid quality ceiling');result[name]=v;}}
 return result;
}
export function qualityRequest(source:number,backend:object|undefined,policy:QualityPolicy){
 const p=checkedQualityPolicy(policy),state=qualityState(source,backend),q=(backend as QualityDiagnostics|undefined)?.quality;
 if(!state.available||!q)throw new PlayerError('UNSUPPORTED_FEATURE','Quality selection is unavailable for this source and playback route');
 if(p.mode==='manual'){
  const index=state.qualities.findIndex(r=>r.id===p.qualityId);
  if(index<0)throw new PlayerError('INVALID_ARGUMENT','Quality ID does not belong to the active source');
  return {source:q.source,policy:{mode:'manual'} as {mode:'manual'|'auto';maxBandwidth?:number;maxWidth?:number;maxHeight?:number},representation:q.qualities[index].index};
 }
 if(!state.qualities.some(r=>r.bandwidth<=(p.maxBandwidth??Infinity)&&r.width<=(p.maxWidth??Infinity)&&r.height<=(p.maxHeight??Infinity)))throw new PlayerError('INVALID_ARGUMENT','No quality meets the requested ceilings');
 return {source:q.source,policy:p,representation:undefined};
}
export type QualityRequest=ReturnType<typeof qualityRequest>;

export function initialQualityPolicy(value:unknown):{mode:'manual'}|Extract<QualityPolicy,{mode:'auto'}> {
 if(value&&typeof value==='object'&&'mode' in value&&value.mode==='manual'){
  if(Object.keys(value).some(k=>k!=='mode'))throw new PlayerError('INVALID_ARGUMENT','Initial manual quality starts conservatively; select a source quality after opening');
  return {mode:'manual'};
 }
 const checked=checkedQualityPolicy(value as QualityPolicy);
 if(checked.mode!=='auto')throw new PlayerError('INVALID_ARGUMENT','Invalid initial quality policy');
 return checked;
}

// Shared application return-to-live policy; this is not a latency measurement.
export const LIVE_TARGET_DELAY_SECONDS=6;
