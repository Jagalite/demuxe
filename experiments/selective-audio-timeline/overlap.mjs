// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-timeline/overlap-${Date.now()}`);await fs.mkdir(out,{recursive:true});const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const f of ['poc.mjs','poc.html'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(path.resolve('build/selective-audio-timeline/assets'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});const result={phases:[]};
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);await page.evaluate(()=>poc.start('C'));await page.waitForTimeout(2000);
for(const [label,action] of [['seek-during-rate','seek'],['pause-during-rate','pause']]){
 const outcomes=await page.evaluate(async action=>{const rate=poc.rate(action==='seek'?1.75:1).then(()=>({ok:true}),e=>({error:e.name,message:e.message}));await new Promise(r=>setTimeout(r,50));await poc[action](...(action==='seek'?[4]:[]));return await rate;},action);
 if(action==='pause'){await page.waitForTimeout(1500);await page.evaluate(()=>poc.resume());}
 await page.waitForTimeout(2000);const state=await page.evaluate(()=>poc.snapshot());result.phases.push({label,outcomes,state});console.log(label,{outcomes,time:state.position,error:state.clock.errorMs,rate:state.clock.videoRate,errors:state.errors});}
await page.evaluate(()=>poc.pause());await page.evaluate(()=>poc.rate(1.5));await page.waitForTimeout(1000);await page.evaluate(()=>poc.resume());await page.waitForTimeout(2500);
const state=await page.evaluate(()=>poc.snapshot());result.phases.push({label:'paused-rate-resume',state});console.log('paused-rate-resume',{error:state.clock.errorMs,rate:state.clock.videoRate,errors:state.errors});
result.samples=await page.evaluate(()=>poc.samples());await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close();}
