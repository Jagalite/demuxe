// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../../web/generated/internal/machine/legacy-retained-presentation.js';
const raw=await readFile(process.env.RETAINED_POLICY_SNIPPET??new URL('../../web/filter-retained-engine-worker.js',import.meta.url),'utf8');
const start=raw.indexOf('let retainedControl='),end=raw.indexOf('let decoderWorker',start);assert.ok(start>=0,'production retained policy adapter missing');const source=raw.slice(start,end<0?undefined:end);
function fixture(){let now=0,serial=1,key=100,delay=10,redraw=false,throwTimer,hook;const live=new Map(),history=[],drawn=[],acks=[];let next=0;
 const context={...core,Map,Set,Math,Number,Error,Object,performance:{now:()=>now},control:{pendingTarget:null},context:null,quality:false,videoTrack:{},canvasSubmissions:0,tick(){},subtitles:{clear(){},read(){return {};},draw(){}},videoPresenter:{draw(frame){drawn.push(frame.name);}},engine:{_web_selected_serial:()=>serial,_web_selected_pts:()=>key/1e6,_web_selected_redraw:()=>redraw,_web_selected_delay:()=>delay,_web_presented:()=>acks.push(key)},setTimeout(fn,ms){if(throwTimer)throw throwTimer;const handle=++next;live.set(handle,{fn,ms});history.push({fn,handle});hook?.();return handle;},clearTimeout(handle){live.delete(handle);}};
 vm.runInNewContext(source+`;globalThis.h={receiveFrame,presentSelected,presentReady,cleanupFrames,get state(){return retainedControl},get frames(){return frames},get pending(){return pendingFrames},get timers(){return presentationTimers},get submissions(){return canvasSubmissions}};`,context);
 return{h:context.h,live,history,drawn,acks,set now(n){now=n;},set serial(n){serial=n;},set key(n){key=n;},set delay(n){delay=n;},set redraw(n){redraw=n;},set timerFailure(e){throwTimer=e;},set timerHook(fn){hook=fn;},receive(frame,generation=0,pts=key){context.h.receiveFrame({retainedFrame:frame,generation,pts});},fire(index=history.length-1){const event=history[index];live.delete(event.handle);event.fn();}};
}
const frame=(name,onClose)=>({name,closed:0,close(){this.closed++;onClose?.();}});
test('actual retained adapter cancels generation-old timers before recycled timestamp draw',()=>{
 const f=fixture(),old=frame('old'),next=frame('new');f.receive(old);f.h.presentSelected();assert.equal(f.live.size,1);f.receive(next,1);assert.equal(old.closed,1);assert.equal(f.live.size,0);f.now=10;f.fire(0);assert.deepEqual(f.drawn,[]);
 f.h.presentSelected();f.now=20;f.fire();assert.deepEqual(f.drawn,['new']);assert.equal(f.h.state.drawn,1);assert.equal(f.h.state.position,.0001);f.h.cleanupFrames();assert.equal(next.closed,1);assert.equal(f.h.frames.size,0);
});
test('frame-close reset reentry releases prepublished incoming frame and cannot draw it',()=>{
 const f=fixture(),old=frame('old',()=>f.h.cleanupFrames(undefined,false)),next=frame('new');f.receive(old);f.h.presentSelected();f.receive(next,1);assert.equal(old.closed,1);assert.equal(next.closed,1);assert.equal(f.h.frames.size,0);assert.equal(f.h.state.frames.length,0);f.now=10;f.fire(0);assert.deepEqual(f.drawn,[]);assert.equal(f.h.timers.size,0);
});
test('timer acquisition failure retires reserved presentation and preserves original error through cleanup failure',()=>{
 const f=fixture(),failure=Error('timer'),image=frame('image',()=>{throw Error('close');});f.receive(image);f.timerFailure=failure;assert.throws(()=>f.h.presentSelected(),error=>error===failure);assert.equal(image.closed,1);assert.equal(f.h.frames.size,0);assert.equal(f.h.pending.size,0);assert.equal(f.h.timers.size,0);assert.equal(f.h.state.pending.length,0);assert.equal(f.h.state.closed,true);
});
test('timer acquisition retirement releases late handle and callback stays inert',()=>{
 const f=fixture(),image=frame('image');f.receive(image);f.timerHook=()=>f.h.cleanupFrames();f.h.presentSelected();assert.equal(f.live.size,0);assert.equal(f.h.timers.size,0);f.now=10;f.fire();assert.deepEqual(f.drawn,[]);assert.equal(image.closed,1);
});
test('early timers rearm without dropping overlay and duplicate callback cannot redraw',()=>{
 const f=fixture(),image=frame('image');f.receive(image);f.h.presentSelected();f.now=9;f.fire(0);assert.equal(f.live.size,1);assert.equal(f.h.pending.size,1);f.now=10;f.fire(1);f.fire(1);f.fire(0);assert.deepEqual(f.drawn,['image']);assert.equal(f.acks.length,1);assert.equal(f.h.pending.size,0);assert.equal(f.h.state.drawn,1);f.h.cleanupFrames();assert.equal(image.closed,1);
});
