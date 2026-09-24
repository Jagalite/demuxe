// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const ass=(await readFile('results/subtitle-stack-upgrade/same-text-style.ass','utf8')).replace(',,Same\n',',,{\\fad(200,200)}Same\n');
await writeFile('build/subtitle-static-animated.ass',ass);
execFileSync('ffmpeg',['-v','error','-y','-i','results/subtitle-stack-upgrade/same-text-style.mkv','-i','build/subtitle-static-animated.ass','-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','ass','build/subtitle-static-animated.mkv']);
const cases=[
 ['animated-ass','build/subtitle-static-animated.mkv'],
 ['pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv'],
 ['vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv'],
];
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [name,file] of cases){
  const page=await browser.newPage();
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(file);await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   const scheduler=await page.evaluate(()=>player.current.backend.mpvSubs.stats.scheduler);assert.equal(scheduler,'deadline',name);
   if(name==='animated-ass')await page.evaluate(()=>player.seek(4));
   await page.evaluate(()=>player.play());await page.waitForTimeout(1200);
   const result=await page.evaluate(()=>({route:player.diagnostics.plan.id,scheduler:player.current.backend.mpvSubs.stats.scheduler,renders:player.current.backend.mpvSubs.stats.renders,avChains:player.current.backend.mpvSubs.service.avChains}));
   assert.equal(result.route,'native-direct-mpv');assert.equal(result.scheduler,name==='animated-ass'?'animated':'deadline');assert.equal(result.avChains,0);
   assert.ok(name==='animated-ass'?result.renders>35:result.renders<6,JSON.stringify(result));
   console.log(name,JSON.stringify(result));await page.evaluate(()=>player.destroy());
   for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
