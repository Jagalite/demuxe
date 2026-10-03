// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const core=await import(process.env.RETAINED_POLICY_CORE??new URL('../../web/generated/internal/machine/legacy-retained-presentation.js',import.meta.url));
const playbackCore=await import('../../web/generated/internal/machine/legacy-playback-worker.js');
const raw=await readFile(process.env.RETAINED_POLICY_SNIPPET??new URL('../../web/filter-retained-engine-worker.js',import.meta.url),'utf8');
const start=raw.indexOf('let retainedControl='),end=raw.indexOf('let decoderWorker',start);assert.ok(start>=0,'production retained policy adapter missing');const source=raw.slice(start,end<0?undefined:end);
function fixture(){let now=0,serial=1,key=100,delay=10,redraw=false,throwTimer,hook;const live=new Map(),history=[],drawn=[],acks=[];let next=0;
 const replies=[],captures=[];let encode=()=>Promise.resolve({type:'image/png'});
 const context={...core,...playbackCore,Promise,audioOnly:false,canvas:{width:640,height:360,convertToBlob(options){captures.push(options);return encode();}},post(message){replies.push(message);},transition(e){context.control=playbackCore.reduceLegacyPlaybackWorker(context.control,e);},schedulePump(){},Map,Set,Math,Number,Error,Object,performance:{now:()=>now},control:{...playbackCore.initialLegacyPlaybackWorker(),initialized:true,ready:true,source:1},context:null,quality:false,videoTrack:{},canvasSubmissions:0,tick(){},subtitles:{clear(){},read(){return {};},draw(){}},videoPresenter:{draw(frame){drawn.push(frame.name);}},engine:{_web_selected_serial:()=>serial,_web_selected_pts:()=>key/1e6,_web_selected_redraw:()=>redraw,_web_selected_delay:()=>delay,_web_presented:()=>acks.push(key)},setTimeout(fn,ms){if(throwTimer)throw throwTimer;const handle=++next;live.set(handle,{fn,ms});history.push({fn,handle});hook?.();return handle;},clearTimeout(handle){live.delete(handle);}};
 vm.runInNewContext(source+`;globalThis.h={requestSnapshot,receiveFrame,presentSelected,presentReady,cleanupFrames,get state(){return retainedControl},get frames(){return frames},get pending(){return pendingFrames},get timers(){return presentationTimers},get submissions(){return canvasSubmissions}};`,context);
 return{h:context.h,replies,captures,get control(){return context.control;},set control(value){context.control=value;},set encode(value){encode=value;},live,history,drawn,acks,set now(n){now=n;},set serial(n){serial=n;},set key(n){key=n;},set delay(n){delay=n;},set redraw(n){redraw=n;},set timerFailure(e){throwTimer=e;},set timerHook(fn){hook=fn;},receive(frame,generation=0,pts=key){context.h.receiveFrame({retainedFrame:frame,generation,pts});},fire(index=history.length-1){const event=history[index];live.delete(event.handle);event.fn();}};
}
const frame=(name,onClose)=>({name,closed:0,close(){this.closed++;onClose?.();}});
for(const delay of [0,10])test(`selection before first transferred frame preserves its presentation, delay=${delay}`,()=>{
 const f=fixture(),first=frame('first');f.delay=delay;f.h.presentSelected();
 const request=f.h.state.pending[0];assert.ok(request);assert.equal(f.h.pending.size,1);
 f.receive(first,1);assert.equal(f.h.state.epoch,request.epoch);
 if(delay){assert.equal(f.live.size,1);f.now=delay;f.fire();}
 assert.deepEqual(f.drawn,['first']);assert.equal(f.acks.length,1);assert.equal(f.h.pending.size,0);
 f.h.presentSelected();assert.deepEqual(f.drawn,['first']);f.h.cleanupFrames();assert.equal(first.closed,1);
});
test('post-seek selection survives first new-generation frame while old timer and frame stay retired',()=>{
 const f=fixture(),old=frame('old'),late=frame('late'),next=frame('seek');f.receive(old,1);f.h.presentSelected();
 f.h.cleanupFrames(0,false);assert.equal(old.closed,1);assert.equal(f.live.size,0);
 f.serial=2;f.h.presentSelected();const request=f.h.state.pending[0];assert.ok(request);
 f.receive(late,1);assert.equal(late.closed,1);assert.equal(f.h.state.pending[0].id,request.id);
 f.receive(next,2);assert.equal(f.h.state.pending[0].id,request.id);assert.equal(f.live.size,1);
 f.now=10;f.fire(0);assert.deepEqual(f.drawn,[]);f.fire(1);assert.deepEqual(f.drawn,['seek']);
 assert.equal(f.acks.length,1);f.h.cleanupFrames();assert.equal(next.closed,1);
});
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

test('snapshot waits for a real delayed retained draw and publishes PNG dimensions',async()=>{
 const f=fixture();f.h.requestSnapshot(41);assert.equal(f.captures.length,0);
 f.h.presentSelected();f.receive(frame('first'),1);assert.equal(f.captures.length,0);
 f.now=10;f.fire();await Promise.resolve();
 assert.equal(f.captures.length,1);assert.equal(f.captures[0].type,'image/png');
 assert.equal(f.replies[0].event.id,41);assert.equal(f.replies[0].event.result.width,640);
 assert.equal(f.replies[0].event.result.time,.0001);assert.equal(f.control.snapshot,null);
});
test('paused redraw captures once and encoding errors permit retry',async()=>{
 const f=fixture();f.delay=0;f.receive(frame('held'));f.h.presentSelected();
 f.encode=()=>{throw Error('encode failed');};f.h.requestSnapshot(42);f.redraw=true;f.serial=2;f.h.presentSelected();
 assert.match(f.replies[0].message,/encode failed/);assert.equal(f.control.snapshot,null);
 f.encode=()=>Promise.resolve('png');f.h.requestSnapshot(43);f.serial=3;f.h.presentSelected();f.h.presentSelected();await Promise.resolve();
 assert.equal(f.captures.length,2);assert.equal(f.replies[1].event.id,43);
});
for(const retirement of ['source','close','fail'])test(`snapshot completion cannot publish after ${retirement}`,async()=>{
 const f=fixture();let resolve;f.encode=()=>new Promise(r=>resolve=r);f.delay=0;
 f.h.requestSnapshot(44);f.receive(frame('held'));f.h.presentSelected();assert.equal(f.captures.length,1);
 f.control=retirement==='source'?playbackCore.admitLegacySource(f.control).state:playbackCore.reduceLegacyPlaybackWorker(f.control,{type:retirement});
 resolve('old png');await Promise.resolve();assert.equal(f.replies.length,0);assert.equal(f.control.snapshot,null);
});
