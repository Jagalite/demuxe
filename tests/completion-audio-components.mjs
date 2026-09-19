// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='results/full-completion/audio-components';await mkdir(out,{recursive:true});const result={scope:'Browser Opus encode/decode, explicit indexed channel matrix, and requested gain ramp. Component viability only; no physical audio or CPU qualification.'};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 result.audio=await page.evaluate(async()=>{
  const config={codec:'opus',sampleRate:48000,numberOfChannels:2,bitrate:128000},support=await AudioEncoder.isConfigSupported(config);const r={support};
  try{r.invalidSupport=(await AudioEncoder.isConfigSupported({...config,codec:'not-a-codec'})).supported;}catch(e){r.invalidSupport=false;r.invalidError=e.name;}
  if(support.supported){
   const packets=[],decoded=[],errors=[];let description;
   const encoder=new AudioEncoder({output:(chunk,meta)=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);packets.push({bytes,timestamp:chunk.timestamp,duration:chunk.duration,type:chunk.type});if(meta?.decoderConfig)description=meta.decoderConfig;},error:e=>errors.push(String(e))});
   try{encoder.configure(config);for(let block=0;block<50;block++){const samples=new Float32Array(960*2);for(let c=0;c<2;c++)for(let j=0;j<960;j++)samples[c*960+j]=.1*Math.sin(2*Math.PI*(c?880:440)*(block*960+j)/48000);const data=new AudioData({format:'f32-planar',sampleRate:48000,numberOfChannels:2,numberOfFrames:960,timestamp:block*20000,data:samples});encoder.encode(data);data.close();}await encoder.flush();}finally{encoder.close();}
   const decoder=new AudioDecoder({output:data=>{const channels=[];for(let c=0;c<data.numberOfChannels;c++){const plane=new Float32Array(data.numberOfFrames);data.copyTo(plane,{planeIndex:c,format:'f32-planar'});channels.push([...plane]);}decoded.push({timestamp:data.timestamp,channels});data.close();},error:e=>errors.push(String(e))});
   try{decoder.configure(description??config);for(const p of packets)decoder.decode(new EncodedAudioChunk({type:p.type,timestamp:p.timestamp,duration:p.duration,data:p.bytes}));await decoder.flush();}finally{decoder.close();}
   const channels=[0,1].map(c=>decoded.flatMap(d=>d.channels[c]));const amplitude=(samples,hz)=>{let x=0,y=0;for(let i=0;i<samples.length;i++){x+=samples[i]*Math.cos(2*Math.PI*hz*i/48000);y+=samples[i]*Math.sin(2*Math.PI*hz*i/48000);}return 2*Math.hypot(x,y)/samples.length;};
   r.encoding={packets:packets.length,packetBytes:packets.reduce((n,p)=>n+p.bytes.length,0),decodedSamples:channels.map(c=>c.length),firstTimestamp:decoded[0]?.timestamp,configDescriptionBytes:description?.description?.byteLength??0,tones:channels.map(c=>[amplitude(c,440),amplitude(c,880)]),errors};
  }
  const renderRamp=async ramp=>{const c=new OfflineAudioContext(1,4800,48000),b=c.createBuffer(1,4800,48000);b.getChannelData(0).fill(.25);const source=c.createBufferSource();source.buffer=b;const gain=c.createGain();gain.gain.setValueAtTime(0,0);if(ramp){gain.gain.setValueAtTime(0,.02);gain.gain.linearRampToValueAtTime(1,.03);}else gain.gain.setValueAtTime(1,.02);source.connect(gain);gain.connect(c.destination);source.start();const data=(await c.startRendering()).getChannelData(0);let step=0;for(let i=1;i<data.length;i++)step=Math.max(step,Math.abs(data[i]-data[i-1]));return {maximumSampleStep:step,final:data.at(-1),first:data[0]};};
  r.ramp={abrupt:await renderRamp(false),ramped:await renderRamp(true),contract:'Explicitly requested10ms gain transition, not unchanged instantaneous output or CPU saving.'};
  const matrix=async wrong=>{const c=new OfflineAudioContext(6,512,48000),buffer=c.createBuffer(6,512,48000);for(let channel=0;channel<6;channel++)buffer.getChannelData(channel).fill((channel+1)*.01);const source=c.createBufferSource();source.buffer=buffer;const splitter=c.createChannelSplitter(6),merger=c.createChannelMerger(6),permutation=[2,0,1,5,3,4];source.connect(splitter);permutation.forEach((input,output)=>splitter.connect(merger,wrong?0:input,output));merger.connect(c.destination);source.start();const rendered=await c.startRendering();const actual=permutation.map((_,i)=>rendered.getChannelData(i)[256]);const expected=permutation.map(i=>Math.fround((i+1)*.01));return {actual,expected,exact:actual.every((x,i)=>x===expected[i])};};
  r.matrix={positive:await matrix(false),wrongRouting:await matrix(true),contract:'Explicit channel indices only; no semantic speaker inference.'};return r;
 });
 assert.equal(result.audio.invalidSupport,false);if(result.audio.support.supported){const e=result.audio.encoding;assert.deepEqual(e.errors,[]);assert.ok(e.tones[0][0]>.07&&e.tones[0][1]<.01&&e.tones[1][1]>.07&&e.tones[1][0]<.01);}
 assert.ok(result.audio.ramp.ramped.maximumSampleStep<result.audio.ramp.abrupt.maximumSampleStep/100);assert.equal(result.audio.ramp.ramped.final,.25);assert.ok(result.audio.matrix.positive.exact&&!result.audio.matrix.wrongRouting.exact);await page.evaluate(()=>player.destroy());result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
