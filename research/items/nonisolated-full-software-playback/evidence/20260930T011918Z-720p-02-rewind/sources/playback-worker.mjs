// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '/runtime/engine.js';
import {PrivatePlaybackHost} from './private-playback-host.mjs';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
onmessage = async ({data: {backend, canvas, fixture, width, height, duration = 4, seekTargets = [0.5, 1.5, 2.5], continuous = false, fps = 24, audioPort, latencyUs}}) => {
  let engine, host;
  const log = [], captures = [], stages = [];
  try {
    if (backend === 'asyncify') for (const name of ['Suspending', 'promising'])
      Object.defineProperty(WebAssembly, name, {value: undefined});
    if (crossOriginIsolated || typeof SharedArrayBuffer !== 'undefined') throw Error('Expected no isolation/shared memory');
    const bytes = await (await fetch('/engine/playback' + (backend === 'asyncify' ? '.asyncify' : '') + '.wasm')).arrayBuffer();
    const {default: create} = await import('/engine/playback.mjs');
    engine = await createCooperativeEngine(create, bytes, backend, {print: s => log.push(s), printErr: s => log.push(s)});
    if (!(engine.raw.memory.buffer instanceof ArrayBuffer)) throw Error('Expected private Wasm memory');
    host = new PrivatePlaybackHost(engine, canvas, width, height);
    const source = await (await fetch(fixture)).blob();
    await host.create(source, audioPort, latencyUs);
    let id = 1;
    const until = async (predicate, name, timeout = 10000) => {
      const start = performance.now();
      while (performance.now() - start < timeout) {
        const events = await host.pump();
        if (predicate(events)) {stages.push({name, elapsedMs: performance.now()-start, draws: host.draws, properties: {...host.properties}});postMessage({type: 'progress', backend, stage: stages.at(-1)});return;}
        await delay(8);
      }
      throw Error('Timed out: ' + name + '; properties=' + JSON.stringify(host.properties));
    };
    await host.command(id++, 'loadfile', 'brange://source');
    await until(events => events.some(e => e.event === 'file-loaded'), 'file-loaded');
    await until(() => host.draws > 0 && host.properties['video-codec'], 'initial-picture');
    for (const target of seekTargets) {
      await host.seek(id++, target);
      await until(events => events.some(e => e.event === 'playback-restart'), 'paused-seek-' + target);
      await host.pump(true);
      captures.push({target, position: host.properties['time-pos'], rgba: Array.from(host.picture())});
    }
    await host.seek(id++, 0);
    await until(events => events.some(e => e.event === 'playback-restart'), 'rewind');
    const longCalls = [], originalCall = engine.call, traceOrigin = performance.now();
    if (continuous) engine.call = async (...args) => {
      const start = performance.now();
      try {return await originalCall(...args);}
      finally {
        const elapsedMs = performance.now() - start;
        if (elapsedMs > 50 && longCalls.length < 128) longCalls.push({name: args[0], wallMs: start - traceOrigin, elapsedMs});
      }
    };
    const startAudioEpoch = host.audio?.header()[3];
    await host.command(id++, 'set', 'pause', 'no');
    const startDraws = host.draws;
    let continuity;
    if (continuous) {
      const samples = [], timeline = [], started = performance.now();
      let lastDraw = startDraws;
      let lastTick = started, lastTrace = -Infinity;
      await until(() => {
        const now = performance.now(), gapMs = now - lastTick;
        if (now - started < 5000 && now - lastTrace >= 100 || gapMs > 200) {
          timeline.push({wallMs: now - started, gapMs, position: host.properties['time-pos'],
            audio: host.audio ? {header: Array.from(host.audio.header()), posted: host.audio.posted, feedbackCount: host.audio.feedbackCount, running: host.audio.running} : undefined,
            scheduler: engine.scheduler.snapshot(), source: engine.source.snapshot()});
          lastTrace = now;
        }
        lastTick = now;
        if (host.draws !== lastDraw) {
          lastDraw = host.draws;
          samples.push({wallMs: performance.now() - started, position: host.properties['time-pos'], avsync: host.properties.avsync, draws: host.draws});
        }
        return host.properties['eof-reached'] === true;
      }, 'continuous-eof', duration * 1000 + 15000);
      const elapsedMs = performance.now() - started;
      const steady = samples.filter(s => s.position >= 0.5 && s.position < duration - 0.5);
      const gaps = steady.slice(1).map((s, i) => s.wallMs - steady[i].wallMs);
      const avsync = steady.map(s => Math.abs(s.avsync)).filter(Number.isFinite);
      const avsyncApplicable = !!host.properties['track-list']?.some(track => track.type === 'audio' && track.selected);
      continuity = {samples, timeline, longCalls, elapsedMs, frames: host.draws - startDraws,
        audioEpoch: startAudioEpoch, audioEpochStable: !host.audio || host.audio.epoch === startAudioEpoch,
        audioEOF: host.audio ? {epoch: host.audio.epoch, header: Array.from(host.audio.header()), eofReached: host.properties['eof-reached'] === true} : undefined,
        maxPresentationGapMs: Math.max(0, ...gaps), maxNativeAVSyncSeconds: Math.max(0, ...avsync),
        avsyncApplicable,
        thresholds: {minimumFrameRatio: 0.9, maximumPresentationGapMs: 250, maximumNativeAVSyncSeconds: 0.1, durationToleranceSeconds: 1},
        clockEvidence: 'Native mpv avsync is an internal diagnostic, not independent physical A/V qualification'};
      continuity.passed = continuity.frames >= duration * fps * 0.9 && continuity.maxPresentationGapMs <= 250
        && continuity.audioEpochStable && (!avsyncApplicable || avsync.length > 0 && continuity.maxNativeAVSyncSeconds <= 0.1) && Math.abs(elapsedMs / 1000 - duration) <= 1;
    } else {
      await until(() => host.properties['time-pos'] > 1 && host.draws - startDraws > 12, 'playing');
      await host.seek(id++, Math.max(2, duration - 2));
      await until(events => events.some(e => e.event === 'playback-restart'), 'playing-seek');
      await until(() => host.properties['eof-reached'] === true, 'eof', 10000);
    }
    const draws = host.draws, properties = {...host.properties};
    const cleanup = await host.destroy();host = null;
    if (cleanup.scheduler.liveTasks || cleanup.scheduler.retainedTasks || cleanup.scheduler.freeSlots !== 24 || cleanup.source.handles || cleanup.source.pending)
      throw Error('Resources survived destroy: ' + JSON.stringify(cleanup));
    // Recreate with a genuinely pending finite-source read, then revoke it.
    // Closing must abort the read before waiting for native task teardown.
    engine = await createCooperativeEngine(create, bytes, backend, {print: s => log.push(s), printErr: s => log.push(s)});
    host = new PrivatePlaybackHost(engine, new OffscreenCanvas(width, height), width, height);
    let readStarted = false, readAborted = false;
    await host.create({size: source.size, read: (offset, count, signal) => new Promise((resolve, reject) => {
      readStarted = true;
      const abort = () => {readAborted = true;reject(Error('Expected cancellation'));};
      if (signal.aborted) abort();else signal.addEventListener('abort', abort, {once: true});
    })});
    await host.command(100, 'loadfile', 'brange://source');
    for (let i = 0; i < 100 && !readStarted; i++) await delay(5);
    if (!readStarted || !engine.source.snapshot().pending) throw Error('Cancellation control did not enter a pending read');
    const cancellation = await host.destroy();host = null;
    cancellation.readAborted = readAborted;
    if (!readAborted || cancellation.scheduler.liveTasks || cancellation.scheduler.retainedTasks || cancellation.source.handles || cancellation.source.pending)
      throw Error('Pending read cancellation leaked resources');
    postMessage({passed: !continuity || continuity.passed, backend, captures, stages, draws, properties, cleanup, cancellation, continuity, log,
      facts: {crossOriginIsolated, sharedArrayBuffer: typeof SharedArrayBuffer,
        jspiSuspending: typeof WebAssembly.Suspending, memory: engine.raw.memory.buffer.constructor.name}});
  } catch (error) {
    const details = {passed: false, backend, error: String(error.stack ?? error), log, captures, stages,
      properties: host?.properties, events: host?.events, snapshot: engine?.scheduler.snapshot()};
    postMessage({type: 'progress', backend, failure: details});
    try {if (host) details.cleanup = await host.destroy();else engine?.dispose();} catch (cleanupError) {details.cleanupError = String(cleanupError);engine?.dispose();}
    postMessage(details);
  }
};
