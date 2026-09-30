// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',server=spawn(process.execPath,['scripts/serve-component-lab.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
const result={family,cases:[],passed:false};
try{
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});server.stdout.on('data',d=>{const m=String(d).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});result.browser=browser.version();
 for(const [codec,deployment]of [['copy','combined'],['ac3','common'],['ac3','missing']]){
  const page=await browser.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);
  await page.evaluate(()=>{const audio=new AudioContext(),source=audio.createMediaElementSource(document.querySelector('video')),analyser=audio.createAnalyser();source.connect(analyser);analyser.connect(audio.destination);window.proof={audio,source,analyser};});
  await page.selectOption('#codec',codec);await page.selectOption('#deployment',deployment);await page.click('#run');await page.evaluate(()=>window.proof.audio.resume());
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,null,{timeout:20000});
  const status=await page.locator('#status').textContent();
  if(deployment==='missing'){assert.match(status,/DEPLOYMENT_UNAVAILABLE/);assert.ok(!requests.some(p=>p.endsWith('.wasm')));}
  else{
   assert.equal(JSON.parse(status).decision.bindingId,codec==='copy'?'typescript':'common');
   const sample=await page.evaluate(async()=>{
    const video=document.querySelector('video'),{audio,source,analyser}=window.proof;await audio.resume();
    const values=new Float32Array(analyser.fftSize),end=performance.now()+500;let peak=0;
    while(performance.now()<end){analyser.getFloatTimeDomainData(values);for(const n of values)peak=Math.max(peak,Math.abs(n));await new Promise(r=>setTimeout(r,20));}
    const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.drawImage(video,0,0,160,90);const nonblack=ctx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60);source.disconnect();await audio.close();return {peak,nonblack,time:video.currentTime};
   });console.log(codec,deployment,sample);assert.ok(sample.peak>0.001&&sample.nonblack&&sample.time>0.4,JSON.stringify(sample));result.cases.push({codec,deployment,...sample});
   if(codec==='copy')assert.ok(!requests.some(p=>p.endsWith('.wasm')));else assert.equal(requests.filter(p=>p.endsWith('.wasm')).length,1);
  }
  await page.evaluate(()=>window.proof.audio.state==='closed'?undefined:window.proof.audio.close());await page.click('#stop');assert.equal(await page.locator('video').getAttribute('src'),null);assert.deepEqual(errors,[]);await page.close();
 }
 result.passed=true;
}finally{if(browser)result.cleanup=await closeTestBrowser(browser,family);server.kill();await mkdir('results/media-components/component-lab',{recursive:true});await writeFile('results/media-components/component-lab/'+family+'.json',JSON.stringify(result,null,2)+'\n');}
