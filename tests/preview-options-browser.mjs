// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await(process.env.BROWSER==='firefox'?firefox:chromium).launch({headless:true,...(process.env.BROWSER==='firefox'?{}:{channel:'chrome'})});
 const page=await browser.newPage();await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{
  await document.querySelector('demuxe-player').destroy();
  window.element=document.createElement('demuxe-player');element.controls=true;element.previewThumbnails=false;
  element.previewOptions={pregenerate:{timestamps:[1,3,5],count:1}};document.body.append(element);
  window.p=await element.ready;window.file=new File([await(await fetch('/fixtures/example.mp4')).blob()],'preview.mp4');await p.open(file);
 });
 await page.waitForFunction(()=>p.preview.diagnostics.cacheEntries===1);
 const warm=await page.evaluate(async()=>({frame:(await p.preview.getFrame({time:1,width:240,height:135}))?.cache,hidden:element.shadowRoot.querySelector('#thumbnail-preview').hidden,checked:element.shadowRoot.querySelector('#preview-toggle').checked,time:p.state.currentTime}));
 assert.deepEqual(warm,{frame:'hit',hidden:true,checked:false,time:0});
 await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>p.preview.diagnostics.cacheEntries),1);
 await page.evaluate(()=>{element.shadowRoot.querySelector('#settings-toggle').click();});
 const root=page.locator('demuxe-player').last();await root.locator('#preview-toggle').check();await root.locator('#settings-close').click();
 await root.locator('#timeline').scrollIntoViewIfNeeded();
 const box=await root.locator('#timeline').boundingBox();await page.mouse.move(box.x+box.width/6,box.y+box.height/2);await root.locator('#thumbnail-preview').waitFor({state:'visible'});
 await page.evaluate(()=>{element.previewThumbnails=false;});await root.locator('#thumbnail-preview').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>p.preview.enabled),true);
 const disabled=await page.evaluate(async()=>{
  p.preview.enabled=false;await p.preview.drain();await p.open(file);
  const off=await p.preview.getFrame({time:1});const count=p.preview.diagnostics.cacheEntries;p.preview.enabled=true;
  return {off,count};
 });assert.deepEqual(disabled,{off:null,count:0});
 await page.waitForFunction(()=>p.preview.diagnostics.cacheEntries===1);
 await page.evaluate(async()=>{await element.destroy();window.element=document.createElement('demuxe-player');element.previewOptions=false;document.body.append(element);window.p=await element.ready;await p.open(file);});
 assert.deepEqual(await page.evaluate(async()=>({enabled:p.preview.enabled,frame:await p.preview.getFrame({time:1})})),{enabled:false,frame:null});
 await page.evaluate(()=>element.destroy());
 // Constructor interval mode warms every half minute, truncated by finite duration.
 const interval=await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js');const host=document.createElement('div');document.body.append(host);
  window.intervalPlayer=new Player(host,{preview:{pregenerate:{every:.025,unit:'minutes'}}});await intervalPlayer.open(file);return intervalPlayer.state.duration;
 });
 await page.waitForFunction(()=>intervalPlayer.preview.diagnostics.cacheEntries>=4);
 const intervalCache=await page.evaluate(async()=>{const cache=(await intervalPlayer.preview.getFrame({time:3,width:240,height:135}))?.cache;await intervalPlayer.destroy();return cache;});
 assert.equal(intervalCache,'hit');console.log(JSON.stringify({browser:browser.version(),timestampList:true,count:1,blankCount:'all',intervalDuration:interval,intervalCache,uiToggle:true,apiToggle:true}));
}finally{await browser?.close();server.kill();}
