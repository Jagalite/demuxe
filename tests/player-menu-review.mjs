import {chromium,firefox,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
 for(const [name,type] of [['chrome',chromium],['firefox',firefox],['webkit',webkit]]){
  const browser=await type.launch({headless:true,...(name==='chrome'?{channel:'chrome'}:{})});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(origin);await page.waitForFunction(()=>window.player);const v=page.locator('webmpv-player');
   await v.locator('#open-menu').click();assert.ok(await v.locator('#source-options').isVisible());assert.ok(await v.locator('#subtitleFile').isVisible());
   await v.locator('#settings-toggle').click();assert.ok(await v.locator('#playback-options').isVisible());assert.equal(await v.locator('#open-menu').getAttribute('aria-expanded'),'false');
   await v.locator('#open-menu').click();assert.ok(await v.locator('#source-options').isVisible());await page.keyboard.press('Escape');assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'open-menu');
   await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);
   await v.locator('#diagnostics-toggle').click();const stats=v.locator('#diagnostics-overlay');await stats.waitFor({state:'visible'});await page.waitForTimeout(300);assert.equal(await stats.getAttribute('role'),'region');
   const sizes=await stats.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));assert.ok(sizes.scroll>sizes.height);
   await stats.hover();await page.mouse.wheel(0,500);await page.waitForFunction(()=>document.querySelector('webmpv-player').shadowRoot.getElementById('diagnostics-overlay').scrollTop>0);
   await stats.focus();await page.keyboard.press('End');assert.equal(await page.evaluate(()=>player.state.currentTime),0);assert.ok(await stats.isVisible());
   await page.keyboard.press('Escape');await stats.waitFor({state:'hidden'});assert.equal(await v.locator('#diagnostics-toggle').getAttribute('aria-pressed'),'false');
   await v.locator('#diagnostics-toggle').click();await v.locator('#open-menu').click();await v.evaluate(el=>el.controls=false);
   await stats.waitFor({state:'hidden'});await v.locator('#settings').waitFor({state:'hidden'});assert.equal(await v.locator('#diagnostics-toggle').getAttribute('aria-pressed'),'false');assert.equal(await v.locator('#open-menu').getAttribute('aria-expanded'),'false');assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');
   await v.evaluate(el=>el.controls=true);await v.locator('#open-menu').click();assert.ok(await v.locator('#source-options').isVisible());assert.deepEqual(errors,[]);await v.evaluate(el=>el.destroy());
   console.log(`PASS ${name}: explicit menu triggers, menu switching, controls cleanup, scrollable diagnostics`);
  }finally{await browser.close();}
 }
}finally{server.kill();}
