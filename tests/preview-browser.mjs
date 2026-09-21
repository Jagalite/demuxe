// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
 browser=await (process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});
 const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);
 const result=await page.evaluate(async()=>{
  await window.player.destroy();const {Player,LocalVideoPreviewProvider}=await import('/web/generated/index.js');
  const player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'never',preview:{debounceMs:5}});
  const bytes=await(await fetch('/fixtures/example.mp4')).arrayBuffer();await player.open(new File([bytes],'example.mp4'));await player.seek(1);
  const urls=new Set(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=value=>{const url=create(value);urls.add(url);return url;};URL.revokeObjectURL=url=>{urls.delete(url);revoke(url);};
  let seeks=0,errors=0;player.addEventListener('seeking',()=>seeks++);player.addEventListener('error',()=>errors++);
  const pausedBefore=player.state.playbackIntent;const before=player.state.currentTime,frame=await player.preview.getFrame({time:2.2,width:160}),after=player.state.currentTime;const pausedAfter=player.state.playbackIntent;
  if(!frame||!('blob' in frame.image))throw Error('Missing generated image');
  const bitmap=await createImageBitmap(frame.image.blob),dimensions=[bitmap.width,bitmap.height];bitmap.close();
  const hit=await player.preview.getFrame({time:2.8,width:160});
  // A failed optional decoder must neither emit player errors nor move its timeline.
  const remove=player.preview.addProvider({id:'broken',priority:1,canHandle:()=>true,getFrame:async()=>{throw Error('optional decode failure');}});
  const fallback=await player.preview.getFrame({time:0,width:160});remove();
  const abort=new AbortController(),pending=player.preview.getFrame({time:4,signal:abort.signal}).catch(e=>e.name);abort.abort();const cancelled=await pending;
  // While playing, the primary surface continues advancing during extraction.
  await player.play();const start=player.surface.currentTime;await player.preview.getFrame({time:3,width:160});await new Promise(resolve=>setTimeout(resolve,200));const advanced=player.surface.currentTime>start;await player.pause();
  await player.open(new File([bytes],'replacement.mp4'));const sourceCleared=player.preview.diagnostics.cacheEntries===0;
  await player.close();const cleared=player.preview.diagnostics;const absent=await player.preview.getFrame({time:0});await player.destroy();
  const ownedURLs=urls.size;URL.createObjectURL=create;URL.revokeObjectURL=revoke;
  return {before,after,pausedBefore,pausedAfter,sourceCleared,ownedURLs,actualTime:frame.actualTime,temporalAccuracy:frame.temporalAccuracy,seeks,errors,dimensions,cache:hit.cache,path:frame.path,time:frame.time,fallback:!!fallback,cancelled,advanced,cleared,absent};
 });
 assert.equal(result.pausedBefore,result.pausedAfter);assert.equal(result.sourceCleared,true);assert.equal(result.ownedURLs,0);assert.equal(result.actualTime,null);assert.equal(result.temporalAccuracy,'approximate');assert.equal(result.before,result.after);assert.equal(result.seeks,0);assert.equal(result.errors,0);assert.equal(result.dimensions[0],160);assert.equal(result.cache,'hit');assert.equal(result.path,'local-browser');assert.ok(Math.abs(result.time-2)<.1);assert.equal(result.fallback,true);assert.equal(result.cancelled,'AbortError');assert.equal(result.advanced,true);assert.equal(result.cleared.cacheBytes,0);assert.equal(result.absent,null);
 console.log(JSON.stringify({browser:browser.version(),...result},null,2));
}finally{await browser?.close();server.kill();}
