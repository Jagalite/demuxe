// SPDX-License-Identifier: Apache-2.0
// Isolated full-frame GPU reconstruction and every-sample FFmpeg 9.0.2 parity.

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.floor((sorted.length - 1) * p)];
  return {minMs: sorted[0], p50Ms: percentile(0.5), p95Ms: percentile(0.95),
    maxMs: sorted.at(-1), meanMs: values.reduce((a, b) => a + b, 0) / values.length};
}

export function prepareCoefficients(meta, binary) {
  if (binary.byteLength !== meta.coefficientBytes || binary.byteLength % 4)
    throw Error(`${meta.fixture}:${meta.frame}: coefficient payload size mismatch`);
  const source = new Int16Array(binary);
  const packedWords = new Uint32Array(meta.mbCount * 256);
  const packed16 = new Uint16Array(packedWords.buffer);
  const descriptorWords = new Int32Array(meta.sliceCount * 8);
  for (let s = 0; s < meta.slices.length; s++) {
    const slice = meta.slices[s];
    const count = slice.mbCount;
    const sourceBase = slice.rawCoefficientOffset;
    if (sourceBase + count * 512 > source.length)
      throw Error(`${meta.fixture}:${meta.frame}:${slice.slice}: source coefficients truncated`);
    for (let mb = 0; mb < count; mb++) {
      const destination = (slice.packedWordOffset + mb * 256) * 2;
      packed16.set(source.subarray(sourceBase + mb * 256,
        sourceBase + (mb + 1) * 256), destination);
      packed16.set(source.subarray(sourceBase + count * 256 + mb * 128,
        sourceBase + count * 256 + (mb + 1) * 128), destination + 256);
      packed16.set(source.subarray(sourceBase + count * 384 + mb * 128,
        sourceBase + count * 384 + (mb + 1) * 128), destination + 384);
    }
    descriptorWords.set([slice.packedWordOffset, slice.mbX, slice.mbY,
      count, slice.qscale, 0, 0, 0], s * 8);
  }
  if (packedWords.byteLength !== meta.coefficientBytes)
    throw Error(`${meta.fixture}:${meta.frame}: packed byte count mismatch`);
  return {packedWords, descriptorWords, matrixWords: new Uint32Array(meta.matrixWords),
    frameWords: new Uint32Array([meta.width, meta.height,
      meta.width * meta.height, meta.width * meta.height / 2])};
}

async function getBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function mismatchLocation(meta, index) {
  const ySamples = meta.width * meta.height;
  const uvSamples = ySamples / 2;
  const plane = index < ySamples ? 'Y' : index < ySamples + uvSamples ? 'U' : 'V';
  const local = index - (plane === 'Y' ? 0 : plane === 'U' ? ySamples : ySamples + uvSamples);
  const stride = plane === 'Y' ? meta.width : meta.width / 2;
  const x = local % stride;
  const y = Math.floor(local / stride);
  const mbX = Math.floor(x / (plane === 'Y' ? 16 : 8));
  const mbY = Math.floor(y / 16);
  const slice = meta.slices.find(item => item.mbY === mbY &&
    mbX >= item.mbX && mbX < item.mbX + item.mbCount);
  return {plane, x, y, slice: slice?.slice ?? null, mbX, mbY};
}

