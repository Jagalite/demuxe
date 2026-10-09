// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit,testBrowserRuntime} from './browser-test-runtime.mjs';
import {spawn} from 'node:child_process';
import {deadline} from './api-stability/live-check-helpers.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=`results/player-menu-review/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const report={checks:[],testBrowserRuntime,passed:false};
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
 for(const [name,type] of [['chrome',chromium],['firefox',firefox],['webkit',webkit]]){
  if(process.env.BROWSER&&process.env.BROWSER!==name)continue;
  const browser=await type.launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
  try{for(const mode of ['desktop','mobile']){
   const page=await browser.newPage({viewport:{width:mode==='mobile'?390:1280,height:844}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e.stack||e)));
   await page.addInitScript(()=>{window.menuMediaEvents=[];for(const name of ['loadeddata','seeked','error','ended','playing','pause'])document.addEventListener(name,event=>{if(event.target instanceof HTMLVideoElement)menuMediaEvents.push({name,time:event.target.currentTime,duration:event.target.duration,readyState:event.target.readyState});},true);});
   const row={family:name,browser:browser.version(),mode,phase:'open',passed:false,browserEvents:[]};for(const event of ['crash','close'])page.on(event,()=>row.browserEvents.push({event,time:Date.now()}));report.checks.push(row);await save();
   const v=page.locator('demuxe-player'),stats=v.locator('#diagnostics-overlay');
   const openSource=async()=>{if(mode==='mobile'){await v.locator('#settings-toggle').click();await v.locator('#settings-source').click();}else await v.locator('#open-menu').click();};
   const openDiagnostics=async()=>{if(mode==='mobile'){await v.locator('#settings-toggle').click();await v.locator('#settings-diagnostics').click();}else await v.locator('#diagnostics-toggle').click();};
   try{
    await page.goto(origin);await page.waitForFunction(()=>window.player);
    assert.equal(await v.locator('#open-menu').isVisible(),mode==='desktop');
    assert.equal(await v.locator('#diagnostics-toggle').isVisible(),mode==='desktop');
    await openSource();assert.ok(await v.locator('#source-options').isVisible());assert.ok(await v.locator('#subtitleFile').isVisible());
    assert.equal(await v.locator('#settings').evaluate(el=>el.matches(':modal')),mode==='mobile');
    if(mode==='mobile')await page.keyboard.press('Escape');
    await v.locator('#settings-toggle').click();assert.ok(await v.locator('#playback-options').isVisible());assert.equal(await v.locator('#open-menu').getAttribute('aria-expanded'),'false');
    if(mode==='mobile')await v.locator('#settings-source').click();else await v.locator('#open-menu').click();
    assert.ok(await v.locator('#source-options').isVisible());await page.keyboard.press('Escape');
    assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement?.id),mode==='mobile'?'settings-toggle':'open-menu');
    row.phase='load';await save();await openSource();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);
    // Pin playback so End tests scrolling independently of the media clock.
    await page.evaluate(async()=>{await player.pause();await player.seek(0);});
    await page.setViewportSize({width:mode==='mobile'?390:1280,height:390});
    row.phase='diagnostics';await save();await openDiagnostics();await stats.waitFor({state:'visible'});assert.equal(await stats.getAttribute('role'),'region');
    // Native may report few fields; constrain the real panel to exercise overflow in both presentations.
    await stats.evaluate(el=>el.style.maxHeight='64px');
    await page.waitForFunction(()=>{const el=document.querySelector('demuxe-player').shadowRoot.getElementById('diagnostics-overlay');return el.scrollHeight>el.clientHeight;});
    await stats.hover();await page.mouse.wheel(0,500);await page.waitForFunction(()=>document.querySelector('demuxe-player').shadowRoot.getElementById('diagnostics-overlay').scrollTop>0);
    await stats.focus();await page.keyboard.press('End');assert.equal(await page.evaluate(()=>player.state.currentTime),0);assert.ok(await stats.isVisible());
    await page.keyboard.press('Escape');await stats.waitFor({state:'hidden'});assert.equal(await v.locator('#diagnostics-toggle').getAttribute('aria-pressed'),'false');
    assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement?.id),mode==='mobile'?'settings-toggle':'diagnostics-toggle','Escape restores focus to a visible diagnostics entry point');
    row.phase='controls cleanup';await save();await openDiagnostics();await openSource();await v.evaluate(el=>el.controls=false);
    await stats.waitFor({state:'hidden'});await v.locator('#settings').waitFor({state:'hidden'});assert.equal(await v.locator('#diagnostics-toggle').getAttribute('aria-pressed'),'false');assert.equal(await v.locator('#open-menu').getAttribute('aria-expanded'),'false');assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement?.id),'stage');
    await v.evaluate(el=>el.controls=true);await openSource();assert.ok(await v.locator('#source-options').isVisible());assert.deepEqual(errors,[]);
    row.passed=true;console.log(`PASS ${name} ${mode}: menu entry points, switching, Escape focus, controls cleanup, scrollable diagnostics`);
   }catch(error){row.error=String(error.stack);row.snapshot=await deadline(v.evaluate(el=>{const s=el.shadowRoot,d=s.getElementById('diagnostics-overlay');return {state:el.player?.state,video:[...s.querySelectorAll('video')].map(video=>({time:video.currentTime,duration:video.duration,readyState:video.readyState,networkState:video.networkState,paused:video.paused,error:video.error?.code})),mediaEvents:window.menuMediaEvents,focus:s.activeElement?.id,diagnostics:{text:d.textContent,height:d.clientHeight,scroll:d.scrollHeight},controls:el.controls};}),2000).catch(error=>({error:String(error)}));await save();throw error;}
   finally{let timer;try{await Promise.race([v.evaluate(el=>el.destroy()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Player cleanup deadline exceeded')),15000);})]);}catch(error){row.cleanupError=String(error.stack);row.passed=false;throw error;}finally{clearTimeout(timer);await page.close();await save();}}
  }}finally{await browser.close();}
 }
 assert.ok(report.checks.length>0,'At least one browser must be qualified');report.passed=report.checks.every(row=>row.passed);
}finally{server.kill();await save();console.log(out);}
