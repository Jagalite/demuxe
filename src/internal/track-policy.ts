// SPDX-License-Identifier: Apache-2.0
import type {MediaTrack,TrackMatch,TrackPolicy,TrackTypePolicy} from '../types.js';
import {matchesPolicyTrack,policyTrackAllowed,preferredTrackIndex,trackSelectionRejection,type PolicyTrack} from './machine/track-policy.js';
import {PlayerError} from './errors.js';
import {freeze} from './state.js';
const invalid=(message:string):never=>{throw new PlayerError('INVALID_ARGUMENT',`Track policy: ${message}`);};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function matcher(value:unknown):TrackMatch {
  if(!object(value)||!Object.keys(value).length||Object.keys(value).some(k=>!['language','title','codec','streamIndex'].includes(k)))return invalid('expected a nonempty track matcher');
  for(const [key,v] of Object.entries(value)){
    if(key==='streamIndex'){if(!Number.isInteger(v)||Number(v)<0)invalid('streamIndex must be a nonnegative integer');}
    else if(typeof v!=='string'||!v.trim()||v.length>256)invalid(`${key} must be a nonempty string up to 256 characters`);
    if(key==='language')try{new Intl.Locale(v as string);}catch{invalid('invalid language tag');}
  }
  return {...value} as TrackMatch;
}
export function normalizeTrackPolicy(value:unknown={}):TrackPolicy {
  if(!object(value)||Object.keys(value).some(k=>!['audio','subtitles'].includes(k)))return invalid('expected audio/subtitles policies');
  const result:Record<string,TrackTypePolicy>={};
  for(const key of ['audio','subtitles']){
    const rule=value[key];if(rule===undefined)continue;
    if(!object(rule)||Object.keys(rule).some(k=>!['default','allowed','allowOff','allowAuto','locked'].includes(k)))return invalid(`invalid ${key} policy`);
    const copy:Record<string,unknown>={};
    for(const k of ['allowOff','allowAuto','locked'])if(rule[k]!==undefined){if(typeof rule[k]!=='boolean')invalid(`${k} must be boolean`);copy[k]=rule[k];}
    if(rule.allowed!==undefined){if(!Array.isArray(rule.allowed)||rule.allowed.length>128)invalid('allowed must be an array of at most 128 matchers');copy.allowed=(rule.allowed as unknown[]).map(matcher);}
    const d=rule.default;
    if(d!==undefined)copy.default=d==='file'||d==='off'?d:Array.isArray(d)?(d.length&&d.length<=128?d.map(matcher):invalid('default preferences must contain 1–128 matchers')):matcher(d);
    if(copy.default==='off'&&copy.allowOff===false)invalid('default off conflicts with allowOff false');
    result[key]=copy;
  }
  return freeze(result);
}
const names=new Intl.DisplayNames(['en'],{type:'language'});
function language(value:string):string {
  try{return (names.of(new Intl.Locale(value.replaceAll('_','-')).language)??value).toLowerCase();}catch{return value.toLowerCase();}
}
/** Host language canonicalization is observation capture; matching and policy
 * choices are deterministic over the resulting detached scalar records. */
export function capturePolicyTrack(track:MediaTrack):PolicyTrack{return {id:track.id,language:track.language?language(track.language):null,title:track.title??null,codec:track.codec??null,streamIndex:track.streamIndex??null,default:!!track.default,selected:!!track.selected};}
function captureMatch(match:TrackMatch):TrackMatch{return {...match,...(match.language!==undefined?{language:language(match.language)}:{})};}
export function captureTrackPolicy(policy:TrackTypePolicy|undefined):TrackTypePolicy|undefined{
  if(!policy)return;
  const preference=policy.default;
  return {...policy,...(policy.allowed?{allowed:policy.allowed.map(captureMatch)}:{}),...(preference&&preference!=='file'&&preference!=='off'?{default:Array.isArray(preference)?preference.map(captureMatch):captureMatch(preference as TrackMatch)}:{})};
}
export function matchesTrack(track:MediaTrack,match:TrackMatch):boolean{return matchesPolicyTrack(capturePolicyTrack(track),captureMatch(match));}
export function trackAllowed(track:MediaTrack,policy?:TrackTypePolicy):boolean{return policyTrackAllowed(capturePolicyTrack(track),captureTrackPolicy(policy));}
export function defaultTrack(list:readonly MediaTrack[],policy?:TrackTypePolicy):MediaTrack|null {
  const decision=preferredTrackIndex(list.map(capturePolicyTrack),captureTrackPolicy(policy));
  if(decision.rejection)throw new PlayerError('UNSUPPORTED_FEATURE',decision.rejection);
  return list[decision.index]??null;
}
export function assertTrackSelection(policy:TrackTypePolicy|undefined,id:string|null,track?:MediaTrack):void {
  const rejection=trackSelectionRejection(captureTrackPolicy(policy),id,track?capturePolicyTrack(track):undefined);
  if(rejection)throw new PlayerError('UNSUPPORTED_FEATURE',rejection);
}
