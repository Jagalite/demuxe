// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SoftwarePreviewProvider} from '../../web/generated/preview/software.js';
import {WasmPlayer} from '../../web/generated/internal/wasm-player.js';
import {createWasmLifecycle} from '../../web/generated/internal/machine/wasm-lifecycle.js';
const turn=()=>new Promise(setImmediate);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

async function fixture(t,{geometry={w:320,h:180}}={}){
 const root=await mkdtemp(join(tmpdir(),'demuxe-preview-readiness-')),created=deferred(),opened=deferred(),loaded=deferred(),presented=deferred();
 const key=Symbol.for(root),log={snapshots:0,destroys:0,cleanups:[],resizes:[],commands:[]};
 class ControlledPlayer extends EventTarget{
  ready=Promise.resolve();properties=new Map();eventWaiters=new Map();lifecycle=createWasmLifecycle();destroyed=false;
  constructor(canvas){super();this.canvas=canvas;if(geometry)this.properties.set('video-params',geometry);created.resolve(this);}
  async command(...args){log.commands.push(args);}
  async open(){opened.resolve(this);await loaded.promise;}
  async openRemote(){return this.open();}
  waitForPreviewPresentation(){return presented.promise;}
  waitForPreviewMetadata(){return WasmPlayer.prototype.waitForPreviewMetadata.call(this);}
  waitForEvent(predicate){return WasmPlayer.prototype.waitForEvent.call(this,predicate);}
  resize(width,height){log.resizes.push([width,height]);this.canvas.width=width;this.canvas.height=height;}
  async previewSnapshot(){log.snapshots++;return{blob:new Blob(['image'],{type:'image/jpeg'}),time:2,width:this.canvas.width,height:this.canvas.height};}
  async destroy(){if(this.destroyed)return;this.destroyed=true;log.destroys++;for(const entry of [...this.eventWaiters.values()])entry.cancel(Error('Player destroyed'));}
  tracks(value){this.properties.set('track-list',value);this.dispatchEvent(new CustomEvent('mpv',{detail:{event:'property-change',name:'track-list',data:value}}));}
  geometry(value){this.properties.set('video-params',value);this.dispatchEvent(new CustomEvent('mpv',{detail:{event:'property-change',name:'video-params',data:value}}));}
  end(){this.dispatchEvent(new CustomEvent('mpv',{detail:{event:'end-file'}}));}
 }
 globalThis[key]=ControlledPlayer;
 const module=join(root,'web/generated/internal/wasm-player.js');await mkdir(join(root,'web/generated/internal'),{recursive:true});
 await writeFile(module,`export const WasmPlayer=globalThis[Symbol.for(${JSON.stringify(root)})];\n`);
 t.after(async()=>{delete globalThis[key];await rm(root,{recursive:true,force:true});});
 const controller=new AbortController(),source={file:new File(['media'],'sample.mkv')};
 const provider=new SoftwarePreviewProvider(()=>source,{createElement:()=>({width:0,height:0})},pathToFileURL(root+'/'));
 const request={time:2,width:160,exact:false,sourceId:'source-1',signal:controller.signal,publish:()=>{},trackCleanup:work=>log.cleanups.push(work)};
 let settled=false;const result=provider.getFrame(request).finally(()=>{settled=true;});void result.catch(()=>{});
 const engine=await created.promise;await opened.promise;
 return{engine,loaded,presented,controller,result,log,get settled(){return settled;},async clean(){await Promise.all(log.cleanups);assert.equal(engine.eventWaiters.size,0);assert.equal(log.destroys,1);}};
}

test('presentation and open completion do not mistake withheld track metadata for absent video',async t=>{
 const f=await fixture(t);f.loaded.resolve();f.presented.resolve();await turn();
 assert.equal(f.settled,false);assert.equal(f.log.snapshots,0);
 f.engine.properties.set('video-params',{w:320,h:180});f.engine.tracks([{type:'video',selected:true},{type:'audio',selected:false}]);
 const frame=await f.result;assert.equal(frame.path,'software');assert.equal(frame.width,160);assert.equal(frame.height,90);
 assert.equal(f.log.snapshots,1);assert.deepEqual(f.log.resizes,[[160,90]]);await f.clean();
});

