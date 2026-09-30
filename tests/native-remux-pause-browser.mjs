// SPDX-License-Identifier: Apache-2.0
import {firefox} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve();
const browser=await firefox.launch({headless:true});
const samples=[];
try{
 const page=await browser.newPage();
 // Use the current compiled application with the selected runtime assets.
 await page.route('**/web/generated/**',async route=>{
  const pathname=new URL(route.request().url()).pathname.slice(1);
  await route.fulfill({body:await readFile(`${process.env.APPLICATION_ROOT??'.'}/${pathname}`),contentType:'text/javascript'});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js');
  window.player=new Player(document.querySelector('#surface'));
  const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);
 });
 await page.locator('#file').setInputFiles(process.env.FIXTURE??'build/fixtures/playback-performance/sample-ass.mkv');
 await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.play();});
 const duration=await page.evaluate(()=>player.state.duration);
 assert.ok(Number.isFinite(duration)&&duration>4,'Pause regression requires finite media longer than four seconds');
 await page.waitForFunction(start=>player.state.currentTime>start,Math.min(15,duration/4),{timeout:60000});
 assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),'native-remux-mpv');
 await page.evaluate(()=>{window.previous=player.current;window.pausedAt=player.state.currentTime;});
 for(let cycle=0;cycle<2;cycle++){
  await page.evaluate(()=>player.pause());
  for(let i=0;i<16;i++){
   await page.waitForTimeout(250);
   const s=await page.evaluate(()=>({state:player.state,plan:player.diagnostics.plan.id,same:previous===player.current}));samples.push(s);
   assert.equal(s.state.status,'paused');assert.equal(s.state.pendingOperation,null);assert.equal(s.state.subtitlesVisible,true);assert.equal(s.same,true);assert.equal(s.plan,'native-remux-mpv');
   assert.ok(Math.abs(s.state.currentTime-(await page.evaluate(()=>pausedAt)))<.15);
  }
  assert.equal(await page.evaluate(()=>player.state.pendingOperation),null);
  await page.evaluate(()=>player.play());
  await page.waitForFunction(()=>player.state.currentTime>pausedAt+.5);
  await page.evaluate(()=>{window.pausedAt=player.state.currentTime;});
 }
 const seekTarget=Math.min(30,duration/2);
 await page.evaluate(async target=>{await player.seek(target);await player.pause();},seekTarget);await page.waitForTimeout(1000);
 assert.equal(await page.evaluate(()=>player.state.pendingOperation),null);
 assert.equal(await page.evaluate(()=>player.state.status),'paused');
 await page.evaluate(()=>player.play());await page.waitForFunction(target=>player.state.currentTime>target+.5,seekTarget);
 await page.evaluate(()=>player.destroy());
 console.log(`PASS ${browser.version()} remux-mpv pause twice, stable session, seek and resume`);
}finally{
 if(process.env.REPORT)await writeFile(process.env.REPORT,JSON.stringify({browser:browser.version(),samples},null,2));
 await browser.close();await server.close();
}
