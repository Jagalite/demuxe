// SPDX-License-Identifier: Apache-2.0
import {retainedVideoGeometry} from '../retained-video.js';
import {SubtitleOverlay} from '../subtitle-overlay.js';

// A device-local planar YUV surface is {planes:[YView,UView,VView]}. Eight-bit
// samples use r8unorm, ten-bit samples use normalized r16float, and 12/16-bit
// samples use rg8unorm high/low code bytes. The last form preserves integer
// precision that r16float would lose. All views belong to runtime.device.
const shader=`
struct Params { crop: vec4f, range: vec4f, conversion: vec4f, rotation: vec4f, extent: vec4f };
@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var yPlane: texture_2d<f32>;
@group(0) @binding(2) var uPlane: texture_2d<f32>;
@group(0) @binding(3) var vPlane: texture_2d<f32>;
@group(0) @binding(4) var<uniform> params: Params;
struct VOut { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vertex(@builtin(vertex_index) id:u32)->VOut {
  var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var out:VOut;out.position=vec4f(positions[id],0.,1.);
  out.uv=vec2f((positions[id].x+1.)*.5,(1.-positions[id].y)*.5);return out;
}
@fragment fn fragment(input:VOut)->@location(0) vec4f {
  let p=(input.uv-.5)*params.extent.xy;
  let rotated=vec2f(params.rotation.x*p.x+params.rotation.y*p.y,
                   -params.rotation.y*p.x+params.rotation.x*p.y)+.5;
  let inBounds=all(rotated>=vec2f(0.))&&all(rotated<=vec2f(1.));
  let uv=params.crop.xy+rotated*params.crop.zw;
  let ys=textureSample(yPlane,linearSampler,uv);
  let chromaUV=uv+params.rotation.zw;
  let us=textureSample(uPlane,linearSampler,chromaUV);
  let vs=textureSample(vPlane,linearSampler,chromaUV);
  let packed=params.extent.w>.5;
  let y=select(ys.r,(ys.r*65280.+ys.g*255.)*params.extent.z,packed);
  let u=select(us.r,(us.r*65280.+us.g*255.)*params.extent.z,packed)-params.range.w;
  let v=select(vs.r,(vs.r*65280.+vs.g*255.)*params.extent.z,packed)-params.range.w;
  let l=(y-params.range.x)*params.range.y;
  let c=params.range.z;
  if(!inBounds){return vec4f(0.,0.,0.,1.);}
  return vec4f(l+params.conversion.x*v*c,
               l-params.conversion.y*u*c-params.conversion.z*v*c,
               l+params.conversion.w*u*c,1.);
}`;
const overlayShader=`
@group(0) @binding(0) var linearSampler:sampler;
@group(0) @binding(1) var image:texture_2d<f32>;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index) id:u32)->VOut {
  var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var out:VOut;out.position=vec4f(p[id],0.,1.);
  out.uv=vec2f((p[id].x+1.)*.5,(1.-p[id].y)*.5);return out;
}
@fragment fn fragment(input:VOut)->@location(0) vec4f {
  return textureSample(image,linearSampler,input.uv);
}`;

