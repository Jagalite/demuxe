// SPDX-License-Identifier: Apache-2.0
// Browser Worker adapter for the exact, separately verified packaged FFmpeg ABI.
// The caller serves only staged manifest artifacts and owns Worker termination.
const profiles = new Map([['packet-copy', 0], ['video-only', 0], ['flac24', 3], ['opus-permitted', 2]]);
const abortError = () => new DOMException('FFmpeg baseline cancelled', 'AbortError');
function requireCondition(condition, message) { if (!condition) throw Error(message); }
function boundedInteger(value, minimum, maximum, name) {
  requireCondition(Number.isSafeInteger(value) && value >= minimum && value <= maximum, 'Invalid FFmpeg baseline ' + name);
  return value;
}

export async function createBaseline({factoryURL, wasmURL, bridgeURL, runtime = 'asyncify'}, {
  timeoutMs = 45000, shutdownTimeoutMs = 5000, maxOutputBytes = 96 * 1024 * 1024,
  maxInputBytes = 64 * 1024 * 1024, maxSteps = 10000, signal,
} = {}) {
  boundedInteger(timeoutMs, 1, 60000, 'deadline');
  boundedInteger(shutdownTimeoutMs, 1, 120000, 'shutdown deadline');
  boundedInteger(maxOutputBytes, 1, 512 * 1024 * 1024, 'output budget');
  boundedInteger(maxInputBytes, 1, 512 * 1024 * 1024, 'input budget');
  boundedInteger(maxSteps, 1, 1000000, 'drain budget');
  requireCondition(runtime === 'asyncify' || runtime === 'jspi', 'Invalid FFmpeg baseline runtime');
  if (runtime === 'jspi') requireCondition(typeof WebAssembly.Suspending === 'function' && typeof WebAssembly.promising === 'function', 'Selected FFmpeg baseline JSPI runtime is unavailable');
  else for (const name of ['Suspending', 'promising']) Object.defineProperty(WebAssembly, name, {value: undefined, configurable: true, writable: true});
  for (const url of [factoryURL, wasmURL, bridgeURL]) requireCondition(typeof url === 'string' && url.length > 0, 'Missing packaged FFmpeg artifact URL');
  if (signal?.aborted) throw abortError();
  const initialization = new AbortController();
  const initializationFailure = () => signal?.aborted ? abortError() : Error('FFmpeg baseline initialization deadline exceeded');
  let rejectInitialization;
  const stopped = new Promise((_, reject) => { rejectInitialization = reject; });
  initialization.signal.addEventListener('abort', () => rejectInitialization(initializationFailure()), {once: true});
  const cancelInitialization = () => initialization.abort();
  signal?.addEventListener('abort', cancelInitialization, {once: true});
  const timer = setTimeout(cancelInitialization, timeoutMs);
  let engine, bridge;
  try {
    const [{default: factory}, {createFFmpegBridge}, response] = await Promise.race([Promise.all([
      import(factoryURL), import(bridgeURL), fetch(wasmURL, {signal: initialization.signal}),
    ]), stopped]);
    requireCondition(response.ok, 'Packaged FFmpeg Wasm HTTP ' + response.status);
    requireCondition(typeof factory === 'function' && typeof createFFmpegBridge === 'function', 'Packaged FFmpeg factory/bridge ABI mismatch');
    const wasmBinary = new Uint8Array(await Promise.race([response.arrayBuffer(), stopped]));
    if (initialization.signal.aborted) throw initializationFailure();
    engine = await Promise.race([factory({wasmBinary, printErr() {}}), stopped]);
    if (initialization.signal.aborted) throw initializationFailure();
    bridge = createFFmpegBridge(engine, {timeoutMs, shutdownTimeoutMs});
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancelInitialization);
  }
  let active = false, closed = false, closing;
  const dispose = () => {
    if (closing) return closing;
    closed = true;
    bridge.cancel();
    closing = bridge.destroy();
    return closing;
  };
  const operate = async (blob, configuration, operationSignal, probeOnly) => {
    requireCondition(!closed, 'FFmpeg baseline is closed');
    requireCondition(!active, 'Concurrent FFmpeg baseline operation');
    requireCondition(blob instanceof Blob && Number.isSafeInteger(blob.size) && blob.size > 0 && blob.size <= maxInputBytes, 'FFmpeg baseline requires a nonempty finite Blob within the input budget');
    const profile = configuration.profile ?? 'packet-copy';
    requireCondition(profiles.has(profile), 'Unsupported FFmpeg baseline profile: ' + profile);
    const target = configuration.target ?? 0;
    requireCondition(Number.isFinite(target) && target >= 0, 'Invalid FFmpeg baseline target');
    requireCondition(configuration.container === undefined || ['mp4', 'webm'].includes(configuration.container), 'Invalid FFmpeg baseline container');
    const videoTrack = boundedInteger(configuration.videoTrack ?? -1, -1, 0x7fffffff, 'video track');
    const audioTrack = boundedInteger(profile === 'video-only' ? -2 : configuration.audioTrack ?? -1, -2, 0x7fffffff, 'audio track');
    if (operationSignal?.aborted) throw abortError();
    active = true;
    const began = performance.now();
    let failure, outputBytes = 0, steps = 0;
    const chunks = [];
    const cancel = error => { failure ??= error; bridge.cancel(); };
    const onAbort = () => cancel(abortError());
    operationSignal?.addEventListener('abort', onAbort, {once: true});
    const operationTimer = setTimeout(() => cancel(Error('FFmpeg baseline operation deadline exceeded')), timeoutMs);
    const check = () => {
      if (failure) throw failure;
      if (closed) throw Error('FFmpeg baseline is closed');
      if (performance.now() - began >= timeoutMs) {
        cancel(Error('FFmpeg baseline operation deadline exceeded')); throw failure;
      }
    };
    const call = async (name, args = [], type = 'number') => {
      check();
      let result;
      try { result = await bridge.call(name, type, args.map(() => 'number'), args); }
      catch (error) { throw failure ?? error; }
      check();
      if (type === 'number') {
        requireCondition(Number.isFinite(result), 'Invalid FFmpeg baseline ABI result: ' + name);
        if (result < 0) throw Error('Packaged FFmpeg ' + name + ': ' + await bridge.call('rm_error', 'string', [], []));
      }
      return result;
    };
    try {
      bridge.setSource(blob);
      engine.tracks = []; engine.raps = []; engine.videoFrames = [];
      engine.emit = bytes => {
        check();
        requireCondition(bytes instanceof Uint8Array, 'Invalid FFmpeg baseline output chunk');
        requireCondition(outputBytes + bytes.byteLength <= maxOutputBytes, 'FFmpeg baseline output budget exceeded');
        chunks.push(bytes.slice()); outputBytes += bytes.byteLength;
      };
      if (typeof engine._rm_adapt_audio === 'function') await call('rm_adapt_audio', [profiles.get(profile)]);
      else requireCondition(profiles.get(profile) === 0, 'Packaged FFmpeg audio adaptation ABI unavailable');
      await call('rm_probe', [blob.size]);
      const probe = structuredClone(engine.tracks), duration = await call('rm_duration');
      requireCondition(duration >= 0, 'Invalid FFmpeg baseline duration');
      if (probeOnly) {
        await call('rm_close', [], null);
        return {tracks: probe, duration, format: engine.format};
      }
      engine.tracks = [];
      await call('rm_open', [blob.size, videoTrack, audioTrack]);
      const tracks = structuredClone(engine.tracks);
      const videoCodec = await call('rm_video_codec', [], 'string'), audioCodec = await call('rm_audio_codec', [], 'string');
      const container = configuration.container ?? (engine.container === 'webm' ? 'webm' : 'mp4');
      await call('rm_set_container', [container === 'webm' ? 1 : 0]);
      await call('rm_start', [target]);
      while (true) {
        requireCondition(++steps <= maxSteps, 'FFmpeg baseline drain budget exceeded');
        const more = await call('rm_step');
        requireCondition(more === 0 || more === 1, 'Invalid FFmpeg baseline drain status');
        if (!more) break;
      }
      requireCondition(outputBytes > 0, 'Packaged FFmpeg produced no media');
      const output = new Uint8Array(outputBytes);
      let offset = 0;
      for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
      const stats = {steps, outputBytes, preparationMs: performance.now() - began, residentBytes: engine.HEAPU8.byteLength};
      await call('rm_close', [], null);
      return {output, tracks, probe, duration, videoCodec, audioCodec, container, profile, target, runtime, stats};
    } catch (error) {
      failure ??= error;
      await dispose().catch(() => {});
      throw failure;
    } finally {
      clearTimeout(operationTimer); operationSignal?.removeEventListener('abort', onAbort);
      engine.emit = () => {};
      active = false;
    }
  };
  return {
    prepareFile: (blob, configuration = {}, operationSignal) => operate(blob, configuration, operationSignal, false),
    probeFile: (blob, operationSignal) => operate(blob, {}, operationSignal, true),
    dispose,
  };
}
