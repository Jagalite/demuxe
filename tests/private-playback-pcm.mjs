// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PrivatePCMTransport} from '../web/private-mpv/playback-pcm.js';

function create() {
  const engine = {raw: {memory: new WebAssembly.Memory({initial: 2})}};
  const messages = [];
  const port = {start() {}, close() {}, postMessage(message) {messages.push(message);}};
  const transport = new PrivatePCMTransport(engine, 0, port, 0);
  clearInterval(transport.timer);
  const header = transport.header();
  header[3] = 2;header[2] = 1;
  transport.pump();transport.feedback({type: 'resetAck', epoch: 2});
  return {transport, header, messages};
}

test('Reset cannot start an empty worklet, and PCM is queued before running', () => {
  const {transport, header, messages} = create();
  assert.equal(messages.some(message => message.type === 'state' && message.running), false);
  header[0] = 1024;transport.pump();
  const pcm = messages.findIndex(message => message.type === 'pcm');
  const running = messages.findIndex(message => message.type === 'state' && message.running);
  assert.ok(pcm >= 0 && running > pcm);
  assert.equal(transport.posted, 1024);
  transport.feedback({type: 'consumed', epoch: 2, frames: 1024});
  assert.equal(transport.running, true, 'Real starvation after startup must remain visible');
  header[3] = 4;header[0] = header[1] = 0;transport.pump();
  transport.feedback({type: 'resetAck', epoch: 4});
  assert.equal(messages.filter(message => message.type === 'state' && message.running).length, 1);
});

test('Pause and resume do not start an empty queue or lose consumption feedback', () => {
  const {transport, header, messages} = create();
  header[0] = 256;transport.pump();
  transport.feedback({type: 'consumed', epoch: 2, frames: 256});
  header[6] = 0;transport.pump();
  assert.equal(transport.running, false);
  header[6] = 1;transport.pump();
  assert.equal(transport.running, false);
  header[0] = 512;transport.pump();
  assert.equal(transport.running, true);
  assert.deepEqual(messages.slice(-2).map(message => message.type), ['pcm', 'state']);
  assert.equal(header[1], 256);
});
