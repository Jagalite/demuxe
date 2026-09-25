// SPDX-License-Identifier: Apache-2.0
// Experiment-only live coefficient service. No codec is registered with Demuxe.
import {WebGPUCodecRuntime} from '../../web/webgpu/runtime.js';
import {parseCapture, parsePackedCapture} from './capture.js';

const PACKET_OFFSET = 80, FRAME_OFFSET = PACKET_OFFSET + 8 * 1024 * 1024;
const AGAIN = -6, EOF = -541478725, IO = -29;
export class LiveProResService {
  constructor(engine, {onFrame, onWakeup, onError, onReset,
    oracleHashes = null, validatePixels = false, poolLimit = 8,
    backpressureProbeAt = null} = {}) {
    this.engine = engine; this.onFrame = onFrame; this.onWakeup = onWakeup;
    this.onError = onError; this.onReset = onReset;
    this.pointer = engine._web_decoder_ptr();
    this.runtime = new WebGPUCodecRuntime({maxLiveBufferBytes: 48 * 1024 * 1024,
      onDeviceLost: error => {this.failure = error; this.onError?.(error); this.onWakeup?.();}});
    this.ready = []; this.records = []; this.free = []; this.held = new Set();
    this.oracleHashes = oracleHashes; this.validatePixels = validatePixels;
    this.validationBuffers = new Map();
    this.generation = 1; this.limit = poolLimit; this.busy = false; this.closed = false;
    if (!Number.isInteger(poolLimit) || poolLimit < 3 || poolLimit > 8)
      throw Error('Live ProRes pool limit must be 3..8');
    this.backpressureProbeAt = backpressureProbeAt;
    this.backpressureProbeTriggered = false;
    this.flushed = false; this.draining = false; this.failure = null; this.configured = false;
    this.frameWords = new Uint32Array(4);
    this.sharedUploadSupported = null;
    this.staging = null;
    this.stats = {clockKind: 'wasm-monotonic-wall/js-performance-wall',
      packets: 0, decoded: 0, delivered: 0, wasmMailboxCopyBytes: 0,
      ffmpegFrameThreadWallMs: 0, entropyThreadWallMs: 0,
      captureSerializationThreadWallMs: 0, wasmMailboxCopyThreadWallMs: 0,
      sourcePacketBytes: 0, refcountedPackets: 0,
      captureCopyMs: 0, workerCaptureCopyBytes: 0,
      coefficientPackingMs: 0, packedCoefficientWritesBytes: 0,
      repackWritesBytes: 0, entropyDestinationWritesBytes: 0,
      largeInputAllocationBytes: 0,
      stagingCopyMs: 0, stagingCopyBytes: 0, sharedUploadSupported: null,
      uploadSubmissionCpuMs: 0, gpuWriteBufferMs: 0, commandEncodeMs: 0,
      commandSubmitMs: 0, bytesUploaded: 0,
      mailboxPolls: 0, mailboxIdlePolls: 0, mailboxOperations: 0,
      mailboxOperationWallMs: 0, mailboxReceiveWallMs: 0,
      backpressure: 0, stale: 0, poolPeak: 0, poolReuses: 0, queuePeak: 0,
      perFrameCompletionWaits: 0, gpuCompletionSamples: [],
      coefficientParity: 0, coefficientHashMs: 0,
      validationGpuCopyBytes: 0, validationReadbackBytes: 0,
      validationMismatches: 0, validationReadbackWallMs: 0};
    this.timer = setInterval(() => {void this.pump();}, 1);
  }
  get diagnostics() {return {...this.stats, ready: this.ready.length, held: this.held.size,
    allocatedSurfaces: this.records.length, freeSurfaces: this.free.length,
    pooledSurfaceBytes: this.records.length * 640 * 360 * 8,
    generation: this.generation, runtime: this.runtime.diagnostics};}
  async initialize() {
    const device = await this.runtime.acquireDevice();
    device.addEventListener('uncapturederror', event => {
      this.failure = String(event.error?.message ?? event.error);
      this.onError?.(this.failure);
    });
    const [core, wrapper] = await Promise.all([
      fetch('/experiments/prores-idct-webgpu/idct-core.wgsl').then(r => r.text()),
      fetch('/experiments/prores-frame-webgpu/frame.wgsl').then(r => r.text()),
    ]);
    const module = device.createShaderModule({code: core + '\n' + wrapper});
    const messages = (await module.getCompilationInfo()).messages;
    if (messages.some(message => message.type === 'error'))
      throw Error(`Live ProRes shader validation: ${messages.map(m => m.message).join('; ')}`);
    this.pipeline = this.runtime.pipeline('live-prores-frame-proof', gpu =>
      gpu.createComputePipeline({layout: 'auto', compute: {module, entryPoint: 'main'}}));
    this.coefficients = this.runtime.buffer({size: 1024 * 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.descriptors = this.runtime.buffer({size: 8192,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.matrices = this.runtime.buffer({size: 128,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    this.params = this.runtime.buffer({size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    this.bindGroups = new WeakMap();
    return device;
  }
  acquire(pts, duration) {
    if (this.held.size >= this.limit) return null;
    let record = this.free.pop();
    if (record) this.stats.poolReuses++;
    else {
      record = {buffer: this.runtime.buffer({size: 640 * 360 * 8,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST |
          (this.validatePixels ? GPUBufferUsage.COPY_SRC : 0)})};
      this.records.push(record);
    }
    const generation = this.generation;
    let closed = false;
    const frame = {pts, duration, generation, width: 640, height: 360,
      pixelFormat: 'I422P10', color: {matrix: 'bt709', fullRange: false, chromaOffset: [0, 0]},
      surface: {layout: 'planar-u32', buffer: record.buffer}, close: () => {
        if (closed) return;
        closed = true;
        this.held.delete(frame);
        if (generation === this.generation) this.free.push(record);
        this.onWakeup?.();
      }};
    this.held.add(frame);
    this.stats.poolPeak = Math.max(this.stats.poolPeak, this.held.size);
    return frame;
  }
  releaseFrames() {
    this.generation++;
    this.onReset?.();
    for (const frame of [...this.held]) frame.close();
    this.ready.length = 0;
    this.free = [...this.records];
    this.onWakeup?.();
  }
  async pump() {
    if (this.closed || this.busy) return;
    const memory = this.engine.HEAPU8.buffer;
    const header = new Int32Array(memory, this.pointer, 16);
    const ticket = Atomics.load(header, 0);
    this.stats.mailboxPolls++;
    if ((ticket & 3) !== 1) {this.stats.mailboxIdlePolls++; return;}
    const operationStart = performance.now();
    this.stats.mailboxOperations++;
    this.busy = true;
    let result = 0;
    const view = new DataView(memory, this.pointer);
    const valid = () => Atomics.load(header, 0) === ticket;
    try {
      const operation = header[2];
      if (operation === 1) {
        const codec = new TextDecoder().decode(new Uint8Array(memory,
          this.pointer + FRAME_OFFSET + 1920 * 1080 * 3 / 2, 64).slice()).split('\0', 1)[0];
        if (codec !== 'prores' || header[5] !== 640 || header[6] !== 360)
          throw Error(`Unqualified live ProRes configuration: ${codec} ${header[5]}x${header[6]}`);
        this.configured = true; this.failure = null;
      } else if (operation === 2) {
        if (!this.configured || this.failure) throw Error(this.failure ?? 'Live ProRes not configured');
        const pts = view.getFloat64(64, true), duration = view.getFloat64(72, true);
        const size = header[4];
        if (!Number.isSafeInteger(pts) || !Number.isSafeInteger(duration) ||
            size < 32 || size > 2 * 1024 * 1024) throw Error('Invalid live ProRes mailbox payload');
        const forcedProbe = this.stats.packets === this.backpressureProbeAt &&
          !this.backpressureProbeTriggered;
        if (this.held.size >= this.limit || forcedProbe) {
          if (forcedProbe) this.backpressureProbeTriggered = true;
          this.stats.backpressure++;
          result = AGAIN;
          if (forcedProbe) this.onWakeup?.();
        } else {
          const begin = performance.now();
          const packetOffset = this.pointer + PACKET_OFFSET;
          const direct = new Uint32Array(memory, packetOffset, 1)[0] === 0x31505044;
          const bytes = direct ? null : new Uint8Array(memory, packetOffset, size).slice();
          const copied = performance.now();
          const captured = direct ? parsePackedCapture(memory, packetOffset, size, this.frameWords) :
            parseCapture(bytes);
          const packed = performance.now();
          if (this.oracleHashes) {
            const expected = this.oracleHashes[captured.frame];
            if (!expected || expected.frame !== captured.frame)
              throw Error(`No coefficient oracle for frame ${captured.frame}`);
            const combined = new Uint8Array(captured.packedWords.byteLength +
              captured.descriptorWords.byteLength + captured.matrixWords.byteLength);
            combined.set(new Uint8Array(captured.packedWords.buffer,
              captured.packedWords.byteOffset, captured.packedWords.byteLength));
            combined.set(new Uint8Array(captured.descriptorWords.buffer,
              captured.descriptorWords.byteOffset, captured.descriptorWords.byteLength),
              captured.packedWords.byteLength);
            combined.set(new Uint8Array(captured.matrixWords.buffer,
              captured.matrixWords.byteOffset, captured.matrixWords.byteLength),
              captured.packedWords.byteLength + captured.descriptorWords.byteLength);
            const digest = await crypto.subtle.digest('SHA-256', combined);
            const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
            if (actual !== expected.hash) throw Error(`Live coefficient parity failed frame ${captured.frame}: ${actual}`);
            this.stats.coefficientParity++;
            this.stats.coefficientHashMs += performance.now() - packed;
          }
          const validationDone = performance.now();
          const frame = this.acquire(pts, duration);
          if (!frame) throw Error('Live ProRes pool admission race');
          try {
            if (captured.packedWords.byteLength > this.coefficients.size ||
                captured.descriptorWords.byteLength > this.descriptors.size)
              throw Error('Live ProRes GPU input bound exceeded');
            const device = this.runtime.device;
            let coeff = captured.packedWords, descriptors = captured.descriptorWords,
              matrices = captured.matrixWords;
            const stagingStart = performance.now();
            if (direct && this.sharedUploadSupported === false) {
              this.staging ??= {coeff: new Uint32Array(1024 * 1024 / 4),
                descriptors: new Int32Array(8192 / 4), matrices: new Uint32Array(32)};
              this.staging.coeff.set(coeff); this.staging.descriptors.set(descriptors);
              this.staging.matrices.set(matrices);
              coeff = this.staging.coeff.subarray(0, coeff.length);
              descriptors = this.staging.descriptors.subarray(0, descriptors.length);
              matrices = this.staging.matrices;
              this.stats.stagingCopyBytes += captured.packedWords.byteLength +
                captured.descriptorWords.byteLength + captured.matrixWords.byteLength;
            }
            this.stats.stagingCopyMs += performance.now() - stagingStart;
            const uploadStart = performance.now();
            if (direct && this.sharedUploadSupported === null) {
              try {device.queue.writeBuffer(this.coefficients, 0, coeff);
                this.sharedUploadSupported = true;}
              catch (error) {
                if (!(error instanceof TypeError)) throw error;
                this.sharedUploadSupported = false;
                this.staging = {coeff: new Uint32Array(1024 * 1024 / 4),
                  descriptors: new Int32Array(8192 / 4), matrices: new Uint32Array(32)};
                const copyStart = performance.now();
                this.staging.coeff.set(coeff); this.staging.descriptors.set(descriptors);
                this.staging.matrices.set(matrices);
                this.stats.stagingCopyMs += performance.now() - copyStart;
                this.stats.stagingCopyBytes += captured.packedWords.byteLength +
                  captured.descriptorWords.byteLength + captured.matrixWords.byteLength;
                coeff = this.staging.coeff.subarray(0, coeff.length);
                descriptors = this.staging.descriptors.subarray(0, descriptors.length);
                matrices = this.staging.matrices;
                device.queue.writeBuffer(this.coefficients, 0, coeff);
              }
            } else device.queue.writeBuffer(this.coefficients, 0, coeff);
            device.queue.writeBuffer(this.descriptors, 0, descriptors);
            device.queue.writeBuffer(this.matrices, 0, matrices);
            device.queue.writeBuffer(this.params, 0, captured.frameWords);
            this.stats.gpuWriteBufferMs += performance.now() - uploadStart;
            this.stats.sharedUploadSupported = this.sharedUploadSupported;
            const encodeStart = performance.now();
            let group = this.bindGroups.get(frame.surface.buffer);
            if (!group) {
              group = device.createBindGroup({layout: this.pipeline.getBindGroupLayout(0), entries: [
                {binding: 0, resource: {buffer: this.coefficients}},
                {binding: 1, resource: {buffer: this.matrices}},
                {binding: 2, resource: {buffer: this.params}},
                {binding: 3, resource: {buffer: this.descriptors}},
                {binding: 4, resource: {buffer: frame.surface.buffer}},
              ]});
              this.bindGroups.set(frame.surface.buffer, group);
            }
            const encoder = device.createCommandEncoder();
            encoder.clearBuffer(frame.surface.buffer);
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.pipeline); pass.setBindGroup(0, group);
            pass.dispatchWorkgroups(captured.maxSliceMbCount, captured.sliceCount);
            pass.end();
            const commands = encoder.finish();
            this.stats.commandEncodeMs += performance.now() - encodeStart;
            const submitStart = performance.now();
            device.queue.submit([commands]);
            this.stats.commandSubmitMs += performance.now() - submitStart;
            if (this.validatePixels && [0, 90, 179].includes(captured.frame)) {
              const readback = this.runtime.buffer({size: 640 * 360 * 8,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ});
              const copy = device.createCommandEncoder();
              copy.copyBufferToBuffer(frame.surface.buffer, 0, readback, 0, 640 * 360 * 8);
              device.queue.submit([copy.finish()]);
              this.validationBuffers.set(captured.frame, readback);
              this.stats.validationGpuCopyBytes += readback.size;
            }
            const submitted = performance.now();
            this.ready.push(frame); this.stats.packets++; this.stats.decoded++;
            this.stats.ffmpegFrameThreadWallMs += Math.max(0, header[13]) / 1000;
            this.stats.entropyThreadWallMs += Math.max(0, header[14]) / 1000;
            this.stats.captureSerializationThreadWallMs += Math.max(0, header[15]) / 1000;
            this.stats.wasmMailboxCopyThreadWallMs += Math.max(0, header[7]) / 1000;
            this.stats.wasmMailboxCopyBytes += direct ? 0 : size;
            this.stats.sourcePacketBytes += Math.max(0, header[8]);
            this.stats.refcountedPackets += header[9] === 1 ? 1 : 0;
            this.stats.captureCopyMs += copied - begin;
            this.stats.workerCaptureCopyBytes += direct ? 0 : size;
            this.stats.coefficientPackingMs += packed - copied;
            this.stats.packedCoefficientWritesBytes += captured.packedWords.byteLength;
            if (direct) this.stats.entropyDestinationWritesBytes += captured.packedWords.byteLength;
            else {
              this.stats.repackWritesBytes += captured.packedWords.byteLength;
              this.stats.largeInputAllocationBytes += size + captured.packedWords.byteLength +
                captured.descriptorWords.byteLength + captured.matrixWords.byteLength;
            }
            this.stats.uploadSubmissionCpuMs += submitted - validationDone;
            this.stats.bytesUploaded += captured.packedWords.byteLength +
              captured.descriptorWords.byteLength + 144;
            this.stats.queuePeak = Math.max(this.stats.queuePeak, this.ready.length);
            if (this.stats.decoded % 30 === 0) {
              const frameIndex = captured.frame;
              void device.queue.onSubmittedWorkDone().then(() =>
                this.stats.gpuCompletionSamples.push({frame: frameIndex,
                  wallMsAfterSubmission: performance.now() - submitted}),
                error => {this.failure = String(error); this.onError?.(this.failure);});
            }
            this.onWakeup?.();
          } catch (error) {frame.close(); throw error;}
        }
      } else if (operation === 3) {this.draining = true; this.flushed = true; this.onWakeup?.();}
      else if (operation === 4) {
        if (this.failure) throw Error(this.failure);
        const frame = this.ready.shift();
        if (frame) {
          if (frame.generation !== this.generation) {frame.close(); this.stats.stale++; result = AGAIN;}
          else {
            header[5] = header[6] = 2; header[8] = 0;
            header[9] = header[10] = header[11] = 2; header[12] = 0;
            new Uint8Array(memory, this.pointer + FRAME_OFFSET, 6).set([16, 16, 16, 16, 128, 128]);
            view.setFloat64(64, frame.pts, true); view.setFloat64(72, frame.duration, true);
            try {this.onFrame?.(frame);}
            catch (error) {frame.close(); throw error;}
            this.stats.delivered++; result = 1;
          }
        } else result = this.draining && this.flushed ? EOF : AGAIN;
      } else if (operation === 5 || operation === 6) {
        this.releaseFrames(); this.draining = this.flushed = false;
        if (operation === 5) this.configured = false;
      } else throw Error(`Unknown live ProRes mailbox operation ${operation}`);
    } catch (error) {this.failure = String(error); this.onError?.(this.failure); result = IO;}
    finally {
      this.stats.mailboxOperationWallMs += performance.now() - operationStart;
      if (header[2] === 4) this.stats.mailboxReceiveWallMs += performance.now() - operationStart;
      if (valid()) {header[3] = result; Atomics.store(header, 0, ticket + 1); Atomics.notify(header, 0);}
      this.busy = false;
    }
  }
  async finalizeValidation() {
    const begin = performance.now();
    const comparisons = [];
    for (const [frame, buffer] of this.validationBuffers) {
      const response = await fetch(`/oracle/${String(frame).padStart(3, '0')}`);
      if (!response.ok) throw Error(`Missing pixel oracle for ${frame}`);
      const expected = new Uint16Array(await response.arrayBuffer());
      await buffer.mapAsync(GPUMapMode.READ);
      const actual = new Uint32Array(buffer.getMappedRange());
      let mismatches = 0, first = null;
      for (let index = 0; index < expected.length; index++) {
        if (actual[index] !== expected[index]) {
          mismatches++;
          first ??= {index, actual: actual[index], expected: expected[index]};
        }
      }
      buffer.unmap(); this.runtime.releaseBuffer(buffer);
      this.stats.validationReadbackBytes += buffer.size;
      this.stats.validationMismatches += mismatches;
      comparisons.push({frame, samples: expected.length, mismatches, first});
    }
    this.validationBuffers.clear();
    this.stats.validationReadbackWallMs += performance.now() - begin;
    return comparisons;
  }
  async close() {
    if (this.closed) return;
    this.closed = true; clearInterval(this.timer);
    const header = new Int32Array(this.engine.HEAPU8.buffer, this.pointer, 16);
    const ticket = Atomics.load(header, 0);
    if ((ticket & 3) === 1) {header[3] = IO; Atomics.store(header, 0, ticket + 1); Atomics.notify(header, 0);}
    this.releaseFrames();
    for (const buffer of this.validationBuffers.values()) this.runtime.releaseBuffer(buffer);
    this.validationBuffers.clear();
    await this.runtime.destroy();
  }
}
