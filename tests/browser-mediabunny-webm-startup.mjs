// SPDX-License-Identifier: Apache-2.0
// Force a direct-load stall and test the WebM provider and real FFmpeg fallback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';

const root=resolve(process.env.DEMUXE_COMPOSED_DEPLOYMENT??''),evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!process.env.DEMUXE_COMPOSED_DEPLOYMENT||!evidence)throw Error('Set DEMUXE_COMPOSED_DEPLOYMENT and DEMUXE_BROWSER_EVIDENCE');
const family=process.env.DEMUXE_PUBLIC_BROWSER??'chrome';assert.ok(['chrome','firefox','webkit'].includes(family));
const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/vp8-resource.webm',import.meta.url));
// Mark the second, non-key SimpleBlock discardable. Demuxe's bounded profile
// rejects this valid authored flag; packet payload and timing are unchanged.
const declined=Buffer.from(fixture);assert.equal(declined[349],0xa3);assert.equal(declined[357],0);declined[357]=1;
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),requests=[];
const receipt={status:'running-not-qualified',browserEngine:family,harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),manifestSHA256:hash(manifestBytes),fixtureSHA256:hash(fixture),declinedSHA256:hash(declined),declinedMutation:{offset:357,from:0,to:1,meaning:'discardable flag on second non-key SimpleBlock'},cases:[],limitations:['First direct-load start deliberately suppressed to exercise existing default startup timers','Synthetic local VP8 fixture and test-owned qualification, not release or general browser qualification','Window-created workers tracked; nested worker census and other WebM profiles excluded']};
let server,browser;const save=()=>writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');
try{
 server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  try{
   const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'};
   if(path==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html'});res.end('<!doctype html><body></body>');return;}
   if(path==='/favicon.ico'){res.writeHead(204,headers);res.end();return;}
   const file=resolve(root,path.slice(1));assert.ok(file.startsWith(root+sep));const bytes=await readFile(file);requests.push({path,bytes:bytes.length,sha256:hash(bytes),at:Date.now()});
   res.writeHead(200,{...headers,'Content-Type':path.endsWith('.wasm')?'application/wasm':path.endsWith('.json')?'application/json':'text/javascript','Content-Length':bytes.length});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base='http://127.0.0.1:'+server.address().port+'/';
 browser=await({chrome:chromium,firefox,webkit}[family]).launch({headless:true,...family==='chrome'?{channel:'chrome'}:{}});receipt.browser=browser.version();
 for(const scenario of ['preferred','decline']){
  const page=await browser.newPage(),start=requests.length;
  try{
   await page.goto(base);await page.mouse.click(1,1);
   const result=await page.evaluate(async({manifest,scenario,bytes,base})=>{
    const {Player,DemuxeRuntime}=await import('/dist/index.js'),{NativePlayer}=await import('/web/generated/internal/native-player.js');const sdk='mediabunny-file-preparation',identities=Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity]));
    // Compare with this browser's direct decoding of the same source; VP8
    // color conversion may differ across engines even for identical packets.
    const reference=async()=>{const video=document.createElement('video'),url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/webm'}));video.muted=true;try{video.src=url;await new Promise((ok,bad)=>{video.onloadeddata=ok;video.onerror=bad;});video.currentTime=1.25;await new Promise(ok=>video.onseeked=ok);const fresh=new Promise((ok,bad)=>{const timer=setTimeout(()=>bad(Error('No direct reference frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25){clearTimeout(timer);ok();}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});await video.play();await fresh;await video.pause();const canvas=new OffscreenCanvas(64,48),ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,64,48);return Array.from(ctx.getImageData(32,24,1,1).data);}finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}};
    const referenceColor=await reference();
    const runtime=new DemuxeRuntime({assetBase:base,qualifiedProviders:identities,qualifiedCompositions:[{recipeId:'native-remux',bindingId:'mediabunny',sourceProfiles:['local:pthread:webm-matroska-vp8-video'],implementationIdentities:{[sdk]:identities[sdk],'browser-prepared':identities['browser-prepared']}}]});await runtime.providers.load('demuxe-providers.json');
    const host=document.createElement('div');document.body.append(host);const player=new Player(host,{runtime,mode:'native',nativeRemux:'auto',remuxRuntime:'off',preview:false,providerPreferences:[{capability:'media.prepare.file',providers:[sdk,'ffmpeg-file-preparation']}],buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
    const trace=[],mark=(event,data)=>trace.push({event,at:performance.timeOrigin+performance.now(),data});const wait=NativePlayer.prototype.wait;let forced=false;
    NativePlayer.prototype.wait=function(event,start,...args){if(!forced&&this.requestedPlan?.startsWith('native-direct')&&['loadeddata','loadedmetadata'].includes(event)){forced=true;mark('direct-load',event);return wait.call(this,event,()=>{},...args);}return wait.call(this,event,start,...args);};
    const prefetch=player.prefetchStartup;player.prefetchStartup=function(...args){mark('prefetch',args[0]);return prefetch.apply(this,args);};
    const WorkerClass=globalThis.Worker,workers=new Set(),messages=[];globalThis.Worker=class extends WorkerClass{constructor(url,options){super(url,options);workers.add(this);const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};this.addEventListener('message',({data})=>{if(options?.name==='demuxe-media-preparation'&&data?.ok===true)messages.push({at:performance.timeOrigin+performance.now(),prepared:data.value!==undefined});});}};
    try{
     await player.setMuted(true);await player.open(new File([new Uint8Array(bytes)],'fixture.webm'));const diag=player.diagnostics;if(diag.plan?.id!=='native-remux')throw Error('Unexpected plan '+diag.plan?.id);await player.seek(1.25);
     const video=player.surface,bias=diag.backend?.remux?.timelineBias??0;const fresh=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No fresh frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25+bias){clearTimeout(timer);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});await player.play();const frame=await fresh;await player.pause();
     const canvas=new OffscreenCanvas(64,48),ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,64,48);const color=Array.from(ctx.getImageData(32,24,1,1).data);if(color.some((value,i)=>Math.abs(value-referenceColor[i])>2))throw Error('Decoded color differs from direct source '+JSON.stringify({color,referenceColor}));
     const ffmpegCalls=diag.backend?.remux?.remux?.calls??0;await player.close();return {scenario,forced,trace,messages,frame,color,referenceColor,ffmpegCalls,remainingWorkers:workers.size};
    }finally{await player.destroy();await runtime.destroy();host.remove();NativePlayer.prototype.wait=wait;globalThis.Worker=WorkerClass;if(workers.size)throw Error('Workers leaked');}
   },{manifest,scenario,bytes:Array.from(scenario==='decline'?declined:fixture),base});
   const deliveries=requests.slice(start).filter(x=>x.path.startsWith('/web/providers/mediabunny/')||x.path.startsWith('/web/engine-remux/'));receipt.cases.push({...result,deliveries});await save();
   assert.ok(result.forced);const direct=result.trace.find(x=>x.event==='direct-load'),prefetch=result.trace.find(x=>x.event==='prefetch');assert.ok(direct&&prefetch&&prefetch.at-direct.at>=390);assert.equal(result.remainingWorkers,0);assert.ok(result.frame>1.25);
   assert.ok(deliveries.some(x=>x.path==='/web/providers/mediabunny/webm.js'));const ff=deliveries.filter(x=>x.path==='/web/engine-remux/remux.wasm');
   if(scenario==='preferred'){assert.equal(ff.length,0);assert.equal(result.ffmpegCalls,0);}
   else{const mismatch=result.messages.find(x=>x.prepared===false);assert.ok(mismatch);assert.ok(result.ffmpegCalls>0);assert.equal(ff.length,1);assert.ok(ff[0].at>=mismatch.at-20);}
  }finally{await page.close();}
 }
 receipt.status='finite-packaged-webm-startup-passed-not-release';
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};throw error;}
finally{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));receipt.requests=requests;await save();}
