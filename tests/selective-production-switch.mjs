// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [fixture,tracks] of [
  ['build/selective-production/aac-ac3.mkv',[['ac3','native-video-mpv-audio'],['aac','native-direct'],['ac3','native-video-mpv-audio']]],
  ['build/selective-production/ac3-dts.mkv',[['dts','native-video-mpv-audio'],['ac3','native-video-mpv-audio']]],
 ]){
  const page=await browser.newPage({viewport:{width:960,height:540}});
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540});window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);});
   await page.locator('#source').setInputFiles(fixture);
   await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
   await page.evaluate(()=>player.play());
   let prior=await page.evaluate(()=>player.state.currentTime);
   for(const [codec,expected] of tracks){
    const available=await page.evaluate(()=>player.state.audioTracks);
    const selected=available.find(track=>track.codec?.toLowerCase().includes(codec)||track.label?.toLowerCase().includes(codec));
    assert.ok(selected,JSON.stringify(available));
    await page.evaluate(id=>player.selectAudioTrack(id),selected.id);
    await page.waitForTimeout(700);
    const state=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,time:player.state.currentTime,paused:player.state.paused,errors,selected:player.state.audioTracks.find(track=>track.selected)?.label,backend:player.diagnostics.backend?.mpvAudio,decisions:player.diagnostics.planAdmission,attempts:player.diagnostics.selection?.attempts}));
    console.log(fixture,codec,JSON.stringify({plan:state.plan,time:state.time,selected:state.selected,underruns:state.backend?.preEofUnderruns,errors:state.errors,rejection:state.decisions?.find(x=>x.id==='native-video-mpv-audio'),attempts:state.attempts}));
    assert.equal(state.plan,expected);
    assert.ok(state.time>=prior-.1,'track switch lost media position');
    assert.equal(state.backend?.preEofUnderruns??0,0);
    assert.deepEqual(state.errors,[]);
    prior=state.time;
   }
   await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);
   assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
