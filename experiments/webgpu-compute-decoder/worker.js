// SPDX-License-Identifier: GPL-3.0-or-later
// Isolated ProRes-like dequantization/8x8 inverse-DCT experiment. Not a decoder.
let device, context, canvas, pipeline, renderPipeline, sampler, coefficients;
let width, height, mode, shared, generation = 0, held = null, closed = false;
const frames = new Map(), timers = new Set();
const stats = {uploads:0, uploadBytes:0, readbackBytes:0, jsCopyBytes:0,
  submitted:0, selected:0, drawn:0, dropped:0, duplicated:0, resetDrops:0,
  peakRetained:0, peakResources:0, liveResources:0, computeSubmitMs:0,
  readbackWaitMs:0, presentMs:0, pts:[], errors:[]};
const now = () => performance.now();
function release(frame) {
  if (!frame) return;
  frame.texture?.destroy(); frame.readBuffer?.destroy();
  stats.liveResources -= (frame.texture ? 1 : 0) + (frame.readBuffer ? 1 : 0);
}
function dropAll() {
  for (const timer of timers) { clearTimeout(timer.id); timer.resolve(); }
  timers.clear();
  for (const frame of frames.values()) release(frame);
  frames.clear(); release(held); held = null;
}
function snapshot() { return {...stats, retained:frames.size+(held ? 1 : 0),
  ptsCount:stats.pts.length,pts:stats.pts.slice(-120)}; }
