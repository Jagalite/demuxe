// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import assert from 'node:assert/strict';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function open(page,file){
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
 await page.locator('#media').setInputFiles(file);
 await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
}
try{
 const race=await browser.newPage();
 try{
  await open(race,'build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv');
  await race.evaluate(()=>player.seek(1));await sleep(300);
  const result=await race.evaluate(async()=>{
   const sub=player.current.backend.mpvSubs,original=sub.request.bind(sub);
   sub.request=(type,data)=>type==='render'?original(type,data).then(value=>new Promise(resolve=>setTimeout(()=>resolve(value),150))):original(type,data);
   const before={renders:sub.stats.renders,discarded:sub.stats.discarded};
   sub.invalidate();await new Promise(resolve=>setTimeout(resolve,30));sub.invalidate();
   await new Promise(resolve=>setTimeout(resolve,550));sub.request=original;
   return {before,after:{renders:sub.stats.renders,discarded:sub.stats.discarded},scheduler:sub.stats.scheduler};
  });
  assert.equal(result.scheduler,'deadline');
  assert.ok(result.after.discarded>result.before.discarded,JSON.stringify(result));
  assert.ok(result.after.renders>result.before.renders,JSON.stringify(result));
  console.log('busy invalidation retry',JSON.stringify(result));
  await race.evaluate(()=>player.destroy());for(let i=0;i<50&&race.workers().length;i++)await sleep(100);assert.equal(race.workers().length,0);
 }finally{await race.close();}

 const fallback=await browser.newPage();
 try{
  await fallback.route('**/web/mpv-subtitle-worker.js',async route=>{
   const response=await route.fetch();const source=await response.text();
   const target='if(engine._subtitle_service_seek(0)>=0){';
   assert.ok(source.includes(target),'ASS scan injection target changed');
   await route.fulfill({response,body:source.replace(target,'if(false){')});
  });
  await open(fallback,'build/head-to-head/assets-component-isolation-01/fixtures/h264-ass/index.mkv');
  assert.equal(await fallback.evaluate(()=>player.current.backend.mpvSubs.stats.scheduler),'frame');
  await fallback.evaluate(()=>player.seek(1));await fallback.evaluate(()=>player.play());await sleep(1200);
  const result=await fallback.evaluate(()=>{const sub=player.current.backend.mpvSubs,c=document.querySelector('.demuxe-native-ass'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i])pixels++;return {position:sub.stats.position,pixels,renders:sub.stats.renders,avChains:sub.service.avChains};});
  assert.ok(result.renders>35,JSON.stringify(result));assert.ok(result.pixels>0,JSON.stringify(result));assert.equal(result.avChains,0);
  console.log('ASS scan seek failure fallback',JSON.stringify(result));
  await fallback.evaluate(()=>player.destroy());for(let i=0;i<50&&fallback.workers().length;i++)await sleep(100);assert.equal(fallback.workers().length,0);
 }finally{await fallback.close();}
}finally{await browser.close();await server.close();}
