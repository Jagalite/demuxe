// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {YUVPresenter}=await import(process.env.DEMUXE_YUV_PRESENTER?pathToFileURL(process.env.DEMUXE_YUV_PRESENTER):new URL('../web/yuv-presenter.js',import.meta.url));
globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;}getContext(){return{};}};
function fake({call=()=>{},add=()=>{},remove=()=>{}}={}){
 const calls=[],live=new Set(),listeners=new Map(),counts=new Map();let serial=0;
 const gl=new Proxy({}, {get(_target,name){if(typeof name==='string'&&/^[A-Z0-9_]+$/.test(name))return 1;return(...args)=>{calls.push(name);counts.set(name,(counts.get(name)??0)+1);let value;if(/^create(?:Shader|Program|Texture)$/.test(name)){value={kind:name,id:++serial};live.add(value);}if(/^delete/.test(name))live.delete(args[0]);if(name==='getShaderParameter'||name==='getProgramParameter')value=true;if(name==='getShaderInfoLog'||name==='getProgramInfoLog')value='driver failure';if(name==='isContextLost')value=false;if(name==='getError')value=0;const override=call(name,args,value,counts.get(name));return override===undefined?value:override;};}});
 const canvas={width:16,height:16,getContext:()=>gl,addEventListener(type,handler){const set=listeners.get(type)??new Set();listeners.set(type,set);set.add(handler);add(type,handler);},removeEventListener(type,handler){remove(type,handler);listeners.get(type)?.delete(handler);}};
 return {canvas,gl,calls,live,listeners,emit(type){for(const handler of [...listeners.get(type)??[]])handler({preventDefault(){}});},count:()=>[...listeners.values()].reduce((sum,set)=>sum+set.size,0)};
}
for(const [name,method,at]of [['shader compile','compileShader',2],['program link','linkProgram',1],['third texture configuration','texParameteri',9]])test(`${name} failure rolls back every acquired resource`,()=>{
 const fault=Error(name),f=fake({call(methodName,_args,_value,count){if(methodName===method&&count===at)throw fault;}});
 assert.throws(()=>new YUVPresenter(f.canvas),error=>error===fault);assert.equal(f.live.size,0);assert.equal(f.count(),0);
});
test('listener registration failure rolls back a listener installed before throwing',()=>{
 const fault=Error('listener'),f=fake({add(type){if(type==='webglcontextrestored')throw fault;}});
 assert.throws(()=>new YUVPresenter(f.canvas),error=>error===fault);assert.equal(f.count(),0);assert.equal(f.live.size,0);
});
test('null native allocation rejects and releases earlier handles',()=>{
 const f=fake({call(name,_args,value,count){if(name==='createTexture'&&count===3){f.live.delete(value);return null;}}});
 assert.throws(()=>new YUVPresenter(f.canvas),/allocation failed/);assert.equal(f.live.size,0);assert.equal(f.count(),0);
});
test('retirement during listener installation removes a late registered callback',()=>{
 const f=fake();class Retiring extends YUVPresenter{onLost(){this.destroy();}}
 const add=f.canvas.addEventListener;f.canvas.addEventListener=function(type,handler){if(type==='webglcontextlost')handler({preventDefault(){}});add.call(this,type,handler);};
 assert.throws(()=>new Retiring(f.canvas),/destroyed/);assert.equal(f.count(),0);assert.equal(f.live.size,0);
});
test('a texture returned after reentrant retirement is immediately released',()=>{
 const f=fake({call(name){if(name==='createTexture')f.emit('webglcontextlost');}});class Retiring extends YUVPresenter{onLost(){this.destroy();}}
 assert.throws(()=>new Retiring(f.canvas),/destroyed/);assert.equal(f.live.size,0);assert.equal(f.count(),0);assert.equal(f.calls.filter(name=>name==='createTexture').length,1);
});
test('destroy attempts every cleanup, revokes draw and callbacks first, and is idempotent',()=>{
 let active=false,removed=0,deleted=0,callback=0;const fault=Error('cleanup');
 const f=fake({remove(){removed++;if(active&&removed===1)throw fault;},call(name){if(active&&name==='deleteTexture'&&++deleted===1)throw fault;}}),p=new YUVPresenter(f.canvas);
 p.onLost=()=>callback++;p.onRestore=()=>callback++;const loss=p.lossHandler,restore=p.restoreHandler;active=true;
 assert.throws(()=>p.destroy(),error=>error instanceof AggregateError&&error.errors.length===2);assert.equal(removed,2);assert.equal(deleted,4);assert.equal(f.live.size,0);assert.equal(p.gl,null);assert.equal(p.stats.liveTextures,0);
 const count=f.calls.length;p.destroy();p.draw({},{});p.drawRGB({},0,1,1,4,0);p.drawSubtitleOverlay({});loss({preventDefault(){callback++;}});restore();assert.equal(callback,0);assert.equal(f.calls.length,count);
});
test('context reset retires handles without deleting already-lost GL objects',()=>{
 const f=fake(),p=new YUVPresenter(f.canvas),before=f.calls.length;p.destroy(true);assert.equal(f.count(),0);assert.equal(p.gl,null);assert.deepEqual(f.calls.slice(before),[]);p.draw({},{});
});
test('reentrant context status and subtitle read cannot submit a post-destroy draw',()=>{
 let p;const f=fake({call(name){if(name==='isContextLost'&&p)p.destroy();}});p=new YUVPresenter(f.canvas);const before=f.calls.length;p.draw({},{});assert.ok(!f.calls.slice(before).includes('useProgram'));
 const g=fake(),q=new YUVPresenter(g.canvas);q.subtitles.read=()=>{q.destroy();return{surface:null};};const second=g.calls.length;q.drawSubtitleOverlay({});assert.ok(!g.calls.slice(second).includes('activeTexture'));
});
test('live context still submits YUV and RGB frames and preserves upload accounting',()=>{
 const f=fake(),p=new YUVPresenter(f.canvas),engine={HEAPU8:new Uint8Array([16,32,48,64,128,128])};p.subtitles.read=()=>({surface:null});
 p.draw(engine,{w:2,h:2,planes:[0,4,5],strides:[2,1,1],dst:[0,0,16,16],src:[0,0,2,2],rotate:0,system:1,full:0,pts:2});
 p.drawRGB(engine,0,1,1,4,3);assert.equal(p.stats.frames,2);assert.equal(p.stats.fallbackFrames,1);assert.equal(p.stats.videoUploads,4);assert.equal(p.stats.videoUploadBytes,10);assert.equal(p.stats.liveTextures,4);assert.equal(f.calls.filter(name=>name==='drawArrays').length,2);p.destroy();assert.equal(f.live.size,0);assert.equal(f.count(),0);
});
