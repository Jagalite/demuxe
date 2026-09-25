// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const fixture='results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv';
try{
 for(const fault of ['missing-assets','preparation','audio-startup','runtime-audio','sync-controller','subtitle-ass','subtitle-pgs','eac3-unqualified'].filter(value=>!process.env.CASE||process.env.CASE===value)){
  const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(70000);
  try{
   if(fault==='missing-assets')await page.route('**/web/engine-selective/**',route=>route.request().method()==='HEAD'?route.fulfill({status:404,body:''}):route.continue());
   if(fault==='audio-startup')await page.route('**/web/engine-selective/player.mjs',route=>route.request().method()==='GET'?route.fulfill({status:404,body:''}):route.continue());
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async fault=>{
    if(fault==='preparation'){
      const add=MediaSource.prototype.addSourceBuffer;
      MediaSource.prototype.addSourceBuffer=function(mime){if(mime.startsWith('video/mp4;'))throw new DOMException('Injected selective video preparation failure','NotSupportedError');return add.call(this,mime);};
    }
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540});
    window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail)));
    const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
   },fault);
   await page.locator('#source').setInputFiles(fault==='subtitle-ass'?'build/selective-production/h264-ac3-ass.mkv':fault==='subtitle-pgs'?'build/selective-production/h264-ac3-pgs.mkv':fault==='eac3-unqualified'?'results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-eac3.mkv':fixture);
   await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.currentTime>.2,undefined,{timeout:10000});
   if(fault==='runtime-audio'){
     assert.equal(await page.evaluate(()=>player.diagnostics.plan?.id),'native-video-mpv-audio');
     await page.evaluate(()=>player.current.backend.mpvAudio.fail(Error('Injected selective audio failure')));
     await page.waitForFunction(()=>player.diagnostics.plan?.id==='hybrid',undefined,{timeout:20000});
     await page.waitForTimeout(250);
   }
   if(fault==='sync-controller'){
     assert.equal(await page.evaluate(()=>player.diagnostics.plan?.id),'native-video-mpv-audio');
     await page.evaluate(()=>{player.current.backend.mpvAudio.estimatedAudioPresentationTime=()=>null;});
     await page.waitForFunction(()=>player.diagnostics.plan?.id==='hybrid',undefined,{timeout:20000});
     await page.waitForTimeout(250);
   }
   const state=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,attempts:player.diagnostics.selection?.attempts,runtime:player.diagnostics.runtimeCapabilities,position:player.state.currentTime,errors}));
   assert.equal(state.plan,'hybrid',JSON.stringify(state));
   assert.ok(state.position>.2,JSON.stringify(state));
   console.log(fault,JSON.stringify({plan:state.plan,position:state.position,attempts:state.attempts?.filter(a=>a.reason.includes('native-video-mpv-audio')),runtimeFailure:fault==='runtime-audio'?state.runtime:undefined}));
   await page.evaluate(()=>player.destroy());
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
