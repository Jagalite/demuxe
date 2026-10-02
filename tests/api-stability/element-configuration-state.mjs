// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialElementConfiguration,transitionElementConfiguration,elementLabels,elementPreviewEnabled} from '../../web/generated/internal/machine/element-configuration.js';
import {initialElementView,transitionElementView,elementTitle,elementTrackOptions,elementActivity} from '../../web/generated/internal/machine/element-view.js';
import {initialElementQueue,transitionElementQueue} from '../../web/generated/internal/machine/element-queue.js';
const watchdogs={nativeProgress:true,hybridDecoder:true,decoderOutput:true,selectiveAudio:true,nativeProgressTimeoutMs:10000};
const initial=()=>initialElementConfiguration(watchdogs),step=transitionElementConfiguration;

test('element numeric configuration rejects invalid values without changing prior accepted settings',()=>{
 let state=initial();assert.equal(state.seekStep,10);assert.equal(state.autoHideDelay,2800);
 for(const value of [0,-1,NaN,Infinity]){const result=step(state,{type:'seek-step',value});assert.equal(result.error.code,'INVALID_ARGUMENT');assert.equal(result.state,state);}
 state=step(state,{type:'seek-step',value:2.5}).state;assert.equal(state.seekStep,2.5);
 for(const value of [-1,NaN,Infinity,2147483648])assert.equal(step(state,{type:'auto-hide-delay',value}).state,state);
 state=step(state,{type:'auto-hide-delay',value:0}).state;assert.equal(state.autoHideDelay,0);
 for(const [type,field] of [['source-controls','sourceControls'],['diagnostics-control','diagnosticsControl'],['file-drop','fileDrop']])state=step(state,{type,value:false}).state;
 assert.equal(state.sourceControls,false);assert.equal(state.diagnosticsControl,false);assert.equal(state.fileDrop,false);
});

test('initialization locks reject audio and preview changes, while a disconnected owner can be configured again',()=>{
 const state=initial();for(const command of [{type:'audio-playback',value:'worklet'},{type:'preview',value:false}]){
  const locked=step(state,{...command,hasOwner:true});assert.equal(locked.error.code,'INVALID_ARGUMENT');assert.equal(locked.state,state);
  assert.equal(step(state,{...command,hasOwner:false}).error,undefined);
 }
 assert.equal(step(state,{type:'audio-playback',value:'invalid',hasOwner:false}).error.code,'INVALID_ARGUMENT');
 const changed=step(state,{type:'audio-playback',value:'worklet',hasOwner:false}).state;assert.equal(changed.audioPlayback,'worklet');
});

test('preview and track configuration are detached data snapshots; visibility composes with enabled policy',()=>{
 const preview={strategy:{type:'timestamps',timestamps:[1,3]},enabled:false},policy={audio:{allowed:[{language:'eng'}]}};
 let state=step(initial(),{type:'preview',value:preview,hasOwner:false}).state;preview.strategy.timestamps.push(5);preview.enabled=true;
 assert.deepEqual(state.preview.strategy.timestamps,[1,3]);assert.equal(elementPreviewEnabled(state,true),false);
 state=step(state,{type:'track-policy',value:policy}).state;policy.audio.allowed[0].language='fra';assert.equal(state.trackPolicy.audio.allowed[0].language,'eng');assert.ok(Object.isFrozen(state.trackPolicy.audio.allowed));
 state=step(state,{type:'preview',value:undefined,hasOwner:false}).state;assert.equal(elementPreviewEnabled(state,true),true);assert.equal(elementPreviewEnabled(state,false),false);
 state=step(state,{type:'preview',value:false,hasOwner:false}).state;assert.equal(elementPreviewEnabled(state,true),false);
});

test('labels validate known keys, detach values and derive seek labels without mutating defaults',()=>{
 const defaults={play:'Play',back:'Back',forward:'Forward'},state=step(initial(),{type:'seek-step',value:6}).state;
 const custom=step(state,{type:'labels',entries:[['play','Go'],['unknown',{}],['back',undefined]],keys:Object.keys(defaults)}).state;
 assert.deepEqual(elementLabels(defaults,custom),{play:'Go',back:'Seek backward 6 seconds',forward:'Seek forward 6 seconds'});assert.equal(defaults.back,'Back');
 for(const value of [6,'x'.repeat(1025)])assert.equal(step(custom,{type:'labels',entries:[['play',value]],keys:Object.keys(defaults)}).state,custom);
 assert.deepEqual(step(custom,{type:'labels',entries:[],keys:Object.keys(defaults)}).state.labels,{});
});

test('watchdog rejection and nested reflection retain accepted configuration',()=>{
 const state=initial(),next={...watchdogs,nativeProgress:false};assert.equal(step(state,{type:'watchdogs',value:next,terminal:true}).error.code,'ABORTED');assert.equal(state.watchdogs.nativeProgress,true);
 let current=step(state,{type:'watchdogs',value:next,terminal:false}).state;next.nativeProgress=true;assert.equal(current.watchdogs.nativeProgress,false);
 current=step(current,{type:'asset-lock',value:'/assets/v1/'}).state;
 for(const enter of [true,true,false])current=step(current,{type:'reflection',enter}).state;
 assert.equal(current.reflectionDepth,1);assert.equal(current.configuredAsset,'/assets/v1/');
 for(const enter of [false,false])current=step(current,{type:'reflection',enter}).state;assert.equal(current.reflectionDepth,0);
});

