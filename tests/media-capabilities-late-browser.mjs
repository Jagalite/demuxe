// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={};
try{
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  window.queryCompletions=[];
  Object.defineProperty(navigator.mediaCapabilities,'decodingInfo',{value:config=>new Promise(resolve=>queryCompletions.push(()=>resolve({supported:true,smooth:true,powerEfficient:false}))),configurable:true});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));
  window.reconsiderations=0;const schedule=player.schedulePromotion.bind(player);player.schedulePromotion=()=>{reconsiderations++;schedule();};
  const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);
 });
 await page.locator('#file').setInputFiles('fixtures/example.mp4');
 await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
 const snapshot=()=>page.evaluate(()=>({plan:player.diagnostics.plan.id,evidence:player.diagnostics.planAdmission.find(p=>p.id===player.diagnostics.plan.id)?.browserCapability?.decodingInfo,reconsiderations}));
 result.before=await snapshot();assert.equal(result.before.plan,'native-direct');assert.ok(result.before.evidence.queries.length);assert.ok(result.before.evidence.queries.every(q=>q.status==='timeout'));
 await page.evaluate(()=>{for(const complete of queryCompletions)complete();});
 await page.waitForFunction(()=>player.diagnostics.planAdmission.find(p=>p.id===player.diagnostics.plan.id)?.browserCapability?.decodingInfo?.queries.every(q=>q.status==='answered'&&q.late));
 result.after=await snapshot();assert.equal(result.after.plan,result.before.plan);assert.ok(result.after.reconsiderations>result.before.reconsiderations);
 await page.evaluate(()=>player.play());result.position=await page.evaluate(()=>player.state.currentTime);await page.evaluate(()=>player.destroy());
 result.passed=true;
}finally{await browser.close();await server.close();await mkdir('results/browser-media-capability',{recursive:true});await writeFile('results/browser-media-capability/late-answer.json',JSON.stringify(result,null,2)+'\n');}
console.log('PASS late capability answers update diagnostics and schedule reconsideration after bounded startup');
