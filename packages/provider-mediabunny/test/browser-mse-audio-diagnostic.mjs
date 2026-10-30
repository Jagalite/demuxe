// SPDX-License-Identifier: Apache-2.0
// Reduced WebKit audio observation diagnostic; never a passing qualification gate.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as r from 'mediabunny';
import {webkit} from 'playwright';
import {createBoundedReader} from '../bounded-reader.js';
import {inspectMp4TrackProfiles} from '../mp4-profile.js';
import {createMP4PacketStream} from '../mp4-stream.js';
if(!process.env.DEMUXE_PUBLIC_FIXTURE||!process.env.DEMUXE_BROWSER_EVIDENCE)throw Error('Set DEMUXE_PUBLIC_FIXTURE and DEMUXE_BROWSER_EVIDENCE for this diagnostic');
const file=new Blob([await readFile(process.env.DEMUXE_PUBLIC_FIXTURE)]);
const reader=createBoundedReader({size:file.size,read:async(at,n)=>new Uint8Array(await file.slice(at,at+n).arrayBuffer())},{maxReads:4096});
const authored=await inspectMp4TrackProfiles(reader);await reader.close();
const input=new r.Input({formats:[r.MP4],source:new r.BlobSource(file)});
const stream=await createMP4PacketStream(r,input,{trackIds:(await input.getTracks()).map(t=>t.id),authoredTracks:authored,target:1.25});
const parts=[];for await(const part of stream)parts.push(Array.from(part.bytes));await stream.done;
const target=new r.BufferTarget(),output=new r.Output({format:new r.Mp4OutputFormat({fastStart:'fragmented',minimumFragmentDuration:.5}),target});
const entries=await Promise.all((await input.getTracks()).map(async track=>{const source=track.type==='video'?new r.EncodedVideoPacketSource('avc'):new r.EncodedAudioPacketSource('aac');if(track.type==='video')output.addVideoTrack(source);else output.addAudioTrack(source);return {track,source,config:await track.getDecoderConfig()};}));
await output.start();await Promise.all(entries.map(async({track,source,config})=>{let first=true;for await(const packet of new r.EncodedPacketSink(track).packets()){await source.add(packet,first?{decoderConfig:config}:undefined);first=false;}source.close();}));await output.finalize();const control=Array.from(new Uint8Array(target.buffer));input.dispose();
const browser=await webkit.launch({headless:true});
try{
 const page=await browser.newPage();await page.route('https://audio.test/**',route=>route.fulfill({contentType:'text/html',body:'<body>Audio diagnostic</body>'}));await page.goto('https://audio.test/');await page.mouse.click(1,1);
 const result=await page.evaluate(async({parts,original,control,mime})=>{
 const results=[];
 for(const mode of ['original','fragmented-blob','mse','plain-mse']){
  const video=document.createElement('video');document.body.append(video);const ctx=new AudioContext({sampleRate:48000});await ctx.resume();const tap=ctx.createMediaElementSource(video),analyser=ctx.createAnalyser(),gain=ctx.createGain();gain.gain.value=0;tap.connect(analyser);analyser.connect(gain);gain.connect(ctx.destination);
  const media=mode.endsWith('mse')?new MediaSource():null;const url=URL.createObjectURL(media??new Blob(mode==='original'?[new Uint8Array(original)]:parts.map(p=>new Uint8Array(p)),{type:'video/mp4'}));
  const loaded=new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('media error '+video.error?.message));setTimeout(()=>reject(Error('metadata timeout')),5000);});video.src=url;
  if(media){await new Promise(resolve=>media.addEventListener('sourceopen',resolve,{once:true}));const sb=media.addSourceBuffer(mime);for(const part of (mode==='plain-mse'?[control]:parts)){const done=new Promise((resolve,reject)=>{sb.addEventListener('updateend',resolve,{once:true});sb.addEventListener('error',reject,{once:true});});sb.appendBuffer(new Uint8Array(part));await done;}media.endOfStream();}
  await loaded;video.currentTime=mode==='original'||mode==='plain-mse'?1.25:2.25;await video.play();let rms=0;for(let i=0;i<60;i++){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.max(rms,Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length));await new Promise(resolve=>setTimeout(resolve,20));}
  results.push({mode,rms,time:video.currentTime,audio:Array.from(video.audioTracks??[],t=>({enabled:t.enabled,id:t.id}))});video.pause();video.removeAttribute('src');video.load();video.remove();await ctx.close();URL.revokeObjectURL(url);
 }
 return results;
 },{parts,original:Array.from(new Uint8Array(await file.arrayBuffer())),control,mime:stream.mime});
 const receipt={status:'diagnostic-observations-not-qualification',browser:browser.version(),source:{bytes:file.size,sha256:createHash('sha256').update(new Uint8Array(await file.arrayBuffer())).digest('hex')},harness:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),results:result,limitations:['RMS tap alone cannot establish audible MSE output or identify a browser defect','Blob playback can normalize the fragment timeline; these modes do not assert identical source time','No comparison against an independent FFmpeg producer']};
 await writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify(receipt,null,2)+'\n');console.log(receipt);
}finally{await browser.close();}
