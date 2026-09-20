// SPDX-License-Identifier: GPL-3.0-or-later
// Isolated integration using the GPL retained-video geometry; never production-imported.
import {drawRetainedVideo} from './retained-video.js';
export async function createPresenter(canvas,gpu){
 if(!gpu){const ctx=canvas.getContext('2d',{alpha:false});return{kind:'canvas-filter',draw(frame,overlay,track){ctx.filter='invert(1)';drawRetainedVideo(ctx,frame,canvas,{...track,'demux-rotation':90});ctx.filter='none';for(const p of overlay.parts)ctx.drawImage(p.tile,p.x,p.y,p.dw,p.dh);},destroy(){}};}
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('R023 GPU adapter missing');const device=await adapter.requestDevice();const ctx=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();ctx.configure({device,format,alphaMode:'opaque'});
 const module=device.createShaderModule({code:`
 @group(0) @binding(0) var video:texture_external;
 @group(0) @binding(1) var smp:sampler;
 @group(0) @binding(2) var sub:texture_2d<f32>;
 struct V { @builtin(position) p:vec4f, @location(0) uv:vec2f }
 @vertex fn vs(@builtin(vertex_index) i:u32)->V {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:V;v.p=vec4f(p[i],0,1);v.uv=vec2f((p[i].x+1)*.5,(1-p[i].y)*.5);return v;}
 @fragment fn fs(v:V)->@location(0) vec4f {let rgb=textureSampleBaseClampToEdge(video,smp,vec2f(v.uv.y,1-v.uv.x)).rgb;let s=textureLoad(sub,vec2i(v.p.xy),0);return vec4f((vec3f(1)-rgb)*(1-s.a)+s.rgb,1);}
 `});
 const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length){device.destroy();throw Error('R023 WGSL: '+errors.map(m=>m.message).join('; '));}
 const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}}),sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
 let texture,width=0,height=0,previous;const subcanvas=new OffscreenCanvas(canvas.width,canvas.height),subctx=subcanvas.getContext('2d');
 return{kind:'fused-external-texture',draw(frame,overlay,track){if((track?.['demux-rotation']||0)!==0||(track?.['demux-par']||1)!==1)throw Error('R023 unsupported sourcegeometry');if(width!==canvas.width||height!==canvas.height){texture?.destroy();width=canvas.width;height=canvas.height;subcanvas.width=width;subcanvas.height=height;texture=device.createTexture({size:[width,height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});previous=null;}
 if(previous!==overlay){subctx.clearRect(0,0,width,height);for(const p of overlay.parts)subctx.drawImage(p.tile,p.x,p.y,p.dw,p.dh);device.queue.copyExternalImageToTexture({source:subcanvas},{texture,premultipliedAlpha:true},[width,height]);previous=overlay;}
 const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:device.importExternalTexture({source:frame,colorSpace:'srgb'})},{binding:1,resource:sampler},{binding:2,resource:texture.createView()}]});const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);},destroy(){texture?.destroy();ctx.unconfigure();device.destroy();}};
}
