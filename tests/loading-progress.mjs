// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage();await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.element=document.querySelector('demuxe-player');await element.ready;});
 const pill=page.locator('demuxe-player').first().locator('#busy');
 for(let attempt=0;attempt<2;attempt++){
  const stepLabel=attempt?'Stage':'Step';
  await page.evaluate(step=>{element.labels={step};},stepLabel);
  // Hold actual media I/O so the startup state spans rendering frames.
  // A synchronous event observer alone cannot prove the pill is displayed.
  let release;const gate=new Promise(resolve=>release=resolve);
  const route=async request=>{if(request.request().resourceType()==='media')await gate;await request.continue();};
  await page.route('**/fixtures/example.mp4?loading=*',route);
  try{
   await page.evaluate(attempt=>{
    window.stages=[];const busy=element.shadowRoot.getElementById('busy');
    window.observer=new MutationObserver(()=>{if(!busy.hidden)stages.push(busy.textContent);});
    observer.observe(busy,{subtree:true,childList:true,characterData:true,attributes:true});
    window.opening=element.player.open(location.origin+'/fixtures/example.mp4?loading='+attempt).then(()=>({ok:true}),error=>({error:String(error)}));
   },attempt);
   await page.waitForFunction(stepLabel=>{
    const busy=element.shadowRoot.getElementById('busy');
    return !busy.hidden&&busy.textContent.startsWith(stepLabel+' 2/2 · Starting Native');
   },stepLabel).catch(async error=>{error.message+='\n'+JSON.stringify(await page.evaluate(()=>({stages,opening:element.player.state.pendingOperation,status:element.player.state.status,pill:element.shadowRoot.getElementById('busy').textContent})));throw error;});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await pill.isVisible(),true);
   assert.ok((await pill.innerText()).startsWith(stepLabel+' 2/2 · Starting Native'));
   assert.equal(await page.evaluate(()=>element.player.state.pendingOperation?.kind),'opening');
   release();
   assert.deepEqual(await page.evaluate(()=>opening),{ok:true});
   assert.equal(await pill.isVisible(),false);
   const stages=await page.evaluate(()=>{observer.disconnect();return window.stages;});
   assert.ok(stages.some(text=>text.startsWith(stepLabel+' 1/2')),JSON.stringify(stages));
   assert.ok(stages.every(text=>!/^Step \d\/3/.test(text)&&!text.includes('Finishing setup')),JSON.stringify(stages));
   assert.equal(await page.evaluate(()=>element.player.state.pendingOperation),null);
   await page.evaluate(()=>element.player.close());
  }finally{release();await page.unrouteAll({behavior:'wait'});}
 }
 await page.evaluate(()=>element.destroy());
 console.log('PASS visible native startup, completion without a third step, and reset on reopen',browser.version());
}finally{await browser?.close();server.kill();}
