// SPDX-License-Identifier: Apache-2.0
import {firefox} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.OUT??'results/firefox-startup-preview-20261001';await mkdir(out,{recursive:true});
const tag=process.env.CASE??'protected',result={tag,fixture:process.env.SOURCE,events:[]};
if(!result.fixture)throw Error('Set SOURCE to the local MKV fixture');
result.runtime={};for(const file of ['web/generated/unified-player.js','web/generated/player/preview.js','web/generated/player/index.js','web/generated/preview/pregeneration.js','web/generated/preview/providers.js','web/generated/preview/controller.js','web/mpv-subtitle-worker.js'])result.runtime[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const save=()=>writeFile(`${out}/${tag}.json`,JSON.stringify(result,null,2));
result.headless=process.env.HEADLESS==='1';
const browser=await firefox.launch({headless:result.headless,firefoxUserPrefs:{'media.autoplay.default':0}});
result.browserVersion=browser.version();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(120000);
 page.on('pageerror',e=>{result.events.push({error:String(e)});console.log('pageerror',String(e));});
 await page.goto(process.env.ORIGIN??'http://127.0.0.1:4179/');await page.waitForFunction(()=>!!window.player);console.log('page ready');
 const prep=Date.now();await page.evaluate(()=>player.preparationReady);result.preparationMs=Date.now()-prep;console.log('prepared',result.preparationMs);await save();
 await page.evaluate(async tag=>{
  if(tag==='baseline'){const {PreviewController}=await import('/web/generated/preview/controller.js');PreviewController.prototype.setPlaybackActive=function(){};}
  window.trace=[];window.t0=performance.now();const mark=(name,data)=>trace.push({name,ms:performance.now()-t0,data});
  const wrap=(obj,key,prefix)=>{const fn=obj[key];if(typeof fn!=='function')return;obj[key]=async function(...args){mark(prefix+key+':start');try{const value=await fn.apply(this,args);mark(prefix+key+':end');return value;}catch(e){mark(prefix+key+':error',String(e));throw e;}};};
  for(const key of ['open','play','select','inspectWithFFmpeg','checkInspectedAssets','replace','settled','playNativeVerified'])wrap(player,key,'player.');
  const create=player.create;player.create=async function(...args){mark('create:start',args);const s=await create.apply(this,args);mark('create:end');for(const key of ['open','load','startRemux','openServices','verifyStartup','play','inspectMetadata'])wrap(s.backend,key,'backend.');for(const e of ['loadedmetadata','loadeddata','canplay','playing','waiting','pause'])s.surface.addEventListener(e,()=>mark('video.'+e));return s;};
  const {NativeMpvSubtitles}=await import('/web/generated/internal/native-mpv-subtitles.js');for(const key of ['select','verify'])wrap(NativeMpvSubtitles.prototype,key,'subtitle.');
  const {WasmPlayer}=await import('/web/generated/internal/wasm-player.js');for(const key of ['command','open','waitForPreviewPresentation','previewSnapshot'])wrap(WasmPlayer.prototype,key,'preview-engine.');
  if(tag==='recovery'){const {BrowserCaptionUnsupported}=await import('/web/generated/internal/plain-vtt.js');NativeMpvSubtitles.prototype.verify=async()=>{throw new BrowserCaptionUnsupported('Injected subtitle packet deadline exceeded');};}
  const request=NativeMpvSubtitles.prototype.request;NativeMpvSubtitles.prototype.request=async function(type,data,...rest){const begun=performance.now(),record=player.state.sourceId===null;try{const value=await request.call(this,type,data,...rest);if(record)mark('subtitle.request',{type,seconds:data?.seconds,ms:performance.now()-begun,hasOverlay:value.hasOverlay,schedule:value.schedule});return value;}catch(e){if(record)mark('subtitle.request-error',{type,error:String(e)});throw e;}};
  player.subscribe(s=>{const value=[s.status,s.pendingOperation?.kind,s.activeMode].join(':');if(window.lastState!==value){mark('state',value);window.lastState=value;}});
  document.querySelector('#viewer').shadowRoot.querySelector('#file').addEventListener('change',()=>{window.t0=performance.now();mark('file-change');},true);
 },tag);
 await page.locator('#viewer #file').setInputFiles(result.fixture);console.log('file set');
 try{await page.waitForFunction(()=>!player.state.pendingOperation&&(player.state.sourceId!==null||player.state.status==='error'),null,{timeout:90000});}catch(e){result.openTimeout=String(e);}
 result.startup=await page.evaluate(()=>({trace,state:player.state,diagnostics:player.diagnostics,errors:playerErrors}));await save();console.log('startup',JSON.stringify(result.startup.trace));
 if(result.openTimeout||!result.startup.state.sourceId)throw Error('Opening did not complete');
 if(!process.env.STARTUP_ONLY){
 await page.evaluate(()=>player.setMode(player.mode));result.pinnedAfterStartup=true;await page.evaluate(()=>player.play());console.log('playing');
 await page.evaluate(()=>{
  window.samples=[];let previous=performance.now();window.sampleTimer=setInterval(()=>{const now=performance.now(),s=player.state,v=player.surface;samples.push({ms:now-t0,gap:now-previous,time:s.currentTime,status:s.status,paused:v?.paused,frames:(()=>{const q=v?.getVideoPlaybackQuality?.();return q?{total:q.totalVideoFrames,dropped:q.droppedVideoFrames}:null;})(),surfaceTime:v?.currentTime,preview:player.preview.diagnostics});previous=now;},100);
 });
 await page.waitForTimeout(2000);
 const timeline=page.locator('#viewer #timeline'),box=await timeline.boundingBox();
 result.hoverImages=[];
 for(const fraction of [.2,.4,.2]){
  await page.mouse.move(5,5);const begun=Date.now();
  await page.mouse.move(box.x+box.width*fraction,box.y+box.height/2);
  await page.waitForFunction(()=>{const panel=document.querySelector('#viewer').shadowRoot.querySelector('#thumbnail-preview'),img=panel.querySelector('img');return !panel.hidden&&!img.hidden&&img.naturalWidth>0;},null,{timeout:15000});
  const elapsedMs=Date.now()-begun;
  result.hoverImages.push(await page.evaluate(({fraction,elapsedMs})=>{const panel=document.querySelector('#viewer').shadowRoot.querySelector('#thumbnail-preview'),img=panel.querySelector('img');return {fraction,elapsedMs,width:img.naturalWidth,height:img.naturalHeight,label:panel.textContent,status:player.state.status,paused:player.surface.paused};},{fraction,elapsedMs}));
  await page.waitForTimeout(1500);
 }
 assert.ok(result.hoverImages.every(image=>image.width>0&&!image.paused),'Hover must display an image during playback');
 assert.ok(result.hoverImages[2].elapsedMs<500,'Cached hover should appear promptly');
 await page.mouse.move(5,5);
 const preparing=Date.now();
 let prepared=[];
 do{
  prepared=await page.evaluate(async()=>{
   const duration=player.state.duration,frames=[];
   for(const fraction of [.01,.25,.5,.75,.99]){
    const start=performance.now(),frame=await player.preview.getFrame({time:duration*fraction,width:240,height:135,maxDistance:duration/96+1,cacheOnly:true});
    frames.push({fraction,hit:frame?.cache==='hit',time:frame?.time,ms:performance.now()-start});
   }
   return frames;
  });
  if(prepared.every(frame=>frame.hit))break;
  await page.waitForTimeout(1000);
 }while(Date.now()-preparing<120000);
 result.preparedStoryboard={waitMs:Date.now()-preparing,samples:prepared};await save();
 assert.ok(prepared.every(frame=>frame.hit),'Background storyboard must supply samples across the timeline');
 result.hover=await page.evaluate(()=>{clearInterval(sampleTimer);return {samples,preview:player.preview.diagnostics,state:player.state,trace};});await save();console.log('hover',JSON.stringify({samples:result.hover.samples.length,preview:result.hover.preview,state:result.hover.state.status}));
 await page.mouse.move(5,5);await page.evaluate(()=>player.pause());await page.waitForTimeout(2000);await page.waitForFunction(()=>!player.state.pendingOperation);
 result.beforePreview=await page.evaluate(()=>({time:player.state.currentTime,intent:player.state.playbackIntent,source:player.state.sourceId}));
 result.pausedPreview=await page.evaluate(async()=>{const start=performance.now();try{const f=await player.preview.getFrame({time:120,width:240,height:135});return {ms:performance.now()-start,path:f?.path,metrics:f?.metrics,diagnostics:player.preview.diagnostics};}catch(e){return {ms:performance.now()-start,error:String(e),diagnostics:player.preview.diagnostics};}});result.finalTrace=await page.evaluate(()=>trace);await save();console.log('pausedPreview',JSON.stringify(result.pausedPreview));
 result.afterPreview=await page.evaluate(()=>({time:player.state.currentTime,intent:player.state.playbackIntent,source:player.state.sourceId}));
 result.cache=await page.evaluate(async()=>{await player.play();const start=performance.now(),frame=await player.preview.getFrame({time:120,width:240,height:135});await player.pause();return {ms:performance.now()-start,cache:frame?.cache,path:frame?.path};});await save();
 assert.deepEqual(result.afterPreview,result.beforePreview,'Preview must preserve primary state');assert.equal(result.cache.cache,'hit');
 await page.evaluate(()=>player.seek(5));await page.waitForFunction(()=>Math.abs(player.diagnostics.backend.mpvSubtitles?.position-5)<.1,null,{timeout:15000});
 result.subtitle=await page.evaluate(async()=>{const sub=player.current.backend.mpvSubs;if(!sub)return {mode:player.mode};const text=await sub.currentText(),c=sub.canvas;const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])alpha++;return {text,alpha,service:sub.service,stats:sub.stats};});await save();
 assert.ok(result.subtitle.alpha>0,'Expected visible subtitle pixels at 5 seconds');
 await page.screenshot({path:`${out}/${tag}.png`});
 }
 result.passed=true;
}catch(e){result.error=String(e);process.exitCode=1;console.error(e);}finally{await save();await browser.close();}
