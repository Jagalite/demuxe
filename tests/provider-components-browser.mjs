// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',root=process.cwd();
const layout=process.env.AUDIO_LAYOUT??'common',pointers={},records={};
for(const profile of layout==='fine'?['ac3','dts','flac']:['common']){
 pointers[profile]=JSON.parse(await readFile((process.env.AUDIO_BUILD_ROOT??'build/audio-providers')+'/'+profile+'.json','utf8'));
 records[profile]=JSON.parse(await readFile(pointers[profile].directory+'/build-record.json','utf8'));
}
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><video width="320" height="180"></video>');return;}
 let base,relative;
 if(name.startsWith('/compiled/')){base=path.join(root,'build/component-candidates');relative=name.slice(10);}
 else if(name.startsWith('/assets/')){const pieces=name.slice(8).split('/');base=pointers[pieces.shift()]?.directory;relative=pieces.join('/');if(!base){res.writeHead(404).end();return;}}
 else if(name.startsWith('/fixtures/')){base=path.join(root,'build/provider-audio/repair');relative=name.slice(10);}
 else{res.writeHead(404).end();return;}
 const file=path.resolve(base,relative);if(!file.startsWith(path.resolve(base)+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const result={family,layout,builds:records,cases:[],passed:false};
try{
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0}}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});result.browser=browser.version();
 for(const codec of ['ac3','eac3','dca']){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  const sample=await page.evaluate(async({codec,hashes,layout})=>{
   const {repairMatroskaAudio}=await import('/compiled/provider-container/src/audio-repair.js');const {PacketAudioDecoder}=await import('/compiled/provider-audio/src/packet-decoder.js');const {PacketFlacEncoder}=await import('/compiled/provider-audio/src/flac-encoder.js');
   const executionStart=performance.now();
   const loaded=new Map();
   const load=async(profile)=>{
    if(loaded.has(profile))return loaded.get(profile);
    const factory=(await import('/assets/'+profile+'/module.mjs')).default;
    const bytes=await(await fetch('/assets/'+profile+'/module.wasm')).arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(actual!==hashes[profile])throw Error('Candidate asset mismatch');
    const module=await factory({wasmBinary:new Uint8Array(bytes)});loaded.set(profile,module);return module;
   };
   const decoder=await load(layout==='common'?'common':codec==='dca'?'dts':'ac3'),encoder=await load(layout==='common'?'common':'flac'),controller=new AbortController();
   const input=await(await fetch('/fixtures/'+codec+'.mkv')).blob();const began=performance.now();const output=await repairMatroskaAudio(input,{decoder:(codec,signal)=>new PacketAudioDecoder(decoder,codec,signal),encoder:(channels,signal)=>new PacketFlacEncoder(encoder,channels,signal)},controller.signal);const preparationMs=performance.now()-began,executionMs=performance.now()-executionStart;
   const video=document.querySelector('video'),context=new AudioContext(),analyser=context.createAnalyser();const source=context.createMediaElementSource(video);source.connect(analyser);analyser.connect(context.destination);await context.resume();
   const media=new MediaSource(),url=URL.createObjectURL(media);video.src=url;
   try{
    await new Promise((r,j)=>{media.addEventListener('sourceopen',r,{once:true});setTimeout(()=>j(Error('MSE open timeout')),10000);});
    const mime='video/mp4; codecs="avc1.64001e,flac"';if(!MediaSource.isTypeSupported(mime))throw Error('Candidate output codec unavailable');
    const buffer=media.addSourceBuffer(mime);await new Promise(async(r,j)=>{buffer.addEventListener('updateend',r,{once:true});buffer.addEventListener('error',()=>j(Error('MSE append failure')),{once:true});buffer.appendBuffer(await output.arrayBuffer());});media.endOfStream();
    await video.play();let audioPeak=0;const wave=new Float32Array(analyser.fftSize),end=performance.now()+15000;
    while(video.currentTime<1&&performance.now()<end){analyser.getFloatTimeDomainData(wave);for(const n of wave)audioPeak=Math.max(audioPeak,Math.abs(n));await new Promise(r=>setTimeout(r,20));}
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);const nonblack=cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60);
    const time=video.currentTime;await new Promise((r,j)=>{video.addEventListener('seeked',r,{once:true});video.currentTime=2;setTimeout(()=>j(Error('Seek timeout')),10000);});
    return {codec,layout,executionMs,preparationMs,time,audioPeak,nonblack,seekTime:video.currentTime,outputBytes:output.size};
   }finally{controller.abort();video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);source.disconnect();analyser.disconnect();await context.close();}
  },{codec,layout,hashes:Object.fromEntries(Object.entries(records).map(([profile,r])=>[profile,r.artifacts['module.wasm'].sha256]))});
  assert.ok(sample.time>=1);assert.equal(sample.nonblack,true);assert.ok(sample.audioPeak>0.001);assert.ok(Math.abs(sample.seekTime-2)<0.15);assert.deepEqual(errors,[]);result.cases.push(sample);console.log(sample);await page.close();
 }
 result.passed=true;
}finally{
 if(browser)result.cleanup=await closeTestBrowser(browser,family);server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/audio-provider',{recursive:true});await writeFile(`results/media-components/audio-provider/browser-${family}-${layout}.json`,JSON.stringify(result,null,2)+'\n');
}