function fail(error) { stats.errors.push(String(error?.stack || error)); postMessage({type:'error', error:stats.errors.at(-1), stats:snapshot()}); }
const shader = `
struct Coeffs { values: array<i32> };
@group(0) @binding(0) var<storage, read> coeffs: Coeffs;
@group(0) @binding(1) var output: texture_storage_2d<rgba8unorm, write>;
const PI: f32 = 3.141592653589793;
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let size = textureDimensions(output);
  if (id.x >= size.x || id.y >= size.y) { return; }
  let blocksWide = size.x / 8u;
  let base = ((id.y / 8u) * blocksWide + id.x / 8u) * 64u;
  let x = f32(id.x % 8u); let y = f32(id.y % 8u);
  var sum = 0.0;
  for (var v = 0u; v < 8u; v++) {
    for (var u = 0u; u < 8u; u++) {
      let au = select(1.0, 0.70710678118, u == 0u);
      let av = select(1.0, 0.70710678118, v == 0u);
      let c = f32(coeffs.values[base + v * 8u + u]) * 4.0;
      sum += au * av * c * cos((2.0*x+1.0)*f32(u)*PI/16.0)
        * cos((2.0*y+1.0)*f32(v)*PI/16.0);
    }
  }
  let value = clamp((512.0 + 0.25*sum) / 1023.0, 0.0, 1.0);
  textureStore(output, id.xy, vec4<f32>(value, value, value, 1.0));
}`;
const vertex = `
@vertex fn vertex(@builtin(vertex_index) index:u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
  return vec4<f32>(p[index],0,1);
}`;
const fragment = `
@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;
@fragment fn fragment(@builtin(position) position:vec4<f32>) -> @location(0) vec4<f32> {
  let size = vec2<f32>(textureDimensions(image));
  return textureSample(image, imageSampler, position.xy / size);
}`;
async function init(data) {
  const begun = now();
  if (!navigator.gpu) throw Error('navigator.gpu unavailable in Software-style worker');
  const adapter = await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if (!adapter) throw Error('No WebGPU adapter');
  device = await adapter.requestDevice();
  device.lost.then(info => { if (!closed) fail(`GPU device lost: ${info.reason}: ${info.message}`); });
  device.addEventListener('uncapturederror', event => fail(`GPU validation: ${event.error?.message}`));
  ({width,height,mode,canvas} = data);
  if (width % 8 || height % 8) throw Error('Dimensions must be divisible by 8');
  shared = new Int32Array(data.memory);
  context = canvas.getContext(mode === 'resident' ? 'webgpu' : '2d');
  if (!context) throw Error('OffscreenCanvas context unavailable');
  const format = navigator.gpu.getPreferredCanvasFormat();
  if (mode === 'resident') context.configure({device,format,alphaMode:'opaque'});
  const module = device.createShaderModule({code:shader});
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter(message => message.type === 'error');
  if (errors.length) throw Error(JSON.stringify(errors));
  pipeline = device.createComputePipeline({layout:'auto',compute:{module,entryPoint:'main'}});
  if (mode === 'resident') {
    sampler = device.createSampler({magFilter:'nearest',minFilter:'nearest'});
    renderPipeline = device.createRenderPipeline({layout:'auto',
      vertex:{module:device.createShaderModule({code:vertex}),entryPoint:'vertex'},
      fragment:{module:device.createShaderModule({code:fragment}),entryPoint:'fragment',targets:[{format}]},
      primitive:{topology:'triangle-list'}});
  }
  coefficients = device.createBuffer({size:width*height*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  stats.liveResources++; stats.peakResources = 1;
  const adapterInfo = adapter.info;
  postMessage({type:'ready', initializationMs:now()-begun,
    environment:{gpu:!!navigator.gpu,worker:true,isolated:crossOriginIsolated,
      adapter:{vendor:adapterInfo.vendor,architecture:adapterInfo.architecture,device:adapterInfo.device,description:adapterInfo.description},
      features:[...device.features],limits:{maxTextureDimension2D:device.limits.maxTextureDimension2D},format},
    shaderMessages:info.messages.map(m=>({type:m.type,message:m.message})),stats:snapshot()});
}
async function makeFrame(data) {
  if (data.generation !== generation) { stats.resetDrops++; return; }
  if (frames.size + (held ? 1 : 0) >= 4) { stats.dropped++; return; }
  const key = `${generation}:${data.pts}`;
  if (frames.has(key)) { stats.duplicated++; return; }
  const begun = now();
  const texture = device.createTexture({size:[width,height],format:'rgba8unorm',
    usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
  const bytesPerRow = Math.ceil(width*4/256)*256;
  const readBuffer = mode === 'readback' ? device.createBuffer({size:bytesPerRow*height,
    usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}) : null;
  stats.liveResources += 1+(readBuffer ? 1 : 0);
  stats.peakResources = Math.max(stats.peakResources,stats.liveResources);
  // The source is a SharedArrayBuffer backed by WebAssembly.Memory in the page.
  // queue.writeBuffer is the one unavoidable structured-input upload in this PoC.
  device.queue.writeBuffer(coefficients,0,shared,0,width*height);
  stats.uploads++; stats.uploadBytes += width*height*4;
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0,device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
    {binding:0,resource:{buffer:coefficients}}, {binding:1,resource:texture.createView()}]}));
  pass.dispatchWorkgroups(width/8,height/8); pass.end();
  if (readBuffer) encoder.copyTextureToBuffer({texture},{buffer:readBuffer,bytesPerRow},[width,height]);
  device.queue.submit([encoder.finish()]);
  stats.computeSubmitMs += now()-begun; stats.submitted++;
  const frame = {texture,readBuffer,bytesPerRow,pts:data.pts,generation};
  frames.set(key,frame); stats.peakRetained = Math.max(stats.peakRetained,frames.size+(held ? 1 : 0));
  postMessage({type:'queued',pts:data.pts,stats:snapshot()});
}
async function present(data) {
  if (data.generation !== generation) { stats.resetDrops++; return; }
  const key = `${generation}:${data.pts}`, frame = frames.get(key);
  if (!frame) { stats.dropped++; postMessage({type:'missing',pts:data.pts,stats:snapshot()}); return; }
  stats.selected++;
  const delay = Math.max(0,data.deadlineEpochMs - (performance.timeOrigin + now()));
  await new Promise(resolve => {
    const timer={resolve,id:null};
    timer.id=setTimeout(()=>{timers.delete(timer);resolve();},delay);timers.add(timer);
  });
  if (closed || generation !== data.generation || !frames.has(key)) return;
  frames.delete(key); release(held); held = frame;
  const start = now();
  if (mode === 'readback') {
    const wait = now();
    try { await frame.readBuffer.mapAsync(GPUMapMode.READ); }
    catch (error) { if (closed || generation !== data.generation) return; throw error; }
    if (closed || generation !== data.generation) return;
    stats.readbackWaitMs += now()-wait;
    const source = new Uint8Array(frame.readBuffer.getMappedRange());
    const pixels = new Uint8ClampedArray(width*height*4);
    for (let y=0;y<height;y++) pixels.set(source.subarray(y*frame.bytesPerRow,y*frame.bytesPerRow+width*4),y*width*4);
    frame.readBuffer.unmap(); stats.readbackBytes += frame.bytesPerRow*height;
    stats.jsCopyBytes += width*height*4;
    context.putImageData(new ImageData(pixels,width,height),0,0);
  } else {
    const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{
      view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0,device.createBindGroup({layout:renderPipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:frame.texture.createView()},{binding:1,resource:sampler}]}));
    pass.draw(3); pass.end(); device.queue.submit([encoder.finish()]);
    try { await device.queue.onSubmittedWorkDone(); }
    catch (error) { if (closed || generation !== data.generation) return; throw error; }
  }
  stats.presentMs += now()-start; stats.drawn++; stats.pts.push(data.pts);
  postMessage({type:'presented',pts:data.pts,stats:snapshot()});
}
self.onmessage = ({data}) => {
  if (data.type === 'destroy') {
    closed=true; dropAll(); coefficients?.destroy(); coefficients=null; stats.liveResources=0;
    context?.unconfigure?.(); device?.destroy();
    postMessage({type:'destroyed',stats:snapshot()}); self.close(); return;
  }
  if (data.type === 'reset') {
    generation=data.generation; const count=frames.size+(held ? 1 : 0);
    stats.resetDrops += count; dropAll(); postMessage({type:'reset-done',stats:snapshot()}); return;
  }
  const action = data.type === 'init' ? init(data) : data.type === 'frame' ? makeFrame(data)
    : data.type === 'select' ? present(data) : Promise.reject(Error(`Unknown message ${data.type}`));
  Promise.resolve(action).catch(fail);
};
