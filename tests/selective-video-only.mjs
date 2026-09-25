// SPDX-License-Identifier: Apache-2.0
// Exercises the production packet-copy remuxer with an unsupported audio stream omitted.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try {
  const page=await browser.newPage();
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(()=>{
    const input=document.createElement('input');input.type='file';input.id='selective-source';document.body.append(input);
    window.selectiveVideo=document.createElement('video');selectiveVideo.muted=true;selectiveVideo.playsInline=true;document.body.append(selectiveVideo);
    window.selectiveErrors=[];selectiveVideo.addEventListener('error',()=>selectiveErrors.push(String(selectiveVideo.error?.message)));
  });
  for(const [fixture,width] of [
    ['results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv',1920],
    ['results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-dts.mkv',1920],
    ['results/unsupported-audio-cpu/20260924-hevc-qualified/fixtures/hevc-main10-1080p30-ac3.mkv',1920],
  ]){
  await page.locator('#selective-source').setInputFiles(fixture);
  const result=await page.evaluate(async()=>{
    const {RemuxPlayer}=await import('/web/native-remux-player.js');
    const remux=new RemuxPlayer(selectiveVideo,{mseOwner:'window'});
    try {
      await remux.open({file:document.querySelector('#selective-source').files[0],audioOnly:false,videoOnly:true});
      await remux.play();
      const wait=async predicate=>{const until=performance.now()+5000;while(performance.now()<until){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Video-only output timed out');};
      await wait(()=>selectiveVideo.currentTime>1&&selectiveVideo.getVideoPlaybackQuality().totalVideoFrames>10);
      const state={mime:remux.mime,tracks:remux.tracks,frames:selectiveVideo.getVideoPlaybackQuality().totalVideoFrames,errors:selectiveErrors.slice(),videoWidth:selectiveVideo.videoWidth};
      await remux.seek(8);
      await wait(()=>selectiveVideo.currentTime>=8);
      state.seekTime=selectiveVideo.currentTime;
      return state;
    } finally {await remux.destroy();}
  });
  assert.match(result.mime,/^video\/mp4;/);
  assert.equal(result.tracks.filter(t=>t.type==='audio'&&t.selected).length,0);
  assert.equal(result.tracks.filter(t=>t.type==='video'&&t.selected).length,1);
  assert.ok(result.frames>10&&result.videoWidth===width&&result.seekTime>=8);
  assert.deepEqual(result.errors,[]);
  console.log(JSON.stringify({fixture,passed:true,...result}));
  }
} finally {await browser.close();await server.close();}
