// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await(process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.element=document.querySelector('demuxe-player');const p=await element.ready;await p.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'preview.mp4'));await p.seek(1);});
 const timeline=page.locator('demuxe-player').first().locator('#timeline'),panel=page.locator('demuxe-player').first().locator('#thumbnail-preview');
 const box=await timeline.boundingBox();await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await panel.waitFor({state:'visible'});
 if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT});
 assert.match(await panel.innerText(),/≈/);assert.equal(await page.evaluate(()=>element.player.surface.currentTime),1);
 await page.mouse.move(box.x,box.y-150);await panel.waitFor({state:'hidden'});
 // A late authored provider cannot make a departed hover visible.
 await page.evaluate(()=>{window.remove=element.player.preview.addProvider({id:'late',priority:0,canHandle:()=>true,getFrame:r=>new Promise(resolve=>{window.finishPreview=()=>resolve({time:0,actualTime:0,width:1,height:1,image:{blob:new Blob()},path:'late'});})});});
 await page.mouse.move(box.x+box.width*.7,box.y+box.height/2);await page.waitForFunction(()=>window.finishPreview);await page.mouse.move(box.x,box.y-150);await page.evaluate(()=>{finishPreview();remove();});await panel.waitFor({state:'hidden'});
 // Source replacement and destruction release visible preview URLs.
 await page.mouse.move(box.x+box.width*.3,box.y+box.height/2);await panel.waitFor({state:'visible'});
 await page.evaluate(()=>element.close());await panel.waitFor({state:'hidden'});assert.equal(await panel.locator('img').getAttribute('src'),null);
 await page.evaluate(()=>element.destroy());console.log('PASS scrubber display, represented-time label, playback isolation, stale cancellation, close/destroy cleanup');
}finally{await browser?.close();server.kill();}
