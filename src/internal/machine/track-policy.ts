// SPDX-License-Identifier: Apache-2.0
import type {TrackMatch,TrackTypePolicy} from '../../types.js';
/** Language aliases are normalized by the Intl adapter before admission. */
export type PolicyTrack=Readonly<{id:string;language:string|null;title:string|null;codec:string|null;streamIndex:number|null;default:boolean;selected:boolean}>;
export function matchesPolicyTrack(track:PolicyTrack,match:TrackMatch):boolean{
  return (match.language===undefined||!!track.language&&track.language===match.language)&&
    (match.title===undefined||track.title?.toLowerCase()===match.title.trim().toLowerCase())&&
    (match.codec===undefined||track.codec?.toLowerCase()===match.codec.trim().toLowerCase())&&
    (match.streamIndex===undefined||track.streamIndex===match.streamIndex);
}
export function policyTrackAllowed(track:PolicyTrack,policy?:TrackTypePolicy):boolean{return policy?.allowed===undefined||policy.allowed.some(match=>matchesPolicyTrack(track,match));}
export function preferredTrackIndex(list:readonly PolicyTrack[],policy?:TrackTypePolicy):Readonly<{index:number;rejection?:string}>{
  if(policy?.default==='off')return Object.freeze({index:-1});
  const allowed=list.flatMap((track,index)=>policyTrackAllowed(track,policy)?[index]:[]),preference=policy?.default;
  if(preference&&preference!=='file')for(const match of Array.isArray(preference)?preference:[preference]){
    const found=allowed.find(index=>matchesPolicyTrack(list[index],match as TrackMatch));if(found!==undefined)return Object.freeze({index:found});
  }
  const index=allowed.find(index=>list[index].default)??allowed.find(index=>list[index].selected)??allowed[0]??-1;
  return Object.freeze({index,...(index<0&&policy?.allowOff===false?{rejection:'Track policy requires a matching track, but none is available'}:{})});
}
export function trackSelectionRejection(policy:TrackTypePolicy|undefined,id:string|null,track?:PolicyTrack):string|undefined{
  if(policy?.locked)return 'Track selection is locked by the host';
  if(id===null&&policy?.allowOff===false)return 'Turning this track off is not allowed';
  if(id==='auto'&&policy?.allowAuto===false)return 'Automatic track selection is not allowed';
  if(track&&!policyTrackAllowed(track,policy))return 'This track is not allowed by the host';
}
