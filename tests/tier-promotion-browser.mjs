// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 let page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.Player=Player;window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
 await page.locator('#file').setInputFiles('build/mpv-subtitle-service/fixtures/rejected-bframes.mkv');
 await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
 assert.notEqual(await page.evaluate(()=>player.mode),'native');
 await page.evaluate(()=>player.subtitleVisible(false));await page.waitForFunction(()=>player.mode==='native');
 const session=await page.evaluate(()=>{window.backend=player.current;return player.diagnostics.plan.id;});
 assert.ok(['native-direct','native-remux'].includes(session));
 await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>backend===player.current),true);
 await page.evaluate(()=>player.subtitleVisible(true));assert.notEqual(await page.evaluate(()=>player.mode),'native');
 await page.evaluate(()=>player.selectSubtitleTrack(null));await page.waitForFunction(()=>player.mode==='native');
 await page.evaluate(()=>player.selectSubtitleTrack('auto'));assert.notEqual(await page.evaluate(()=>player.mode),'native');
 await page.evaluate(()=>player.setMode(player.mode));await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(400);assert.notEqual(await page.evaluate(()=>player.mode),'native');
 await page.evaluate(()=>player.setAutomaticSelection(true));assert.equal(await page.evaluate(()=>player.mode),'native');
 await page.evaluate(()=>player.destroy());
 console.log('PASS paused promotion, no-op, required caption return, manual pin');
 // Explicit overlapping preparation: old playback must progress while Native is delayed.
 await page.close();page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.Player=Player;const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
 await page.locator('#file').setInputFiles('build/mpv-subtitle-service/fixtures/rejected-bframes.mkv');
 await page.evaluate(async()=>{window.player=new Player(document.querySelector('#surface'),{experimentalBackgroundPromotion:{maxKnownBytes:512*1024*1024}});await player.open(document.querySelector('#file').files[0]);await player.play();window.previous=player.current;window.startedAt=player.state.currentTime;});
 await page.route('**/native-player.js',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
 await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(500);
 const during=await page.evaluate(()=>({same:previous===player.current,position:Number(previous.backend.properties.get('time-pos')),start:startedAt}));assert.equal(during.same,true);assert.ok(during.position>during.start+.15);
 await page.waitForFunction(()=>player.mode==='native',{},{timeout:30000});
 assert.ok(await page.evaluate(()=>player.state.currentTime>=startedAt));
 const before=await page.evaluate(()=>player.state.currentTime);await page.evaluate(()=>player.prepare(['software']));assert.equal(await page.evaluate(()=>player.mode),'native');assert.ok(await page.evaluate(()=>player.state.currentTime)>=before);
 await page.evaluate(()=>player.destroy());console.log('PASS overlapping preparation, advancing old clock, latest-time handoff, in-play warming');
 // Nested remux allocations must reject an overlapping candidate and clear switching.
 await page.close();page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{experimentalBackgroundPromotion:{maxKnownBytes:256*1024*1024}});const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
 await page.locator('#file').setInputFiles('build/mpv-subtitle-service/fixtures/rejected-bframes.mkv');
 await page.evaluate(async()=>{
  await player.open(document.querySelector('#file').files[0]);await player.play();window.previous=player.current;
  const backend=previous.backend;window.originalDiagnostics=Object.getOwnPropertyDescriptor(backend,'diagnostics');let diagnostics=backend.diagnostics;
  // Exercise the Native remux diagnostic shape without another decoder allocation.
  Object.defineProperty(backend,'diagnostics',{configurable:true,get(){return {...diagnostics,heapBytes:0,remux:{remux:{heapBytes:128*1024*1024}}};},set(value){diagnostics=value;}});
  window.budgetRejections=0;player.addEventListener('modechange',event=>{if(event.detail.phase==='failed'&&event.detail.message.includes('known-allocation budget'))budgetRejections++;});
  await player.subtitleVisible(false);
 });
 await page.waitForFunction(()=>budgetRejections>0);
 await page.waitForFunction(()=>!player.activeOperation);
 assert.equal(await page.evaluate(()=>player.diagnostics.switching),false);
 assert.equal(await page.evaluate(()=>previous===player.current),true);
 const afterRejection=await page.evaluate(()=>player.state.currentTime);
 await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>player.state.currentTime)>afterRejection);
 await page.evaluate(async()=>{if(originalDiagnostics)Object.defineProperty(previous.backend,'diagnostics',originalDiagnostics);else delete previous.backend.diagnostics;await player.pause();});
 await page.waitForFunction(()=>player.mode==='native');
 await page.evaluate(()=>player.destroy());console.log('PASS nested remux budget rejection, switching cleanup, continued playback and subsequent promotion');
 // A user seek cancels optional preparation before it can commit.
 await page.close();page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{experimentalBackgroundPromotion:{maxKnownBytes:512*1024*1024}});const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
 await page.locator('#file').setInputFiles('build/mpv-subtitle-service/fixtures/rejected-bframes.mkv');
 await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.play();window.previous=player.current;});
 await page.route('**/native-player.js',async route=>{await new Promise(r=>setTimeout(r,1800));await route.continue();});
 await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(350);await page.evaluate(()=>player.seek(5));
 await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>previous===player.current),true);assert.equal(await page.evaluate(()=>player.state.subtitlesVisible),false);
 await page.unroute('**/native-player.js');
 // Compatibility failures must retain both the accepted session and changed setting.
 await page.evaluate(async()=>{const {NativePlayer}=await import('/web/generated/internal/native-player.js');const {PlayerError}=await import('/web/generated/internal/errors.js');window.failures=0;NativePlayer.prototype.open=async function(){failures++;throw new PlayerError('UNSUPPORTED_MEDIA','Injected compatibility rejection');};});
 await page.evaluate(()=>player.pause());await page.waitForTimeout(800);
 assert.equal(await page.evaluate(()=>previous===player.current),true);assert.equal(await page.evaluate(()=>player.state.subtitlesVisible),false);
 const failures=await page.evaluate(()=>window.failures);assert.ok(failures>0);
 await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.failures),failures);
 await page.evaluate(()=>player.destroy());console.log('PASS seek preemption, optional rollback, setting preservation, configuration backoff');
 await page.close();page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{videoFilters:'hflip'});await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4'));await player.setVideoFilters('');});
 await page.waitForFunction(()=>player.mode==='native');await page.evaluate(()=>player.destroy());console.log('PASS filter removal inspects an initially uninspected source and promotes');
}finally{await browser.close();await server.close();}
