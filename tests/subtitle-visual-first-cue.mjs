// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import assert from 'node:assert/strict';
const cases=[['srt','build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv'],['mov_text','build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4'],['ass','build/head-to-head/assets-component-isolation-01/fixtures/h264-ass/index.mkv']];
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [name,file] of cases)for(const lane of ['direct','remux']){
  const page=await browser.newPage();
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
   await page.locator('#media').setInputFiles(file);await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),lane==='direct'?'native-direct-mpv':'native-remux-mpv');
   await page.evaluate(()=>{const sub=player.current.backend.mpvSubs,s=sub.stats;let count=s.bitmapUpdates;window.subtitleFirstCue=[];Object.defineProperty(s,'bitmapUpdates',{get(){return count;},set(value){count=value;window.subtitleFirstCue.push({position:s.position,videoTime:sub.video.currentTime});}});});
   await page.evaluate(()=>player.play());await page.waitForFunction(()=>window.subtitleFirstCue.some(x=>x.position>=.5),null,{timeout:5000});
   const got=await page.evaluate(()=>{const event=window.subtitleFirstCue.find(x=>x.position>=.5),sub=player.current.backend.mpvSubs,c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return {event,pixels,mode:sub.stats.scheduler,avChains:sub.service.avChains};});
   assert.ok(got.event.position-.5<.12,`${name}/${lane}: ${JSON.stringify(got)}`);assert.ok(got.pixels>0);assert.equal(got.mode,'deadline');assert.equal(got.avChains,0);
   console.log(name,lane,JSON.stringify(got));
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
