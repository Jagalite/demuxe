// SPDX-License-Identifier: Apache-2.0
import {initialSelectiveWorklet, retireSelectiveWorklet, observeSelectiveWorklet, selectiveWorkletCurrent, selectiveTimelineDue, selectiveNextTimeline, selectivePulseDue, selectiveWorkletFrames, selectiveWorkletCanConsume, selectiveWorkletScanFrames, selectiveWorkletScanOffset, selectiveWorkletLayoutSupported} from './generated/internal/machine/selective-worklet.js';
// A fixed SharedArrayBuffer, independent of growable Wasm memory.
// Selective audio header: 7=drain state, 8=pre-EOF underruns,
// 9=post-EOF drain callbacks, 10=controller generation, 11=last consumed generation,
// 12=publication gate, 13=last consumed native epoch, 14=permitted native epoch,
// 15=rejected stale epoch callbacks.
class PCMOutput extends AudioWorkletProcessor {
  constructor({ processorOptions: { buffer, capacity, channels=2, measureOutput=false } }) {
    super();
    this.h = new Int32Array(buffer, 0, 16);
    this.pcm = new Float32Array(buffer, 64);
    this.capacity = capacity;
    this.meta=new Float64Array(buffer,64+capacity*channels*4,capacity*2);
    this.scanned=0;this.scannedRate=NaN;this.nextTimeline=0;
    if(!selectiveWorkletLayoutSupported(channels))throw Error("Unsupported PCM layout");
    this.channels=channels;
    this.control = initialSelectiveWorklet();
    this.measureOutput=measureOutput;this.lastPulse=-Infinity;
    this.port.onmessage = ({data}) => { if (data === 'close') this.control = retireSelectiveWorklet(this.control); };
  }
  current() {
    const h=this.h,epoch=Atomics.load(h,3);
    return selectiveWorkletCurrent(this.control,Atomics.load(h,10),epoch)
      && selectiveWorkletCanConsume(Atomics.load(h,12),Atomics.load(h,2),this.channels,epoch,Atomics.load(h,14));
  }
  notify(message) {
    if (!this.current()) return;
    try { this.port.postMessage(message); } catch { this.control = retireSelectiveWorklet(this.control, true); }
  }
  process(_inputs, outputs) {
    if (this.control.phase !== 'active') return false;
    const channels = outputs[0];
    const h = this.h;
    const generation = Atomics.load(h, 10);
    if (generation !== this.control.generation) {
      this.control = observeSelectiveWorklet(this.control, generation, this.control.epoch);
      return true;
    }
    const epoch = Atomics.load(h, 3);
    if (epoch !== this.control.epoch) {
      this.control = observeSelectiveWorklet(this.control, generation, epoch);this.scanned=0;this.scannedRate=NaN;
      Atomics.store(h, 1, 0);
      Atomics.store(h, 4, epoch);
      return true;
    }
    const gate=Atomics.load(h,12), running=Atomics.load(h,2);
    if (!gate) {this.scanned=0;this.scannedRate=NaN;}
    if (!gate || !running || !channels.length) {
      if (Atomics.load(h, 7) && channels.length) Atomics.add(h, 9, 1);
      return true;
    }
    if (!selectiveWorkletCanConsume(gate,running,channels.length,epoch,Atomics.load(h, 14))) {
      Atomics.add(h, 15, 1);
      return true;
    }
    const read = Atomics.load(h, 1) >>> 0;
    const write = Atomics.load(h, 0) >>> 0;
    const count = selectiveWorkletFrames(read, write, channels[0].length, this.capacity);
    if(count){
      const available=selectiveWorkletScanFrames(read,write,this.capacity);
      for(let offset=selectiveWorkletScanOffset(read,this.scanned,available);offset<available;offset++){
        const position=(read+offset)>>>0,index=(position%this.capacity)*2,rate=this.meta[index+1];
        if(rate!==this.scannedRate){this.scannedRate=rate;this.notify({kind:'rate-boundary',audioFrame:currentFrame+offset,sampleRate,mediaTime:this.meta[index],rate,epoch,generation});}
      }
      this.scanned=write;
      if(selectiveTimelineDue(currentFrame,this.nextTimeline)){this.nextTimeline=selectiveNextTimeline(currentFrame);const index=(read%this.capacity)*2;
        this.notify({kind:'timeline',audioFrame:currentFrame,sampleRate,mediaTime:this.meta[index],rate:this.meta[index+1],epoch,generation});}
    }
    for (let i = 0; i < count; i++) {
      const at = (((read + i) >>> 0) % this.capacity) * this.channels;
      for (let c = 0; c < channels.length; c++) channels[c][i] = c<this.channels?this.pcm[at+c]:0;
    }
    if (!this.current()) {
      for (const channel of channels) channel.fill(0);
      return this.control.phase === 'active';
    }
    if(this.measureOutput&&channels.length){for(let i=0;i<count;i++){if(Math.abs(channels[0][i])>0.12&&selectivePulseDue(currentFrame+i,this.lastPulse,sampleRate)){this.lastPulse=currentFrame+i;this.notify({kind:'click',audioFrame:currentFrame+i,sampleRate});break;}}}
    if (!this.current()) { for (const channel of channels) channel.fill(0); return this.control.phase === 'active'; }
    Atomics.store(h, 1, (read + count) | 0);
    Atomics.add(h, 5, count);
    if (count) {
      Atomics.store(h, 11, generation);
      Atomics.store(h, 13, epoch);
    }
    if (count < channels[0].length) {
      Atomics.add(h, 6, 1);
      Atomics.add(h, Atomics.load(h, 7) ? 9 : 8, 1);
    }
    return true;
  }
}
registerProcessor('demuxe-pcm', PCMOutput);
