// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const ac3='results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv';
const dts='results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-dts.mkv';
try{
 for(const scenario of ['replace-after-eof','destroy-during-seek','destroy-during-rate']){
  const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(30000);
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540});
    window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));
    const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
   });
   await page.locator('#source').setInputFiles(ac3);
   await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
   assert.equal(await page.evaluate(()=>player.diagnostics.plan?.id),'native-video-mpv-audio');
   await page.evaluate(()=>player.play());
   if(scenario==='replace-after-eof'){
    await page.evaluate(()=>player.seek(26));
    await page.waitForFunction(()=>player.state.currentTime>=29.9,undefined,{timeout:10000});
    await page.waitForTimeout(500);
    await page.locator('#source').setInputFiles(dts);
    await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
    assert.equal(await page.evaluate(()=>player.diagnostics.plan?.id),'native-video-mpv-audio');
    await page.evaluate(()=>player.play());
    await page.waitForFunction(()=>player.state.currentTime>.3,undefined,{timeout:10000});
    await page.evaluate(()=>player.destroy());
   }else{
    const result=await page.evaluate(async scenario=>{
      const pending=scenario==='destroy-during-seek'?player.seek(18):player.setPlaybackRate(1.75);
      await new Promise(resolve=>setTimeout(resolve,20));
      const destruction=player.destroy();
      const settled=await Promise.allSettled([pending,destruction]);
      return settled.map(x=>({status:x.status,reason:x.status==='rejected'?String(x.reason):null}));
    },scenario);
    assert.equal(result[1].status,'fulfilled',JSON.stringify(result));
   }
   await page.waitForTimeout(250);
   const state=await page.evaluate(()=>({errors}));
   assert.equal(page.workers().length,0,scenario+' leaked workers');
   assert.ok(state.errors.every(error=>scenario!=='replace-after-eof'&&error.code==='ABORTED'&&error.message==='Player is destroyed'),scenario+' emitted unexpected errors: '+JSON.stringify(state.errors));
   console.log('PASS',scenario);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
