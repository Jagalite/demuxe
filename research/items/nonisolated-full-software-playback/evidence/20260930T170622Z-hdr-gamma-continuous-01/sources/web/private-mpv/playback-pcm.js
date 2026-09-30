// SPDX-License-Identifier: MIT
// Reuses the private audio service's bounded stereo PCM/consumption protocol.
// The engine owns decoding and the A/V clock; the worklet reports real consumption.
export class PrivatePCMTransport {
  constructor(engine, ptr, port, latencyUs, capacity = 8192,channels=2) {
    if (![8192, 32768].includes(capacity)) throw Error('Invalid private PCM capacity');
    if(![2,6,8].includes(channels))throw Error('Invalid private PCM channel count');
    this.capacity = capacity;this.channels=channels;
    this.engine = engine;this.ptr = ptr;this.port = port;
    this.epoch = -1;this.posted = 0;this.ack = false;
    this.maxOutstanding = 0;this.feedbackCount = 0;this.staleFeedback = 0;
    this.error = null;this.stopped = false;
    const h = this.header();h[6] = 1;h[5] = latencyUs;
    port.onmessage = ({data}) => this.feedback(data);port.start();
    this.timer = setInterval(() => {try {this.pump();} catch (error) {this.error = String(error);clearInterval(this.timer);}}, 4);
  }
  header() {return new Uint32Array(this.engine.raw.memory.buffer, this.ptr, 8);}
  pump() {
    if (this.stopped || this.error) return;
    const h = this.header(), epoch = h[3];
    if (epoch & 1) return;
    if (epoch !== this.epoch) {
      this.epoch = epoch;this.posted = 0;this.ack = false;this.running = undefined;
      this.port.postMessage({type: 'reset', epoch, capacity: this.capacity,channels:this.channels});return;
    }
    if (!this.ack) return;
    if (h[0] < this.posted || this.posted < h[1] || h[0] - h[1] > this.capacity) throw Error('Invalid PCM counters');
    while (this.posted < h[0]) {
      const frames = Math.min(1024, h[0] - this.posted), pcm = new Float32Array(frames * this.channels);
      const ring = new Float32Array(this.engine.raw.memory.buffer, this.ptr + 32, this.capacity * this.channels);
      for (let i = 0; i < frames; i++) {const at = ((this.posted + i) % this.capacity) * this.channels;for(let channel=0;channel<this.channels;channel++)pcm[i*this.channels+channel]=ring[at+channel];}
      this.port.postMessage({type: 'pcm', epoch, start: this.posted, buffer: pcm.buffer}, [pcm.buffer]);
      this.posted += frames;this.maxOutstanding = Math.max(this.maxOutstanding, this.posted - h[1]);
    }
    // Queue samples before enabling consumption. A reset/resume can precede
    // the first native write; keep it paused until PCM exists. Once running,
    // retain real starvation reporting rather than pausing on an empty queue.
    const running = !!h[2] && !!h[6] && (this.running === true || this.posted > h[1]);
    if (running !== this.running) {this.running = running;this.port.postMessage({type: 'state', epoch, running});}
  }
  feedback(d) {
    if (d.type === 'stopped') {this.stopAck?.();return;}
    if (this.stopped || this.error) return;
    if (d.type === 'error') {this.error = d.error;return;}
    const h = this.header();
    if (d.epoch !== this.epoch || d.epoch !== h[3]) {this.staleFeedback++;return;}
    if (d.type === 'resetAck') {if (this.ack) return;this.ack = true;h[7] = this.epoch;h[1] = 0;}
    if (d.type === 'consumed') {
      if (!Number.isInteger(d.frames) || d.frames < h[1] || d.frames > this.posted) {this.error = 'Invalid consumption feedback';return;}
      h[7] = this.epoch;h[1] = d.frames;this.feedbackCount++;
    }
    this.pump();
  }
  snapshot() {return {capacity: this.capacity,channels:this.channels,maxOutstanding: this.maxOutstanding, feedbackCount: this.feedbackCount, staleFeedback: this.staleFeedback, error: this.error, header: Array.from(this.header())};}
  async stop() {
    if (this.stopped) return;
    this.stopped = true;clearInterval(this.timer);
    try {await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Worklet stop deadline')), 1000);
      this.stopAck = () => {clearTimeout(timer);resolve();};
      this.port.postMessage({type: 'stop', id: 'playback-close'});
    });} finally {this.port.close();}
  }
}
