// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out='build/selective-audio-timeline/assets';await fs.cp('build/selective-audio-sync',out,{recursive:true});
await fs.cp('build/selective-audio-timeline/engine',out+'/demuxe/web/engine-hybrid',{recursive:true});
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Anchor: '+a);return s.replace(a,b)};
const player=out+'/demuxe/web/generated/internal/wasm-player.js';let s=await fs.readFile(player,'utf8');
s=replace(s,'new SharedArrayBuffer(64 + 8192 * this.outputChannels * 4)','new SharedArrayBuffer(64 + 8192 * this.outputChannels * 4 + 8192 * 16)');await fs.writeFile(player,s);
const worker=out+'/demuxe/web/selective-audio-worker.js';s=await fs.readFile(worker,'utf8');
s=replace(s,'  const source = (nativeAudio + 32) >>> 2;',`  const source = (nativeAudio + 32) >>> 2;
  const metadata=new Float64Array(pcm.buffer,64+CAPACITY*audioChannels*4,CAPACITY*2);
  const nativeMetadata=new Float64Array(engine.HEAPU8.buffer,engine._web_sync_ptr(),CAPACITY*2);`);
s=replace(s,'    const index = ((forwarded + i) % CAPACITY) * audioChannels;',`    const frame=(forwarded+i)%CAPACITY;
    metadata[frame*2]=nativeMetadata[frame*2];metadata[frame*2+1]=nativeMetadata[frame*2+1];
    const index = frame * audioChannels;`);await fs.writeFile(worker,s);
s=await fs.readFile('experiments/selective-audio-sync/selective-sync-worklet.js','utf8');
s=replace(s,'    this.capacity = capacity;',`    this.capacity = capacity;
    this.meta=new Float64Array(buffer,64+capacity*channels*4,capacity*2);
    this.scanned=0;this.scannedRate=NaN;this.nextTimeline=0;`);
s=replace(s,'      this.epoch = epoch;','      this.epoch = epoch;this.scanned=0;this.scannedRate=NaN;');
s=replace(s,'    for (let i = 0; i < count; i++) {',`    if(count){
      for(let i=Math.max(read,this.scanned);i<write;i++){
        const index=(i%this.capacity)*2,rate=this.meta[index+1];
        if(rate!==this.scannedRate){this.scannedRate=rate;this.port.postMessage({kind:'rate-boundary',audioFrame:currentFrame+i-read,sampleRate,mediaTime:this.meta[index],rate,epoch,generation});}
      }
      this.scanned=write;
      if(currentFrame>=this.nextTimeline){this.nextTimeline=currentFrame+1024;const index=(read%this.capacity)*2;
        this.port.postMessage({kind:'timeline',audioFrame:currentFrame,sampleRate,mediaTime:this.meta[index],rate:this.meta[index+1],epoch,generation});}
    }
    for (let i = 0; i < count; i++) {`);
s=replace(s,'    if (!Atomics.load(h, 12) || !Atomics.load(h, 2) || !channels.length) {','    if (!Atomics.load(h, 12)) {this.scanned=0;this.scannedRate=NaN;}\n    if (!Atomics.load(h, 12) || !Atomics.load(h, 2) || !channels.length) {');
await fs.writeFile(out+'/demuxe/web/selective-sync-worklet.js',s);
console.log(out);

execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',out+'/fixtures/h264-1080p60-video-only.mp4','-f','lavfi','-i','aevalsrc=if(gte(t\\,1)*lt(mod(t\\,1)\\,0.05)\\,0.7*sin(2*PI*2000*t)\\,0):s=48000:d=30','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','ac3','-ac','2','-ar','48000','-b:a','192k','-t','30',out+'/fixtures/rate-pulses-wide.mkv']);
