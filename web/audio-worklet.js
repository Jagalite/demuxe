// SPDX-License-Identifier: Apache-2.0
import {initialPCMWorklet,closePCMWorklet,observePCMWorkletEpoch,pcmWorkletFrames} from './generated/internal/machine/pcm-worklet.js';
// A fixed SharedArrayBuffer, independent of growable Wasm memory.
// Header: write, read, run, epoch, acknowledged epoch, media frames, underruns.
class PCMOutput extends AudioWorkletProcessor {
  constructor({ processorOptions: { buffer, capacity, channels=2, measureOutput=false } }) {
    super();
    this.h = new Int32Array(buffer, 0, 16);
    this.pcm = new Float32Array(buffer, 64);
    this.capacity = capacity;
    if(![2,6,8].includes(channels))throw Error("Unsupported PCM layout");
    this.channels=channels;
    this.control = initialPCMWorklet();
    this.measureOutput=measureOutput;this.lastPulse=-Infinity;
    this.port.onmessage = ({data}) => { if (data === 'close') this.control = closePCMWorklet(this.control); };
  }
  process(_inputs, outputs) {
    if (this.control.closed) return false;
    const channels = outputs[0];
    const h = this.h;
    const epoch = Atomics.load(h, 3);
    const next = observePCMWorkletEpoch(this.control, epoch);
    if (next !== this.control) {
      this.control = next;
      Atomics.store(h, 1, 0);
      Atomics.store(h, 4, epoch);
      return true;
    }
    if (!Atomics.load(h, 2) || !channels.length) return true;
    const read = Atomics.load(h, 1) >>> 0;
    const write = Atomics.load(h, 0) >>> 0;
    const count = pcmWorkletFrames(read, write, channels[0].length, this.capacity);
    for (let i = 0; i < count; i++) {
      const at = ((read + i) % this.capacity) * this.channels;
      for (let c = 0; c < channels.length; c++) channels[c][i] = c<this.channels?this.pcm[at+c]:0;
    }
    if (Atomics.load(h, 3) !== epoch) {
      for (const channel of channels) channel.fill(0);
      return true;
    }
    if(this.measureOutput&&channels.length){for(let i=0;i<count;i++){if(Math.abs(channels[0][i])>0.12&&currentFrame+i-this.lastPulse>sampleRate*0.5){this.lastPulse=currentFrame+i;this.port.postMessage({kind:'click',audioFrame:currentFrame+i,sampleRate});break;}}}
    Atomics.store(h, 1, (read + count) | 0);
    Atomics.add(h, 5, count);
    if (count < channels[0].length) Atomics.add(h, 6, 1);
    return true;
  }
}
registerProcessor('demuxe-pcm', PCMOutput);
