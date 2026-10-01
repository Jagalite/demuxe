// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '/runtime/engine.js';
import {PrivatePlaybackHost} from './private-playback-host.mjs';
import {privateMpv, privateMpvSource} from '/web/private-mpv.js';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => {if (!condition) throw Error(message);};
onmessage = async ({data: {backend, fixture, width, height, installed}}) => {
  const cases = [], log = [];
  let engine, host, sourceOwner;
  try {
    if (backend === 'asyncify') for (const name of ['Suspending', 'promising']) Object.defineProperty(WebAssembly, name, {value: undefined});
    assert(!crossOriginIsolated && typeof SharedArrayBuffer === 'undefined', 'Expected absent isolation/SAB');
    const bytes = await (await fetch('/engine/playback' + (backend === 'asyncify' ? '.asyncify' : '') + '.wasm')).arrayBuffer();
    const {default: create} = await import('/engine/playback.mjs');
    const source = await (await fetch(fixture)).blob();
    const init = async reader => {
      engine = installed ? await privateMpv(backend, 'playback') : await createCooperativeEngine(create, bytes, backend, {print: s => log.push(s), printErr: s => log.push(s)});
      host = new PrivatePlaybackHost(engine, new OffscreenCanvas(width, height), width, height);
      if (reader?.options) {
        sourceOwner = privateMpvSource(reader, reader.refresh);
        await sourceOwner.open(engine);
        reader = engine.source.source.reader;
      }
      await host.create(reader);
      await host.command(1, 'loadfile', 'brange://source');
    };
    const until = async predicate => {
      const start = performance.now();
      while (performance.now() - start < 8000) {if (predicate(await host.pump())) return;await delay(8);}
      throw Error('Lifecycle observation deadline');
    };
    const cleanup = async () => {
      let result;
      try {result = await host.destroy();} finally {sourceOwner?.close();sourceOwner = null;}
      host = null;
      for (const key of ['liveTasks', 'retainedTasks', 'waitKeys', 'timers']) assert(result.scheduler[key] === 0, 'Scheduler leak: ' + key);
      assert(result.scheduler.freeSlots === 24, 'Lost coroutine slot');
      for (const key of ['handles', 'pending', 'timers']) assert(result.source[key] === 0, 'Source leak: ' + key);
      return result;
    };
    for (let cycle = 0; cycle < 10; cycle++) {
      await init(source);
      await until(() => host.draws > 0 && host.properties['video-codec']);
      await host.seek(2, 1.5);
      await until(events => events.some(e => e.event === 'playback-restart'));
      await host.pump(true);
      const row = {scenario: 'repeated-create-seek-destroy', cycle, heapBytes: engine.raw.memory.buffer.byteLength, draws: host.draws, cleanup: await cleanup()};
      assert(row.heapBytes <= 134217728 && row.draws > 1, 'Repeated cycle exceeded declared resources');
      cases.push(row);
    }
    for (const scenario of ['range', 'auth', 'permission', 'identity-change']) {
      let refreshed = 0, error;
      try {
        await init({options: {url: new URL('/range?scenario=' + scenario + '&session=' + backend, location.href).href, credentials: 'omit', ...(scenario === 'identity-change' ? {blockBytes: 1024} : {})},
          refresh: async () => {refreshed++;return {headers: {'X-Proof': 'renewed'}};}});
        await until(events => {
          const failed = events.find(e => e.event === 'end-file' && e.reason === 'error');
          if (failed) throw Error('HTTP source end-file error');
          return host.draws > 0;
        });
        if (scenario === 'range' || scenario === 'auth') {
          await host.seek(2, 2.5);await until(events => events.some(e => e.event === 'playback-restart'));
        }
      } catch (e) {error = String(e);}
      assert(['permission', 'identity-change'].includes(scenario) ? !!error : !error, 'Unexpected HTTP result: ' + scenario + ': ' + error);
      assert(scenario !== 'auth' || refreshed === 1, 'Authorization renewal did not occur exactly once');
      const readerStats = sourceOwner?.reader.snapshot?.() ?? sourceOwner?.reader.stats;
      cases.push({scenario: 'http-' + scenario, refreshed, expectedError: error, readerStats, cleanup: await cleanup()});
    }
    for (const scenario of ['failed-read', 'stalled-read', 'late-after-cancel']) {
      let aborted = false, lateResolve, reads = 0;
      const reader = {size: source.size, read: (offset, count, signal) => {
        reads++;
        signal.addEventListener('abort', () => {aborted = true;}, {once: true});
        if (scenario === 'failed-read') return Promise.reject(Error('Injected finite read failure'));
        return new Promise(resolve => {lateResolve = () => resolve(new Uint8Array(count).fill(0x5a));});
      }};
      await init(reader);
      const start = performance.now();
      if (scenario === 'late-after-cancel') {
        for (let i = 0; i < 200 && !reads; i++) await delay(5);
        assert(reads > 0 && engine.source.snapshot().pending > 0, 'Did not observe pending read');
        const result = await cleanup();
        lateResolve();await delay(10);
        assert(aborted && engine.source.snapshot().copies === 0, 'Canceled reader committed late data');
        cases.push({scenario, elapsedMs: performance.now() - start, aborted, cleanup: result});
      } else {
        await until(events => events.some(e => e.event === 'end-file' && e.reason === 'error'));
        const observed = engine.source.snapshot();
        assert(reads > 0 && (scenario === 'failed-read' ? observed.errors > 0 : observed.timeouts > 0 && aborted), 'Expected read failure was not observed');
        cases.push({scenario, elapsedMs: performance.now() - start, observed, cleanup: await cleanup()});
      }
    }
    await init(source);await until(() => host.draws > 0);
    const injected = Error('Injected worklet stop deadline');
    host.audio = {async stop() {throw injected;}, snapshot() {return {injectedStopFailure: true};}};
    let caught;
    try {await host.destroy();} catch (error) {caught = error;}
    assert(caught === injected, 'Stop failure was not preserved');
    assert(engine.scheduler.snapshot().liveTasks === 0 && engine.source.snapshot().handles === 0, 'Stop failure skipped engine cleanup');
    host = null;
    cases.push({scenario: 'stop-failure-with-real-engine', scheduler: engine.scheduler.snapshot(), source: engine.source.snapshot()});
    if (installed) for (const scenario of ['identity', 'wasm-corrupt', 'glue-corrupt', 'missing', 'wrong-abi']) {
      const originalFetch = fetch;
      const wrongABI = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
      const wrongHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', wrongABI)), n => n.toString(16).padStart(2, '0')).join('');
      globalThis.fetch = async (...args) => {
        const url = new URL(String(args[0]), location.href);
        if (!url.pathname.includes('engine-mpv-playback-')) return originalFetch(...args);
        if (scenario === 'missing') return new Response('', {status: 404});
        const response = await originalFetch(...args);
        if (url.pathname.endsWith('/manifest.json') && ['identity', 'wrong-abi'].includes(scenario)) {
          const manifest = await response.json();
          if (scenario === 'identity') manifest.profile = 'audio';
          else manifest.files['player.wasm'] = wrongHash;
          return new Response(JSON.stringify(manifest));
        }
        if (scenario === 'wrong-abi' && url.pathname.endsWith('/player.wasm')) return new Response(wrongABI);
        if (scenario === 'wasm-corrupt' && url.pathname.endsWith('/player.wasm') || scenario === 'glue-corrupt' && url.pathname.endsWith('/player.mjs')) {
          const data = new Uint8Array(await response.arrayBuffer());data[data.length - 1] ^= 1;return new Response(data);
        }
        return response;
      };
      let error;
      try {const candidate = await privateMpv(backend, 'playback');candidate.dispose();}
      catch (e) {error = String(e);}
      finally {globalThis.fetch = originalFetch;}
      assert(!!error, 'Faulted playback asset was admitted: ' + scenario);
      cases.push({scenario: 'asset-' + scenario, expectedError: error});
    }
    postMessage({passed: true, backend, cases, log, facts: {crossOriginIsolated, sharedArrayBuffer: typeof SharedArrayBuffer}});
  } catch (error) {
    let cleanupError;
    try {if (host) await host.destroy();else engine?.dispose();} catch (e) {cleanupError = String(e);engine?.dispose();}
    finally {sourceOwner?.close();}
    postMessage({passed: false, backend, cases, log, error: String(error.stack ?? error), cleanupError});
  }
};
