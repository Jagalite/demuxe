// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const codec=process.env.PREVIEW_CODEC??'ffv1';
const fixture=`fixtures/preview-software-${process.pid}.mkv`;
const codecArgs=codec==='hevc'?['-c:v','libx265','-preset','ultrafast','-x265-params','pools=1:frame-threads=1:log-level=error']:['-c:v','ffv1'];
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',`testsrc2=size=${codec==='hevc'?'1280x720':'320x180'}:rate=12`,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','6',...codecArgs,'-c:a',codec==='hevc'?'aac':'pcm_s16le',fixture]);
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await(process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});
 const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);
 const result=await page.evaluate(async ({fixture,codec})=>{
  await window.player.destroy();const {Player,SoftwarePreviewProvider}=await import('/web/generated/index.js');
  const p=new Player(document.querySelector('#surface'),{mode:'software',automaticSelection:false,preview:{debounceMs:5}});
  const file=new File([await(await fetch('/'+fixture)).blob()],'software.mkv');await p.open(file);
  let previewInput={file};
  // Some browsers decode HEVC natively. Exercise the software provider explicitly
  // for that codec; FFV1 exercises the unchanged production fallback routing.
  if(codec==='hevc')p.preview.setProviders([new SoftwarePreviewProvider(()=>previewInput,document,new URL('/',location.href))]);
  let seeks=0,errors=0;p.addEventListener('seeking',()=>seeks++);p.addEventListener('error',()=>errors++);
  const before={time:p.state.currentTime,intent:p.state.playbackIntent},owners=document.querySelectorAll('iframe').length;
  const frame=await p.preview.getFrame({time:2.2,width:160});if(!frame)throw Error(JSON.stringify(p.preview.diagnostics));
  const after={time:p.state.currentTime,intent:p.state.playbackIntent};
  const bitmap=await createImageBitmap(frame.image.blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const nonblack=pixels.some((v,i)=>i%4!==3&&v>100);
  const hit=await p.preview.getFrame({time:2.8,width:160});
  const a=p.preview.getFrame({time:3}).catch(e=>e.name);await new Promise(r=>setTimeout(r,50));const b=p.preview.getFrame({time:4});const cancelled=await a;const latest=await b;
  const controller=new AbortController();const abandoned=p.preview.getFrame({time:1,signal:controller.signal}).catch(e=>e.name);await new Promise(r=>setTimeout(r,50));controller.abort();const aborted=await abandoned;
  await new Promise(r=>setTimeout(r,300));
  await p.play();const start=p.state.currentTime;await p.preview.getFrame({time:1});await new Promise(r=>setTimeout(r,200));const advanced=p.state.currentTime>start;await p.pause();
  // Drive the exact mpv property notification used for software rebuffering.
  const buffering=value=>{const backend=p.current.backend;backend.properties.set('paused-for-cache',value);backend.dispatchEvent(new CustomEvent('mpv',{detail:{event:'property-change',name:'paused-for-cache',data:value}}));};
  await p.play();
  const pressureRequest=p.preview.getFrame({time:0}).catch(e=>e.name);
  const deadline=performance.now()+5000;
  while(document.querySelectorAll('iframe').length===owners&&performance.now()<deadline)await new Promise(r=>setTimeout(r,1));
  if(document.querySelectorAll('iframe').length===owners)throw Error('Preview worker did not start: '+JSON.stringify({preview:p.preview.diagnostics,state:p.state,result:await pressureRequest}));
  buffering(true);const preempted=await pressureRequest;await p.preview.drain();
  const blocked=await p.preview.getFrame({time:5}),cachedDuringBuffering=await p.preview.getFrame({time:2,width:160});
  const ownersDuringBuffering=document.querySelectorAll('iframe').length;
  buffering(false);await p.pause();const resumed=await p.preview.getFrame({time:0});
  const leakedOwners=document.querySelectorAll('iframe').length-owners;
  await p.open(file);const invalidated=p.preview.diagnostics.cacheEntries===0;
  const remote={url:new URL('/'+fixture,location.href).href,immutable:true};await p.openRemote(remote);previewInput={remote};const remoteFrame=await p.preview.getFrame({time:2,width:160});
  const pending=p.preview.getFrame({time:3}).catch(e=>e.name);await new Promise(r=>setTimeout(r,50));await p.destroy();await pending;
  return {preempted,blocked,bufferingHit:cachedDuringBuffering?.cache,ownersDuringBuffering,owners,resumed:!!resumed,remotePath:remoteFrame?.path,before,after,path:frame.path,time:frame.time,actualTime:frame.actualTime,accuracy:frame.temporalAccuracy,dimensions:[frame.width,frame.height],nonblack,cache:hit.cache,cancelled,aborted,latest:latest?.time,advanced,seeks,errors,leakedOwners,invalidated,ownersAfterDestroy:document.querySelectorAll('iframe').length,latencyMs:frame.metrics.totalMs};
 },{fixture,codec});
 assert.equal(result.preempted,'AbortError');assert.equal(result.blocked,null);assert.equal(result.bufferingHit,'hit');assert.equal(result.ownersDuringBuffering,result.owners);assert.equal(result.resumed,true);
 assert.deepEqual(result.before,result.after);assert.equal(result.remotePath,'software');if(codec==='ffv1')assert.equal(result.path,'software');assert.equal(result.nonblack,true);assert.deepEqual(result.dimensions,[160,90]);assert.equal(result.cache,'hit');assert.equal(result.cancelled,'AbortError');assert.equal(result.aborted,'AbortError');assert.ok(Math.abs(result.time-2)<.2);assert.ok(Math.abs(result.latest-4)<.2);assert.equal(result.actualTime,null);assert.equal(result.accuracy,'approximate');assert.equal(result.advanced,true);assert.equal(result.seeks,0);assert.equal(result.errors,0);assert.equal(result.leakedOwners,0);assert.equal(result.invalidated,true);assert.equal(result.ownersAfterDestroy,0);
 // An idle primary player tears down quickly; its destroy promise must still
 // join a software preview that has just started allocating its worker tree.
 const teardown=await page.evaluate(async fixture=>{
  const {Player,SoftwarePreviewProvider}=await import('/web/generated/index.js');
  const p=new Player(document.querySelector('#surface'),{mode:'native',preview:{debounceMs:0}});
  const file=new File([await(await fetch('/'+fixture)).blob()],'teardown.mkv');
  p.preview.setProviders([new SoftwarePreviewProvider(()=>({file}),document,new URL('/',location.href))]);
  const work=p.preview.getFrame({time:2}).catch(e=>e.name),deadline=performance.now()+5000;
  while(!document.querySelector('iframe')&&performance.now()<deadline)await new Promise(r=>setTimeout(r,1));
  if(!document.querySelector('iframe'))throw Error('Preview owner did not start');
  await p.destroy();const owners=document.querySelectorAll('iframe').length;await work;return owners;
 },fixture);assert.equal(teardown,0);
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async fixture=>{window.element=document.querySelector('demuxe-player');const p=await element.ready;await p.open(new File([await(await fetch('/'+fixture)).blob()],'hover.mkv'));},fixture);
 const timeline=page.locator('demuxe-player').first().locator('#timeline'),panel=page.locator('demuxe-player').first().locator('#thumbnail-preview');
 const box=await timeline.boundingBox();await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await panel.waitFor({state:'visible'});
 assert.match(await panel.innerText(),/≈/);assert.equal(await panel.locator('img').evaluate(img=>img.naturalWidth>0),true);
 await page.mouse.move(box.x,box.y-150);await panel.waitFor({state:'hidden'});await page.evaluate(()=>element.destroy());
 console.log(JSON.stringify({browser:browser.version(),codec,hoverVisible:true,...result},null,2));
}finally{await browser?.close();server.kill();await unlink(fixture);}
