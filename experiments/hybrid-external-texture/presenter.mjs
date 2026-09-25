// SPDX-License-Identifier: Apache-2.0
// Test-only presenter for the frozen, unrotated 16:9 H.264/AAC fixture.
import {retainedVideoGeometry} from './retained-video.js';

export async function externalTexturePresenter(canvas,onError){
  const adapter=await navigator.gpu?.requestAdapter();
  if(!adapter)throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice();
  const context=canvas.getContext('webgpu');
  if(!context)throw Error('WebGPU canvas unavailable');
  const format=navigator.gpu.getPreferredCanvasFormat();
  const stats={kind:'webgpu-external-texture',draws:0,imports:0,submissions:0,errors:[],format,
    adapter:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description}};
  let destroyed=false;
  const fail=error=>{if(destroyed)return;stats.errors.push(String(error));onError(String(error));};
  device.addEventListener('uncapturederror',event=>fail(event.error.message));
  device.lost.then(info=>{if(!destroyed)fail(`GPU device lost: ${info.reason} ${info.message}`);});
  context.configure({device,format,alphaMode:'opaque'});
  device.pushErrorScope('validation');
  const module=device.createShaderModule({code:`
    struct Out { @builtin(position) position:vec4f, @location(0) uv:vec2f };
    @vertex fn vertex(@builtin(vertex_index) id:u32)->Out {
      var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
      let xy=p[id];var out:Out;out.position=vec4f(xy,0.,1.);
      out.uv=vec2f((xy.x+1.)*.5,1.-(xy.y+1.)*.5);return out;
    }
    @group(0) @binding(0) var video:texture_external;
    @group(0) @binding(1) var point:sampler;
    @fragment fn fragment(@location(0) uv:vec2f)->@location(0) vec4f {
      return textureSampleBaseClampToEdge(video,point,uv);
    }`});
  const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vertex'},
    fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  const error=await device.popErrorScope();if(error)throw Error(error.message);
  return {stats,draw(frame,track,overlay){
    if(destroyed)throw Error('Presenter destroyed');
    const geometry=retainedVideoGeometry(frame,canvas,track);
    if(geometry.rotation!==0||Math.abs(geometry.dst[2]-canvas.width)>.01||Math.abs(geometry.dst[3]-canvas.height)>.01)
      throw Error('Quick presenter supports only unrotated full-canvas geometry');
    if(overlay?.surface)throw Error('Quick presenter does not support subtitles');
    const imported=device.importExternalTexture({source:frame});stats.imports++;
    const bindings=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:imported},{binding:1,resource:sampler}]});
    const encoder=device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),
      loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);pass.end();
    device.queue.submit([encoder.finish()]);stats.submissions++;stats.draws++;
  },destroy(){destroyed=true;context.unconfigure();device.destroy();}};
}
