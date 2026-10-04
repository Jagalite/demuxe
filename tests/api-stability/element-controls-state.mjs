// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialElementControls,transitionElementControls} from '../../web/generated/internal/machine/element-controls.js';
const step=transitionElementControls;
const facts={playing:true,pending:false,connected:true,focusVisible:false};

test('auto-hide checks live playback, menu, drag, focus and connection instead of trusting elapsed time',()=>{
 const initial=initialElementControls(),revealed=step(initial,{type:'reveal',playing:true,delay:2800});assert.equal(revealed.hideAfter,2800);
 assert.equal(step(revealed.state,{type:'hide-elapsed',...facts}).accepted,true);
 for(const patch of [{playing:false},{pending:true},{connected:false},{focusVisible:true}])assert.equal(step(revealed.state,{type:'hide-elapsed',...facts,...patch}).accepted,false);
 for(const command of [{type:'drag',active:true},{type:'menu',open:true,trigger:'settings-toggle',sourceControls:true}])assert.equal(step(step(revealed.state,command).state,{type:'hide-elapsed',...facts}).accepted,false);
 assert.equal(step(initial,{type:'reveal',playing:false,delay:2800}).hideAfter,undefined);assert.equal(step(initial,{type:'reveal',playing:true,delay:0}).hideAfter,undefined);
 const hidden=step(initial,{type:'hide'}).state;assert.equal(hidden.idle,true);assert.equal(step(hidden,{type:'reveal',playing:true,delay:1}).state.idle,false);
});

test('pointer leave can hide only live mouse playback with controls and a source',()=>{
 const state=initialElementControls(),command={type:'pointer-leave',...facts,mouse:true,terminal:false,controls:true,hasSource:true};
 assert.equal(step(state,command).accepted,true);
 for(const patch of [{mouse:false},{terminal:true},{controls:false},{hasSource:false},{pending:true},{focusVisible:true}])assert.equal(step(state,{...command,...patch}).accepted,false);
 const hidden=step(state,{type:'hide'}).state;assert.equal(step(hidden,{type:'screen-press'}).state.stageWasIdle,true);assert.equal(step(state,{type:'screen-press'}).state.stageWasIdle,false);
});

test('menu ownership preserves its trigger on close and refuses disabled source menus',()=>{
 const initial=initialElementControls();assert.equal(step(initial,{type:'menu',open:true,trigger:'open-menu',sourceControls:false}).accepted,false);
 const source=step(initial,{type:'menu',open:true,trigger:'open-menu',sourceControls:true}).state;assert.equal(source.menuOpen,true);assert.equal(source.menuTrigger,'open-menu');
 const closed=step(source,{type:'menu',open:false,trigger:'settings-toggle',sourceControls:false}).state;assert.equal(closed.menuOpen,false);assert.equal(closed.menuTrigger,'open-menu');
 assert.equal(step(closed,{type:'menu',open:true,trigger:'settings-toggle',sourceControls:false}).state.menuTrigger,'settings-toggle');
});

test('seeking while idle shows bounded feedback, while playback intent determines reveal on status changes',()=>{
 let state=step(initialElementControls(),{type:'hide'}).state;
 let seeking=step(state,{type:'seeking',seeking:true});assert.equal(seeking.state.seekPreview,true);assert.equal(seeking.reveal,false);assert.equal(seeking.seekPreviewAfter,undefined);
 seeking=step(seeking.state,{type:'seeking',seeking:false});assert.equal(seeking.seekPreviewAfter,800);state=step(seeking.state,{type:'seek-preview-expired'}).state;assert.equal(state.seekPreview,false);
 let playing=step(state,{type:'playing',playing:true,intent:'play',status:'playing'});assert.equal(playing.reveal,false);
 assert.equal(step(playing.state,{type:'playing',playing:false,intent:'play',status:'buffering'}).reveal,false);
 assert.equal(step(playing.state,{type:'playing',playing:false,intent:'pause',status:'paused'}).reveal,true);
 const stopping=step(playing.state,{type:'playing',playing:false,intent:'play',status:'paused'});
 assert.equal(stopping.reveal,false);
 const paused=step(stopping.state,{type:'playing',playing:false,intent:'pause',status:'paused'});
 assert.equal(paused.changed,true);assert.equal(paused.reveal,true);
 assert.equal(step(paused.state,{type:'playing',playing:false,intent:'pause',status:'paused'}).changed,false);
 for(const status of ['ended','error','idle'])assert.equal(step(playing.state,{type:'playing',playing:false,intent:'play',status}).reveal,true);
 assert.equal(step(playing.state,{type:'playing',playing:true,intent:'play',status:'playing'}).changed,false);
 assert.equal(step(initialElementControls(),{type:'seeking',seeking:true}).reveal,true);
});

