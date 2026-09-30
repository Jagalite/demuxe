// SPDX-License-Identifier: MIT
// Focused failure injection for the reviewed cleanup and evidence gates.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PrivatePlaybackHost} from './private-playback-host.mjs';

const checks = [];
{
  const cause = Error('Injected reader failure');
  let revoked = 0, drained = 0;
  const engine = {source: {drainFailures() {drained++;return [{kind: 'reader', cause}];}, cancelSource() {revoked++;}},
    call() {throw Error('Native pump must not continue after source failure');}};
  const host = new PrivatePlaybackHost(engine, {getContext() {return {}; }}, 320, 180);
  let failure;
  await assert.rejects(host.pump(), error => {failure = error;return error.cause === cause && error.message.includes('Source transport:');});
  await assert.rejects(host.pump(), error => error === failure);
  assert.equal(revoked, 1);assert.equal(drained, 1);
  checks.push('source failure promptly revokes reads and preserves the first cause');
}
for (const failures of [[], ['audio'], ['native'], ['audio', 'native'], ['snapshot'], ['dispose']]) {
  const calls = [], errors = Object.fromEntries(failures.map(name => [name, Error(name)]));
  const fail = name => {calls.push(name);if (errors[name]) throw errors[name];};
  const engine = {
    source: {cancelSource() {fail('cancel');}, snapshot() {return {}; }},
    async call(name) {assert.equal(name, 'web_destroy');fail('native');},
    scheduler: {snapshot() {fail('snapshot');return {}; }},
    dispose() {fail('dispose');},
  };
  const host = new PrivatePlaybackHost(engine, {getContext() {return {}; }}, 320, 180);
  host.created = true;
  host.audio = {async stop() {fail('audio');}, snapshot() {return {}; }};
  if (!failures.length) await host.destroy();
  else await assert.rejects(host.destroy(), error => failures.length === 1
    ? error === errors[failures[0]]
    : error instanceof AggregateError && failures.every(name => error.errors.includes(errors[name])));
  assert.deepEqual(calls, ['cancel', 'audio', 'native', 'snapshot', 'dispose']);
  checks.push('cleanup completes and preserves errors: ' + (failures.join('+') || 'success'));
}

// Execute the runner's actual post-capture gate with injected inspection results.
// Avoid launching browsers or copying the condition under test into this test.
const runner = await readFile(new URL('./run-playback.mjs', import.meta.url), 'utf8');
const start = runner.indexOf('    if (audioReferenceArg && (test.audio?.error');
const end = runner.indexOf('    result.cases.push(test);', start);
assert(start >= 0 && end > start, 'Audio validation block must be present');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const validate = new AsyncFunction('test', 'audioReferenceArg', 'readFile', 'writeFile', 'path', 'output', 'backend', 'profile = {}', runner.slice(start, end));
const reference = Buffer.alloc(48002 * 4);
for (const [name, audio, expected] of [
  ['missing inspection', undefined, false],
  ['inspection timeout', {error: 'Inspection deadline'}, false],
  ['error alongside PCM', {error: 'Inspection deadline', pcm: []}, false],
  ['missing PCM', {contextState: 'closed'}, false],
  ['empty PCM', {pcm: [], contextState: 'closed', maxQueued: 0}, false],
  ['valid PCM', {pcm: Array(48002).fill(0), contextState: 'closed', maxQueued: 8192}, true],
  ['valid binary PCM', {pcm: new Float32Array(48002), contextState: 'closed', maxQueued: 8192}, true],
  ['wrong binary PCM type', {pcm: new Uint8Array(48002), contextState: 'closed', maxQueued: 8192}, false],
]) {
  const test = {passed: true, audio};
  await validate(test, 'reference.f32', async () => reference, async () => {}, path, '/unused');
  assert.equal(test.passed, expected, name);
  assert.equal(test.audio.passed, expected, name);
  checks.push('audio gate: ' + name);
}
const videoOnly = {passed: true};
await validate(videoOnly, undefined, async () => {throw Error('Unexpected audio read');}, async () => {}, path, '/unused');
assert.equal(videoOnly.passed, true);
checks.push('video-only case remains valid');
for (const corruptTail of [false, true]) {
  const pcm = Array(48002).fill(0);
  if (corruptTail) pcm[48001] = 1;
  const test = {passed: true, continuity: {audioEpoch: 2}, audio: {pcm, contextState: 'closed', maxQueued: 8192, underruns: 0}};
  await validate(test, 'reference.f32', async () => reference, async () => {}, path, '/unused', 'injected', {continuous: true, duration: 0.5});
  assert.equal(test.passed, !corruptTail);
  assert.equal(test.audio.fullReference.comparedSamples, 48002);
  checks.push('continuous full PCM: ' + (corruptTail ? 'corruption after initial window rejected' : 'valid reference'));
}
for (const phase of ['in-source', 'terminal', 'missing-evidence']) {
  const event = {epoch: 2, read: phase === 'terminal' ? 24001 : 100, consumed: 0};
  const test = {passed: true, continuity: {audioEpoch: 2}, audio: {pcm: Array(48002).fill(0), contextState: 'closed', maxQueued: 8192, underruns: 1, underrunEvents: phase === 'missing-evidence' ? [] : [event]}};
  await validate(test, 'reference.f32', async () => reference, async () => {}, path, '/unused', 'injected', {continuous: true, duration: 0.5});
  assert.equal(test.passed, phase === 'terminal');
  assert.equal(test.audio.underruns, 1);
  checks.push('underrun phase gate: ' + phase);
}
console.log(JSON.stringify({passed: true, checks}, null, 2));
