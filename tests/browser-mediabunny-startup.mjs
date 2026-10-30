// SPDX-License-Identifier: Apache-2.0
// Force only the initial direct-load wait to exercise actual startup timers.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox} from 'playwright';

const root=resolve(process.env.DEMUXE_COMPOSED_DEPLOYMENT??''),evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!process.env.DEMUXE_COMPOSED_DEPLOYMENT||!evidence)throw Error('Set DEMUXE_COMPOSED_DEPLOYMENT and DEMUXE_BROWSER_EVIDENCE');
const family=process.env.DEMUXE_PUBLIC_BROWSER??'chrome';assert.ok(['chrome','firefox'].includes(family));
const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url)),declined=Buffer.from(fixture);
const group=declined.indexOf('sgpd');assert.ok(group>0);assert.equal(declined.readInt16BE(group+20),-1);declined.writeInt16BE(-2,group+20);
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes);
const receipt={status:'running-not-qualified',browserEngine:family,harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),manifestSHA256:hash(manifestBytes),fixtureSHA256:hash(fixture),declinedSHA256:hash(declined),cases:[],limitations:['The test deliberately suppresses only the initial direct media-load start to force normal startup deadlines','Finite local synthetic AVC/AAC fixture and test-owned qualification; not release or general browser reliability','Window-created worker handles are tracked; no independent nested worker census']};
let server,browser;const requests=[],save=()=>writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');
try{
 server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  try{
   const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'};
   if(path==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html'});res.end('<!doctype html><body></body>');return;}
   if(path==='/favicon.ico'){res.writeHead(204,headers);res.end();return;}
   const file=resolve(root,path.slice(1));assert.ok(file.startsWith(root+sep));const bytes=await readFile(file);
   requests.push({path,bytes:bytes.length,sha256:hash(bytes),at:Date.now()});res.writeHead(200,{...headers,'Content-Type':path.endsWith('.wasm')?'application/wasm':path.endsWith('.json')?'application/json':'text/javascript','Content-Length':bytes.length});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base='http://127.0.0.1:'+server.address().port+'/';
 browser=await (family==='chrome'?chromium:firefox).launch({headless:true,...family==='chrome'?{channel:'chrome'}:{}});receipt.browser=browser.version();
 for(const sdk of ['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'])for(const scenario of ['preferred','decline','unqualified']){
  const page=await browser.newPage(),start=requests.length;
  try{
   await page.goto(base);await page.mouse.click(1,1);
   const result=await page.evaluate(async({manifest,sdk,scenario,bytes,base})=>{
    const {Player,DemuxeRuntime}=await import('/dist/index.js'),{NativePlayer}=await import('/web/generated/internal/native-player.js');
    const identities=Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity])),binding=sdk==='mediabunny-mp4-file-preparation'?'mediabunny-mp4':'mediabunny-mp4-stream';
    const runtime=new DemuxeRuntime({assetBase:base,qualifiedProviders:identities,qualifiedCompositions:scenario==='unqualified'?[]:[{recipeId:'native-remux',bindingId:binding,sourceProfiles:['local:pthread:mp4-mov-avc-aac-2ch'],implementationIdentities:{[sdk]:identities[sdk],'browser-prepared':identities['browser-prepared']}}]});
    await runtime.providers.load('demuxe-providers.json');const host=document.createElement('div');document.body.append(host);
    const player=new Player(host,{runtime,mode:'native',nativeRemux:'auto',remuxRuntime:'off',preview:false,providerPreferences:[{capability:'media.prepare.file',providers:[sdk,'ffmpeg-file-preparation']}],buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
    const trace=[],mark=(event,data)=>trace.push({event,at:performance.timeOrigin+performance.now(),data});
    const wait=NativePlayer.prototype.wait;let forced=false;NativePlayer.prototype.wait=function(event,start,...args){if(!forced&&this.requestedPlan?.startsWith('native-direct')&&['loadeddata','loadedmetadata'].includes(event)){forced=true;mark('direct-load',event);return wait.call(this,event,()=>{},...args);}return wait.call(this,event,start,...args);};
    const prefetch=player.prefetchStartup;player.prefetchStartup=function(...args){mark('prefetch',args[0]);return prefetch.apply(this,args).then(value=>{mark('prefetch-settled');return value;});};
    const WorkerClass=globalThis.Worker,workers=new Set(),messages=[];
    globalThis.Worker=class extends WorkerClass{constructor(url,options){super(url,options);workers.add(this);const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};this.addEventListener('message',({data})=>{if(['demuxe-media-preparation','demuxe-stream-preparation'].includes(options?.name)&&(data?.ok===true||data?.code==='PROVIDER_PROFILE_MISMATCH'||data?.error?.code==='PROVIDER_PROFILE_MISMATCH')){const item={at:performance.timeOrigin+performance.now(),prepared:data?.value!==undefined,code:data?.code??data?.error?.code};messages.push(item);}});}};
    let context;
    try{
     await player.setMuted(true);await player.open(new File([new Uint8Array(bytes)],'fixture.mp4'));const diag=player.diagnostics;
     if(diag.plan?.id!=='native-remux')throw Error('Unexpected plan '+diag.plan?.id);await player.seek(1.25);
     const video=player.surface,bias=diag.backend?.remux?.timelineBias??0;context=new AudioContext({sampleRate:48000});await context.resume();const tap=context.createMediaElementSource(video),analyser=context.createAnalyser(),silent=context.createGain();silent.gain.value=0;tap.connect(analyser);analyser.connect(silent);silent.connect(context.destination);await player.setMuted(false);await player.setVolume(1);
     const fresh=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No fresh frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25+bias){clearTimeout(timer);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});await player.play();const frame=await fresh;
     let rms=0;for(let i=0;i<100&&rms<=.01;i++){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length);if(rms<=.01)await new Promise(resolve=>setTimeout(resolve,20));}if(rms<=.01)throw Error('No fresh audio');
     const calls=diag.backend?.remux?.remux?.calls??0;await player.close();return {scenario,sdk,forced,trace,messages,frame,rms,ffmpegCalls:calls,remainingWorkers:workers.size};
    }finally{await context?.close();await player.destroy();await runtime.destroy();host.remove();NativePlayer.prototype.wait=wait;globalThis.Worker=WorkerClass;if(workers.size)throw Error('Workers leaked');}
   },{manifest,sdk,scenario,bytes:Array.from(scenario==='decline'?declined:fixture),base});
   const deliveries=requests.slice(start).filter(item=>item.path.startsWith('/web/providers/mediabunny/')||item.path.startsWith('/web/engine-remux/'));receipt.cases.push({...result,deliveries});await save();
   assert.ok(result.forced);const direct=result.trace.find(x=>x.event==='direct-load'),prefetch=result.trace.find(x=>x.event==='prefetch');assert.ok(direct&&prefetch);assert.ok(prefetch.at-direct.at>=390,'Default prefetch deadline fired early');
   assert.equal(result.remainingWorkers,0);assert.ok(result.frame>1.25&&result.rms>.01);const ff=deliveries.filter(x=>x.path.endsWith('/remux.wasm'));
   if(scenario==='unqualified')assert.ok(!deliveries.some(x=>x.path.includes('/web/providers/mediabunny/')));
   else assert.ok(deliveries.some(x=>x.path.includes('/web/providers/mediabunny/')));
   if(scenario==='preferred'){assert.equal(ff.length,0);assert.equal(result.ffmpegCalls,0);}
   else if(scenario==='decline'){assert.ok(result.ffmpegCalls>0);const mismatch=result.messages.find(x=>x.prepared===false||x.code==='PROVIDER_PROFILE_MISMATCH');assert.ok(mismatch);assert.equal(ff.length,1);assert.ok(ff[0].at>=mismatch.at-20,'FFmpeg fetched before the preferred provider declined');}
   else{assert.ok(result.ffmpegCalls>0);assert.equal(ff.length,1);const settled=result.trace.find(x=>x.event==='prefetch-settled');assert.ok(settled);assert.ok(ff[0].at>=prefetch.at-20&&ff[0].at<=settled.at+20,'FFmpeg was not fetched by startup prefetch');}
  }finally{await page.close();}
 }
 receipt.status='finite-packaged-startup-timer-passed-not-release';
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};throw error;}
finally{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));receipt.requests=requests;await save();}