test('terminal status after buffering reveals once even when playing and intent are unchanged',()=>{
 let state=step(initialElementControls(),{type:'playing',playing:true,intent:'play',status:'playing'}).state;
 state=step(state,{type:'hide'}).state;
 state=step(state,{type:'playing',playing:false,intent:'play',status:'buffering'}).state;
 for(const status of ['ended','error','idle']){
   const terminal=step(state,{type:'playing',playing:false,intent:'play',status});
   assert.equal(terminal.changed,true);assert.equal(terminal.reveal,true);
   assert.equal(step(terminal.state,{type:'playing',playing:false,intent:'play',status}).changed,false);
 }
});

test('source or route change retires dragging; opening progress cannot carry into a new operation',()=>{
 const command={type:'preview',identity:'1:native',pending:false,controls:true,seekable:true};let state=step(initialElementControls(),command).state;
 state=step(state,{type:'drag',active:true}).state;assert.equal(step(state,command).resetPreview,false);
 for(const patch of [{identity:'2:native'},{identity:'1:software'},{pending:true},{controls:false},{seekable:false}]){const change=step(state,{...command,...patch});assert.equal(change.resetPreview,true);assert.equal(change.state.dragging,false);}
 state=step(state,{type:'opening',operation:1,initialStage:'Inspecting'}).state;
 state=step(state,{type:'opening-stage',stage:'Starting Native'}).state;assert.equal(step(state,{type:'opening',operation:1,initialStage:'Inspecting'}).state.openingStage,'Starting Native');
 state=step(state,{type:'opening',operation:2,initialStage:'Inspecting'}).state;assert.equal(state.openingStage,'Inspecting');
 assert.equal(step(state,{type:'opening',operation:null,initialStage:'Inspecting'}).state.openingStage,'');
});

test('diagnostics throttle uses supplied time and visibility policy, with explicit forced refresh',()=>{
 let state=initialElementControls();assert.equal(step(state,{type:'diagnostics-sample',now:1000,force:true,hasOwner:true}).accepted,false);
 state=step(state,{type:'diagnostics',show:true,enabled:true,controls:true}).state;
 let sampled=step(state,{type:'diagnostics-sample',now:1000,force:false,hasOwner:true});assert.equal(sampled.accepted,true);state=sampled.state;
 assert.equal(step(state,{type:'diagnostics-sample',now:1499,force:false,hasOwner:true}).accepted,false);
 assert.equal(step(state,{type:'diagnostics-sample',now:1500,force:false,hasOwner:true}).accepted,true);
 assert.equal(step(state,{type:'diagnostics-sample',now:1001,force:true,hasOwner:true}).accepted,true);
 assert.equal(step(state,{type:'diagnostics-sample',now:1500,force:true,hasOwner:false}).accepted,false);
 for(const patch of [{enabled:false},{controls:false}])assert.equal(step(state,{type:'diagnostics',show:true,enabled:true,controls:true,...patch}).state.diagnostics,false);
});

test('announcements and errors are immutable snapshots; cancellation does not replace an active failure',()=>{
 const original=initialElementControls(),error={code:'PLAYBACK_FAILED',message:'Failure',retryable:true};
 let state=step(original,{type:'error',error}).state;error.message='Changed';assert.equal(state.failure.message,'Failure');assert.ok(Object.isFrozen(state.failure));
 assert.equal(step(state,{type:'error',error:{code:'ABORTED',message:'Cancelled',retryable:false}}).state,state);
 assert.equal(step(state,{type:'clear-error'}).state.failure,undefined);
 const first=step(state,{type:'announce',text:'Ready'});assert.equal(first.changed,true);assert.equal(step(first.state,{type:'announce',text:'Ready'}).changed,false);
 assert.equal(original.announcement,'');assert.equal(original.failure,undefined);
});
