// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {SubtitleOverlay} from '../web/subtitle-overlay.js';
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
globalThis.OffscreenCanvas=class{constructor(w,h){this.width=w;this.height=h;}getContext(){return {putImageData:image=>{this.image=image;}};}};
function engine(w,h){const bytes=w*h*4,buffer=new ArrayBuffer(48+bytes),header=new Int32Array(buffer,0,12);header.set([1,1,bytes,0,w,h,1,1,0,0,w,h]);return {HEAPU8:new Uint8Array(buffer),_web_subtitle_ptr:()=>0,_web_subtitle_overlay_version:()=>2,_web_subtitle_composite_count:()=>1};}
test('a full 1080p mpv overlay fits and unchanged snapshots are reused',()=>{const overlay=new SubtitleOverlay(),e=engine(1920,1080),snapshot=overlay.read(e);assert.equal(snapshot.surface.width,1920);assert.equal(overlay.stats.peakBytes,1920*1080*4);assert.equal(overlay.stats.composites,1);assert.equal(overlay.read(e),snapshot);});
test('display conversion preserves premultiplied colors, positioning and pending snapshots',()=>{const overlay=new SubtitleOverlay(),e=engine(2,1),h=new Int32Array(e.HEAPU8.buffer,0,12);h[4]=100;h[5]=100;h[8]=10;h[9]=20;e.HEAPU8.set([16,32,64,128,0,0,0,0],48);const snapshot=overlay.read(e);assert.deepEqual([...snapshot.surface.image.data],[128,64,32,128,0,0,0,0]);const calls=[];overlay.draw({drawImage:(...args)=>calls.push(args)},snapshot);assert.deepEqual(calls,[[snapshot.surface,10,20]]);h[0]++;e.HEAPU8.fill(255,48);assert.notEqual(overlay.read(e).surface,snapshot.surface);assert.equal(snapshot.surface.image.data[0],128);h[0]++;h[1]=h[2]=0;assert.equal(overlay.read(e).surface,null);overlay.draw({drawImage:()=>assert.fail('empty overlay drawn')},overlay.snapshot);});
test('invalid bounds and obsolete tile engines cannot reach the display',()=>{const e=engine(1,1);e._web_subtitle_overlay_version=undefined;assert.throws(()=>new SubtitleOverlay().read(e),/requires rebuild/);for(const [index,value]of [[1,2],[2,5],[4,1921],[8,-1],[10,2]]){const e=engine(1,1);new Int32Array(e.HEAPU8.buffer)[index]=value;assert.throws(()=>new SubtitleOverlay().read(e),/Invalid subtitle packet/);}});
test('malformed export and fallback budget errors remain distinct',()=>{for(const [status,message]of [[-1,'Subtitle bitmap budget exceeded'],[-2,'Invalid subtitle packet'],[-3,'Subtitle composition failed']]){const e=engine(1,1);new Int32Array(e.HEAPU8.buffer)[3]=status;assert.throws(()=>new SubtitleOverlay().read(e),new RegExp(message));}});

// Exercise the actual YUV presenter with a recording GL adapter. This catches
// consumer API drift and verifies clearing the old region after movement/hide.
import {YUVPresenter} from '../web/yuv-presenter.js';
test('YUV presents composed overlays and clears moved or hidden subtitles',()=>{
 const calls=[];
 const gl=new Proxy({isContextLost:()=>false,getError:()=>0},{get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);}});
 const overlay=new SubtitleOverlay(),e=engine(2,1),header=new Int32Array(e.HEAPU8.buffer,0,12);header[4]=100;header[5]=100;
 const presenter=Object.assign(Object.create(YUVPresenter.prototype),{
  gl,staging:[],sizes:[],stats:{planeCopyBytes:0,videoUploads:0,videoUploadBytes:0,peakStagingBytes:0,subtitleUploads:0,subtitleUploadBytes:0,frames:0,drawMs:0},
  textures:[],canvas:{width:100,height:100},loc:{},subtitles:overlay,overlay:{},
  overlayContext:{setTransform:(...args)=>calls.push(['transform',...args]),drawImage:(...args)=>calls.push(['image',...args])},
 });
 const descriptor={w:2,h:2,planes:[48,48,48],strides:[2,1,1],dst:[0,0,100,100],src:[0,0,2,2],rotate:0,pts:0};
 header[1]=header[2]=0;presenter.draw(e,descriptor);assert.equal(presenter.stats.subtitleUploads,0);
 header[0]++;header[1]=1;header[2]=8;header[8]=10;header[9]=20;
 presenter.draw(e,descriptor);assert.deepEqual(presenter.lastBounds,[10,20,12,21]);assert.equal(presenter.stats.subtitleUploads,1);
 presenter.draw(e,descriptor);assert.equal(presenter.stats.subtitleUploads,1,'unchanged snapshot reuses texture');
 header[0]++;header[8]=30;header[9]=40;presenter.draw(e,descriptor);
 assert.deepEqual(presenter.lastBounds,[30,40,32,41]);assert.equal(presenter.overlay.width,22);assert.equal(presenter.overlay.height,21);
 const images=calls.filter(c=>c[0]==='image').length;
 header[0]++;header[1]=header[2]=0;presenter.draw(e,descriptor);
 assert.equal(presenter.lastBounds,null);assert.equal(presenter.stats.subtitleUploads,3,'hide clears the previous rectangle');
 assert.equal(presenter.overlay.width,2);assert.equal(presenter.overlay.height,1);assert.equal(calls.filter(c=>c[0]==='image').length,images,'hide draws no subtitle image');
});
