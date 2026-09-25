// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const root=path.resolve('build/selective-audio-sync');const out=path.resolve(process.env.OUT??`results/selective-audio-sync/control-${Date.now()}`);
await fs.mkdir(out,{recursive:true});const harness=path.join(out,'harness');await fs.mkdir(harness,{recursive:true});
for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(root,harness,path.join(out,'requests.jsonl'));
const result={createdAt:new Date().toISOString(),phases:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{result.browser=browser.version();const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
page.on('pageerror',e=>result.errors.push('page: '+String(e)));
await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
await page.evaluate(()=>poc.start('C'));
async function phase(name,act,ms){if(act)await page.evaluate(({method,arg})=>poc[method](...arg),act);
 await page.waitForTimeout(ms);const state=await page.evaluate(()=>poc.snapshot());
 result.phases.push({name,at:new Date().toISOString(),state});
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));
 console.log(name,JSON.stringify({videoTime:state.position,mpvTime:state.mpv.position,errorMs:state.clock?.errorMs,
  underruns:state.audioOutput.underruns,videoFrames:state.video.total,dropped:state.video.dropped,
  corrections:state.corrections.length,errors:state.errors}));}
await phase('startup+normal',null,3500);
await phase('pause',{method:'pause',arg:[]},1200);
await phase('resume',{method:'resume',arg:[]},2200);
await phase('forward seek 18s',{method:'seek',arg:[18]},2500);
await phase('backward seek 4s',{method:'seek',arg:[4]},2500);
await phase('rate 1.5x',{method:'rate',arg:[1.5]},4500);
await phase('rate 1x',{method:'rate',arg:[1]},1500);
await phase('seek near EOF',{method:'seek',arg:[26]},5000);
result.samples=await page.evaluate(()=>poc.samples());
result.final=await page.evaluate(()=>poc.snapshot());
await page.evaluate(()=>poc.stop());
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));
}finally{await browser.close();await server.close()}
