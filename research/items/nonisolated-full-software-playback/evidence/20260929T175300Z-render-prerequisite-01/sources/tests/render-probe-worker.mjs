// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '/runtime/engine.js';

onmessage = async ({data: {backend}}) => {
  let engine;
  const log = [], cycles = [];
  try {
    if (backend === 'asyncify') {
      for (const name of ['Suspending', 'promising']) Object.defineProperty(WebAssembly, name, {value: undefined});
    }
    if (crossOriginIsolated || typeof SharedArrayBuffer !== 'undefined') throw Error('Expected a non-isolated worker');
    const bytes = await (await fetch('/engine/probe' + (backend === 'asyncify' ? '.asyncify' : '') + '.wasm')).arrayBuffer();
    const {default: create} = await import('/engine/probe.mjs');
    engine = await createCooperativeEngine(create, bytes, backend, {print: s => log.push(s), printErr: s => log.push(s)});
    if (!(engine.raw.memory.buffer instanceof ArrayBuffer)) throw Error('Expected private memory');
    for (let cycle = 0; cycle < 3; cycle++) {
      const created = await engine.call('web_create', 48000);
      if (created !== 0) throw Error('web_create returned ' + created);
      const ptr = await engine.call('web_render', 64, 64, 1);
      if (!ptr || ptr + 64 * 64 * 4 > engine.raw.memory.buffer.byteLength) throw Error('No valid RGB render buffer');
      const rgb = new Uint8Array(engine.raw.memory.buffer, ptr, 64 * 64 * 4);
      let nonzeroRGB = 0;
      for (let i = 0; i < rgb.length; i++) if (i % 4 !== 3 && rgb[i]) nonzeroRGB++;
      if (nonzeroRGB) throw Error('Idle renderer did not produce a black image');
      await engine.call('web_presented');
      const invalidRender = await engine.call('web_render', 0, 64, 1);
      if (invalidRender !== 0) throw Error('Invalid render size accepted');
      await engine.call('web_destroy');
      const snapshot = engine.scheduler.snapshot();
      if (snapshot.liveTasks || snapshot.retainedTasks || snapshot.freeSlots !== 24) throw Error('Logical tasks survived destroy');
      cycles.push({cycle, created, validRenderBuffer: true, blackIdleImage: true, invalidRender, snapshot});
    }
    const facts = {crossOriginIsolated, sharedArrayBuffer: typeof SharedArrayBuffer,
      jspiSuspending: typeof WebAssembly.Suspending, jspiPromising: typeof WebAssembly.promising,
      memory: engine.raw.memory.buffer.constructor.name, heapBytes: engine.raw.memory.buffer.byteLength};
    engine.dispose();
    postMessage({passed: true, backend, cycles, facts, log,
      scope: 'RGB idle renderer lifecycle only; no video decode, media, sound, display cadence or full playback qualification'});
  } catch (error) {
    const snapshot = engine?.scheduler.snapshot();
    engine?.dispose();
    postMessage({passed: false, backend, cycles, snapshot, error: String(error.stack ?? error), log});
  }
};
