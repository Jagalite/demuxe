// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-poc/seek-${Date.now()}`);await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(path.resolve('build/selective-audio-poc/assets'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
const states=[];await page.evaluate(()=>poc.start('C'));
for(const [name,action,delay] of [['initial',null,1000],['forward',18,1800],['backward',4,1800]]){
 if(action!==null)await page.evaluate(t=>poc.seek(t),action);await page.waitForTimeout(delay);
 const state=await page.evaluate(()=>poc.snapshot());states.push({name,state});console.log(name,JSON.stringify({time:state.position,frame:state.video.frame,errorMs:state.clock.errorMs,underruns:state.audioOutput.underruns,errors:state.errors}));}
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(states,null,2));await page.evaluate(()=>poc.stop());
}finally{await browser.close();await server.close()}
