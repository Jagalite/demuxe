// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captureMediaObservation} from '../../web/generated/internal/effects/media-observations.js';
import {selectMediaInfo} from '../../web/generated/internal/machine/media-info.js';
import {mediaInfo as legacyMediaInfo} from '../../web/generated/internal/state.js';

const track=(patch={})=>({id:'7:video:stream:0',type:'video',label:'Video',language:null,codec:'h264',selected:true,external:false,title:null,streamIndex:0,default:false,forced:false,channels:null,sampleRate:null,channelLayout:null,frameRate:24,bitDepth:8,profile:null,roles:[],attachedPicture:false,...patch});
const project=(properties=new Map(),mode='native',surface,tracks=[],sourceId=7)=>selectMediaInfo(captureMediaObservation(properties,mode,surface),tracks,sourceId);
const video=(width,height)=>({tagName:'VIDEO',videoWidth:width,videoHeight:height});

test('empty observations preserve unknown metadata and null selected tracks',()=>{
  assert.deepEqual(project(),{metadataCoverage:{chapters:'unknown',tags:'unknown'},videoTracks:[],chapters:null,tags:null,color:null,displayWidth:null,displayHeight:null,aspectRatio:null,rotation:null,video:null,audio:null,subtitle:null});
});
test('pure selection accepts detached data without a property map or surface',()=>{
  const observation=Object.freeze({mode:'software',videoSurface:null,videoOutput:null,videoInput:null,selectedRawVideo:Object.freeze({displayWidth:null,displayHeight:null,width:640,height:480,pixelAspectRatio:1,rotationPresent:false,rotation:null}),chapters:Object.freeze([Object.freeze({index:null,time:0,title:'Start'})]),tags:Object.freeze([Object.freeze({key:'title',value:'Movie'})]),chapterCoverage:'complete',tagCoverage:'complete',duration:12});
  const selected=track(),input=[selected],result=selectMediaInfo(observation,input,9);
  assert.equal(result.displayWidth,640);assert.equal(result.displayHeight,480);assert.equal(result.aspectRatio,4/3);
  assert.deepEqual(result.chapters,[{id:'9:chapter:0',title:'Start',start:0,end:12}]);assert.deepEqual(result.tags,{title:'Movie'});
  assert.deepEqual(selectMediaInfo(observation,input,9),result);assert.equal(Object.isFrozen(input),false);assert.equal(Object.isFrozen(selected),false);
});
test('video surfaces supply geometry independently of selected raw tracks and mode',()=>{
  const selected=track(),properties=new Map([['track-list',[{type:'video',selected:true,'demux-w':400,'demux-h':300,'demux-rotation':90}]]]);
  for(const mode of ['native','hybrid','software']){
    const result=project(properties,mode,video(1280,720),[selected]);
    assert.equal(result.displayWidth,1280);assert.equal(result.displayHeight,720);assert.equal(result.aspectRatio,16/9);assert.equal(result.rotation,null);
    assert.deepEqual(result.video,selected);
  }
});
test('hybrid uses raw selected-video geometry while public selection remains independent',()=>{
  const selected=track({id:'7:video:stream:2'}),unselected=track({id:'7:video:stream:1',selected:false});
  const properties=new Map([['track-list',[{type:'video',selected:true,'demux-w':640,'demux-h':360,'demux-par':2,'demux-rotation':0}]],['video-out-params',{dw:100,dh:50}],['video-params',{w:200,h:100,primaries:'bt.709',gamma:'bt.1886'}]]);
  const result=project(properties,'hybrid',{tagName:'CANVAS',width:13,height:17},[unselected,selected]);
  assert.equal(result.displayWidth,1280);assert.equal(result.displayHeight,360);assert.equal(result.aspectRatio,32/9);
  assert.deepEqual(result.video,selected);assert.deepEqual(result.videoTracks,[unselected,selected]);
  assert.deepEqual(result.color,{primaries:'bt.709',transfer:'bt.1886',matrix:null,range:null,reportedOnly:true});
});
test('partial display dimensions fall back on both axes and apply pixel aspect ratio',()=>{
  const properties=new Map([['video-out-params',{dw:800,w:720,h:480,par:2}],['video-params',{dw:1920,dh:1080}],['track-list',[{type:'video',selected:true,'demux-w':1024,'demux-h':576}]]]);
  const result=project(properties,'software');assert.equal(result.displayWidth,1440);assert.equal(result.displayHeight,480);assert.equal(result.aspectRatio,3);
});
test('empty output params win over decoded params and use raw fallback',()=>{
  const properties=new Map([['video-out-params',{}],['video-params',{dw:1920,dh:1080}],['track-list',[{type:'video',selected:true,'demux-w':320,'demux-h':240}]]]);
  const result=project(properties,'software');assert.equal(result.displayWidth,320);assert.equal(result.displayHeight,240);
});
test('rotation preserves present nonnumeric suppression and numeric legacy quirks',()=>{
  const raw={type:'video',selected:true,'demux-w':640,'demux-h':360,'demux-rotation':90};
  const properties=new Map([['track-list',[raw]],['video-out-params',{rotate:'90'}]]);
  let result=project(properties,'software');assert.equal(result.rotation,null);assert.equal(result.displayWidth,640);assert.equal(result.displayHeight,360);
  properties.set('video-out-params',{rotate:null});result=project(properties,'software');assert.equal(result.rotation,90);assert.ok(Math.abs(result.displayWidth-360)<1e-9);assert.ok(Math.abs(result.displayHeight-640)<1e-9);
  properties.set('video-out-params',{rotate:NaN});result=project(properties,'software');assert.ok(Number.isNaN(result.rotation));assert.equal(result.displayWidth,640);
  properties.set('video-out-params',{rotate:Infinity});result=project(properties,'software');assert.equal(result.rotation,Infinity);assert.ok(Number.isNaN(result.displayWidth));assert.equal(result.aspectRatio,null);
});
test('chapters retain original fallback ordinals, stable ties, coverage and short duration tails',()=>{
  const properties=new Map([['chapter-list',[{time:8,index:3,title:'Tail'},{time:-1,title:'Invalid'},{time:2,title:'Intro'},{time:2,index:5,title:42},{time:NaN}]],['chapter-coverage','partial'],['duration',5],['metadata',{}]]);
  const result=project(properties,'native',undefined,[],42);
  assert.deepEqual(result.chapters,[{id:'42:chapter:2',title:'Intro',start:2,end:2},{id:'42:chapter:5',title:null,start:2,end:8},{id:'42:chapter:3',title:'Tail',start:8,end:5}]);
  assert.deepEqual(result.metadataCoverage,{chapters:'partial',tags:'complete'});assert.deepEqual(result.tags,{});
});
test('tag normalization retains limits and array-shaped metadata semantics',()=>{
  const metadata={ignored:12,['k'.repeat(257)]:'long key',long:'v'.repeat(4097),...Object.fromEntries(Array.from({length:130},(_,index)=>['key'+index,'value'+index]))};
  const properties=new Map([['metadata',metadata],['tag-coverage','partial']]),observation=captureMediaObservation(properties,'native'),result=selectMediaInfo(observation,[],7);
  assert.equal(observation.tags.length,128);assert.deepEqual(observation.tags[0],{key:'key0',value:'value0'});assert.deepEqual(observation.tags[127],{key:'key127',value:'value127'});
  assert.ok(observation.tags.every(tag=>tag.key.length<=256&&typeof tag.value==='string'&&tag.value.length<=4096));
  assert.ok(!observation.tags.some(tag=>['ignored','long','key128','key129'].includes(tag.key)));
  assert.deepEqual(captureMediaObservation(new Map([['metadata',{}]]),'native').tags,[]);assert.equal(captureMediaObservation(new Map(),'native').tags,null);
  assert.equal(Object.keys(result.tags).length,128);assert.equal(result.tags.key127,'value127');assert.equal(result.tags.key128,undefined);assert.equal(result.metadataCoverage.tags,'partial');
  assert.deepEqual(project(new Map([['metadata',['one',null,'three']]])).tags,{'0':'one','2':'three'});
});
test('capture and projection detach mutable records without freezing the caller',()=>{
  const raw={type:'video',selected:true,'demux-w':640,'demux-h':360},params={w:800,h:600,primaries:'bt.709'},chapter={time:2,title:'Chapter'},metadata={title:'Movie'},surface=video(1280,720),publicTrack=track({roles:['main']});
  const properties=new Map([['track-list',[raw]],['video-params',params],['chapter-list',[chapter]],['metadata',metadata],['duration',10]]);
  const observation=captureMediaObservation(properties,'native',surface),result=selectMediaInfo(observation,[publicTrack],7);
  raw['demux-w']=1;params.primaries='changed';chapter.title='changed';metadata.title='changed';surface.videoWidth=1;properties.set('duration',1);publicTrack.roles.push('changed');publicTrack.label='changed';
  assert.equal(result.displayWidth,1280);assert.equal(result.color.primaries,'bt.709');assert.equal(result.chapters[0].title,'Chapter');assert.equal(result.chapters[0].end,10);assert.equal(result.tags.title,'Movie');assert.deepEqual(result.video.roles,['main']);assert.equal(result.video.label,'Video');
  assert.equal(observation.selectedRawVideo.width,640);assert.equal(observation.videoInput.primaries,'bt.709');assert.equal(observation.duration,10);
  for(const original of [raw,params,chapter,metadata,surface,publicTrack,publicTrack.roles])assert.equal(Object.isFrozen(original),false);
  for(const owned of [observation,observation.videoSurface,observation.videoInput,observation.selectedRawVideo,observation.chapters,observation.chapters[0],observation.tags,observation.tags[0],result,result.videoTracks,result.video,result.video.roles,result.chapters,result.chapters[0],result.tags,result.color,result.metadataCoverage])assert.equal(Object.isFrozen(owned),true);
  assert.notEqual(result.video,publicTrack);assert.equal(result.video,result.videoTracks[0]);
  assert.throws(()=>{result.tags.title='mutate';},TypeError);
});
test('immutable tracks preserve shared identity while shallowly frozen tracks detach roles',()=>{
  const immutable=Object.freeze(track({roles:Object.freeze(['main'])})),observation=captureMediaObservation(new Map(),'native');
  const result=selectMediaInfo(observation,[immutable],7);assert.equal(result.video,immutable);assert.equal(result.videoTracks[0],immutable);
  const roles=['main'],shallow=Object.freeze(track({roles})),detached=selectMediaInfo(observation,[shallow],7);
  assert.notEqual(detached.video,shallow);assert.notEqual(detached.video.roles,roles);roles.push('later');assert.deepEqual(detached.video.roles,['main']);assert.equal(Object.isFrozen(roles),false);
});

