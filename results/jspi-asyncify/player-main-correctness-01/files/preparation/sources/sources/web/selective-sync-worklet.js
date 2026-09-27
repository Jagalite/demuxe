// SPDX-License-Identifier: Apache-2.0
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
    if(![2,6,8].includes(channels))throw Error("Unsupported PCM layout");
    this.channels=channels;
    this.epoch = -1;
    this.generation = -1;
    this.closed = false;this.measureOutput=measureOutput;this.lastPulse=-Infinity;
    this.port.onmessage = ({data}) => { if (data === 'close') this.closed = true; };
  }
  process(_inputs, outputs) {
    if (this.closed) return false;
    const channels = outputs[0];
    const h = this.h;
    const generation = Atomics.load(h, 10);
    if (generation !== this.generation) {
      this.generation = generation;
      return true;
    }
    const epoch = Atomics.load(h, 3);
    if (epoch !== this.epoch) {
      this.epoch = epoch;this.scanned=0;this.scannedRate=NaN;
      Atomics.store(h, 1, 0);
      Atomics.store(h, 4, epoch);
      return true;
    }
    if (!Atomics.load(h, 12)) {this.scanned=0;this.scannedRate=NaN;}
    if (!Atomics.load(h, 12) || !Atomics.load(h, 2) || !channels.length) {
      if (Atomics.load(h, 7) && channels.length) Atomics.add(h, 9, 1);
      return true;
    }
    if (Atomics.load(h, 14) !== epoch) {
      Atomics.add(h, 15, 1);
      return true;
    }
    const read = Atomics.load(h, 1) >>> 0;
    const write = Atomics.load(h, 0) >>> 0;
    const count = Math.min((write - read) >>> 0, channels[0].length, this.capacity);
    if(count){
      for(let i=Math.max(read,this.scanned);i<write;i++){
        const index=(i%this.capacity)*2,rate=this.meta[index+1];
        if(rate!==this.scannedRate){this.scannedRate=rate;this.port.postMessage({kind:'rate-boundary',audioFrame:currentFrame+i-read,sampleRate,mediaTime:this.meta[index],rate,epoch,generation});}
      }
      this.scanned=write;
      if(currentFrame>=this.nextTimeline){this.nextTimeline=currentFrame+1024;const index=(read%this.capacity)*2;
        this.port.postMessage({kind:'timeline',audioFrame:currentFrame,sampleRate,mediaTime:this.meta[index],rate:this.meta[index+1],epoch,generation});}
    }
    for (let i = 0; i < count; i++) {
      const at = ((read + i) % this.capacity) * this.channels;
      for (let c = 0; c < channels.length; c++) channels[c][i] = c<this.channels?this.pcm[at+c]:0;
    }
    if (Atomics.load(h, 3) !== epoch || Atomics.load(h, 10) !== generation) {
      for (const channel of channels) channel.fill(0);
      return true;
    }
    if(this.measureOutput&&channels.length){for(let i=0;i<count;i++){if(Math.abs(channels[0][i])>0.12&&currentFrame+i-this.lastPulse>sampleRate*0.5){this.lastPulse=currentFrame+i;this.port.postMessage({kind:'click',audioFrame:currentFrame+i,sampleRate});break;}}}
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
