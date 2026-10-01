// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBaseline} from './ffmpeg-baseline-browser.mjs';

// A controlled ABI boundary lets failure checks remain independent of FFmpeg.
// Real packaged engines are exercised by the installed/browser harness.
async function oracle(t, configuration = {}, budgets = {}) {
  const key = '__ffmpegBaselineOracle_' + Math.random().toString(36).slice(2);
  const state = {calls: [], cancelled: 0, destroyed: 0, ...configuration};
  globalThis[key] = state;
  t.after(() => { delete globalThis[key]; });
  const factory = `export default async function(options){const s=globalThis[${JSON.stringify(key)}];s.wasmBytes=options.wasmBinary.length;if(s.stallInitialization)await new Promise(()=>{});return {_rm_adapt_audio(){},HEAPU8:new Uint8Array(4096),container:'mp4'};}`;
  const bridge = `export function createFFmpegBridge(engine){const s=globalThis[${JSON.stringify(key)}];return {setSource(blob){s.size=blob.size;},cancel(){s.cancelled++;s.rejectPending?.(Error('Cancelled source'));},async destroy(){s.destroyed++;},async call(name,type,types,args){s.calls.push({name,args});if(name==='rm_error')return 'oracle failure';if(s.failure===name)return -1;if(name==='rm_probe')engine.tracks=[{type:'audio',codec:'aac',sampleRate:48000,channels:2}];if(name==='rm_duration')return 0.6;if(name==='rm_audio_codec')return 'mp4a.40.2';if(name==='rm_video_codec')return '';if(name==='rm_open')engine.tracks=[{selected:true,type:'audio'}];if(name==='rm_start')engine.emit(new Uint8Array(s.chunk??[1,2,3]));if(name==='rm_step'){if(s.stallDrain)return new Promise((resolve,reject)=>{s.rejectPending=reject;});return s.more??0;}return 0;}};}`;
  const moduleURL = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const urls = {factoryURL: moduleURL(factory), bridgeURL: moduleURL(bridge), wasmURL: 'data:application/wasm;base64,AA=='};
  return {state, urls, baseline: configuration.stallInitialization ? undefined : await createBaseline(urls, budgets)};
}

test('baseline emits owned bytes and passes explicit video-only selection to packaged ABI', async t => {
  const {state, baseline} = await oracle(t);
  const result = await baseline.prepareFile(new Blob(['fixture']), {profile: 'video-only', target: 0.25, videoTrack: 3});
  assert.deepEqual([...result.output], [1, 2, 3]);
  assert.deepEqual(state.calls.find(call => call.name === 'rm_open').args, [7, 3, -2]);
  assert.deepEqual(state.calls.find(call => call.name === 'rm_start').args, [0.25]);
  assert.equal(result.duration, 0.6);
  assert.equal(result.stats.steps, 1);
  await baseline.dispose(); await baseline.dispose();
  assert.equal(state.destroyed, 1);
});

test('baseline propagates packaged FFmpeg failures and discards failed ownership', async t => {
  const {state, baseline} = await oracle(t, {failure: 'rm_open'});
  await assert.rejects(() => baseline.prepareFile(new Blob(['fixture'])), /rm_open: oracle failure/);
  assert.equal(state.destroyed, 1);
  await assert.rejects(() => baseline.prepareFile(new Blob(['fixture'])), /baseline is closed/);
});

test('baseline rejects output and drain budget exhaustion', async t => {
  const output = await oracle(t, {chunk: [1, 2, 3, 4]}, {maxOutputBytes: 3});
  await assert.rejects(() => output.baseline.prepareFile(new Blob(['fixture'])), /output budget exceeded/);
  assert.equal(output.state.destroyed, 1);
  const drain = await oracle(t, {more: 1}, {maxSteps: 2});
  await assert.rejects(() => drain.baseline.prepareFile(new Blob(['fixture'])), /drain budget exceeded/);
  assert.equal(drain.state.calls.filter(call => call.name === 'rm_step').length, 2);
  assert.equal(drain.state.destroyed, 1);
});

test('baseline rejects oversized inputs before the packaged source is changed', async t => {
  const {state, baseline} = await oracle(t, {}, {maxInputBytes: 3});
  await assert.rejects(() => baseline.prepareFile(new Blob(['four'])), /input budget/);
  assert.equal(state.size, undefined);
  await baseline.dispose();
});

test('baseline passes requested container and resets adaptation on a reused engine', async t => {
  const {state, baseline} = await oracle(t);
  const flac = await baseline.prepareFile(new Blob(['fixture']), {profile: 'flac24', container: 'webm'});
  assert.equal(flac.container, 'webm');
  assert.deepEqual(state.calls.find(call => call.name === 'rm_set_container').args, [1]);
  await baseline.prepareFile(new Blob(['fixture']), {profile: 'packet-copy'});
  assert.deepEqual(state.calls.filter(call => call.name === 'rm_adapt_audio').map(call => call.args[0]), [3, 0]);
  await baseline.dispose();
});

test('baseline rejects unknown successful drain statuses', async t => {
  const {state, baseline} = await oracle(t, {more: 2});
  await assert.rejects(() => baseline.prepareFile(new Blob(['fixture'])), /Invalid FFmpeg baseline drain status/);
  assert.equal(state.destroyed, 1);
});

test('baseline cancellation releases an outstanding source operation and preserves AbortError', async t => {
  const {state, baseline} = await oracle(t, {stallDrain: true});
  const controller = new AbortController();
  const pending = baseline.prepareFile(new Blob(['fixture']), {}, controller.signal);
  while (!state.rejectPending) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
  assert.equal(state.destroyed, 1);
});

test('baseline initialization rejects on deadline without waiting for factory settlement', async t => {
  const {urls} = await oracle(t, {stallInitialization: true});
  await assert.rejects(() => createBaseline(urls, {timeoutMs: 50}), /initialization deadline exceeded/);
});

test('baseline rejects concurrent operations before changing the active source', async t => {
  const {state, baseline} = await oracle(t, {stallDrain: true});
  const controller = new AbortController();
  const pending = baseline.prepareFile(new Blob(['first']), {}, controller.signal);
  while (!state.rejectPending) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(() => baseline.prepareFile(new Blob(['second'])), /Concurrent FFmpeg baseline operation/);
  assert.equal(state.size, 5);
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
});
