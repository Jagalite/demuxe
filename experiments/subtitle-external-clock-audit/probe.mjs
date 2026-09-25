// SPDX-License-Identifier: Apache-2.0
// Browser check of the shipped route plus isolated non-render update.
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {serve} from '../pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-external-clock-audit');
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report=[];
try {
 for(const format of ['srt','ass']) {
  const page=await browser.newPage();
  try {
   await page.route('**/web/engine-subtitles/service.mjs',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(root+'/engine/service.mjs')}));
   await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service.wasm')}));
   await page.route('**/web/mpv-subtitle-worker.js',async route=>{
    const response=await route.fetch(),source=await response.text();
    const marker="}else if(d.type==='render'){";
    if(!source.includes(marker))throw Error('Worker patch target drift');
    await route.fulfill({response,body:source.replace(marker,`}else if(d.type==='probeUpdate'){
      const rendersBefore=engine.HEAP32[(engine._web_subtitle_ptr()>>>2)+6];
      engine._subtitle_service_block(0);
      let ready=0;for(let i=0;i<400&&!ready;i++){ready=engine._subtitle_probe_update(d.seconds);if(ready<0)ready=0;if(!ready)await delay(5);}
      engine._subtitle_service_block(1);
      const rendersAfter=engine.HEAP32[(engine._web_subtitle_ptr()>>>2)+6];
      const hasTimes=engine._subtitle_probe_times(d.seconds,textPointer);
      const view=new DataView(engine.HEAPU8.buffer);
      const times=hasTimes>0?[view.getFloat64(textPointer,true),view.getFloat64(textPointer+8,true)]:null;
      const n=engine._subtitle_service_text(textPointer,4096);
      postMessage({id:d.id,ready,rendersBefore,rendersAfter,times,text:n>0?new TextDecoder().decode(new Uint8Array(engine.HEAPU8.subarray(textPointer,textPointer+n))):''});return;
    }else if(d.type==='render'){`)});
   });
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(`build/head-to-head/assets-component-isolation-01/fixtures/h264-${format}/index.mkv`);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.currentTime>1.2);
   const sample=async label=>({label,...await page.evaluate(async()=>{const s=player.current.backend.mpvSubs,canvas=s.canvas;const text=await s.currentText();const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])alpha++;return {time:player.state.currentTime,videoTime:player.current.backend.video.currentTime,paused:player.current.backend.video.paused,rate:player.current.backend.video.playbackRate,text,alpha,position:s.stats.position,avChains:s.service.avChains};})});
   const states=[await sample('play')];
   await page.evaluate(()=>player.pause());states.push(await sample('pause'));
   await page.waitForTimeout(250);states.push(await sample('paused-stable'));
   await page.evaluate(()=>player.play());await page.waitForTimeout(300);states.push(await sample('resume'));
   await page.evaluate(()=>player.rate(1.75));await page.waitForTimeout(300);states.push(await sample('rate-1.75'));
   await page.evaluate(()=>player.pause());await page.evaluate(()=>player.seek(3));states.push(await sample('seek-3'));
   const nonRender=await page.evaluate(async()=>{const s=player.current.backend.mpvSubs;s.suspend(true);try {await s.request('seek',{seconds:35.9});const outside=await s.request('probeUpdate',{seconds:35.9});await s.request('seek',{seconds:1});const inside=await s.request('probeUpdate',{seconds:1});return {outside,inside};}finally{s.suspend(false);}});
   report.push({format,plan:await page.evaluate(()=>player.diagnostics.plan?.id),states,nonRender});
   assert.equal(report.at(-1).plan,'native-direct-mpv');
   for(const state of states){assert.equal(state.avChains,0);assert.ok(state.alpha>0,`${format} ${state.label} blank overlay`);assert.ok(Math.abs(state.position-state.videoTime)<.12,`${format} ${state.label} clock mismatch`);}
   assert.equal(states[4].rate,1.75);
   assert.ok(Math.abs(states[2].videoTime-states[1].videoTime)<.02);
   assert.ok(Math.abs(states[5].videoTime-3)<.02);
   for(const point of [nonRender.outside,nonRender.inside]){assert.equal(point.ready,1);assert.equal(point.rendersAfter,point.rendersBefore);}
   assert.ok(nonRender.inside.times?.[0]>=.4&&nonRender.inside.times?.[0]<1);
   await page.evaluate(()=>player.destroy());
   console.log(format,JSON.stringify(report.at(-1)));
  }finally{await page.close();}
 }
}finally{await mkdir(root,{recursive:true});await writeFile(root+'/probe.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
