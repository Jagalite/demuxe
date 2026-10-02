// SPDX-License-Identifier: Apache-2.0
import type {MediaInfo,MediaTrack,PlaybackMode} from '../../types.js';

export type MediaGeometryObservation = Readonly<{
  displayWidth:number|null;displayHeight:number|null;
  width:number|null;height:number|null;pixelAspectRatio:number|null;
  /** Present nonnumeric rotation suppresses the raw-track fallback in legacy code. */
  rotationPresent:boolean;rotation:number|null;
}>;
export type MediaVideoParamsObservation = MediaGeometryObservation & Readonly<{
  primaries:string|null;transfer:string|null;matrix:string|null;range:string|null;
}>;
export type MediaChapterObservation = Readonly<{index:number|null;time:number|null;title:string|null}>;
export type MediaTagObservation = Readonly<{key:string;value:string|null}>;
/** Detached observations only. Non-finite numeric rotation is retained to match
 * the existing projection; it must not be silently JSON-round-tripped as null. */
export type MediaObservation = Readonly<{
  mode:PlaybackMode;
  videoSurface:Readonly<{width:number|null;height:number|null}>|null;
  videoOutput:MediaVideoParamsObservation|null;
  videoInput:MediaVideoParamsObservation|null;
  selectedRawVideo:MediaGeometryObservation|null;
  chapters:readonly MediaChapterObservation[]|null;
  tags:readonly MediaTagObservation[]|null;
  chapterCoverage:'partial'|'complete';tagCoverage:'partial'|'complete';
  duration:number|null;
}>;

/** Pure projection; freeze only owned records, reusing fully frozen track DTOs.
 * The raw selected-video observation and public (policy-filtered) track list
 * remain distinct, as in the existing mediaInfo implementation. */
export function selectMediaInfo(observation:MediaObservation,tracks:readonly MediaTrack[],sourceId:number|null=null):MediaInfo {
  const list=tracks.map(track=>Object.isFrozen(track)&&Object.isFrozen(track.roles)?track:Object.freeze({...track,roles:Object.freeze([...track.roles])}));
  let width:number|null=null,height:number|null=null,rotation:number|null=null;
  if(observation.videoSurface){width=observation.videoSurface.width;height=observation.videoSurface.height;}
  else {
    const params=observation.mode==='hybrid'?null:observation.videoOutput??observation.videoInput;
    const raw=observation.selectedRawVideo;
    width=params?.displayWidth??null;height=params?.displayHeight??null;
    // A partial display-size pair falls back on both axes, matching legacy behavior.
    if(!width||!height){width=params?.width??raw?.width??null;height=params?.height??raw?.height??null;if(width)width*=params?.pixelAspectRatio??raw?.pixelAspectRatio??1;}
    rotation=params?.rotationPresent?params.rotation:raw?.rotation??null;
    if(width&&height){const angle=(rotation||0)*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));[width,height]=[width*cos+height*sin,width*sin+height*cos];}
  }
  const chapters=observation.chapters?.flatMap((chapter,index)=>chapter.time!==null&&Number.isFinite(chapter.time)&&chapter.time>=0?[{
    id:`${sourceId}:chapter:${chapter.index!==null&&Number.isSafeInteger(chapter.index)&&chapter.index>=0?chapter.index:index}`,
    title:chapter.title,start:chapter.time,end:null as number|null,
  }]:[]).sort((a,b)=>a.start-b.start)??null;
  if(chapters)for(let index=0;index<chapters.length;index++)chapters[index].end=chapters[index+1]?.start??observation.duration;
  const tags=observation.tags===null?null:Object.fromEntries(observation.tags.filter(tag=>tag.key.length<=256&&tag.value!==null&&tag.value.length<=4096).slice(0,128).map(tag=>[tag.key,tag.value as string]));
  const params=observation.videoInput;
  return Object.freeze({
    metadataCoverage:Object.freeze({chapters:chapters===null?'unknown':observation.chapterCoverage,tags:tags===null?'unknown':observation.tagCoverage}),
    videoTracks:Object.freeze(list.filter(track=>track.type==='video')),
    chapters:chapters===null?null:Object.freeze(chapters.map(chapter=>Object.freeze({...chapter}))),
    tags:tags===null?null:Object.freeze(tags),
    color:params?Object.freeze({primaries:params.primaries,transfer:params.transfer,matrix:params.matrix,range:params.range,reportedOnly:true as const}):null,
    displayWidth:width,displayHeight:height,aspectRatio:width&&height?width/height:null,rotation,
    video:list.find(track=>track.type==='video'&&track.selected)??null,
    audio:list.find(track=>track.type==='audio'&&track.selected)??null,
    subtitle:list.find(track=>track.type==='subtitle'&&track.selected)??null,
  });
}
