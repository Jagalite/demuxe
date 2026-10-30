// SPDX-License-Identifier: Apache-2.0
// Public custom byte-source staging through a selected, packaged provider.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
const [deployment,fixturePath,output,engine,kind]=process.argv.slice(2);
assert.ok(deployment&&fixturePath&&output&&['chrome','firefox','webkit'].includes(engine)&&['mp4','stream'].includes(kind));
const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex'),fixture=await readFile(fixturePath),manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes);
const sdk=kind==='mp4'?'mediabunny-mp4-file-preparation':'mediabunny-mp4-stream-preparation',binding=kind==='mp4'?'mediabunny-mp4':'mediabunny-mp4-stream',provider=manifest.providers.find(p=>p.id===sdk);assert.ok(provider);
const asset=manifest.assets.find(a=>provider.assetIds.includes(a.id));assert.ok(asset);const requests=[];
const browser=await ({chrome:chromium,firefox,webkit}[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage();await page.route('https://custom-playback.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(path==='/')return route.fulfill({contentType:'text/html',headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},body:'<body></body>'});
  const target=resolve(root,path.slice(1));if(!target.startsWith(root+sep))return route.abort();
  try{const bytes=await readFile(target);requests.push({path,bytes:bytes.length,sha256:hash(bytes)});return route.fulfill({contentType:path.endsWith('.json')?'application/json':path.endsWith('.wasm')?'application/wasm':'text/javascript',body:bytes});}catch{return route.abort();}
 });
 await page.goto('https://custom-playback.test/');await page.mouse.click(1,1);
 const checks=await page.evaluate(async({manifest,bytes,sdk,binding})=>{
  const {Player,DemuxeRuntime}=await import('/dist/index.js'),ids=Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity]));
  const results=[];
  for(const ownership of ['owned','borrowed']){
   const runtime=new DemuxeRuntime({assetBase:'https://custom-playback.test/',qualifiedProviders:ids,qualifiedCompositions:[{recipeId:'native-remux',bindingId:binding,sourceProfiles:['local:pthread:mp4-mov-avc-aac-2ch'],implementationIdentities:{[sdk]:ids[sdk],'browser-prepared':ids['browser-prepared']}}]});await runtime.providers.load('demuxe-providers.json');
   const host=document.createElement('div');document.body.append(host);const player=new Player(host,{runtime,mode:'native',nativeRemux:'always',remuxRuntime:'off',preview:false,providerPreferences:[{capability:'media.prepare.file',providers:[sdk,'ffmpeg-file-preparation']}],buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
   const data=new Uint8Array(bytes);let reads=0,readBytes=0,closes=0,created=0;const workers=new Set(),urls=new Set(),OldWorker=globalThis.Worker,create=URL.createObjectURL,revoke=URL.revokeObjectURL;
   globalThis.Worker=class extends OldWorker{constructor(...args){super(...args);created++;workers.add(this);const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};}};
   URL.createObjectURL=value=>{const url=create.call(URL,value);urls.add(url);return url;};URL.revokeObjectURL=url=>{urls.delete(url);return revoke.call(URL,url);};
   let ctx;
   try{
    const source={kind:'bytes',transport:'application-managed',id:'custom-'+ownership,size:data.length,ownership,name:'input.mp4',type:'video/mp4',read:async(at,n)=>{reads++;readBytes+=n;return data.subarray(at,at+n);},close(){closes++;}};
    await player.setMuted(true);await player.open(source);if(player.diagnostics.plan?.id!=='native-remux')throw Error('Unexpected plan');
    const video=player.surface;await player.seek(1.25);const seek=player.state.currentTime;if(Math.abs(seek-1.25)>.05)throw Error('Seek target changed');
    ctx=new AudioContext({sampleRate:48000});await ctx.resume();if(ctx.state!=='running')throw Error('Audio context unavailable');const tap=ctx.createMediaElementSource(video),split=ctx.createChannelSplitter(2),silent=ctx.createGain();silent.gain.value=0;tap.connect(split);const analysers=[0,1].map(channel=>{const node=ctx.createAnalyser();node.fftSize=2048;split.connect(node,channel);node.connect(silent);return node;});silent.connect(ctx.destination);await player.setMuted(false);await player.setVolume(1);
    const bias=player.diagnostics.backend?.remux?.timelineBias??0;const fresh=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No fresh frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25+bias){clearTimeout(timer);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});await player.play();const freshFrame=await fresh;
    let audio;const until=performance.now()+3000;do{audio=analysers.map((node,channel)=>{const x=new Float32Array(node.fftSize);node.getFloatTimeDomainData(x);const tone=f=>{let re=0,im=0;for(let i=0;i<x.length;i++){const phase=2*Math.PI*f*i/ctx.sampleRate;re+=x[i]*Math.cos(phase);im+=x[i]*Math.sin(phase);}return Math.hypot(re,im)/x.length;};return {rms:Math.sqrt(x.reduce((n,v)=>n+v*v,0)/x.length),expected:tone(channel?660:440),other:tone(channel?440:660)};});if(audio.every(x=>x.rms>.01&&x.expected>2*x.other))break;await new Promise(resolve=>setTimeout(resolve,20));}while(performance.now()<until);
    if(!audio.every(x=>x.rms>.01&&x.expected>2*x.other))throw Error('Missing fresh stereo '+JSON.stringify(audio));await player.pause();const canvas=new OffscreenCanvas(64,48),pixels=canvas.getContext('2d');pixels.drawImage(video,0,0,64,48);const color=Array.from(pixels.getImageData(32,24,1,1).data);
    const diagnostic=player.diagnostics,profile=diagnostic.backend?.projection?.profile,ffmpegCalls=diagnostic.backend?.remux?.remux?.calls??0;await player.close();
    results.push({ownership,reads,readBytes,closes,seek,freshFrame,color,audio,profile,ffmpegCalls,createdWorkers:created,remainingWorkers:workers.size,remainingURLs:urls.size,sourceId:player.state.sourceId});
   }finally{await ctx?.close();await player.destroy();await runtime.destroy();host.remove();globalThis.Worker=OldWorker;URL.createObjectURL=create;URL.revokeObjectURL=revoke;if(workers.size||urls.size)throw Error('Retained playback handles');}
  }
  return results;
 },{manifest,bytes:Array.from(fixture),sdk,binding});
 assert.deepEqual(checks.map(x=>x.ownership),['owned','borrowed']);for(const c of checks){assert.ok(c.reads>0);assert.equal(c.readBytes,fixture.length);assert.equal(c.closes,c.ownership==='owned'?1:0);assert.ok(c.freshFrame>1.25);assert.ok(c.audio.every(x=>x.rms>.01&&x.expected>2*x.other));assert.ok(Math.abs(c.color[0]-224)<=20&&Math.abs(c.color[1]-32)<=20&&Math.abs(c.color[2]-64)<=20);assert.equal(c.ffmpegCalls,0);assert.equal(c.remainingWorkers,0);assert.equal(c.remainingURLs,0);assert.equal(c.sourceId,null);}
 assert.equal(requests.filter(x=>x.path==='/'+asset.path).length,2);assert.ok(!requests.some(x=>x.path.startsWith('/web/engine-remux/')));
 const receipt={status:'custom-byte-source-public-playback-passed-not-release',browserEngine:engine,browser:browser.version(),provider:sdk,manifestSHA256:hash(manifestBytes),harnessSHA256:hash(await readFile(new URL(import.meta.url))),fixture:{bytes:fixture.length,sha256:hash(fixture)},requests,checks,limitations:['Synthetic local AVC/AAC fixture staged as a File; no remote custom transport or broad media qualification.','Application-owned test qualification and archived backup assets are not a release grant.']};await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,browser:receipt.browser,provider:sdk}));
}finally{await browser.close();}
