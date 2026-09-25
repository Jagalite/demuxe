// SPDX-License-Identifier: Apache-2.0
// Experiment-only one-block GPU execution and readback. No playback path.

const median = values => {
  const sorted = [...values].sort((a,b)=>a-b);
  return (sorted[(sorted.length-1)>>1] + sorted[sorted.length>>1])/2;
};
const summary = values => ({medianMs:median(values),minMs:Math.min(...values),maxMs:Math.max(...values)});

export async function runProof(cases, iterations=150) {
  if (!navigator.gpu) throw Error('WebGPU unavailable');
  const adapter = await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if (!adapter) throw Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  let deviceLost = null;
  const validationErrors = [];
  device.lost.then(info => { deviceLost = `${info.reason}: ${info.message}`; });
  device.addEventListener('uncapturederror', event => validationErrors.push(event.error?.message||String(event.error)));
  let input, output, readback;
  try {
    const shader = await fetch('./idct.wgsl').then(response => {
      if (!response.ok) throw Error(`shader HTTP ${response.status}`);
      return response.text();
    });
    const module = device.createShaderModule({code:shader});
    const messages = (await module.getCompilationInfo()).messages.map(message =>
      ({type:message.type,message:message.message,lineNum:message.lineNum}));
    if (messages.some(message=>message.type==='error'))
      throw Error(`WGSL compile errors: ${JSON.stringify(messages)}`);
    const pipeline = await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
    input = device.createBuffer({size:129*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    output = device.createBuffer({size:64*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    readback = device.createBuffer({size:64*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const bindGroup = device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:input}}, {binding:1,resource:{buffer:output}},
    ]});

    async function execute(testCase) {
      if (deviceLost) throw Error(`device lost: ${deviceLost}`);
      const data = new Int32Array(129);
      data.set(testCase.coefficients,0);
      data.set(testCase.matrix,64);
      data[128] = testCase.qscale;
      const start = performance.now();
      device.queue.writeBuffer(input,0,data);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0,bindGroup);
      pass.dispatchWorkgroups(1);
      pass.end();
      device.queue.submit([encoder.finish()]);
      const dispatchSubmitted = performance.now();
      await device.queue.onSubmittedWorkDone();
      const dispatchComplete = performance.now();
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(output,0,readback,0,64*4);
      device.queue.submit([copy.finish()]);
      const readbackSubmitted = performance.now();
      await readback.mapAsync(GPUMapMode.READ);
      const readbackMapped = performance.now();
      const samples = Array.from(new Uint32Array(readback.getMappedRange()).slice());
      readback.unmap();
      if (validationErrors.length) throw Error(`GPU validation: ${validationErrors.join('; ')}`);
      return {samples,timing:{uploadDispatchSubmitMs:dispatchSubmitted-start,
        dispatchCompletionWaitMs:dispatchComplete-dispatchSubmitted,
        readbackSubmitMs:readbackSubmitted-dispatchComplete,
        readbackMapWaitMs:readbackMapped-readbackSubmitted}};
    }

    let checkedSamples=0;
    for (const testCase of cases) {
      const observed = (await execute(testCase)).samples;
      for (let index=0;index<64;index++) {
        if (observed[index]!==testCase.expected[index])
          throw Error(`sample mismatch case=${testCase.id} category=${testCase.category} `+
            `index=${index} row=${index>>3} column=${index&7} `+
            `FFmpeg=${testCase.expected[index]} WebGPU=${observed[index]}`);
        checkedSamples++;
      }
    }

    const target = cases.find(testCase=>testCase.category==='real_fixture');
    if (!target) throw Error('no real fixture case for timing');
    for (let i=0;i<20;i++) await execute(target);
    const timings=[];
    for (let i=0;i<iterations;i++) timings.push((await execute(target)).timing);
    const result={cases:cases.length,checkedSamples,mismatches:0,crossOriginIsolated,
      adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture,
        device:adapter.info.device,description:adapter.info.description},
      features:[...device.features],shaderMessages:messages,validationErrors,
      deviceLost,iterations,warmup:20,
      timing:{uploadDispatchSubmit:summary(timings.map(t=>t.uploadDispatchSubmitMs)),
        dispatchCompletionWait:summary(timings.map(t=>t.dispatchCompletionWaitMs)),
        readbackSubmit:summary(timings.map(t=>t.readbackSubmitMs)),
        readbackMapWait:summary(timings.map(t=>t.readbackMapWaitMs)),
        dispatchWall:summary(timings.map(t=>t.uploadDispatchSubmitMs+t.dispatchCompletionWaitMs)),
        readbackWall:summary(timings.map(t=>t.readbackSubmitMs+t.readbackMapWaitMs))},
      timingDefinition:'Browser wall time; dispatch includes upload and queue completion; readback is a separate buffer copy/map. No GPU shader timestamp.'};
    if (deviceLost) throw Error(`device lost: ${deviceLost}`);
    return result;
  } finally {
    readback?.destroy();output?.destroy();input?.destroy();device.destroy();
  }
}
