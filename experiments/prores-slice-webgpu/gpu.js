// SPDX-License-Identifier: Apache-2.0
// Isolated slice reconstruction, oracle comparison, and wall-clock staging.

const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
const summary = values => ({medianMs: median(values), minMs: Math.min(...values),
  maxMs: Math.max(...values)});
const SENTINEL = 0xffffffff;

export async function runProof(cases, iterations = 150) {
  if (!navigator.gpu) throw Error('WebGPU unavailable');
  const adapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
  if (!adapter) throw Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  const validationErrors = [];
  let deviceLost = null;
  device.lost.then(info => { deviceLost = `${info.reason}: ${info.message}`; });
  device.addEventListener('uncapturederror', event =>
    validationErrors.push(event.error?.message || String(event.error)));
  const buffers = [];
  const makeBuffer = (size, usage) => {
    const buffer = device.createBuffer({size, usage});
    buffers.push(buffer);
    return buffer;
  };
  try {
    const [core, wrapper] = await Promise.all([
      fetch('/idct-core.wgsl').then(r => { if (!r.ok) throw Error(`core HTTP ${r.status}`); return r.text(); }),
      fetch('/slice.wgsl').then(r => { if (!r.ok) throw Error(`slice HTTP ${r.status}`); return r.text(); }),
    ]);
    const shader = device.createShaderModule({code: core + '\n' + wrapper});
    const shaderMessages = (await shader.getCompilationInfo()).messages.map(message =>
      ({type: message.type, message: message.message, lineNum: message.lineNum}));
    if (shaderMessages.some(message => message.type === 'error'))
      throw Error(`WGSL compile errors: ${JSON.stringify(shaderMessages)}`);
    const pipeline = await device.createComputePipelineAsync({layout: 'auto',
      compute: {module: shader, entryPoint: 'main'}});
    const mbCount = Math.max(...cases.map(testCase => testCase.mbCount));
    const codedWidth = mbCount * 16;
    const ySamples = codedWidth * 16;
    const uvSamples = codedWidth / 2 * 16;
    const sizes = {coefficientBytes: mbCount * 8 * 64 * 2, matrixBytes: 128,
      parameterBytes: 32, yOutputBytes: ySamples * 4,
      uOutputBytes: uvSamples * 4, vOutputBytes: uvSamples * 4,
      readbackBytes: (ySamples + 2 * uvSamples) * 4};
    const input = makeBuffer(sizes.coefficientBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const matrices = makeBuffer(sizes.matrixBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const params = makeBuffer(sizes.parameterBytes,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const output = makeBuffer(sizes.readbackBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC);
    const readback = makeBuffer(sizes.readbackBytes,
      GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    const bindGroup = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
      {binding: 0, resource: {buffer: input}},
      {binding: 1, resource: {buffer: matrices}},
      {binding: 2, resource: {buffer: params}},
      {binding: 3, resource: {buffer: output}},
    ]});
    const blank = new Uint32Array(sizes.readbackBytes / 4).fill(SENTINEL);

    async function execute(testCase) {
      if (deviceLost) throw Error(`device lost: ${deviceLost}`);
      if (testCase.mbCount !== mbCount || testCase.codedWidth !== codedWidth)
        throw Error('this fixed-size proof expects equal slice widths');
      device.queue.writeBuffer(output, 0, blank);
      device.queue.writeBuffer(matrices, 0, new Uint32Array(testCase.matrixWords));
      device.queue.writeBuffer(params, 0, new Int32Array([
        testCase.mbCount, testCase.codedWidth, testCase.visibleWidth,
        testCase.visibleHeight, testCase.qscale, ySamples, uvSamples, 0,
      ]));
      await device.queue.onSubmittedWorkDone();
      const uploadStart = performance.now();
      device.queue.writeBuffer(input, 0, new Uint32Array(testCase.coefficientWords));
      await device.queue.onSubmittedWorkDone();
      const uploadDone = performance.now();
      const submitStart = performance.now();
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(testCase.mbCount);
      pass.end();
      device.queue.submit([encoder.finish()]);
      const submitted = performance.now();
      await device.queue.onSubmittedWorkDone();
      const gpuDone = performance.now();
      const readbackStart = performance.now();
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(output, 0, readback, 0, sizes.readbackBytes);
      device.queue.submit([copy.finish()]);
      await readback.mapAsync(GPUMapMode.READ);
      const words = new Uint32Array(readback.getMappedRange()).slice();
      readback.unmap();
      const readbackDone = performance.now();
      if (validationErrors.length) throw Error(`GPU validation: ${validationErrors.join('; ')}`);
      if (deviceLost) throw Error(`device lost: ${deviceLost}`);
      return {words, timing: {coefficientUploadMs: uploadDone - uploadStart,
        commandSubmissionMs: submitted - submitStart,
        gpuCompletionMs: gpuDone - submitted,
        validationReadbackMs: readbackDone - readbackStart}};
    }

    let checkedSamples = 0;
    let guardedSamples = 0;
    const casesResult = [];
    for (const testCase of cases) {
      const {words} = await execute(testCase);
      const perPlane = {};
      for (const [name, offset, stride, width] of [
        ['Y', 0, codedWidth, testCase.visibleWidth],
        ['U', ySamples, codedWidth / 2, testCase.visibleWidth / 2],
        ['V', ySamples + uvSamples, codedWidth / 2, testCase.visibleWidth / 2],
      ]) {
        const expected = testCase.expected[name];
        if (expected.length !== width * testCase.visibleHeight)
          throw Error(`${testCase.id} ${name}: oracle length mismatch`);
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < stride; x++) {
            const got = words[offset + y * stride + x];
            if (y < testCase.visibleHeight && x < width) {
              const want = expected[y * width + x];
              if (got !== want)
                throw Error(`${testCase.id} ${name} visible mismatch x=${x} y=${y} `+
                  `FFmpeg=${want} WebGPU=${got} nonSentinel=${words.filter(v => v !== SENTINEL).length} `+
                  `first=${Array.from(words.slice(0, 8))}`);
              checkedSamples++;
            } else {
              if (got !== SENTINEL)
                throw Error(`${testCase.id} ${name} wrote outside visible crop x=${x} y=${y}: ${got}`);
              guardedSamples++;
            }
          }
        }
        perPlane[name] = expected.length;
      }
      casesResult.push({id: testCase.id, source: testCase.source,
        frame: testCase.frame, slice: testCase.slice, mbX: testCase.mbX,
        mbY: testCase.mbY, mbCount: testCase.mbCount,
        visibleWidth: testCase.visibleWidth, visibleHeight: testCase.visibleHeight,
        qscale: testCase.qscale, samples: perPlane});
    }
    const target = cases.find(testCase => testCase.source === 'real' &&
      testCase.visibleHeight === 16 && testCase.mbX === 0);
    if (!target) throw Error('no complete real slice for timing');
    for (let i = 0; i < 20; i++) await execute(target);
    const timings = [];
    for (let i = 0; i < iterations; i++) timings.push((await execute(target)).timing);
    const timing = Object.fromEntries(Object.keys(timings[0]).map(key =>
      [key, summary(timings.map(item => item[key]))]));
    return {mismatches: 0, checkedSamples, guardedSamples, cases: casesResult,
      layout: {coefficients: 'macroblock-major Y0,Y1,Y2,Y3,U0,U1,V0,V1; 64 signed i16 per block; two per u32',
        matrices: '64 luma then 64 chroma unsigned bytes; four per u32',
        output: 'planar Y,U,V u32 with coded-width strides and visible crop guards',
        workgroupSize: 8, workgroups: mbCount},
      sizes, adapter: {vendor: adapter.info.vendor, architecture: adapter.info.architecture,
        device: adapter.info.device, description: adapter.info.description},
      crossOriginIsolated, features: [...device.features], shaderMessages,
      validationErrors, deviceLost, timingTarget: target.id, warmup: 20,
      iterations, timing,
      timingDefinition: 'Browser wall times, serial stages. Upload includes queue.writeBuffer and queue completion; command submission includes encode/submit; GPU completion is queue wait, not shader timestamp; validation readback includes buffer copy and mapping. Per-iteration output reset and metadata uploads are outside measured stages.'};
  } finally {
    for (const buffer of buffers) buffer.destroy();
    device.destroy();
  }
}
