// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {audioOnlyFixture} from './audio-only-fixture.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const evidence=process.env.DEMUXE_BROWSER_EVIDENCE;if(!evidence)throw Error('Set DEMUXE_BROWSER_EVIDENCE');
const channels=Number(process.env.DEMUXE_AUDIO_CHANNELS??2);assert.ok([1,2].includes(channels));
const mov=process.env.DEMUXE_TEST_MOV==='1';
const bytes=audioOnlyFixture(await readFile(join(root,'qualification/fixtures/avc-aac-320x240.mp4')));
const hash=data=>createHash('sha256').update(data).digest('hex');
const bundle=await build({absWorkingDir:root,stdin:{contents:"export * from 'mediabunny'; export {createMP4VideoPreparer} from './mp4-preparation.js';",resolveDir:root},bundle:true,platform:'browser',format:'esm',write:false});
const receipt={status:'running-not-qualified',fixture:{bytes:bytes.length,sha256:hash(bytes),authorship:'Retained synthetic A/V source with video trak changed to free; sample bytes/offsets/timing unchanged'},harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),bundleSHA256:hash(bundle.outputFiles[0].contents),limits:['Component preservation check; public owner/worker playback is tested separately','Generated AAC packets with retained authored priming; no arbitrary gapless/edit/layout/profile claim']};
let browser,timer;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});receipt.browser=browser.version();timer=setTimeout(()=>void browser.close(),60000);
 const page=await browser.newPage();
 await page.exposeFunction('exportAudioFixture',async data=>{const bytes=Buffer.from(data);receipt.fixture={bytes:bytes.length,sha256:hash(bytes),channels,container:mov?'MOV':'MP4',authorship:mov?'Synthetic AAC packets repackaged by MediaBunny QuickTime writer':channels===1?'Genuinely encoded mono AAC with SDK classic MP4 writer':'Retained stereo A/V source with video trak changed to free'};if(process.env.DEMUXE_AUDIO_EXPORT_FIXTURE)await writeFile(process.env.DEMUXE_AUDIO_EXPORT_FIXTURE,bytes);});
 await page.route('https://audio-preservation.test/**',route=>route.fulfill({status:200,contentType:route.request().url().endsWith('.js')?'text/javascript':'text/html',body:route.request().url().endsWith('.js')?Buffer.from(bundle.outputFiles[0].contents):'<body></body>'}));
 await page.goto('https://audio-preservation.test/');
 receipt.checks=await page.evaluate(async({data,channels,mov})=>{
  const r=await import('/library.js');let file=new File([new Uint8Array(data)],'audio-only.m4a');
  if(channels===1){
   const packets=[];let config,failure;
   const encoder=new AudioEncoder({output:(chunk,metadata)=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);packets.push(data);config??=metadata.decoderConfig;},error:error=>{failure=error;}});
   try{
    encoder.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:1,bitrate:96000});
    for(let i=0;i<150;i++){const pcm=Float32Array.from({length:1024},(_,n)=>.2*Math.sin(2*Math.PI*440*(i*1024+n)/48000));const sample=new AudioData({format:'f32-planar',sampleRate:48000,numberOfChannels:1,numberOfFrames:1024,timestamp:Math.round(i*1024/48000*1e6),data:pcm});try{encoder.encode(sample);}finally{sample.close();}}
    await encoder.flush();if(failure)throw failure;
   }finally{encoder.close();}
   if(packets.length<150||!config)throw Error('Incomplete mono AAC encoding');
   const target=new r.BufferTarget(),output=new r.Output({format:new r.Mp4OutputFormat({fastStart:false}),target}),source=new r.EncodedAudioPacketSource('aac');output.addAudioTrack(source);
   await output.start();for(let i=0;i<150;i++)await source.add(new r.EncodedPacket(packets[i],'key',i*1024/48000,1024/48000),i===0?{decoderConfig:config}:undefined);source.close();await output.finalize();file=new File([target.buffer],'mono.m4a');
  }
  if(mov){
   // Repackage the already encoded audio packets using the real QuickTime
   // writer; renaming or changing the file extension would not test MOV.
   const original=new r.Input({formats:[r.MP4],source:new r.BlobSource(file)});
   try{
    const track=await original.getPrimaryAudioTrack(),config=await track.getDecoderConfig();
    const target=new r.BufferTarget(),output=new r.Output({format:new r.MovOutputFormat({fastStart:false}),target}),audio=new r.EncodedAudioPacketSource('aac');
    output.addAudioTrack(audio);await output.start();let first=true;
    for await(const packet of new r.EncodedPacketSink(track).packets()){await audio.add(packet,first?{decoderConfig:config}:undefined);first=false;}
    audio.close();await output.finalize();file=new File([target.buffer],'audio-only.mov',{type:'video/quicktime'});
   }finally{original.dispose();}
  }
  await globalThis.exportAudioFixture(Array.from(new Uint8Array(await file.arrayBuffer())));
  const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const signature=async (file,expectedFormat)=>{
   const input=new r.Input({formats:[r.MP4,r.QTFF],source:new r.BlobSource(file)});
   try{
    const format=await input.getFormat();if(format.name.toLowerCase()!==expectedFormat)throw Error('Unexpected source container '+format.name);
    const tracks=await input.getTracks();if(tracks.length!==1||tracks[0].type!=='audio'||tracks[0].codec!=='aac')throw Error('Unexpected audio-only track set');
    const track=tracks[0],config=await track.getDecoderConfig();
    const packets=[];
    for await(const packet of new r.EncodedPacketSink(track).packets())packets.push({timestamp:packet.timestamp,duration:packet.duration,type:packet.type,sha256:await digest(packet.data)});
    let frames=0;const pcm=[];
    for await(const sample of new r.AudioSampleSink(track).samples())try{
     if(sample.sampleRate!==48000||sample.numberOfChannels!==channels)throw Error('Decoded AAC layout changed');
     frames+=sample.numberOfFrames;
     for(let channel=0;channel<channels;channel++){const plane=new Float32Array(sample.numberOfFrames);sample.copyTo(plane,{planeIndex:channel,format:'f32-planar'});pcm.push({channel,frames:sample.numberOfFrames,sha256:await digest(plane)});}
    }finally{sample.close();}
    return {config:{...config,description:Array.from(new Uint8Array(config.description))},packets,pcm,frames};
   }finally{input.dispose();}
  };
  const sourceTracks=[{id:'source-audio',index:0,type:'audio',codec:'aac',sampleRate:48000,channels,title:'Retained audio',lang:'eng',default:true}];
  const result=await r.createMP4VideoPreparer({load:async()=>r})(file,{sourceTracks});
  if(!result||result.diagnostics.profile!==(mov?'mov-aac-audio-only-v1':'mp4-aac-audio-only-v1'))throw Error('Audio-only preparation declined');
  const source=await signature(file,mov?'quicktime file format':'mp4'),output=await signature(result.file,'mp4');
  if(source.frames!==153600||source.packets.length!==150||JSON.stringify(source)!==JSON.stringify(output))throw Error('Audio packet/configuration/decoded PCM extent changed');
  if(result.tracks.length!==1||result.tracks[0].id!=='source-audio'||result.tracks[0]['ff-index']!==0||result.tracks[0].title!=='Retained audio'||result.tracks[0].lang!=='eng'||!result.tracks[0].default)throw Error('Source identity/metadata changed');
  return {profile:result.diagnostics.profile,tracks:result.tracks,source,outputSHA256:await digest(await result.file.arrayBuffer()),diagnostics:result.diagnostics};
 },{data:Array.from(bytes),channels,mov});
 assert.equal(receipt.checks.source.frames,153600);receipt.status='audio-only-packet-pcm-preservation-passed-not-release';
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};throw error;}
finally{clearTimeout(timer);await browser?.close();await writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');}