export async function runProof(manifest, mainFrames) {
  if (!navigator.gpu) throw Error('WebGPU unavailable');
  if (new Uint8Array(new Uint16Array([0x0102]).buffer)[0] !== 0x02)
    throw Error('this proof requires a little-endian typed-array host');
  const adapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
  if (!adapter) throw Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  let deviceLost = null;
  const validationErrors = [];
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
      fetch('/idct-core.wgsl').then(r => r.text()),
      fetch('/frame.wgsl').then(r => r.text()),
    ]);
    const shader = device.createShaderModule({code: core + '\n' + wrapper});
    const shaderMessages = (await shader.getCompilationInfo()).messages.map(message =>
      ({type: message.type, message: message.message, lineNum: message.lineNum}));
    if (shaderMessages.some(message => message.type === 'error'))
      throw Error(`WGSL compile errors: ${JSON.stringify(shaderMessages)}`);
    const pipeline = await device.createComputePipelineAsync({layout: 'auto',
      compute: {module: shader, entryPoint: 'main'}});
    const fixtures = Object.values(manifest.fixtures);
    const coefficientBytes = Math.max(...fixtures.flatMap(item =>
      item.framesSummary.map(frame => frame.coefficientBytes)));
    const descriptorBytes = Math.max(...fixtures.flatMap(item =>
      item.framesSummary.map(frame => frame.sliceCount * 32)));
    const outputBytes = Math.max(...fixtures.map(item => item.width * item.height * 8));
    const sizes = {coefficientPoolBytes: coefficientBytes,
      descriptorPoolBytes: descriptorBytes, matrixBytes: 128, frameUniformBytes: 16,
      outputPoolBytes: outputBytes, validationReadbackPoolBytes: outputBytes};
    sizes.peakExplicitPoolBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
    sizes.deviceLocalWithoutReadbackBytes = sizes.peakExplicitPoolBytes - outputBytes;
    const input = makeBuffer(coefficientBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const descriptors = makeBuffer(descriptorBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const matrices = makeBuffer(128,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const params = makeBuffer(16,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const output = makeBuffer(outputBytes,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST);
    const readback = makeBuffer(outputBytes,
      GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    const bindGroup = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
      {binding: 0, resource: {buffer: input}},
      {binding: 1, resource: {buffer: matrices}},
      {binding: 2, resource: {buffer: params}},
      {binding: 3, resource: {buffer: descriptors}},
      {binding: 4, resource: {buffer: output}},
    ]});

    async function execute(fixture, frameIndex) {
      if (deviceLost) throw Error(`device lost: ${deviceLost}`);
      const prefix = `/data/${fixture}/${String(frameIndex).padStart(3, '0')}`;
      const [meta, source, oracle] = await Promise.all([
        getJSON(`${prefix}.json`), getBytes(`${prefix}.bin`),
        getBytes(`/oracle/${fixture}/${String(frameIndex).padStart(3, '0')}`),
      ]);
      if (meta.fixture !== fixture || meta.frame !== frameIndex ||
          source.byteLength !== meta.coefficientBytes ||
          oracle.byteLength !== meta.width * meta.height * 4)
        throw Error(`${fixture}:${frameIndex}: prepared data mismatch`);
      const totalStart = performance.now();
      const {packedWords, descriptorWords, matrixWords, frameWords} =
        prepareCoefficients(meta, source);
      const prepared = performance.now();

      device.queue.writeBuffer(input, 0, packedWords);
      await device.queue.onSubmittedWorkDone();
      const coefficientUploaded = performance.now();
      device.queue.writeBuffer(descriptors, 0, descriptorWords);
      device.queue.writeBuffer(matrices, 0, matrixWords);
      device.queue.writeBuffer(params, 0, frameWords);
      await device.queue.onSubmittedWorkDone();
      const metadataUploaded = performance.now();

      const encoder = device.createCommandEncoder();
      encoder.clearBuffer(output, 0, outputBytes);
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(meta.maxSliceMbCount, meta.sliceCount);
      pass.end();
      device.queue.submit([encoder.finish()]);
      const submitted = performance.now();
      await device.queue.onSubmittedWorkDone();
      const gpuDone = performance.now();

      const frameOutputBytes = meta.width * meta.height * 8;
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(output, 0, readback, 0, frameOutputBytes);
      device.queue.submit([copy.finish()]);
      await readback.mapAsync(GPUMapMode.READ, 0, frameOutputBytes);
      const observed = new Uint32Array(readback.getMappedRange(0, frameOutputBytes)).slice();
      readback.unmap();
      const readbackDone = performance.now();
      if (validationErrors.length) throw Error(`GPU validation: ${validationErrors.join('; ')}`);
      if (deviceLost) throw Error(`device lost: ${deviceLost}`);

      const expected = new Uint16Array(oracle);
      if (expected.length !== observed.length)
        throw Error(`${fixture}:${frameIndex}: oracle sample count mismatch`);
      for (let index = 0; index < expected.length; index++) {
        if (observed[index] !== expected[index]) {
          const where = mismatchLocation(meta, index);
          throw Error(`${fixture}:${frameIndex}: ${where.plane} mismatch x=${where.x} `+
            `y=${where.y} slice=${where.slice} mb=(${where.mbX},${where.mbY}) `+
            `FFmpeg=${expected[index]} WebGPU=${observed[index]}`);
        }
      }
      const compared = performance.now();
      return {fixture, frame: frameIndex, width: meta.width, height: meta.height,
        slices: meta.sliceCount, sliceWidths: meta.sliceWidths,
        genuinePartialWidthSlices: meta.partialWidthSlices,
        dispatches: 1, workgroups: meta.maxSliceMbCount * meta.sliceCount,
        coefficientBytesUploaded: packedWords.byteLength,
        descriptorBytesUploaded: descriptorWords.byteLength,
        outputSurfaceBytes: frameOutputBytes,
        yOutputBytes: meta.width * meta.height * 4,
        uOutputBytes: meta.width * meta.height * 2,
        vOutputBytes: meta.width * meta.height * 2,
        samplesChecked: expected.length, mismatches: 0,
        timing: {cpuCoefficientPreparationMs: prepared - totalStart,
          coefficientUploadMs: coefficientUploaded - prepared,
          metadataUploadMs: metadataUploaded - coefficientUploaded,
          commandSubmissionMs: submitted - metadataUploaded,
          gpuCompletionMs: gpuDone - submitted,
          deviceLocalFrameWallMs: gpuDone - totalStart,
          validationReadbackMs: readbackDone - gpuDone,
          validationComparisonMs: compared - readbackDone,
          totalFrameWallMs: compared - totalStart}};
    }

    const frames = [];
    for (const frameIndex of mainFrames) frames.push(await execute('main', frameIndex));
    frames.push(await execute('partial', 0));
    const keys = Object.keys(frames[0].timing);
    const main = frames.filter(frame => frame.fixture === 'main');
    const timing = Object.fromEntries(keys.map(key =>
      [key, distribution(main.map(frame => frame.timing[key]))]));
    return {frames, timing, mismatches: 0,
      samplesChecked: frames.reduce((count, frame) => count + frame.samplesChecked, 0),
      genuinePartialWidthSlices: frames.reduce((count, frame) =>
        count + frame.genuinePartialWidthSlices, 0),
      totalCoefficientBytesUploaded: frames.reduce((count, frame) =>
        count + frame.coefficientBytesUploaded, 0),
      sizes, layout: {coefficients: 'macroblock-major Y0,Y1,Y2,Y3,U0,U1,V0,V1; signed i16, two per u32',
        quantMatrices: '64 luma + 64 chroma u8, four per u32',
        output: 'visible-size device-local planar Y,U,V u32',
        dispatch: 'one 2D dispatch per frame; workgroup x=macroblock within slice, y=slice index; eight lanes per macroblock'},
      adapter: {vendor: adapter.info.vendor, architecture: adapter.info.architecture,
        device: adapter.info.device, description: adapter.info.description},
      features: [...device.features], crossOriginIsolated,
      shaderMessages, validationErrors, deviceLost,
      timingDefinition: 'Browser wall times after local asset fetch. CPU preparation is post-entropy macroblock packing. Upload stages include queue completion. GPU completion is a queue wait, not a shader timestamp. Device-local wall ends before readback. Total wall includes validation copy/map and sample comparison. Pipeline creation and local file fetch are excluded.'};
  } finally {
    for (const buffer of buffers) buffer.destroy();
    device.destroy();
  }
}
