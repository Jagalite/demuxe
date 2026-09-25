// SPDX-License-Identifier: Apache-2.0
// Isolated real-packet playback worker. mpv still selects PTS and deadlines.
import {LiveProResService} from './service.js';
import {WebGPUPresenter} from '/web/webgpu/presenter.js';

let engine, service, presenter, canvas, context, timer, mode, closing = false;
let held = null, selectedSerial = 0, pending = null, lastSelected = -1;
let fileLoaded = false, position = 0, eof = false;
let softwareImage;
const gpuMode = () => mode?.startsWith('gpu');
const frames = new Map();
const metrics = {decoded: 0, presented: 0, dropped: 0, missing: 0,
  selected: 0, redraws: 0, peakRetained: 0, peakQueue: 0,
  presenterCpuMs: 0, renderCpuMs: 0, softwareCopyCpuMs: 0,
  workerMessageCpuMs: 0, workerMessages: 0, tickCpuMs: 0, tickCalls: 0,
  lateMs: [], pts: [], errors: [], events: [], openMs: 0};
const now = () => performance.now();
function report(type = 'stats', extra = {}) {
  const start = now();
  let softwareProfile = null;
  if (mode === 'software-profile' && engine?._web_prores_profile_ptr) {
    const ptr = engine._web_prores_profile_ptr();
    const data = new DataView(engine.HEAPU8.buffer, ptr, 32);
    softwareProfile = {clockKind: 'wasm-monotonic-wall',
      ffmpegFrameThreadWallMs: Number(data.getBigUint64(0, true)) / 1e6,
      entropyThreadWallMs: Number(data.getBigUint64(8, true)) / 1e6,
      reconstructionThreadWallMs: Number(data.getBigUint64(16, true)) / 1e6,
      components: Number(data.getBigUint64(24, true))};
  }
  postMessage({type, data: {mode, ...metrics, position, eof, fileLoaded,
    retained: frames.size + (held ? 1 : 0), pending: !!pending,
    decoder: service?.diagnostics ?? null, softwareProfile, ...extra}});
  metrics.workerMessages++;
  metrics.workerMessageCpuMs += now() - start;
}
function closeFrame(frame) {frame.close();}
function resetRetained() {
  if (pending?.timer) clearTimeout(pending.timer);
  pending = null;
  for (const frame of frames.values()) closeFrame(frame);
  frames.clear();
  if (held) closeFrame(held);
  held = null; lastSelected = -1; selectedSerial = 0;
}
function forgetOld(key) {
  for (const [pts, frame] of frames) if (pts < key) {
    frames.delete(pts); closeFrame(frame); metrics.dropped++;
  }
}
function presentReady() {
  if (!pending || closing || !gpuMode()) return;
  const frame = frames.get(pending.key);
  if (!frame) return;
  const {key, deadline} = pending;
  const delay = deadline - now();
  if (delay > 1) {
    if (!pending.timer) pending.timer = setTimeout(() => {
      if (pending?.key === key) pending.timer = null;
      presentReady();
    }, delay);
    return;
  }
  pending = null; frames.delete(key);
  forgetOld(key);
  if (frame.generation !== service.generation) {
    closeFrame(frame); metrics.dropped++; return;
  }
  const start = now();
  presenter.draw(frame, null, null);
  metrics.presenterCpuMs += now() - start;
  metrics.presented++;
  metrics.lateMs.push(now() - deadline);
  metrics.pts.push(key);
  if (held) closeFrame(held);
  held = frame;
  lastSelected = key;
  engine._web_presented();
}
function receiveFrame(frame) {
  metrics.decoded++;
  if (closing || frame.generation !== service.generation || frame.pts <= lastSelected) {
    closeFrame(frame); metrics.dropped++; return;
  }
  const key = Math.round(frame.pts);
  if (frames.has(key)) {closeFrame(frame); throw Error(`Duplicate retained PTS ${key}`);}
  frames.set(key, frame);
  metrics.peakRetained = Math.max(metrics.peakRetained, frames.size + (held ? 1 : 0));
  metrics.peakQueue = Math.max(metrics.peakQueue, frames.size);
  if (frames.size > service.limit) throw Error('Retained frame bound exceeded');
  presentReady();
}
function selected() {
  const serial = engine._web_selected_serial();
  if (serial === selectedSerial) return;
  selectedSerial = serial; metrics.selected++;
  if (engine._web_selected_redraw() && held) {
    const start = now(); presenter.draw(held, null, null);
    metrics.presenterCpuMs += now() - start; metrics.redraws++;
    engine._web_presented(); return;
  }
  const key = Math.round(engine._web_selected_pts() * 1e6);
  if (key < 0) return;
  if (pending?.timer) clearTimeout(pending.timer);
  if (pending && pending.key !== key) metrics.missing++;
  pending = {key, deadline: now() + engine._web_selected_delay(), timer: null};
  forgetOld(key);
  presentReady();
}
function tick() {
  if (closing) return;
  const tickStart = now(); metrics.tickCalls++;
  try {
    for (let i = 0; i < 64; i++) {
      const ptr = engine._web_event(); if (!ptr) break;
      const event = JSON.parse(engine.UTF8ToString(ptr)); engine._free(ptr);
      if (event.event === 'file-loaded') {fileLoaded = true; report('loaded');}
      if (event.event === 'end-file') eof = true;
      if (event.event === 'property-change' && event.name === 'time-pos') position = event.data;
      if (event.event === 'property-change' && event.name === 'eof-reached') eof = !!event.data;
      if (['file-loaded', 'end-file', 'playback-restart', 'seek'].includes(event.event))
        metrics.events.push({event: event.event, at: now(), position});
      if (event.event === 'command-reply' && event.error) metrics.errors.push(String(event.error));
    }
    const begin = now();
    const ptr = engine._web_render(canvas.width, canvas.height, 0);
    metrics.renderCpuMs += now() - begin;
    if (ptr) {
      if (gpuMode()) selected();
      else {
        const copy = now();
        softwareImage ??= new ImageData(canvas.width, canvas.height);
        softwareImage.data.set(engine.HEAPU8.subarray(ptr, ptr + softwareImage.data.length));
        for (let i = 3; i < softwareImage.data.length; i += 4) softwareImage.data[i] = 255;
        context.putImageData(softwareImage, 0, 0);
        metrics.softwareCopyCpuMs += now() - copy;
        metrics.presented++; engine._web_presented();
      }
    }
    if (metrics.presented && metrics.presented % 30 === 0 && metrics.lastReported !== metrics.presented) {
      metrics.lastReported = metrics.presented; report();
    }
  } catch (error) {
    metrics.errors.push(String(error.stack ?? error));
    clearInterval(timer); report('error');
  } finally {
    metrics.tickCpuMs += now() - tickStart;
  }
}
function command(id, args) {
  const padded = [...args]; while (padded.length < 4) padded.push(null);
  const result = engine.ccall('web_command_args', 'number',
    ['number', 'string', 'string', 'string', 'string'], [id, ...padded]);
  if (result < 0) throw Error(`mpv command rejected: ${result}`);
}
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      mode = data.mode; canvas = data.canvas;
      if (!['gpu', 'gpu-direct', 'gpu-fast', 'gpu-direct-fast',
        'software', 'software-profile'].includes(mode))
        throw Error('Invalid experiment mode');
      if (!gpuMode()) context = canvas.getContext('2d', {alpha: false});
      const enginePath = mode === 'gpu' ? 'engine' : mode === 'gpu-direct' ? 'direct' :
        mode === 'gpu-fast' ? 'engine-fast' : mode === 'gpu-direct-fast' ? 'direct-fast' :
        mode === 'software-profile' ? 'software-profile' : 'software';
      const create = (await import(`/build/experiments/prores-real-packet-webgpu/${enginePath}/player.mjs`)).default;
      engine = await create({printErr: message => postMessage({type: 'log', message}),
        print: message => postMessage({type: 'log', message})});
      engine.FS.mkdir('/fonts');
      engine.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));
      if (gpuMode()) {
        service = new LiveProResService(engine, {
          oracleHashes: data.oracleHashes ?? null, validatePixels: !!data.validatePixels,
          poolLimit: data.poolLimit ?? 8, backpressureProbeAt: data.backpressureProbeAt,
          onReset: resetRetained,
          onFrame: receiveFrame, onWakeup: () => engine._web_decoder_wakeup(),
          onError: error => {metrics.errors.push(String(error)); report('error');}});
        await service.initialize();
        presenter = new WebGPUPresenter(canvas, service.runtime);
        engine._web_decoder_enable(3);
      }
      const result = engine._web_create(data.sampleRate);
      if (result < 0) throw Error(`mpv create failed ${result}`);
      engine._web_experiment_skip_render(gpuMode() ? 1 : 0);
      timer = setInterval(tick, 5);
      postMessage({type: 'ready'});
    } else if (data.type === 'open') {
      engine.FS.writeFile('/fixture.mov', new Uint8Array(data.bytes));
      const start = now();
      command(data.id, ['loadfile', '/fixture.mov', 'replace']);
      metrics.openMs = now() - start;
    } else if (data.type === 'command') command(data.id, data.args);
    else if (data.type === 'stats') report();
    else if (data.type === 'finalize') {
      const comparisons = await service?.finalizeValidation() ?? [];
      report('finalized', {pixelComparisons: comparisons});
    }
    else if (data.type === 'destroy') {
      closing = true; clearInterval(timer);
      if (pending?.timer) clearTimeout(pending.timer);
      pending = null;
      for (const frame of frames.values()) closeFrame(frame);
      frames.clear(); if (held) closeFrame(held); held = null;
      presenter?.destroy();
      await service?.close();
      engine?._web_destroy();
      const deadline = now() + 2500;
      while (engine?.PThread.runningWorkers.length && now() < deadline)
        await new Promise(resolve => setTimeout(resolve, 10));
      if (engine?.PThread.runningWorkers.length) throw Error('mpv pthread cleanup did not settle');
      engine?.PThread.terminateAllThreads();
      report('destroyed'); self.close();
    }
  } catch (error) {metrics.errors.push(String(error.stack ?? error)); report('error');}
};
