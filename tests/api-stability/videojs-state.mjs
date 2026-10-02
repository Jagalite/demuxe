// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialVideojsHostLease,transitionVideojsHost,initialVideojsState,transitionVideojs,videojsSourceCurrent} from '../../web/generated/internal/machine/videojs.js';
import {registerVideojsTech} from '../../web/generated/adapters/videojs.js';

test('host lease reserves before setup, keeps retirement exclusive and fences stale release',()=>{
 const initial=initialVideojsHostLease(),reserved=transitionVideojsHost(initial,{type:'reserve'});assert.equal(reserved.accepted,true);assert.equal(initial.owner,null);
 assert.equal(transitionVideojsHost(reserved.state,{type:'reserve'}).accepted,false);
 const attached=transitionVideojsHost(reserved.state,{type:'attach',owner:reserved.owner}),retiring=transitionVideojsHost(attached.state,{type:'retire',owner:reserved.owner});
 assert.equal(transitionVideojsHost(retiring.state,{type:'reserve'}).accepted,false);
 const released=transitionVideojsHost(retiring.state,{type:'release',owner:reserved.owner}),next=transitionVideojsHost(released.state,{type:'reserve'});
 assert.ok(next.owner>reserved.owner);assert.equal(transitionVideojsHost(next.state,{type:'release',owner:reserved.owner}).accepted,false);assert.ok(Object.isFrozen(next.state));
});

test('adapter lifecycle and source reflection reject stale ready/error changes after retirement',()=>{
 const initial=initialVideojsState(),ready=transitionVideojs(initial,{type:'ready'});assert.equal(initial.controlsReady,false);assert.equal(ready.state.controlsReady,true);
 const failed=transitionVideojs(ready.state,{type:'error'});assert.equal(failed.errorId,1);
 const empty=transitionVideojs(failed.state,{type:'source',sourceId:null});assert.equal(empty.clearError,false);assert.equal(empty.state.errorId,1);
 const source=transitionVideojs(empty.state,{type:'source',sourceId:4});assert.equal(source.clearError,true);assert.equal(source.state.errorId,null);assert.equal(videojsSourceCurrent(source.state,4),true);
 assert.equal(transitionVideojs(source.state,{type:'source',sourceId:4}).accepted,false);
 const retired=transitionVideojs(source.state,{type:'dispose'});assert.equal(retired.state.controlsReady,false);assert.equal(videojsSourceCurrent(retired.state,4),false);
 for(const command of [{type:'ready'},{type:'error'},{type:'source',sourceId:5},{type:'dispose'}])assert.equal(transitionVideojs(retired.state,command).state,retired.state);
});

function fixture(t,{construct,subscribe,restore}={}){
 const previous=globalThis.document;let Registered;const calls=[],callbacks=[];
 const parent={appendChild(node){node.parentNode=this;calls.push('restore');restore?.();}};
 const document={createElement(){return {append(node){node.parentNode=this;},className:''};},createComment(){return {parentNode:parent,replaceWith(node){parent.appendChild(node);this.parentNode=null;},remove(){this.parentNode=null;calls.push('marker-remove');}};}};
 globalThis.document=document;t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const host={ownerDocument:document,parentNode:parent,before(){}};
 const runtime=new EventTarget(),listeners=new Set();
 runtime.host=host;runtime.isDestroyed=false;runtime.state={sourceId:1,playbackIntent:'pause',status:'paused',currentTime:0,duration:10,streamType:'vod',volume:1,muted:false,playbackRate:1,error:null,pendingOperation:null,buffered:null,seekable:null,mediaInfo:{}};
 runtime.subscribe=listener=>{subscribe?.(()=>new Registered({demuxePlayer:runtime}));listeners.add(listener);listener(runtime.state);return()=>{listeners.delete(listener);calls.push('unsubscribe');};};
 runtime.setVolume=async value=>calls.push(['volume',value]);runtime.play=async()=>{};runtime.pause=async()=>{};runtime.seek=async()=>{};runtime.setMuted=async()=>{};runtime.setPlaybackRate=async()=>{};
 runtime.publish=patch=>{runtime.state={...runtime.state,...patch};for(const listener of [...listeners])listener(runtime.state);};
 class Tech{
  constructor(){construct?.(()=>new Registered({demuxePlayer:runtime}));this.element=this.createEl();this.setVolume(.3);}
  el(){return this.element;}ready(fn){callbacks.push(fn);}triggerReady(){}trigger(event){calls.push(typeof event==='string'?event:event.type);}dispose(){calls.push('super-dispose');}
 }
 const owner={error(){}};registerVideojsTech({getTech:name=>name==='Tech'?Tech:undefined,getPlayer:()=>owner,registerTech:(_,value)=>Registered=value});
 return {get Tech(){return Registered;},runtime,host,parent,calls,callbacks,listeners,owner,create:()=>new Registered({demuxePlayer:runtime})};
}

test('shell reservation rejects reentrant constructors from super and initial subscription',t=>{
 let reentries=0;const probe=again=>{assert.throws(again,{code:'UNSUPPORTED_FEATURE'});reentries++;};
 const f=fixture(t,{construct:probe,subscribe:probe}),tech=f.create();assert.equal(reentries,2);assert.equal(f.host.parentNode,tech.el());assert.equal(f.calls.some(Array.isArray),false,'Superclass volume initialization cannot change accepted playback');
 f.callbacks[0]();tech.setVolume(.4);assert.deepEqual(f.calls.filter(Array.isArray),[['volume',.4]]);tech.dispose();assert.equal(f.host.parentNode,f.parent);assert.equal(f.listeners.size,0);
 const second=f.create();second.dispose();assert.equal(reentries,4);
});

test('failed superclass construction releases reservation for a later mount',t=>{
 let fail=true;const f=fixture(t,{construct(){if(fail)throw Error('super failed');}});
 assert.throws(()=>f.create(),/super failed/);assert.equal(f.host.parentNode,f.parent);fail=false;const next=f.create();next.dispose();assert.equal(f.host.parentNode,f.parent);
});

test('retirement suppresses queued ready callbacks and keeps host reserved during restoration',t=>{
 let f;f=fixture(t,{restore(){assert.throws(()=>f.create(),{code:'UNSUPPORTED_FEATURE'});}});const tech=f.create(),before=f.calls.length;
 tech.dispose();f.callbacks[0]();tech.setVolume(.8);tech.dispose();assert.equal(f.calls.filter(x=>x==='super-dispose').length,1);assert.equal(f.calls.filter(Array.isArray).length,0);assert.equal(f.calls.slice(before).includes('sourceset'),false);
});

test('source error-clear callback may dispose without leaking stale sourceset or loadedmetadata events',t=>{
 const f=fixture(t),tech=f.create();f.owner.error=()=>tech.dispose();const before=f.calls.length;f.runtime.publish({sourceId:2});
 assert.equal(f.calls.slice(before).includes('sourceset'),false);assert.equal(f.calls.slice(before).includes('loadedmetadata'),false);assert.equal(f.listeners.size,0);
});

test('borrowed disposal does not steal relocated hosts or resurrect destroyed owners',t=>{
 const f=fixture(t),tech=f.create(),elsewhere={};f.host.parentNode=elsewhere;tech.dispose();assert.equal(f.host.parentNode,elsewhere);assert.equal(f.runtime.isDestroyed,false);
 const second=f.create();f.runtime.isDestroyed=true;f.host.parentNode=null;second.dispose();assert.equal(f.host.parentNode,null);
});
