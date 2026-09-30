// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../web/private-mpv/audio-worklet.js', import.meta.url), 'utf8');
function create() {
  let Constructor;const messages = [], feedback = [];
  vm.runInNewContext(source, {Float32Array, ArrayBuffer, AudioWorkletProcessor: class {constructor() {this.port = {postMessage: message => messages.push(message)};}}, registerProcessor(_name, value) {Constructor = value;}});
  const processor = new Constructor();processor.link = {postMessage: message => feedback.push(message)};
  processor.receive({type: 'reset', epoch: 2});processor.receive({type: 'state', epoch: 2, running: true});
  return {processor, messages, feedback, render() {const output = [new Float32Array(128), new Float32Array(128)];processor.process([], [output]);return output;}};
}
test('Capture records consumed stereo PCM in a fixed buffer without per-quantum allocation', () => {
  const {processor: p, messages, render} = create();
  p.port.onmessage({data: {type: 'record', id: 'start'}});
  const buffer = p.capture;
  assert.equal(buffer.length, 2000000);
  const pcm = new Float32Array(512);for (let i = 0; i < pcm.length; i++) pcm[i] = i / 1024;
  p.receive({type: 'pcm', start: 0, epoch: 2, buffer: pcm.buffer});render();render();
  assert.equal(p.capture, buffer);assert.equal(p.captureSamples, 512);
  p.port.onmessage({data: {type: 'inspect', id: 'end'}});
  assert.deepEqual(new Float32Array(messages.at(-1).pcm), pcm);
  render();assert.equal(p.captureSamples, 512, 'Underrun zeros must remain outside consumed-PCM capture');
});
test('Sparse underrun evidence retains counters and partial-quantum position within a bound', () => {
  const {processor: p, render} = create();
  p.receive({type: 'pcm', epoch: 2, start: 0, buffer: new Float32Array(62).buffer});render();
  assert.equal(p.underruns, 1);assert.equal(p.underrunEvents[0].consumed, 31);assert.equal(p.underrunEvents[0].written, 31);
  for (let i = 0; i < 100; i++) render();
  assert.equal(p.underruns, 101);assert.equal(p.underrunEvents.length, 64);
});
test('Capture budget failure stops recording while playback and feedback continue', () => {
  const {processor: p, messages, feedback, render} = create();
  p.captureLimit = 256;p.port.onmessage({data: {type: 'record'}});
  p.receive({type: 'pcm', epoch: 2, start: 0, buffer: new Float32Array(512).fill(0.25).buffer});
  render();assert.equal(p.captureSamples, 256);render();
  assert.equal(p.record, false);assert.equal(p.read, 256);assert.equal(feedback.at(-1).frames, 256);
  assert.equal(messages.at(-1).error, 'Diagnostic capture budget exceeded');
});
test('Only the two declared PCM capacities are admitted, and reset clears old data', () => {
  const {processor: p} = create();
  p.receive({type:'reset',epoch:4,capacity:32768});
  assert.equal(p.capacity,32768);assert.equal(p.ring.length,65536);
  for(let i=0;i<32;i++)p.receive({type:'pcm',epoch:4,start:i*1024,buffer:new Float32Array(2048).buffer});
  assert.equal(p.written,32768);assert.equal(p.maxQueued,32768);
  p.receive({type:'reset',epoch:6});assert.equal(p.capacity,8192);assert.equal(p.written,0);
  p.receive({type:'reset',epoch:8,capacity:32769});assert.equal(p.failed,'Invalid PCM capacity');
});
