// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-sync/rate-${Date.now()}`);await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(path.resolve('build/selective-audio-sync'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
await page.evaluate(()=>poc.start('C'));
for(const [label,method,arg,ms] of [['normal',null,null,3000],['rate1.5','rate',1.5,5000],['rate1','rate',1,2200]]){
 if(method)await page.evaluate(({method,arg})=>poc[method](arg),{method,arg});await page.waitForTimeout(ms);
 const state=await page.evaluate(()=>poc.snapshot());results.push({label,state});console.log(label,JSON.stringify({time:state.position,errorMs:state.clock.errorMs,
   corrections:state.corrections.length,underruns:state.audioOutput.underruns,dropped:state.video.dropped}));}
 const samples=await page.evaluate(()=>poc.samples());await fs.writeFile(path.join(out,'result.json'),JSON.stringify({results,samples},null,2));
 await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close()}
