// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await(process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.element=document.querySelector('demuxe-player');const p=await element.ready;await p.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'preview.mp4'));await p.seek(1);});
 const timeline=page.locator('demuxe-player').first().locator('#timeline'),panel=page.locator('demuxe-player').first().locator('#thumbnail-preview');
 const box=await timeline.boundingBox();await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await panel.waitFor({state:'visible'});
 if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT});
 assert.match(await panel.innerText(),/≈/);assert.equal(await page.evaluate(()=>element.player.surface.currentTime),1);
 const cachedURL=await panel.locator('img').getAttribute('src');
 await page.mouse.move(box.x+box.width*.41,box.y+box.height/2);await page.waitForFunction(()=>element.player.preview.diagnostics.hits>0);
 assert.equal(await panel.locator('img').getAttribute('src'),cachedURL);
 await page.mouse.move(box.x,box.y-150);await panel.waitFor({state:'hidden'});
 // Continuous motion on a long timeline must produce images before the pointer
 // stops, and keep the last image painted while the next sample is decoding.
 const motion=await page.evaluate(async()=>{
  const root=element.shadowRoot,timeline=root.querySelector('#timeline'),panel=root.querySelector('#thumbnail-preview');
  const sample=await element.player.preview.getFrame({time:2,width:240,height:135});
  const max=timeline.max;timeline.max='3600';let started=0,completed=0,cancelled=0;
  const remove=element.player.preview.addProvider({id:'motion',priority:0,canHandle:()=>true,getFrame:async r=>{
   started++;await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);cancelled++;reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{r.signal.removeEventListener('abort',abort);resolve();},80);r.signal.addEventListener('abort',abort,{once:true});});
   completed++;return {...sample,time:r.time,actualTime:r.time,timestampKind:'exact',path:'motion'};
  }});
  let shown=0,blankAfterShown=0;const rect=timeline.getBoundingClientRect();
  try{
   for(let i=0;i<60;i++){
    timeline.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:rect.left+rect.width*(.1+i*.005),clientY:rect.top+rect.height/2}));
    await new Promise(resolve=>setTimeout(resolve,16));
    if(!panel.hidden)shown++;else if(shown)blankAfterShown++;
   }
   const completedDuringMotion=completed,deadline=performance.now()+2000;
   // Provider idleness can precede image.decode() and the next queued UI sample.
   while(performance.now()<deadline&&!/23:4[12]/.test(root.querySelector('#thumbnail-time').textContent))await new Promise(resolve=>setTimeout(resolve,10));
   return {shown,blankAfterShown,completedDuringMotion,started,completed,cancelled,label:root.querySelector('#thumbnail-time').textContent};
  }finally{timeline.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));remove();timeline.max=max;}
 });
 assert.ok(motion.shown>0,JSON.stringify(motion));assert.ok(motion.completedDuringMotion>=2,JSON.stringify(motion));
 assert.equal(motion.blankAfterShown,0);assert.equal(motion.cancelled,0);assert.ok(motion.started<30,JSON.stringify(motion));
 assert.match(motion.label,/23:4[12]/); // The latest pointer position represents about 1422 seconds.
 // A stalled authored image must not block a subsequent resident preview. The
 // provider has already finished, so its request timeout cannot release the UI.
 await page.route('**/preview-hung.png',()=>{});
 await page.evaluate(async()=>{
  const api=element.player.preview,sample=await api.getFrame({time:2,width:240,height:135});
  window.removeHung=api.addProvider({id:'hung-image',priority:0,canHandle:()=>true,getFrame:async r=>({...sample,time:r.time,actualTime:r.time,path:'hung-image',image:r.time<5?{uris:[location.origin+'/preview-hung.png'],crop:{x:0,y:0,width:1,height:1}}:sample.image})});
  await api.getFrame({time:8,width:240,height:135});window.hitsBeforeHung=api.diagnostics.hits;
  window.movePreview=time=>{const t=element.shadowRoot.querySelector('#timeline'),r=t.getBoundingClientRect();t.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:r.left+r.width*(time-Number(t.min))/(Number(t.max)-Number(t.min)),clientY:r.top+r.height/2}));};
 });
 const hungRequest=page.waitForRequest('**/preview-hung.png');await page.evaluate(()=>movePreview(1));await hungRequest;
 const hungCancelled=page.waitForEvent('requestfailed',{predicate:r=>r.url().endsWith('/preview-hung.png'),timeout:2000});
 await page.evaluate(()=>movePreview(8));
 await page.waitForFunction(()=>!element.shadowRoot.querySelector('#thumbnail-preview').hidden&&/0:08/.test(element.shadowRoot.querySelector('#thumbnail-time').textContent),null,{timeout:2000});
 await hungCancelled;
 assert.equal(await page.evaluate(()=>element.player.preview.diagnostics.hits),await page.evaluate(()=>hitsBeforeHung+1));
 assert.equal(await page.evaluate(()=>element.player.surface.currentTime),1);
 await page.evaluate(()=>{element.shadowRoot.querySelector('#timeline').dispatchEvent(new PointerEvent('pointerleave'));removeHung();});
 await page.unroute('**/preview-hung.png');
 // Revisiting the same cached image while it loads must reuse that download.
 let imageLoads=0;
 const png=Buffer.from(await page.evaluate(async()=>{const c=new OffscreenCanvas(1,1);c.getContext('2d').fillRect(0,0,1,1);return Array.from(new Uint8Array(await(await c.convertToBlob()).arrayBuffer()));}));
 await page.route('**/preview-slow.png',async route=>{imageLoads++;await new Promise(r=>setTimeout(r,120));await route.fulfill({contentType:'image/png',body:png});});
 const sameImage=await page.evaluate(async()=>{
  const api=element.player.preview,root=element.shadowRoot;let shown=0;
  const remove=api.addProvider({id:'slow-image',priority:0,canHandle:()=>true,getFrame:async r=>({time:r.time,actualTime:r.time,width:1,height:1,path:'slow-image',image:{uris:[location.origin+'/preview-slow.png'],crop:{x:0,y:0,width:1,height:1}}})});
  try{for(let i=0;i<30;i++){movePreview(2+i*.001);await new Promise(r=>setTimeout(r,16));if(!root.querySelector('#thumbnail-preview').hidden)shown++;}return shown;}
  finally{root.querySelector('#timeline').dispatchEvent(new PointerEvent('pointerleave'));remove();}
 });
 assert.ok(sameImage>0,'A resident image should become visible during motion within its bucket');assert.equal(imageLoads,1);
 await page.unroute('**/preview-slow.png');
 // A late authored provider cannot make a departed hover visible.
 await page.evaluate(()=>{window.lateCalls=0;window.remove=element.player.preview.addProvider({id:'late',priority:0,canHandle:()=>true,getFrame:r=>new Promise(resolve=>{lateCalls++;window.finishPreview=()=>resolve({time:0,actualTime:0,width:1,height:1,image:{blob:new Blob()},path:'late'});})});});
 await page.mouse.move(box.x+box.width*.7,box.y+box.height/2);await page.waitForFunction(()=>window.finishPreview);
 await page.mouse.move(box.x+box.width*.9,box.y+box.height/2);await page.mouse.move(box.x,box.y-150);await page.evaluate(()=>finishPreview());
 await page.waitForFunction(()=>!element.player.preview.diagnostics.active&&!element.player.preview.diagnostics.pending);assert.equal(await page.evaluate(()=>lateCalls),1);
 await page.evaluate(()=>remove());await panel.waitFor({state:'hidden'});
 // Source replacement and destruction release visible preview URLs.
 await page.mouse.move(box.x+box.width*.3,box.y+box.height/2);await panel.waitFor({state:'visible'});
 await page.evaluate(()=>element.close());await panel.waitFor({state:'hidden'});assert.equal(await panel.locator('img').getAttribute('src'),null);
 await page.evaluate(()=>element.destroy());console.log('PASS scrubber display, continuous motion, cached image reuse, stalled image recovery, represented-time label, playback isolation, stale cancellation, close/destroy cleanup');
}finally{await browser?.close();server.kill();}