// These fixtures compare values with the unchanged legacy projector. Independent
// expectations above keep agreement between two implementations from being the oracle.
const fixtures=[
  {name:'absent metadata',properties:[]},
  {name:'known empty metadata',properties:[['chapter-list',[]],['metadata',{}],['video-params',{}]]},
  {name:'decoded display geometry',properties:[['video-params',{dw:1920,dh:1080,rotate:90,primaries:'bt.2020',gamma:'pq',colormatrix:'bt.2020-ncl',colorlevels:'limited'}]]},
  {name:'coded geometry and raw fallback',properties:[['video-out-params',{w:720,par:1.5}],['track-list',[{type:'video',selected:true,'demux-w':640,'demux-h':480,'demux-rotation':-90}]]]},
  {name:'numeric filtering',properties:[['video-params',{w:'640',h:0,par:Infinity}],['track-list',[{type:'video',selected:true,'demux-w':320,'demux-h':240,'demux-par':2}]],['duration',0],['chapter-list',[{time:0},{time:3,index:1.5},{time:'4'}]]]},
  {name:'chapters and tags',properties:[['chapter-list',[{time:9,index:2},{time:1,title:'First'},null,{time:1,index:8}]],['duration',8],['metadata',{title:'A',count:1}],['chapter-coverage','partial'],['tag-coverage','partial']]},
  {name:'nonnumeric rotation',properties:[['video-out-params',{rotate:'bad'}],['track-list',[{type:'video',selected:true,'demux-w':320,'demux-h':240,'demux-rotation':90}]]]},
  {name:'nonfinite rotation',properties:[['video-params',{w:320,h:240,rotate:Infinity}]]},
  {name:'raw selected video differs from public video',properties:[['track-list',[{type:'video',selected:false,'demux-w':10,'demux-h':10},{type:'video',selected:true,'demux-w':320,'demux-h':240}]]]},
];
for(const fixture of fixtures)for(const mode of ['native','hybrid','software'])for(const surface of [undefined,video(640,360),video(0,0),{tagName:'CANVAS',width:10,height:10}])test(`legacy media projection: ${fixture.name}, ${mode}, ${surface?.tagName??'no surface'} ${surface?.videoWidth??''}`,()=>{
  const properties=new Map(fixture.properties),list=[track(),track({id:'7:audio:stream:1',type:'audio',label:'Audio',roles:['main']}),track({id:'7:sub:stream:2',type:'subtitle',label:'Subtitles'})];
  const observation=captureMediaObservation(properties,mode,surface);
  const actual=selectMediaInfo(observation,list,7),expected=legacyMediaInfo(properties,mode,surface,list,7);
  assert.deepEqual(actual,expected);assert.equal(JSON.stringify(actual),JSON.stringify(expected),'Snapshot comparison depends on legacy property order');
  assert.deepEqual(selectMediaInfo(observation,list,null),legacyMediaInfo(properties,mode,surface,list,null));
});
