// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const fixture='results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv';
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540});window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);});
 await page.locator('#source').setInputFiles(fixture);
 await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
 await page.evaluate(()=>player.play());
 const scenarios=[
  ['rate-then-seek',()=>page.evaluate(async()=>{const a=player.setPlaybackRate(1.75),b=player.seek(12);return Promise.allSettled([a,b]);})],
  ['seek-then-rate',()=>page.evaluate(async()=>{const a=player.seek(4),b=player.setPlaybackRate(1);return Promise.allSettled([a,b]);})],
  ['nearby-seeks',()=>page.evaluate(async()=>{const a=player.seek(10),b=player.seek(11),c=player.seek(9);return Promise.allSettled([a,b,c]);})],
  ['seek-pause-resume',()=>page.evaluate(async()=>{const a=player.seek(6),b=player.pause(),c=player.play();return Promise.allSettled([a,b,c]);})],
 ];
 for(const [name,operation] of scenarios){
  const settled=await operation();await page.waitForTimeout(800);
  const state=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,time:player.state.currentTime,audio:player.diagnostics.backend?.mpvAudio,errors}));
  console.log(name,JSON.stringify({settled: settled.map(x=>x.status),plan:state.plan,time:state.time,error:state.audio?.errorMs,underruns:state.audio?.preEofUnderruns,errors:state.errors}));
  assert.ok(settled.every(x=>x.status==='fulfilled'),name+' operation rejected');
  assert.equal(state.plan,'native-video-mpv-audio');assert.equal(state.audio?.preEofUnderruns,0);assert.deepEqual(state.errors,[]);
 }
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);assert.equal(page.workers().length,0);
}finally{await browser.close();await server.close();}
