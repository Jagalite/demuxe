// SPDX-License-Identifier: Apache-2.0
import type {MediaInfo, MediaTrack, TimeRange, PlaybackMode} from '../types.js';
export function freeze<T>(value: T): T {
  if(value && typeof value==='object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}
export function ranges(value: unknown): readonly TimeRange[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.map(r=>({start:Number(r.start),end:Number(r.end)}));
  return out.every(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.start>=0&&r.end>=r.start)?out:null;
}
/** Packet caches can include negative preroll PTS before the public timeline. */
export function cachedRanges(value:unknown):readonly TimeRange[]|null {
  if(!Array.isArray(value))return null;
  const out=value.map(r=>({start:Number(r?.start),end:Number(r?.end)}));
  if(!out.every(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>=r.start))return null;
  return out.filter(r=>r.end>0).map(r=>({start:Math.max(0,r.start),end:r.end}));
}
export type RawTrack = Record<string, any>;
export function usesRemuxTracks(plan?: string): boolean {return plan==='remux'||plan==='remux-mpv'||!!plan?.startsWith('native-video-mpv-audio')||plan==='adapted-flac'||plan==='adapted-opus';}
export function trackKey(track: RawTrack, mode: PlaybackMode, plan?: string): string {
  const type = track.type;
  if(plan==='shaka-mse')return `${type}:shaka:${track.id}`;
  // ff-index belongs to each demuxer: separate subtitle files commonly all use 0.
  // Attachments are replayed in the same order on replacement, retaining mpv IDs.
  if(track.external)return `${type}:external:${track['external-index']??track.id}`;
  const index = Number.isInteger(track['ff-index']) ? track['ff-index'] : mode==='native'&&usesRemuxTracks(plan)&&type==='audio'?Number(track.id)-1:undefined;
  return index!==undefined?`${type}:stream:${index}`:`${type}:${mode==='native'?'native':'mpv'}:${track.id}`;
}
const languageNames = new Intl.DisplayNames(['en'], {type:'language'});
function trackLabel(track:RawTrack):string {
  const title=typeof track.title==='string'?track.title.trim():'';
  const language=typeof track.lang==='string'?track.lang.trim():'';
  let name='';
  if(language&&!['und','unknown','zxx'].includes(language.toLowerCase())) {
    try{name=languageNames.of(language.replaceAll('_','-'))??language;}catch{name=language;}
  }
  const parts:string[]=[];
  // Keep authored titles, but do not let a codec-only title hide the language.
  if(name&&!title.toLowerCase().includes(name.toLowerCase()))parts.push(name);
  if(title)parts.push(title);
  const codec=typeof track.codec==='string'?track.codec.trim().toUpperCase():'';
  if(codec&&!title.toUpperCase().includes(codec))parts.push(codec);
  const channels=Number(track['demux-channel-count']??track.channels);
  if(track.type==='audio'&&Number.isInteger(channels)&&channels>0&&!/\b\d+\.\d+\b|\b(?:mono|stereo|surround|\d+\s*ch(?:annels?)?)\b/i.test(title))parts.push(channels===1?'Mono':channels===2?'Stereo':`${channels} channels`);
  if(!parts.length)parts.push(`${track.type==='sub'?'Subtitle':track.type==='audio'?'Audio':'Video'} ${track.id}`);
  if(track.default===true)parts.push('File default');
  if(track.forced===true)parts.push('Forced');
  return parts.join(' · ');
}
export function tracks(raw: RawTrack[], sourceId: number, mode: PlaybackMode, plan?: string): MediaTrack[] {
  const result:MediaTrack[]=raw.filter(t=>['audio','sub','video'].includes(t.type)).map(t=>({id:`${sourceId}:${trackKey(t,mode,plan)}`,type:t.type==='sub'?'subtitle':t.type,
    label:trackLabel(t), language:t.lang?String(t.lang):null,
    codec:t.codec?String(t.codec):null, selected:!!t.selected,external:!!t.external,title:t.title?String(t.title):null,streamIndex:Number.isInteger(t['ff-index'])?t['ff-index']:mode==='native'&&usesRemuxTracks(plan)&&t.type==='audio'&&!t.external?Number(t.id)-1:null,default:!!t.default,forced:!!t.forced,channels:Number(t['demux-channel-count']??t.channels)>0?Number(t['demux-channel-count']??t.channels):null}));
  const counts=new Map<string,number>();
  for(const track of result){const key=`${track.type}:${track.label}`;counts.set(key,(counts.get(key)??0)+1);}
  const ordinals=new Map<string,number>();
  return result.map(track=>{const n=(ordinals.get(track.type)??0)+1;ordinals.set(track.type,n);return counts.get(`${track.type}:${track.label}`)!>1?{...track,label:`${track.label} · Track ${n}`}:track;});
}
const positive=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
export function mediaInfo(properties: ReadonlyMap<string,unknown>, mode: PlaybackMode, surface: HTMLCanvasElement|HTMLVideoElement|undefined, list: MediaTrack[]): MediaInfo {
  const raw=(properties.get('track-list') as RawTrack[]|undefined)?.find(t=>t.type==='video'&&t.selected);
  let width:number|null=null,height:number|null=null,rotation:number|null=null;
  if(surface?.tagName==='VIDEO') {width=positive((surface as HTMLVideoElement).videoWidth);height=positive((surface as HTMLVideoElement).videoHeight);}
  else {
    const p=(mode==='hybrid'?undefined:properties.get('video-out-params')||properties.get('video-params')) as RawTrack|undefined;
    width=positive(p?.dw);height=positive(p?.dh);
    if(!width||!height){width=positive(p?.w)||positive(raw?.['demux-w']);height=positive(p?.h)||positive(raw?.['demux-h']);if(width)width*=positive(p?.par)||positive(raw?.['demux-par'])||1;}
    const angle=p?.rotate??raw?.['demux-rotation']; rotation=typeof angle==='number'?angle:null;
    if(width&&height){const a=(rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));[width,height]=[width*c+height*s,width*s+height*c];}
  }
  return {displayWidth:width,displayHeight:height,aspectRatio:width&&height?width/height:null,rotation,
    video:list.find(t=>t.type==='video'&&t.selected)??null,audio:list.find(t=>t.type==='audio'&&t.selected)??null,subtitle:list.find(t=>t.type==='subtitle'&&t.selected)??null};
}
