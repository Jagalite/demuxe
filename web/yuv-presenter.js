// SPDX-License-Identifier: Apache-2.0
import {SubtitleOverlay} from './subtitle-overlay.js';
export class YUVPresenter {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
  if(!this.gl)throw Error('WebGL2 unavailable');const gl=this.gl;
  this.stats={fallbackFrames:0,rgbCopyBytes:0,frames:0,videoUploads:0,videoUploadBytes:0,planeCopyBytes:0,stagingAllocations:0,rgbAllocations:0,subtitleUploads:0,subtitleUploadBytes:0,videoReadbacks:0,liveTextures:0,peakStagingBytes:0,drawMs:0,planeCopyMs:0,uploadSubmitMs:0,shaderSubmitMs:0,overlayMs:0,lastPts:0};
  this.textures=[];this.shaders=[];this.listeners=[];this.staging=[];this.sizes=[];
  const current=()=>{if(this.gl!==gl)throw Error('YUV presenter destroyed');};
  const call=(name,...args)=>{current();const method=gl[name];current();const value=method.call(gl,...args);current();return value;};
  const own=(name,release,...args)=>{current();const method=gl[name];current();const value=method.call(gl,...args);if(this.gl!==gl){if(value)try{gl[release](value);}catch{}throw Error('YUV presenter destroyed');}if(!value)throw Error(`YUV ${name} allocation failed`);return value;};
  const listen=(type,handler)=>{const remove=()=>canvas.removeEventListener(type,handler);this.listeners.push(remove);try{const add=canvas.addEventListener;current();add.call(canvas,type,handler);current();}catch(error){if(this.gl!==gl)try{remove();}catch{}throw error;}};
  this.lossHandler=e=>{if(this.gl!==gl)return;e.preventDefault();if(this.gl!==gl)return;this.lost=true;const callback=this.onLost;if(this.gl===gl)callback?.call(this);};
  this.restoreHandler=()=>{if(this.gl!==gl)return;const callback=this.onRestore;if(this.gl===gl)callback?.call(this);};
  try{
  listen('webglcontextlost',this.lossHandler);listen('webglcontextrestored',this.restoreHandler);
  const shader=(type,source)=>{const s=own('createShader','deleteShader',type);this.shaders.push(s);call('shaderSource',s,source);call('compileShader',s);if(!call('getShaderParameter',s,gl.COMPILE_STATUS))throw Error(call('getShaderInfoLog',s));return s;};
  const vs=shader(gl.VERTEX_SHADER,`#version 300 es
  out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=vec2(p.x,1.-p.y);gl_Position=vec4(p*2.-1.,0,1);}`);
  const fs=shader(gl.FRAGMENT_SHADER,`#version 300 es
  precision highp float;in vec2 uv;out vec4 color;
  uniform sampler2D Y;uniform sampler2D U;uniform sampler2D V;uniform sampler2D overlay;
  uniform vec4 crop;uniform vec2 chromaScale;uniform vec2 chromaOffset;uniform int rotation;uniform int is709;uniform int fullRange;uniform int overlayPass;
  uniform int rgbRotation;uniform int rgbSwapped;uniform vec2 rgbCanvas;
  void main(){if(overlayPass!=0){
   vec2 q=uv;
   if(overlayPass==2){
    vec2 p=(uv-.5)*rgbCanvas;
    if(rgbRotation==90)q=rgbSwapped==1?vec2(uv.y,1.-uv.x):.5+vec2(p.y,-p.x)/rgbCanvas;
    else if(rgbRotation==180)q=1.-uv;
    else if(rgbRotation==270)q=rgbSwapped==1?vec2(1.-uv.y,uv.x):.5+vec2(-p.y,p.x)/rgbCanvas;
   }
   color=any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.)))?vec4(0.,0.,0.,1.):overlayPass==2?texture(Y,q):texture(overlay,q);
   if(overlayPass==2)color.a=1.;return;}
   vec2 c=crop.xy+uv*crop.zw;
   if(rotation==90)c=vec2(c.y,1.-c.x);else if(rotation==180)c=1.-c;else if(rotation==270)c=vec2(1.-c.y,c.x);
   vec2 chromaCoord=c*chromaScale+chromaOffset;
   float y=texture(Y,c).r,u=texture(U,chromaCoord).r-128./255.,v=texture(V,chromaCoord).r-128./255.;
   if(fullRange==0){y=(y-16./255.)*255./219.;u*=255./224.;v*=255./224.;}
   vec3 rgb=is709==1?vec3(y+1.5748*v,y-.187324*u-.468124*v,y+1.8556*u):vec3(y+1.402*v,y-.344136*u-.714136*v,y+1.772*u);
   color=vec4(rgb,1);}`);
  this.program=own('createProgram','deleteProgram');call('attachShader',this.program,vs);call('attachShader',this.program,fs);call('linkProgram',this.program);while(this.shaders.length){current();gl.deleteShader(this.shaders.shift());current();}
  if(!call('getProgramParameter',this.program,gl.LINK_STATUS))throw Error(call('getProgramInfoLog',this.program));call('useProgram',this.program);
  this.loc=Object.fromEntries(['crop','chromaScale','chromaOffset','rotation','is709','fullRange','overlayPass','rgbRotation','rgbSwapped','rgbCanvas'].map(k=>[k,call('getUniformLocation',this.program,k)]));
  for(let i=0;i<4;i++){const t=own('createTexture','deleteTexture');this.textures.push(t);this.stats.liveTextures=this.textures.length;call('activeTexture',gl.TEXTURE0+i);call('bindTexture',gl.TEXTURE_2D,t);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])call('texParameteri',gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])call('texParameteri',gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);call('uniform1i',call('getUniformLocation',this.program,['Y','U','V','overlay'][i]),i);}
  this.staging=[];this.sizes=[];this.subtitles=new SubtitleOverlay();this.overlay=new OffscreenCanvas(canvas.width,canvas.height);current();this.overlayContext=this.overlay.getContext('2d');current();if(!this.overlayContext)throw Error('Subtitle overlay canvas unavailable');
  }catch(error){try{YUVPresenter.prototype.destroy.call(this);}catch{}throw error;}
 }
 draw(engine,d){
  const begin=performance.now(),gl=this.gl;if(!gl||this.lost||gl.isContextLost()||this.gl!==gl)return;
  gl.useProgram(this.program);gl.disable(gl.BLEND);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  for(let i=0;i<3;i++){
   const planeStart=performance.now();
   const w=i?Math.ceil(d.w/2):d.w,h=i?Math.ceil(d.h/2):d.h;
   if(this.staging[i]?.length!==w*h){this.staging[i]=new Uint8Array(w*h);this.stats.stagingAllocations++;}
   const bytes=this.staging[i];for(let row=0;row<h;row++)bytes.set(engine.HEAPU8.subarray(d.planes[i]+row*d.strides[i],d.planes[i]+row*d.strides[i]+w),row*w);
   if(this.gl!==gl)return;this.stats.planeCopyMs+=performance.now()-planeStart;
   const uploadStart=performance.now();
   this.stats.planeCopyBytes+=bytes.length;gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);
   if(this.sizes[i]!==`${w}x${h}`){gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,w,h,0,gl.RED,gl.UNSIGNED_BYTE,null);this.sizes[i]=`${w}x${h}`;}
   gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RED,gl.UNSIGNED_BYTE,bytes);this.stats.videoUploads++;this.stats.videoUploadBytes+=bytes.length;
   this.stats.uploadSubmitMs+=performance.now()-uploadStart;
  }
  const shaderStart=performance.now();
  this.stats.peakStagingBytes=Math.max(this.stats.peakStagingBytes,this.staging.reduce((s,b)=>s+b.length,0));
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const [x,y,w,h]=d.dst,cw=Math.ceil(d.w/2),ch=Math.ceil(d.h/2),shift=d.chroma||[0,0];
  gl.viewport(x,this.canvas.height-y-h,w,h);gl.uniform1i(this.loc.overlayPass,0);gl.uniform1i(this.loc.is709,d.system);gl.uniform1i(this.loc.fullRange,d.full);
  gl.uniform2f(this.loc.chromaScale,d.w/(2*cw),d.h/(2*ch));
  gl.uniform2f(this.loc.chromaOffset,-shift[0]/(2*cw),-shift[1]/(2*ch));
  const rotated=d.rotate%180!==0,rw=rotated?d.h:d.w,rh=rotated?d.w:d.h;gl.uniform1i(this.loc.rotation,d.rotate);gl.uniform4f(this.loc.crop,d.src[0]/rw,d.src[1]/rh,d.src[2]/rw,d.src[3]/rh);gl.drawArrays(gl.TRIANGLES,0,3);
  this.stats.shaderSubmitMs+=performance.now()-shaderStart;
  const overlayStart=performance.now();
  this.drawSubtitleOverlay(engine);if(this.gl!==gl)return;
  this.stats.overlayMs+=performance.now()-overlayStart;
  const error=gl.getError();if(error)throw Error(`YUV GL error ${error}`);
  this.stats.frames++;this.stats.lastPts=d.pts;this.stats.drawMs+=performance.now()-begin;
 }
 drawSubtitleOverlay(engine){
  const gl=this.gl;if(!gl||this.lost||gl.isContextLost()||this.gl!==gl)return;
  const snapshot=this.subtitles.read(engine);if(this.gl!==gl)return;
  const shape=`${this.canvas.width}x${this.canvas.height}`;
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.textures[3]);
  if(this.overlayShape!==shape){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.canvas.width,this.canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.overlayShape=shape;this.lastSnapshot=null;this.lastBounds=null;}
  if(this.lastSnapshot!==snapshot){
   const current=snapshot.surface?[snapshot.x,snapshot.y,snapshot.x+snapshot.surface.width,snapshot.y+snapshot.surface.height]:null;
   const both=[current,this.lastBounds].filter(Boolean);
   if(both.length){const x=Math.min(...both.map(b=>b[0])),y=Math.min(...both.map(b=>b[1])),w=Math.max(...both.map(b=>b[2]))-x,h=Math.max(...both.map(b=>b[3]))-y;
    if(w>0&&h>0){this.overlay.width=w;this.overlay.height=h;this.overlayContext.setTransform(1,0,0,1,-x,-y);this.subtitles.draw(this.overlayContext,snapshot);gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,gl.RGBA,gl.UNSIGNED_BYTE,this.overlay);this.stats.subtitleUploads++;this.stats.subtitleUploadBytes+=w*h*4;}
   }
   this.lastSnapshot=snapshot;this.lastBounds=current;
  }
  if(snapshot.surface){gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1i(this.loc.overlayPass,1);gl.drawArrays(gl.TRIANGLES,0,3);}
 }
 drawRGB(engine,ptr,w,h,stride,pts,rotate=0,swapped=0,separateOSD=0){
  const gl=this.gl;if(!gl||this.lost||gl.isContextLost()||this.gl!==gl)return;
  if(this.rgb?.length!==w*h*4){this.rgb=new Uint8Array(w*h*4);this.stats.rgbAllocations++;}
  for(let row=0;row<h;row++)this.rgb.set(engine.HEAPU8.subarray(ptr+row*stride,ptr+row*stride+w*4),row*w*4);
  if(this.gl!==gl)return;gl.useProgram(this.program);gl.disable(gl.BLEND);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);
  if(this.sizes[0]!==`rgb:${w}x${h}`){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.sizes[0]=`rgb:${w}x${h}`;}
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,this.rgb);gl.uniform1i(this.loc.rgbRotation,rotate);gl.uniform1i(this.loc.rgbSwapped,swapped);gl.uniform2f(this.loc.rgbCanvas,w,h);gl.uniform1i(this.loc.overlayPass,2);gl.drawArrays(gl.TRIANGLES,0,3);
  if(separateOSD)this.drawSubtitleOverlay(engine);if(this.gl!==gl)return;
  const error=gl.getError();if(error)throw Error(`RGB GL error ${error}`);
  this.stats.frames++;this.stats.fallbackFrames++;this.stats.rgbCopyBytes+=this.rgb.length;this.stats.videoUploads++;this.stats.videoUploadBytes+=this.rgb.length;this.stats.lastPts=pts;
 }
 destroy(contextReset=false){
  const gl=this.gl;if(!gl)return;
  // Revoke the physical context handle before any cleanup callback can reenter.
  this.gl=null;const listeners=this.listeners??[],shaders=this.shaders??[],textures=this.textures??[],program=this.program,subtitles=this.subtitles;
  this.listeners=[];this.shaders=[];this.textures=[];this.program=null;this.staging=[];this.sizes=[];this.rgb=null;this.subtitles=null;this.overlay=null;this.overlayContext=null;this.lastSnapshot=null;this.lastBounds=null;if(this.stats)this.stats.liveTextures=0;
  const errors=[],clean=run=>{try{run();}catch(error){errors.push(error);}};
  for(const remove of listeners)clean(remove);
  if(!contextReset){for(const shader of shaders)clean(()=>gl.deleteShader(shader));for(const texture of textures)clean(()=>gl.deleteTexture(texture));if(program)clean(()=>gl.deleteProgram(program));}
  if(subtitles)clean(()=>subtitles.clear());
  if(errors.length)throw new AggregateError(errors,'YUV presenter cleanup failed');
 }
}
