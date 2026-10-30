// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMediaBunnyPreviewProvider} from '../index.js';

function fixture(getCanvas, sourceExtra = {}) {
  let disposed = 0;
  const canvas = {width: 240, height: 135, convertToBlob: async () => new Blob(['image'])};
  class Input {
    async getPrimaryVideoTrack() { return {canDecode: async () => true}; }
    dispose() { disposed++; }
  }
  class CanvasSink { async getCanvas(time) { return getCanvas ? getCanvas(time) : {canvas, timestamp: 1, duration: 0.04}; } }
  const provider = createMediaBunnyPreviewProvider({formats: [{}], getSource: id => id === 'current' ? {id, size: 1, read: async () => new Uint8Array(1), ...sourceExtra} : null,
    load: async () => ({Input, CanvasSink, CustomSource: class {}})});
  return {provider, canvas, disposed: () => disposed};
}
const request = () => ({time: 1.02, width: 240, height: 135, exact: true, sourceId: 'current', signal: new AbortController().signal, publish() { throw new Error('Unexpected provisional publication'); }});

test('preview preserves represented PTS and retires its input and canvas', async () => {
  const {provider, canvas, disposed} = fixture();
  const result = await provider.getFrame(request());
  assert.equal(result.actualTime, 1);
  assert.equal(result.temporalAccuracy, 'approximate');
  assert.equal(result.fidelity, 'reduced');
  assert.equal(result.image.blob.size, 5);
  assert.equal(result.width, 240);
  assert.equal(canvas.width, 0);
  assert.equal(disposed(), 1);
  assert.equal(provider.requiresDecoder, true);
  assert.equal(provider.allowDuringPlayback, false);
});

test('release cancels extraction, discards late results and permits reuse', async () => {
  let finish;
  const {provider} = fixture(() => new Promise(resolve => { finish = resolve; }));
  const pending = provider.getFrame(request());
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const rejected = assert.rejects(pending, {name: 'AbortError'});
  await provider.release();
  await rejected;
  const late = {width: 240, height: 135};
  finish({canvas: late, timestamp: 1});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.width, 0);
  assert.equal(provider.canHandle(request()), true);
  assert.equal(provider.canHandle({...request(), sourceId: 'old'}), false);
});

test('release waits for an already-running owned-source cleanup', async () => {
  let finishClose;
  const {provider} = fixture(undefined, {ownership: 'owned', close: () => new Promise(resolve => { finishClose = resolve; })});
  const pending = provider.getFrame(request());
  while (!finishClose) await new Promise(resolve => setImmediate(resolve));
  let retired = false;
  const released = provider.release().then(() => { retired = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retired, false);
  finishClose(); await released; await pending;
  assert.equal(retired, true);
});

test('preview abort preserves its reason when parser disposal throws', async () => {
  const reason = new DOMException('Preview retired', 'AbortError'), controller = new AbortController(); let started, disposed = 0;
  const waiting = new Promise(resolve => { started = resolve; });
  class Input { getPrimaryVideoTrack() { started(); return new Promise(() => {}); } dispose() { disposed++; throw new Error('dispose failed'); } }
  const provider = createMediaBunnyPreviewProvider({formats: [{}], getSource: () => ({id: 'source', size: 1, read: async () => new Uint8Array(1)}), load: async () => ({Input, CustomSource: class {}})});
  const pending = provider.getFrame({...request(), signal: controller.signal}), rejected = assert.rejects(pending, error => error === reason);
  await waiting; controller.abort(reason); await rejected; await new Promise(resolve => setImmediate(resolve)); assert.equal(disposed, 1);
});

test('preview reports parser disposal failure when no frame is available', async () => {
  const failure = new Error('dispose failed'); let disposed = 0;
  class Input { async getPrimaryVideoTrack() { return null; } dispose() { disposed++; throw failure; } }
  const provider = createMediaBunnyPreviewProvider({formats: [{}], getSource: () => ({id: 'source', size: 1, read: async () => new Uint8Array(1)}), load: async () => ({Input, CustomSource: class {}})});
  await assert.rejects(provider.getFrame(request()), error => error === failure); assert.equal(disposed, 1);
});

test('release waits for all owned-source closures even when one fails', async () => {
  const failure = new Error('first close failed'); let closeCount = 0, finishSecond, entered = 0;
  class Input { async getPrimaryVideoTrack() { return {canDecode: async () => true}; } dispose() {} }
  class CanvasSink { getCanvas() { entered++; return new Promise(() => {}); } }
  const provider = createMediaBunnyPreviewProvider({formats: [{}], getSource: () => ({id: 'source', size: 1, ownership: 'owned', read: async () => new Uint8Array(1), close: () => ++closeCount === 1 ? Promise.reject(failure) : new Promise(resolve => { finishSecond = resolve; })}), load: async () => ({Input, CanvasSink, CustomSource: class {}})});
  const first = provider.getFrame(request()), second = provider.getFrame(request());
  const cancelledFirst = assert.rejects(first, {name: 'AbortError'}), cancelledSecond = assert.rejects(second, {name: 'AbortError'});
  while (entered < 2) await new Promise(resolve => setImmediate(resolve));
  let settled = false; const releasing = provider.release().then(() => { settled = true; }, error => { settled = true; throw error; });
  const rejected = assert.rejects(releasing, error => error === failure);
  while (!finishSecond) await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false);
  finishSecond(); await rejected; await Promise.all([cancelledFirst, cancelledSecond]); assert.equal(closeCount, 2);
});

test('preview preserves the original transport failure when the parser wraps it', async () => {
  const failure = new Error('source permission revoked'); let disposed = 0, closed = 0;
  class CustomSource { constructor(options) { this.read = options.read; } }
  class Input {
    constructor({source}) { this.source = source; }
    async getPrimaryVideoTrack() { try { await this.source.read(0, 1); } catch { throw new Error('parser could not read input'); } }
    dispose() { disposed++; }
  }
  const provider = createMediaBunnyPreviewProvider({formats: [{}], getSource: () => ({id: 'source', size: 1, ownership: 'owned', read: async () => { throw failure; }, close: () => { closed++; }}), load: async () => ({Input, CustomSource})});
  await assert.rejects(provider.getFrame(request()), error => error === failure);
  assert.equal(disposed, 1); assert.equal(closed, 1);
});
