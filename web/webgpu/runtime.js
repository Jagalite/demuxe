// SPDX-License-Identifier: Apache-2.0
import {webgpuDecoderSupported,webgpuRequiredFeatures,createWebGPUCodecAdapter} from './codecs/registry.js';
import {assertWebGPUCodecAdapter} from './codecs/adapter.js';

// Device-local service for future codec adapters. All GPU objects and decoded
// surfaces remain in the playback worker; no GPUTexture crosses a worker port.
// Adapter contract: configure(config), submitPacket(packet), receiveFrame(),
// flush(), reset(), destroy(). A received frame contains {pts,duration,
// generation,surface,width,height,pixelFormat,color,close()}.
export class WebGPUCodecRuntime {
  constructor({gpu=globalThis.navigator?.gpu,maxQueuedPackets=8,maxSurfaces=16,
    maxSurfaceBytes=512*1024*1024,maxPooledBufferBytes=64*1024*1024,
    maxLiveBufferBytes=128*1024*1024,maxPipelines=64,onDeviceLost,onFrameAvailable}={}){
    this.gpu=gpu;this.maxQueuedPackets=maxQueuedPackets;this.maxSurfaces=maxSurfaces;
    this.maxSurfaceBytes=maxSurfaceBytes;this.maxPooledBufferBytes=maxPooledBufferBytes;
    this.maxLiveBufferBytes=maxLiveBufferBytes;this.maxPipelines=maxPipelines;
    this.adapter=null;this.device=null;this.gpuAdapter=null;this.generation=0;
    this.queuedPackets=0;this.surfaces=new Set();this.pipelines=new Map();
    this.buffers=new Set();this.bufferSizes=new Map();this.liveBufferBytes=0;
    this.bufferRoles=new Map();this.freeBuffers=new Map();this.freeBufferHandles=new Set();this.pooledBufferBytes=0;
    this.surfaceTextures=new Map();this.freeSurfaces=new Map();this.freeSurfaceHandles=new Set();this.surfaceBytes=0;
    this.submissions=0;this.sequence=0;this.deviceLost=false;
    this.destroyed=false;this.codec=null;this.failure=null;this.acquiring=null;
    this.onDeviceLost=onDeviceLost;this.onFrameAvailable=onFrameAvailable;
  }
  static supports(codec){return webgpuDecoderSupported(codec);}
  get available(){return !!this.gpu&&!this.deviceLost;}
  get diagnostics(){return {available:this.available,selected:!!this.adapter,codec:this.codec,
    queuedPackets:this.queuedPackets+(this.adapter?.queuedPackets??0),retainedFrames:this.surfaces.size,
    liveSurfaces:this.surfaceTextures.size,surfaceBytes:this.surfaceBytes,liveBufferBytes:this.liveBufferBytes,
    pooledBufferBytes:this.pooledBufferBytes,pipelineCount:this.pipelines.size,
    submissions:this.submissions,deviceLost:this.deviceLost};}
  async acquireDevice(requiredFeatures=[]){
    if(this.destroyed)throw Error('WebGPU runtime destroyed');
    if(this.deviceLost)throw Error('WebGPU device lost');
    if(this.device){if(requiredFeatures.some(feature=>!this.device.features?.has(feature)))throw Error('WebGPU device lacks codec feature');return this.device;}
    if(this.acquiring){const device=await this.acquiring;
      if(requiredFeatures.some(feature=>!device.features?.has(feature)))throw Error('WebGPU device lacks codec feature');
      return device;}
    if(!this.gpu)throw Error('WebGPU unavailable');
    this.acquiring=(async()=>{
      this.gpuAdapter=await this.gpu.requestAdapter();
      if(!this.gpuAdapter)throw Error('WebGPU adapter unavailable');
      if(requiredFeatures.some(feature=>!this.gpuAdapter.features?.has(feature)))throw Error('WebGPU adapter lacks codec feature');
      const device=await this.gpuAdapter.requestDevice({requiredFeatures});
      if(this.destroyed){device.destroy();throw Error('WebGPU runtime destroyed');}
      this.device=device;
      void device.lost.then(info=>{
        if(this.device!==device)return;
        this.deviceLost=true;this.failure=String(info?.message??'WebGPU device lost');
        this.generation++;this.releaseSurfaces();this.queuedPackets=0;
        const adapter=this.adapter;this.adapter=null;this.codec=null;
        if(adapter)void Promise.resolve().then(()=>adapter.destroy()).catch(()=>{});
        for(const buffer of this.buffers)buffer.destroy();this.buffers.clear();this.bufferSizes.clear();this.liveBufferBytes=0;
        this.bufferRoles.clear();this.freeBuffers.clear();this.freeBufferHandles.clear();this.pooledBufferBytes=0;
        for(const texture of this.surfaceTextures.keys())texture.destroy();
        this.surfaceTextures.clear();this.freeSurfaces.clear();this.freeSurfaceHandles.clear();this.surfaceBytes=0;
        this.pipelines.clear();device.destroy();this.device=null;
        this.onDeviceLost?.(this.failure);
      });
      return device;
    })();
    try{return await this.acquiring;}finally{this.acquiring=null;}
  }
  async configure(codec,config){
    if(!webgpuDecoderSupported(codec))return false;
    await this.reset();
    const generation=this.generation;
    const device=await this.acquireDevice(webgpuRequiredFeatures(codec));
    const adapter=assertWebGPUCodecAdapter(await createWebGPUCodecAdapter(codec,{runtime:this,device,generation:this.generation,
      maxQueuedPackets:this.maxQueuedPackets,maxRetainedFrames:this.maxSurfaces,
      notifyFrameAvailable:()=>{if(!this.deviceLost)this.onFrameAvailable?.();}}),codec);
    try{await adapter.configure(config);}catch(error){try{await adapter.destroy();}catch{/* Preserve the configuration failure. */}throw error;}
    if(generation!==this.generation||this.destroyed||this.deviceLost){await adapter.destroy();throw Error('WebGPU decoder configuration invalidated');}
    this.adapter=adapter;this.codec=codec;this.failure=null;return true;
  }
  async submit(packet){
    if(!this.adapter||this.deviceLost)throw Error(this.failure??'WebGPU decoder unavailable');
    if(!(packet.bytes instanceof Uint8Array)||packet.bytes.length<1||packet.bytes.length>8*1024*1024||
      typeof packet.key!=='boolean'||!Number.isSafeInteger(packet.pts)||!Number.isSafeInteger(packet.duration)||packet.duration<0)
      throw Error('Invalid WebGPU decoder packet');
    if(this.queuedPackets+(this.adapter.queuedPackets??0)>=this.maxQueuedPackets)return false;
    if(packet.generation!==undefined&&packet.generation!==this.generation)return false;
    const generation=this.generation;
    packet.sequence=++this.sequence;
    this.queuedPackets++;
    try{await this.adapter.submitPacket(packet);if(generation!==this.generation)return false;
      this.submissions++;return true;}
    finally{this.queuedPackets=Math.max(0,this.queuedPackets-1);}
  }
  receiveFrame(){
    if(!this.adapter)return null;
    const frame=this.adapter.receiveFrame();if(!frame)return null;
    if(typeof frame.close!=='function')throw Error('WebGPU decoded frame has no release method');
    if(frame.generation!==this.generation){frame.close();return null;}
    if(this.surfaces.size>=this.maxSurfaces){frame.close();throw Error('WebGPU retained surface bound exceeded');}
    const maxDimension=this.device?.limits?.maxTextureDimension2D??8192;
    if(!frame.surface||!Number.isSafeInteger(frame.pts)||!Number.isSafeInteger(frame.duration)||frame.duration<0||
      !Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<1||frame.height<1||
      frame.width>maxDimension||frame.height>maxDimension||!frame.pixelFormat||!frame.color||typeof frame.close!=='function'){
      frame.close?.();throw Error('Invalid WebGPU decoded frame');
    }
    const close=frame.close.bind(frame);let closed=false;
    const owned={...frame,close:()=>{if(closed)return;closed=true;this.surfaces.delete(owned);close();}};
    this.surfaces.add(owned);return owned;
  }
  async drain(){await this.adapter?.flush();}
  async reset(){
    this.generation++;this.queuedPackets=0;this.releaseSurfaces();
    let failure;
    if(this.adapter){const adapter=this.adapter;this.adapter=null;this.codec=null;
      try{await adapter.reset();}catch(error){failure=error;}
      try{await adapter.destroy();}catch(error){failure??=error;}}
    for(const buffer of this.buffers)buffer.destroy();this.buffers.clear();this.bufferSizes.clear();this.liveBufferBytes=0;
    this.bufferRoles.clear();this.freeBuffers.clear();this.freeBufferHandles.clear();this.pooledBufferBytes=0;
    for(const texture of this.surfaceTextures.keys())texture.destroy();
    this.surfaceTextures.clear();this.freeSurfaces.clear();this.freeSurfaceHandles.clear();this.surfaceBytes=0;
    if(failure)throw failure;
  }
  releaseSurfaces(){for(const frame of [...this.surfaces])frame.close();}
  pipeline(key,create){
    if(this.destroyed||this.deviceLost||!this.device)throw Error('WebGPU runtime unavailable');
    if(!this.pipelines.has(key)){
      if(this.pipelines.size>=this.maxPipelines)throw Error('WebGPU pipeline cache bound exceeded');
      this.pipelines.set(key,create(this.device));
    }
    return this.pipelines.get(key);
  }
  async loadShader(url){
    let response;
    try{response=await fetch(url);}catch(error){const failure=Error('WebGPU shader asset failed to load: '+String(error));failure.assetFailure=true;throw failure;}
    if(!response.ok){const failure=Error('WebGPU shader asset failed to load: HTTP '+response.status);failure.assetFailure=true;throw failure;}
    return response.text();
  }
  buffer(descriptor){
    if(!this.device||this.deviceLost)throw Error('WebGPU device unavailable');
    const size=descriptor?.size;
    if(!Number.isSafeInteger(size)||size<1||size>(this.device.limits?.maxBufferSize??Number.MAX_SAFE_INTEGER)||
      !Number.isInteger(descriptor.usage)||descriptor.usage<1)throw Error('Invalid WebGPU buffer descriptor');
    if(this.liveBufferBytes+size>this.maxLiveBufferBytes)throw Error('WebGPU live buffer byte bound exceeded');
    const buffer=this.device.createBuffer(descriptor);
    this.buffers.add(buffer);this.bufferSizes.set(buffer,size);this.liveBufferBytes+=size;return buffer;
  }
  acquireBuffer(role,descriptor){
    if(!['input','metadata','scratch'].includes(role))throw Error('Invalid WebGPU buffer role');
    const key=`${role}:${descriptor.size}:${descriptor.usage}`;
    const free=this.freeBuffers.get(key),pooled=free?.pop();
    if(free?.length===0)this.freeBuffers.delete(key);
    if(pooled)this.pooledBufferBytes-=descriptor.size;
    const buffer=pooled??this.buffer(descriptor);
    this.freeBufferHandles.delete(buffer);
    this.bufferRoles.set(buffer,key);return buffer;
  }
  releaseBuffer(buffer){
    if(!this.buffers.has(buffer))return;
    if(this.freeBufferHandles.has(buffer))return;
    const key=this.bufferRoles.get(buffer);
    const size=key?Number(key.split(':')[1]):0;
    if(key&&this.freeBuffers.size<32&&this.pooledBufferBytes+size<=this.maxPooledBufferBytes){const free=this.freeBuffers.get(key)??[];
      if(free.length<4){free.push(buffer);this.freeBufferHandles.add(buffer);this.freeBuffers.set(key,free);this.pooledBufferBytes+=size;return;}}
    this.bufferRoles.delete(buffer);this.buffers.delete(buffer);
    this.liveBufferBytes-=this.bufferSizes.get(buffer)??0;this.bufferSizes.delete(buffer);buffer.destroy();
  }
  acquireSurface(descriptor){
    if(!this.device||this.deviceLost)throw Error('WebGPU device unavailable');
    const key=JSON.stringify([descriptor.size,descriptor.format,descriptor.usage]);
    const free=this.freeSurfaces.get(key),pooled=free?.pop();
    if(free?.length===0)this.freeSurfaces.delete(key);
    if(pooled){this.freeSurfaceHandles.delete(pooled);return pooled;}
    if(this.surfaceTextures.size>=this.maxSurfaces)throw Error('WebGPU surface pool bound exceeded');
    const size=descriptor.size,width=Number(size?.width??size?.[0]),height=Number(size?.height??size?.[1]);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('Invalid WebGPU surface size');
    if(width>(this.device.limits?.maxTextureDimension2D??8192)||height>(this.device.limits?.maxTextureDimension2D??8192)||
      (size?.depthOrArrayLayers??size?.[2]??1)!==1||(descriptor.mipLevelCount??1)!==1||(descriptor.sampleCount??1)!==1)
      throw Error('Unsupported WebGPU surface dimensions');
    const bytesPerPixel={r8unorm:1,r16float:2,r16unorm:2,rgba8unorm:4}[descriptor.format]??16;
    const bytes=width*height*bytesPerPixel;
    if(this.surfaceBytes+bytes>this.maxSurfaceBytes)throw Error('WebGPU surface byte bound exceeded');
    const texture=this.device.createTexture(descriptor);this.surfaceTextures.set(texture,{key,bytes});this.surfaceBytes+=bytes;return texture;
  }
  releaseSurface(texture){
    const entry=this.surfaceTextures.get(texture);if(!entry||this.freeSurfaceHandles.has(texture))return;
    this.freeSurfaceHandles.add(texture);
    const free=this.freeSurfaces.get(entry.key)??[];free.push(texture);this.freeSurfaces.set(entry.key,free);
  }
  async destroy(){
    if(this.destroyed)return;this.destroyed=true;
    try{await this.reset();}finally{
      for(const buffer of this.buffers)buffer.destroy();this.buffers.clear();this.bufferSizes.clear();this.liveBufferBytes=0;
      this.bufferRoles.clear();this.freeBuffers.clear();this.freeBufferHandles.clear();this.pooledBufferBytes=0;this.pipelines.clear();
      this.device?.destroy();this.device=null;this.gpuAdapter=null;
    }
  }
}
