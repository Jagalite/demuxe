// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/worker-mse-review/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),baseline:!!process.env.REVIEW_BASELINE,cases:[]};
try{for(const isolated of [true]){
 const server=await serve({isolated,mediaPaths:{ts:'build/remux-fixtures-v1/avc-aac.ts'}});
 try{
  const page=await browser.newPage();
  if(process.env.REVIEW_BASELINE)for(const file of ['worker-remux-controller.js','native-mse-worker.js'])await page.route('**/'+file,r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','78385fc:web/'+file],{encoding:'utf8'})}));
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const video=document.createElement('video');document.body.append(video);window.owner=new RemuxPlayer(video);await owner.open({options:{url}});await owner.play();},server.origin+'/media/ts');
  await page.waitForFunction(()=>owner.video.currentTime>1.2);
  const mse=page.workers().find(w=>w.url().endsWith('/native-mse-worker.js'));
  await mse.evaluate(async()=>{const {RemuxPlayer}=await import('./native-remux-player.js');const restart=RemuxPlayer.prototype.restart;RemuxPlayer.prototype.restart=async function(...args){const result=await restart.apply(this,args);self.held=true;await new Promise(r=>self.resumeRecovery=r);return result;};});
  const producer=page.workers().find(w=>w.url().endsWith('/native-remux-worker.js'));
  await producer.evaluate(()=>setTimeout(()=>{throw Error('Injected producer failure while playing');},0));
  const deadline=Date.now()+10000;while(Date.now()<deadline&&!await mse.evaluate(()=>self.held))await page.waitForTimeout(20);
  assert.ok(await mse.evaluate(()=>self.held),'recovery must reach its resume barrier');
  await page.evaluate(()=>owner.pause());await mse.evaluate(()=>self.resumeRecovery());
  await page.waitForFunction(()=>owner.snapshot().stats.recoveries.at(-1)?.restored);
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>owner.video.paused),true,'recovery overrode user pause');
  // Explicit later play must remain functional after suppressing recovery play.
  await page.evaluate(()=>owner.play());assert.equal(await page.evaluate(()=>owner.video.paused),false);
  await page.evaluate(()=>owner.destroy());const stopped=Date.now()+1500;while(page.workers().length&&Date.now()<stopped)await page.waitForTimeout(20);const retired=page.workers(),remaining=await Promise.all(retired.map(async w=>({url:w.url(),probe:await Promise.race([w.evaluate(()=>({alive:true})).catch(e=>({error:String(e)})),new Promise(r=>setTimeout(()=>r({timeout:true}),1000))])})));const cdp=await browser.newBrowserCDPSession(),targets=await cdp.send('Target.getTargets');await cdp.detach();assert.equal(retired.length,0,JSON.stringify({remaining,targets:targets.targetInfos.filter(t=>t.type==='worker')}));assert.equal(targets.targetInfos.filter(t=>t.type==='worker'&&t.url.startsWith(server.origin+'/')).length,0,'Chrome retained a live worker target');
  await page.close();result.cases.push({isolated,passed:true,retirementProbe:remaining,name:'pause during producer recovery remains paused; explicit play and destroy still work'});
 }finally{await server.close();}
}}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out);}