test('source title retirement and explicit title modes do not carry names to replacement sources',()=>{
 const first=transitionElementView(initialElementView(),{type:'source',name:'movie.mkv',sourceId:1}).state;
 const facts={mode:'auto',title:'Custom',terminal:false,connected:true,hasSource:true,loadedLabel:'Loaded',emptyLabel:'Empty'};
 assert.deepEqual(elementTitle(first,facts),{title:'Custom',source:'movie.mkv'});
 assert.equal(elementTitle(first,{...facts,mode:'source'}).title,'movie.mkv');assert.equal(elementTitle(first,{...facts,mode:'none'}).title,'');
 assert.equal(transitionElementView(first,{type:'observe-source',sourceId:1}).changed,false);
 const replacement=transitionElementView(first,{type:'observe-source',sourceId:2}).state;assert.equal(replacement.sourceName,'');assert.equal(elementTitle(replacement,{...facts,title:''}).source,'Loaded');
 assert.equal(elementTitle(replacement,{...facts,terminal:true}).source,'Empty');assert.equal(elementTitle(replacement,{...facts,connected:false}).source,'Empty');
});

test('geometry waits for operation settlement and owner changes invalidate renderer caches',()=>{
 const initial=initialElementView(),geometry={type:'geometry',ratio:16/9,pending:false,width:1280,height:720};
 assert.equal(transitionElementView(initial,{...geometry,pending:true}).resize,undefined);
 let decision=transitionElementView(initial,geometry);assert.deepEqual(decision.resize,{width:1280,height:720});let state=decision.state;
 assert.equal(transitionElementView(state,geometry).resize,undefined);assert.equal(transitionElementView(state,{...geometry,ratio:null}).clearAspect,true);
 state=transitionElementView(state,{type:'reset-owner'}).state;assert.deepEqual(transitionElementView(state,geometry).resize,{width:1280,height:720});
});

test('queue render changes track selection and busy policy without unnecessarily rebuilding source rows',()=>{
 const labels={queue:'Queue',clearQueue:'Clear',previous:'Previous',next:'Next',remove:'Remove',unnamed:'Unnamed',open:'Open',addFiles:'Add'};
 let queue=transitionElementQueue(initialElementQueue(),{type:'append',names:['one','two'],terminal:false}).state;
 const command={type:'queue',queue,pending:false,sourceControls:true,labels};let result=transitionElementView(initialElementView(),command);assert.equal(result.rebuild,true);
 let state=result.state;assert.equal(transitionElementView(state,command).changed,false);
 result=transitionElementView(state,{...command,pending:true});assert.equal(result.changed,true);assert.equal(result.rebuild,false);state=result.state;
 result=transitionElementView(state,{...command,labels:{...labels,remove:'Delete'}});assert.equal(result.rebuild,true);
 queue=transitionElementQueue(queue,{type:'remove',index:1,pending:false,sourceControls:true}).state;assert.equal(transitionElementView(result.state,{...command,queue}).rebuild,true);
});

test('track view preserves selected, default and unavailable policy choices and deduplicates inventories',()=>{
 const list=[{id:'1',label:'English',selected:true}],labels={automatic:'Auto',off:'Off'};
 assert.deepEqual(elementTrackOptions(list,undefined,labels),{options:[{label:'Auto',id:'auto'},{label:'Off',id:''},{label:'English',id:'1'}],value:'1',disabled:false});
 assert.deepEqual(elementTrackOptions([],{allowAuto:false,allowOff:false,locked:true},labels),{options:[],value:'auto',disabled:true});
 const command={type:'tracks',audio:list,subtitles:[],policy:{}},changed=transitionElementView(initialElementView(),command);assert.equal(changed.changed,true);assert.equal(transitionElementView(changed.state,command).changed,false);
 assert.equal(transitionElementView(changed.state,{...command,policy:{audio:{locked:true}}}).changed,true);
});

test('activity projection preserves compile priority, seek labels, idle preparation and live window messages',()=>{
 const labels={loading:'Loading',switching:'Switching',seeking:'Seeking',buffering:'Buffering',noWindow:'No window'};
 const state={sourceId:null,pendingOperation:null,status:'idle',streamType:'unknown',seekable:null};
 const progress=[{name:'inspector',status:'ready'},{name:'hybrid',status:'loading'},{name:'software',status:'compiling'}];
 let result=elementActivity(state,progress,'',labels);assert.equal(result.pill,'Compiling Software… · 1/3 ready');assert.equal(result.complete,false);
 result=elementActivity({...state,sourceId:1,pendingOperation:{kind:'seeking'}},progress,'',labels);assert.equal(result.pill,'Seeking');
 result=elementActivity({...state,sourceId:1,pendingOperation:{kind:'opening'}},[],'Starting Native',labels);assert.equal(result.activity,'Starting Native');
 result=elementActivity({...state,sourceId:1,streamType:'live'},[],'',labels);assert.equal(result.pill,'');assert.equal(result.announcement,'No window');
});
