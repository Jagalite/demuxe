// SPDX-License-Identifier: Apache-2.0
// Same-worker, same-device ProRes reconstruction and WebGPUPresenter proof.
import {WebGPUCodecRuntime} from '/web/webgpu/runtime.js';
import {WebGPUPresenter} from '/web/webgpu/presenter.js';
import {prepareCoefficients} from '/experiments/prores-frame-webgpu/gpu.js';

class RetainedPlanarPool {
  constructor(runtime, bytes, limit = 2) {
    this.runtime = runtime;
    this.bytes = bytes;
    this.limit = limit;
    this.records = [];
    this.free = [];
    this.held = new Set();
    this.generation = 1;
    this.reuses = 0;
    this.peakRetained = 0;
  }
  acquire(meta, pts) {
    if (this.held.size >= this.limit) throw Error('retained surface bound reached');
    let record = this.free.pop();
    if (record) this.reuses++;
    else {
      record = {buffer: this.runtime.buffer({size: this.bytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC})};
      this.records.push(record);
    }
    const generation = this.generation;
    let closed = false;
    const frame = {pts, duration: 33333, generation, width: meta.width,
      height: meta.height, pixelFormat: 'I422P10',
      surface: {layout: 'planar-u32', buffer: record.buffer},
      close: () => {
        if (closed) return;
        closed = true;
        this.held.delete(frame);
        if (generation === this.generation) this.free.push(record);
      }};
    this.held.add(frame);
    this.peakRetained = Math.max(this.peakRetained, this.held.size);
    return frame;
  }
  assertRetained(frame) {
    if (!this.held.has(frame) || frame.generation !== this.generation)
      throw Error('stale or released retained frame');
  }
  get diagnostics() {
    return {allocatedSurfaces: this.records.length, freeSurfaces: this.free.length,
      retainedSurfaces: this.held.size, peakRetained: this.peakRetained,
      reuses: this.reuses, surfaceBytes: this.records.length * this.bytes};
  }
  destroy() {
    this.generation++;
    for (const frame of [...this.held]) frame.close();
    for (const record of this.records) this.runtime.releaseBuffer(record.buffer);
    this.records = [];
    this.free = [];
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

function compareCanvas(canvas, reference, testCase) {
  // Validation only: presentation itself never maps YUV or RGB to the CPU.
  const bitmap = canvas.transferToImageBitmap();
  const readback = new OffscreenCanvas(canvas.width, canvas.height);
  const context = readback.getContext('2d', {willReadFrequently: true});
  context.drawImage(bitmap, 0, 0);
  const observed = context.getImageData(0, 0, canvas.width, canvas.height).data;
  bitmap.close();
  const source = new Uint8Array(reference);
  const crop = testCase.crop ?? {x: 0, y: 0, width: testCase.width, height: testCase.height};
  if (observed.length !== crop.width * crop.height * 4 ||
      source.length !== testCase.width * testCase.height * 4)
    throw Error(`${testCase.id}: display/reference dimensions disagree`);
  let sum = 0, max = 0, differing = 0, over2 = 0, over5 = 0, alphaErrors = 0;
  const histogram = new Uint32Array(256);
  let first = null;
  for (let y = 0; y < crop.height; y++) {
    for (let x = 0; x < crop.width; x++) {
      const observedAt = (y * crop.width + x) * 4;
      const referenceAt = ((y + crop.y) * testCase.width + x + crop.x) * 4;
      if (observed[observedAt + 3] !== source[referenceAt + 3]) alphaErrors++;
      for (let channel = 0; channel < 3; channel++) {
        const got = observed[observedAt + channel];
        const want = source[referenceAt + channel];
        const error = Math.abs(got - want);
        histogram[error]++;
        sum += error;
        max = Math.max(max, error);
        if (error) differing++;
        if (error > 2) over2++;
        if (error > 5) over5++;
        if (error > 5 && !first) first = {x, y, channel, got, want, error};
      }
    }
  }
  const channels = crop.width * crop.height * 3;
  let cumulative = 0, p99 = 0;
  for (let error = 0; error < histogram.length; error++) {
    cumulative += histogram[error];
    if (cumulative >= Math.ceil(channels * .99)) { p99 = error; break; }
  }
  return {id: testCase.id, width: crop.width, height: crop.height,
    channels, differingChannels: differing, over2, over5,
    meanAbs: sum / channels, maxAbs: max, p99Abs: p99,
    alphaErrors, firstOver5: first};
}

async function runProof(manifest) {
  if (!navigator.gpu) throw Error('WebGPU unavailable in experiment worker');
  const runtime = new WebGPUCodecRuntime({maxLiveBufferBytes: 32 * 1024 * 1024});
  let pool;
  const presenters = [];
  const validationErrors = [];
  let deviceLost = null;
  try {
    const device = await runtime.acquireDevice();
    device.lost.then(info => { deviceLost = `${info.reason}: ${info.message}`; });
    device.addEventListener('uncapturederror', event =>
      validationErrors.push(event.error?.message ?? String(event.error)));
    const fixtures = Object.values(manifest.frames);
    const maxCoefficientBytes = Math.max(...fixtures.flatMap(info =>
      info.framesSummary.map(frame => frame.coefficientBytes)));
    const maxDescriptorBytes = Math.max(...fixtures.flatMap(info =>
      info.framesSummary.map(frame => frame.sliceCount * 32)));
    const maxOutputBytes = Math.max(...fixtures.map(info => info.width * info.height * 8));
    const coefficientBuffer = runtime.buffer({size: maxCoefficientBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const descriptorBuffer = runtime.buffer({size: maxDescriptorBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const matrixBuffer = runtime.buffer({size: 128,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const parameterBuffer = runtime.buffer({size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    pool = new RetainedPlanarPool(runtime, maxOutputBytes, 2);
    const [core, wrapper] = await Promise.all([
      fetchBytes('/idct-core.wgsl').then(bytes => new TextDecoder().decode(bytes)),
      fetchBytes('/frame.wgsl').then(bytes => new TextDecoder().decode(bytes)),
    ]);
    const module = device.createShaderModule({code: core + '\n' + wrapper});
    const shaderMessages = (await module.getCompilationInfo()).messages.map(message =>
      ({type: message.type, message: message.message, lineNum: message.lineNum}));
    if (shaderMessages.some(message => message.type === 'error'))
      throw Error(`decode WGSL compile errors: ${JSON.stringify(shaderMessages)}`);
    const pipeline = runtime.pipeline('prores-full-frame-proof', gpu =>
      gpu.createComputePipeline({layout: 'auto', compute: {module, entryPoint: 'main'}}));
    const bindGroups = new WeakMap();
    function bindGroup(frame) {
      const buffer = frame.surface.buffer;
      let group = bindGroups.get(buffer);
      if (!group) {
        group = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
          {binding: 0, resource: {buffer: coefficientBuffer}},
          {binding: 1, resource: {buffer: matrixBuffer}},
          {binding: 2, resource: {buffer: parameterBuffer}},
          {binding: 3, resource: {buffer: descriptorBuffer}},
          {binding: 4, resource: {buffer}},
        ]});
        bindGroups.set(buffer, group);
      }
      return group;
    }
    const needed = [
      ['main', 0], ['main', 90], ['main', 179], ['partial', 0],
    ];
    const assets = new Map();
    for (const [fixture, index] of needed) {
      const digits = String(index).padStart(3, '0');
      const [meta, source] = await Promise.all([
        fetchJSON(`/data/${fixture}/${digits}.json`),
        fetchBytes(`/data/${fixture}/${digits}.bin`),
      ]);
      assets.set(`${fixture}:${index}`, {meta, source});
    }
    const references = new Map();
    for (const testCase of manifest.cases) {
      if (!references.has(testCase.referenceFile))
        references.set(testCase.referenceFile,
          await fetchBytes(`/reference/${testCase.referenceFile}`));
    }
    const cases = new Map();
    for (const testCase of manifest.cases) {
      const crop = testCase.crop;
      const canvas = new OffscreenCanvas(crop?.width ?? testCase.width,
        crop?.height ?? testCase.height);
      const presenter = new WebGPUPresenter(canvas, runtime);
      presenters.push(presenter);
      cases.set(testCase.id, {testCase, canvas, presenter});
    }
    const timings = [];
    const batchStart = performance.now();
    let lastSubmitted = batchStart;
    let bytesUploaded = 0, decodeDispatches = 0, presentationSubmissions = 0;
    function decode(fixture, index, pts) {
      const asset = assets.get(`${fixture}:${index}`);
      const {meta, source} = asset;
      const begin = performance.now();
      const prepared = prepareCoefficients(meta, source);
      const packed = performance.now();
      const frame = pool.acquire(meta, pts);
      device.queue.writeBuffer(coefficientBuffer, 0, prepared.packedWords);
      device.queue.writeBuffer(descriptorBuffer, 0, prepared.descriptorWords);
      device.queue.writeBuffer(matrixBuffer, 0, prepared.matrixWords);
      device.queue.writeBuffer(parameterBuffer, 0, prepared.frameWords);
      const encoder = device.createCommandEncoder();
      encoder.clearBuffer(frame.surface.buffer, 0, maxOutputBytes);
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup(frame));
      pass.dispatchWorkgroups(meta.maxSliceMbCount, meta.sliceCount);
      pass.end();
      device.queue.submit([encoder.finish()]);
      const submitted = performance.now();
      timings.push({fixture, frame: index, coefficientPreparationCpuMs: packed - begin,
        decodeSubmissionCpuMs: submitted - packed,
        coefficientBytes: prepared.packedWords.byteLength,
        metadataBytes: prepared.descriptorWords.byteLength + 144});
      bytesUploaded += prepared.packedWords.byteLength + prepared.descriptorWords.byteLength + 144;
      decodeDispatches++;
      lastSubmitted = submitted;
      return frame;
    }
    function present(frame, id) {
      pool.assertRetained(frame);
      const item = cases.get(id);
      const {testCase, presenter} = item;
      const sourceColor = testCase.metadataSource ?
        manifest.sourceColor[testCase.metadataSource] : null;
      const matrix = sourceColor ?
        ({1: 'bt709', 5: 'bt601', 6: 'smpte170m', 9: 'bt2020'}[sourceColor.matrixCode]) :
        testCase.matrix;
      const fullRange = sourceColor ? sourceColor.rangeCode === 2 : testCase.fullRange;
      if (matrix !== testCase.matrix || fullRange !== testCase.fullRange)
        throw Error(`${id}: source color metadata disagrees with reference interpretation`);
      const display = {...frame,
        color: {matrix, fullRange,
          chromaOffset: [0, 0]},
        ...(testCase.crop ? {visibleRect: testCase.crop} : {})};
      const begin = performance.now();
      presenter.draw(display, null, null);
      const submitted = performance.now();
      timings.push({case: id, presentationSubmissionCpuMs: submitted - begin});
      presentationSubmissions++;
      lastSubmitted = submitted;
    }

    const first = decode('main', 0, 0);
    present(first, 'main-000-709-limited');
    present(first, 'main-000-601-limited');
    present(first, 'main-000-709-full');
    const second = decode('main', 90, 3000000);
    present(second, 'main-090-709-limited');
    let boundRejected = false;
    try { pool.acquire(assets.get('main:179').meta, 5966667); }
    catch (error) { boundRejected = /bound/.test(String(error)); }
    if (!boundRejected) throw Error('retained surface bound did not reject third frame');
    first.close();
    let staleRejected = false;
    try { pool.assertRetained(first); }
    catch (error) { staleRejected = /stale/.test(String(error)); }
    if (!staleRejected) throw Error('released frame remained selectable');
    const third = decode('main', 179, 5966667);
    if (third.surface.buffer !== first.surface.buffer)
      throw Error('released decode surface was not reused');
    first.close(); // A stale duplicate release must not free the new owner.
    pool.assertRetained(third);
    present(third, 'main-179-709-limited');
    second.close();
    const fourth = decode('partial', 0, 9000000);
    if (fourth.surface.buffer !== second.surface.buffer)
      throw Error('second released decode surface was not reused');
    second.close();
    pool.assertRetained(fourth);
    present(fourth, 'partial-000-709-limited');
    present(fourth, 'partial-000-709-crop');
    const poolBeforeCompletion = pool.diagnostics;
    // Exactly one explicit completion wait for the whole ordered batch. The
    // decode/presentation path above never waits for a frame's GPU work.
    await device.queue.onSubmittedWorkDone();
    const completed = performance.now();
    if (deviceLost || validationErrors.length)
      throw Error(`WebGPU failure: ${deviceLost ?? validationErrors.join('; ')}`);

    const validationStart = performance.now();
    const comparisons = [];
    for (const {testCase, canvas} of cases.values()) {
      comparisons.push(compareCanvas(canvas,
        references.get(testCase.referenceFile), testCase));
    }
    const validated = performance.now();
    third.close();fourth.close();
    const poolAfterRelease = pool.diagnostics;
    const runtimeBeforeCleanup = runtime.diagnostics;
    const coefficientPreparationCpuMs = timings.reduce((sum, item) =>
      sum + (item.coefficientPreparationCpuMs ?? 0), 0);
    const decodeSubmissionCpuMs = timings.reduce((sum, item) =>
      sum + (item.decodeSubmissionCpuMs ?? 0), 0);
    const presentationSubmissionCpuMs = timings.reduce((sum, item) =>
      sum + (item.presentationSubmissionCpuMs ?? 0), 0);
    const canvasBytes = [...cases.values()].reduce((sum, item) =>
      sum + item.canvas.width * item.canvas.height * 4, 0);
    pool.destroy();
    const runtimeAfterPoolDestroy = runtime.diagnostics;
    pool = null;
    return {timings, comparisons, shaderMessages, validationErrors, deviceLost,
      sameWorkerDevice: true, gpuPixelReadbacksInPresentation: 0,
      gpuToGpuPresentationCopies: 0, validationCanvasReadbacks: comparisons.length,
      validationCanvasBytes: canvasBytes, bytesUploaded, decodeDispatches,
      presentationSubmissions, inputUploadCalls: decodeDispatches * 4,
      coefficientPreparationCpuMs, decodeSubmissionCpuMs,
      presentationSubmissionCpuMs, perFrameCompletionWaits: 0,
      batchCompletionWaits: 1, combinedGpuCompletionWallMs: completed - lastSubmitted,
      decodePresentationBatchWallMs: completed - batchStart,
      validationReadbackAndCompareWallMs: validated - validationStart,
      surfacePoolBeforeCompletion: poolBeforeCompletion,
      surfacePoolAfterRelease: poolAfterRelease,
      runtimeBeforeCleanup, runtimeAfterPoolDestroy,
      canvasAllocationEstimateBytes: canvasBytes,
      explicitTrackedBufferBytes: runtimeBeforeCleanup.liveBufferBytes,
      pooledSurfaceBytes: poolBeforeCompletion.surfaceBytes,
      boundRejected, staleRejected,
      adapter: {vendor: runtime.gpuAdapter.info.vendor,
        architecture: runtime.gpuAdapter.info.architecture},
      timingDefinition: 'CPU submission times include queue.writeBuffer and command encoding/submit. One queue completion wait covers all four decode and seven presentation submissions. Display readback and RGB comparison run only after completion for validation. No GPU shader timestamps.'};
  } finally {
    for (const presenter of presenters) presenter.destroy();
    pool?.destroy();
    await runtime.destroy();
  }
}

self.onmessage = async event => {
  try { self.postMessage({result: await runProof(event.data.manifest)}); }
  catch (error) { self.postMessage({error: String(error?.stack ?? error)}); }
};
