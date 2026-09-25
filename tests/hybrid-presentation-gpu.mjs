// SPDX-License-Identifier: Apache-2.0
// Test-only visible presenters. No readback or VideoFrame.copyTo().
export async function createPresenter(canvas, arm) {
  if (arm === 'webgl2') {
    const gl = canvas.getContext('webgl2', {alpha:false, antialias:false, preserveDrawingBuffer:false});
    if (!gl) throw Error('WebGL2 OffscreenCanvas unavailable');
    const shader = (kind, source) => {
      const value=gl.createShader(kind);gl.shaderSource(value,source);gl.compileShader(value);
      if (!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(value));
      return value;
    };
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
      out vec2 uv;
      void main(){
        vec2 p=gl_VertexID==0?vec2(-1.0,-1.0):(gl_VertexID==1?vec2(3.0,-1.0):vec2(-1.0,3.0));
        uv=vec2((p.x+1.0)*0.5,1.0-(p.y+1.0)*0.5);
        gl_Position=vec4(p,0.0,1.0);
      }`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;
      in vec2 uv; uniform sampler2D sourceFrame; out vec4 color;
      void main(){color=texture(sourceFrame,uv);}`));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'sourceFrame'),0);
    gl.viewport(0,0,canvas.width,canvas.height);
    return {kind:arm,draw(frame){
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,frame);
      const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`VideoFrame WebGL upload error ${error}`);
      gl.drawArrays(gl.TRIANGLES,0,3);
    },dispose(){gl.deleteTexture(texture);gl.deleteProgram(program);}};
  }
  if (arm === 'webgpu') {
    if(!navigator.gpu)throw Error('WebGPU unavailable in retained worker');
    const adapter=await navigator.gpu.requestAdapter();
    if(!adapter)throw Error('WebGPU adapter unavailable');
    const device=await adapter.requestDevice();
    const context=canvas.getContext('webgpu');
    if(!context)throw Error('WebGPU OffscreenCanvas unavailable');
    const format=navigator.gpu.getPreferredCanvasFormat();
    context.configure({device,format,alphaMode:'opaque'});
    const module=device.createShaderModule({code:`
      struct Out { @builtin(position) position:vec4f, @location(0) uv:vec2f };
      @vertex fn vertex(@builtin(vertex_index) id:u32)->Out {
        var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
        let xy=p[id]; var out:Out;out.position=vec4f(xy,0.,1.);
        out.uv=vec2f((xy.x+1.)*0.5,1.-(xy.y+1.)*0.5);return out;
      }
      @group(0) @binding(0) var video:texture_external;
      @group(0) @binding(1) var samplePoint:sampler;
      @fragment fn fragment(@location(0) uv:vec2f)->@location(0) vec4f {
        return textureSampleBaseClampToEdge(video,samplePoint,uv);
      }`});
    const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
    const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
    return {kind:arm,draw(frame){
      const imported=device.importExternalTexture({source:frame});
      const bindings=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:imported},{binding:1,resource:sampler}]});
      const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);
    },dispose(){device.destroy();}};
  }
  throw Error('Unknown GPU presenter '+arm);
}
