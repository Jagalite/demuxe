// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();page.on('console',m=>console.log('browser',m.type(),m.text()));page.on('pageerror',e=>console.error(e));
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js');
  window.player=new Player(document.querySelector('#surface'),{experimentalMpvSubtitles:true,experimentalBufferedNativeSeeks:true,nativeRemux:'always'});
  const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);
 });
 await page.locator('#file').setInputFiles(process.env.SOURCE??'build/mpv-subtitle-service/fixtures/rejected-bframes.mkv');
 try{await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));}catch(error){console.error(await page.evaluate(()=>player.diagnostics.selection));throw error;}
 assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),'native-remux-mpv');
 await page.evaluate(()=>player.play());await page.waitForTimeout(1200);await page.evaluate(()=>player.pause());
 for(const seconds of (process.env.SOURCE?[5,12,31,950,5]:[2,5,13,2,39])){
  await page.evaluate(t=>player.seek(t),seconds);
  await page.waitForFunction(t=>Math.abs(player.diagnostics.backend.mpvSubtitles?.position-t)<.1,seconds);
  const pixels=await page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass');return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((v,i)=>i%4===3&&v>0).length;});assert.equal(pixels>0,seconds!==(process.env.SOURCE?950:39));
  const d=await page.evaluate(()=>player.diagnostics.backend);assert.equal(d.mpvSubtitles.avChains,0);assert.ok(Math.abs(d.position-seconds)<.1);
  console.log('PASS seek',seconds,JSON.stringify(d.mpvSubtitles));
 }
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(500);console.log('remaining workers',page.workers().map(w=>w.url()));assert.equal(page.workers().length,0);
 console.log('PASS bounded mpv subtitles: routing, playback, seeks, no A/V chains, cleanup');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{experimentalMpvSubtitles:true,nativeRemux:'always'});});
 const workerReady=page.waitForEvent('worker',{predicate:w=>w.url().includes('mpv-subtitle-worker.js')});
 await page.evaluate(()=>{window.opening=player.open(document.querySelector('#file').files[0]).catch(e=>e.code);});await workerReady;
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(500);assert.equal(page.workers().length,0);
 console.log('PASS cancellation during subtitle worker initialization leaves no workers');
}finally{await browser.close();await server.close();}
