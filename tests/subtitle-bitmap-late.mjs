// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const cases=[['pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv','build/subtitle-late-pgs.mkv'],['vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv','build/subtitle-late-vobsub.mkv']];
for(const [,input,output] of cases)execFileSync('ffmpeg',['-v','error','-y','-i',input,'-itsoffset','3','-i',input,'-map','0:v:0','-map','0:a:0','-map','1:s:0','-c','copy',output]);
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [name,,file] of cases.filter(([name])=>!process.env.SUBTITLE_CASE||process.env.SUBTITLE_CASE===name))for(const lane of ['direct','remux'].filter(lane=>!process.env.SUBTITLE_LANE||process.env.SUBTITLE_LANE===lane)){
  const page=await browser.newPage();
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
   await page.locator('#media').setInputFiles(file);await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),lane==='direct'?'native-direct-mpv':'native-remux-mpv');
   const capture=()=>page.evaluate(()=>{const sub=player.current.backend.mpvSubs,c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return {time:player.state.currentTime,pixels,mode:sub.stats.scheduler,avChains:sub.service.avChains};});
   await page.evaluate(()=>player.seek(2));await page.waitForTimeout(250);const before=await capture();
   await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>=3.5,null,{timeout:10000});const appeared=await capture();
   await page.evaluate(()=>player.pause());await page.evaluate(()=>player.seek(6));await page.waitForTimeout(250);const inside=await capture();
   console.log(name,lane,JSON.stringify({before,appeared,inside}));
   assert.equal(before.pixels,0);assert.ok(appeared.pixels>0);assert.ok(inside.pixels>0);assert.equal(inside.mode,'deadline');assert.equal(inside.avChains,0);
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