export class WebGPUPresenter {
  constructor(canvas,runtime){
    if(!runtime.device||runtime.deviceLost)throw Error('WebGPU device unavailable');
    this.canvas=canvas;this.runtime=runtime;this.device=runtime.device;
    this.context=canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas unavailable');
    this.format=runtime.gpu.getPreferredCanvasFormat();
    this.context.configure({device:this.device,format:this.format,alphaMode:'opaque'});
    this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
    this.uniform=this.runtime.buffer({size:80,usage:0x40|0x08}); // UNIFORM | COPY_DST
    this.pipeline=this.runtime.pipeline(`planar-yuv-present:${this.format}`,device=>device.createRenderPipeline({
      layout:'auto',vertex:{module:device.createShaderModule({code:shader}),entryPoint:'vertex'},
      fragment:{module:device.createShaderModule({code:shader}),entryPoint:'fragment',targets:[{format:this.format}]},
      primitive:{topology:'triangle-list'},
    }));
    this.overlayPipeline=this.runtime.pipeline(`subtitle-overlay:${this.format}`,device=>device.createRenderPipeline({
      layout:'auto',vertex:{module:device.createShaderModule({code:overlayShader}),entryPoint:'vertex'},
      fragment:{module:device.createShaderModule({code:overlayShader}),entryPoint:'fragment',targets:[{format:this.format,
        blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
      primitive:{topology:'triangle-list'},
    }));
    this.subtitleCanvas=new OffscreenCanvas(canvas.width,canvas.height);
    this.subtitleContext=this.subtitleCanvas.getContext('2d');
    this.subtitles=new SubtitleOverlay();
    this.overlayTexture=null;
    this.overlayStaging=null;
    this.frames=0;this.destroyed=false;
  }
  draw(frame,track,subtitleSnapshot){
    if(this.destroyed||this.runtime.deviceLost)throw Error('WebGPU presenter unavailable');
    if(!/^I(?:420|422|444)(?:P(?:10|12|16))?$/.test(frame.pixelFormat)||frame.surface?.planes?.length!==3)throw Error('Unsupported WebGPU surface format');
    const g=retainedVideoGeometry(frame,this.canvas,track);
    const matrix=frame.color?.matrix;
    if(!['bt709','bt601','smpte170m','bt2020'].includes(matrix))throw Error('Unsupported WebGPU color matrix');
    const full=frame.color?.fullRange===true;
    const c=matrix==='bt709'?[1.5748,.187324,.468124,1.8556]:matrix==='bt2020'?[1.4746,.16455,.57135,1.8814]:[1.402,.344136,.714136,1.772];
    const depth=Number(frame.pixelFormat.match(/P(10|12|16)$/)?.[1]??8),maximum=2**depth-1,shift=2**(depth-8);
    const chroma=frame.color?.chromaOffset??[0,0];
    if(!Array.isArray(chroma)||chroma.length!==2||chroma.some(value=>!Number.isFinite(value)||Math.abs(value)>1))throw Error('Invalid WebGPU chroma offset');
    const angle=g.rotation*Math.PI/180;
    const data=new Float32Array([g.src[0]/frame.width,g.src[1]/frame.height,g.src[2]/frame.width,g.src[3]/frame.height,
      full?0:16*shift/maximum,full?1:maximum/(219*shift),full?1:maximum/(224*shift),2**(depth-1)/maximum,
      ...c,Math.cos(angle),Math.sin(angle),chroma[0],chroma[1],
      g.dst[2]/(g.width*g.scale),g.dst[3]/(g.height*g.scale),1/maximum,depth>10?1:0]);
    this.device.queue.writeBuffer(this.uniform,0,data);
    const group=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:this.sampler},
      ...frame.surface.planes.map((resource,index)=>({binding:index+1,resource})),
      {binding:4,resource:{buffer:this.uniform}},
    ]});
    const encoder=this.device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,group);
    pass.setViewport(g.dst[0],g.dst[1],g.dst[2],g.dst[3],0,1);
    pass.draw(3);
    if(subtitleSnapshot?.surface){
      if(!this.overlayTexture||this.subtitleCanvas.width!==this.canvas.width||this.subtitleCanvas.height!==this.canvas.height){
        this.overlayTexture?.destroy();this.subtitleCanvas.width=this.canvas.width;this.subtitleCanvas.height=this.canvas.height;
        this.overlayTexture=this.device.createTexture({size:[this.canvas.width,this.canvas.height],format:'rgba8unorm',usage:0x10|0x04|0x02}); // RENDER_ATTACHMENT | TEXTURE_BINDING | COPY_DST
      }
      this.subtitleContext.clearRect(0,0,this.canvas.width,this.canvas.height);
      this.subtitles.draw(this.subtitleContext,subtitleSnapshot);
      // The mpv subtitle snapshot is CPU RGBA already. Uploading that overlay
      // does not read back or copy the decoded GPU video surface.
      const width=this.canvas.width,height=this.canvas.height,rowBytes=width*4;
      const stride=Math.ceil(rowBytes/256)*256;
      if(this.overlayStaging?.length!==stride*height)this.overlayStaging=new Uint8Array(stride*height);
      const pixels=this.subtitleContext.getImageData(0,0,width,height).data;
      for(let row=0;row<height;row++)this.overlayStaging.set(pixels.subarray(row*rowBytes,(row+1)*rowBytes),row*stride);
      this.device.queue.writeTexture({texture:this.overlayTexture},this.overlayStaging,{bytesPerRow:stride,rowsPerImage:height},[width,height]);
      const overlayGroup=this.device.createBindGroup({layout:this.overlayPipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:this.sampler},{binding:1,resource:this.overlayTexture.createView()},
      ]});
      pass.setViewport(0,0,this.canvas.width,this.canvas.height,0,1);
      pass.setPipeline(this.overlayPipeline);pass.setBindGroup(0,overlayGroup);pass.draw(3);
    }
    pass.end();this.device.queue.submit([encoder.finish()]);this.frames++;
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.overlayTexture?.destroy();this.overlayTexture=null;this.overlayStaging=null;this.runtime.releaseBuffer(this.uniform);this.context.unconfigure();}
}
