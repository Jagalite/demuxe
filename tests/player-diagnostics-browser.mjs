// SPDX-License-Identifier: Apache-2.0
import {firefox,chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'firefox';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
let browser;
try{
 browser=await(family==='chrome'?chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}):firefox.launch({headless:true}));
 const page=await browser.newPage();
 if(process.env.BASELINE_UI)await page.route('**/web/generated/player/index.js',async route=>route.fulfill({body:await readFile(process.env.BASELINE_UI),contentType:'text/javascript'}));
 await page.goto(origin);await page.waitForFunction(()=>window.player);
 await page.locator('demuxe-player #diagnostics-toggle').click();
 await page.evaluate(async()=>{await player.setVolume(.5);await player.setPlaybackRate(1.25);});
 await page.waitForTimeout(650);
 const idle=await page.locator('demuxe-player #diagnostics-overlay').textContent();
 assert.match(idle,/Audio[^\n]*50%/);assert.match(idle,/1.25×/);
 await page.locator('demuxe-player #diagnostics-toggle').click();
 await page.evaluate(async()=>{await player.setVolume(1);await player.setPlaybackRate(1);});
 await page.locator('demuxe-player #file').setInputFiles('fixtures/example.mp4');
 await page.waitForFunction(()=>player.state.status==='playing'&&!player.state.pendingOperation);
 await page.evaluate(()=>player.pause());
 await page.locator('demuxe-player #diagnostics-toggle').click();
 await page.evaluate(async()=>{
  const viewer=document.querySelector('demuxe-player'),toggle=viewer.shadowRoot.getElementById('diagnostics-toggle');
  // Opening the panel during a real seek displays the transient operation.
  // The final paused update must then appear without any later play request.
  player.addEventListener('seeking',()=>{toggle.click();toggle.click();window.transientDiagnostics=viewer.shadowRoot.getElementById('diagnostics-overlay').textContent;},{once:true});
  await player.seek(3);
 });
 assert.match(await page.evaluate(()=>transientDiagnostics),/paused · seeking/);
 assert.equal(await page.evaluate(()=>player.state.pendingOperation),null);
 await page.waitForTimeout(650);
 const text=await page.locator('demuxe-player #diagnostics-overlay').textContent();
 assert.match(text,/State\s+paused\n/);assert.match(text,/Time\s+0:03/);
 assert.doesNotMatch(text,/paused · seeking/);
 await page.locator('demuxe-player #diagnostics-toggle').click();
 await page.evaluate(()=>player.seek(4));await page.waitForTimeout(650);
 assert.equal(await page.locator('demuxe-player #diagnostics-overlay').isVisible(),false);
 await page.evaluate(()=>document.querySelector('demuxe-player').destroy());
 console.log(`PASS ${family}: paused diagnostics settle, correct position, hidden panel and teardown`);
}finally{await browser?.close();server.kill();}