test('known video metadata still waits for presentation before snapshot',async t=>{
 const f=await fixture(t);f.engine.tracks([{type:'video'}]);f.loaded.resolve();await turn();
 assert.equal(f.settled,false);assert.equal(f.log.snapshots,0);f.presented.resolve();assert.ok(await f.result);await f.clean();
});

test('confirmed audio-only metadata returns null and releases the independent engine',async t=>{
 const f=await fixture(t,{geometry:null});f.engine.tracks([{type:'audio'}]);f.loaded.resolve();f.presented.resolve();
 assert.equal(await f.result,null);assert.equal(f.log.snapshots,0);await f.clean();
});

test('video tracks and presentation wait for delayed geometry instead of taking the default 16:9 snapshot',async t=>{
 const f=await fixture(t,{geometry:null});f.engine.tracks([{type:'video'}]);f.loaded.resolve();f.presented.resolve();await turn();
 assert.equal(f.settled,false);assert.equal(f.log.snapshots,0);f.engine.geometry({w:320,h:240});
 const frame=await f.result;assert.deepEqual([frame.width,frame.height],[160,120]);assert.deepEqual(f.log.resizes,[[160,120]]);await f.clean();
});

test('display geometry arriving before track metadata preserves aspect instead of coded geometry',async t=>{
 const f=await fixture(t,{geometry:null});f.engine.geometry({w:720,h:576,dw:400,dh:300});f.loaded.resolve();f.presented.resolve();await turn();
 assert.equal(f.settled,false);f.engine.tracks([{type:'video'}]);const frame=await f.result;
 assert.deepEqual([frame.width,frame.height],[160,120]);assert.equal(f.log.snapshots,1);await f.clean();
});

test('invalid transient video dimensions cannot admit a snapshot',async t=>{
 const f=await fixture(t,{geometry:null});f.engine.tracks([{type:'video'}]);f.loaded.resolve();f.presented.resolve();
 for(const geometry of [{w:0,h:240},{w:320,h:NaN},{w:Infinity,h:240},{w:320,h:240,dw:0}]){
  f.engine.geometry(geometry);await turn();assert.equal(f.settled,false);assert.equal(f.log.snapshots,0);
 }
 f.engine.geometry({w:320,h:240});assert.ok(await f.result);await f.clean();
});

test('retirement while waiting for video geometry cannot publish from a late observation',async t=>{
 const f=await fixture(t,{geometry:null});f.engine.tracks([{type:'video'}]);f.loaded.resolve();f.presented.resolve();await turn();
 f.controller.abort();await assert.rejects(f.result);f.engine.geometry({w:320,h:240});await turn();
 assert.equal(f.log.snapshots,0);await f.clean();
});

test('empty startup observations remain pending until source metadata arrives',async t=>{
 const f=await fixture(t);f.engine.tracks([]);f.loaded.resolve();f.presented.resolve();await turn();
 assert.equal(f.settled,false);f.engine.tracks([]);await turn();assert.equal(f.settled,false);
 f.engine.tracks([{type:'video'}]);assert.ok(await f.result);await f.clean();
});

test('source retirement aborts a metadata wait and late metadata cannot publish a frame',async t=>{
 const f=await fixture(t);f.loaded.resolve();f.presented.resolve();await turn();f.controller.abort();
 await assert.rejects(f.result);f.engine.tracks([{type:'video'}]);await turn();assert.equal(f.log.snapshots,0);await f.clean();
});

test('end-of-file while metadata is withheld rejects the bounded waiter and releases resources',async t=>{
 const f=await fixture(t);f.loaded.resolve();f.presented.resolve();await turn();f.engine.end();
 await assert.rejects(f.result,/preview.*metadata|preview.*video/i);assert.equal(f.log.snapshots,0);await f.clean();
});

test('withheld metadata uses the existing bounded media waiter and removes its listener at deadline',async t=>{
 const f=await fixture(t),timers=[];let now=0;t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const timer={callback,delay};timers.push(timer);return timer;});
 t.mock.method(globalThis,'clearTimeout',timer=>{timer.cleared=true;});
 f.loaded.resolve();f.presented.resolve();await turn();assert.equal(f.settled,false);
 assert.equal(timers.length,1);assert.equal(timers[0].delay,25000);now=25000;timers[0].callback();
 await assert.rejects(f.result,/timed out/);assert.equal(timers[0].cleared,true);assert.equal(f.log.snapshots,0);await f.clean();
});
