// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
const {DemuxePlayerElement}=await import('../../web/generated/player/index.js');
const {initialElementLifecycle,transitionElementLifecycle}=await import('../../web/generated/internal/machine/element-lifecycle.js');
const {PlayerError,playerError}=await import('../../web/generated/internal/errors.js');
for(const retire of [false,true])test(`initialization failure targets original readiness after cleanup: retired=${retire}`,async()=>{
 const failure=Error('subscribe'),rejected=[],successor=[],reported=[];let finish,destroyed=false;
 class Player{presentation={setFullscreenTarget(){}};addEventListener(){}subscribe(){throw failure;}destroy(){destroyed=true;return new Promise(r=>finish=r);}}
 const callback=new Function('transitionElementLifecycle','Player','PlayerError','playerError','PLAYER_EVENTS','return ({'+DemuxePlayerElement.prototype.connectedCallback.toString()+'}).connectedCallback')(transitionElementLifecycle,Player,PlayerError,playerError,[]);
 const element={lifecycle:initialElementLifecycle(),cleanup:Promise.resolve(),isConnected:true,configuration:{},configure(){},getAttribute(){return null;},$(){return {};},syncPreviewEnabled(){},view(){},rejectReady:e=>rejected.push(e),componentError:e=>reported.push(e)};
 callback.call(element);await Promise.resolve();await Promise.resolve();assert.equal(destroyed,true);
 if(retire){element.lifecycle=transitionElementLifecycle(element.lifecycle,{type:'disconnect'}).state;element.lifecycle=transitionElementLifecycle(element.lifecycle,{type:'connect'}).state;element.rejectReady=e=>successor.push(e);}
 finish();await element.connecting;assert.equal(rejected.length,1);assert.equal(successor.length,0);assert.equal(reported.length,retire?0:1);
});
const {DemuxeMediaElement}=await import('../../web/generated/media-element/index.js');
const {MediaView}=await import('../../web/generated/integration/media-view.js');
test('media registration preserves acquisition error despite retirement and throwing removal',async t=>{
 const p=new EventTarget();p.state={sourceId:null,currentTime:0,duration:null,streamType:'unknown',playbackIntent:'pause',status:'idle',volume:1,muted:false,playbackRate:1,error:null,loop:false,buffered:null,seekable:null,pendingOperation:null};p.subscribe=fn=>{fn(p.state);return()=>{};};
 const element=new DemuxeMediaElement(),failure=Error('add'),cleanup=Error('remove');let done;
 const add=MediaView.prototype.addEventListener,remove=MediaView.prototype.removeEventListener;
 t.mock.method(MediaView.prototype,'addEventListener',function(...args){add.apply(this,args);done=element.dispose().catch(()=>{});throw failure;});
 t.mock.method(MediaView.prototype,'removeEventListener',function(...args){remove.apply(this,args);throw cleanup;});
 assert.throws(()=>element.bind(p),e=>e===failure);await done;assert.equal(element.view,undefined);
});
const {ScrubberPreview}=await import('../../web/generated/player/preview.js');
for(const trigger of ['abort','hidden'])test(`scrubber clear preserves successor published during ${trigger}`,()=>{
 const timeline=new EventTarget(),panel={hidden:false},image={src:'old',removeAttribute(){delete this.src;}},preview=new ScrubberPreview(timeline,panel,image,{},()=>undefined);let released=0;
 preview.displayedURL={url:'old',release(){released++;}};
 const successor=()=>{preview.transition({type:'hover'});image.src='successor';};
 if(trigger==='hidden')Object.defineProperty(panel,'hidden',{set:successor,configurable:true});
 const decision={...preview.transition({type:'hide'})};
 if(trigger==='abort'){const c=new AbortController();c.signal.addEventListener('abort',successor);preview.generators.set(99,c);decision.abortGeneration=99;}
 preview.applyClear(decision);assert.equal(image.src,'successor');assert.equal(released,1);
});
