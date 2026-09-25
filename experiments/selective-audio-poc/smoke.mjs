// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';
const root=path.resolve('build/selective-audio-poc/assets');
const out=path.resolve('results/selective-audio-poc/smoke');await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness,{recursive:true});
for(const [src,name] of [['poc.html','poc.html'],['poc.mjs','poc.mjs']])
 await fs.copyFile(path.join(import.meta.dirname,src),path.join(harness,name));
const server=await serve(root,harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('pageerror',String(e)));
page.on('console',m=>{if(m.type()==='error')console.log('console',m.text())});
await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
const state=await page.evaluate(()=>poc.start('C'));console.log('START',JSON.stringify(state).slice(0,5000));
await page.waitForTimeout(5000);const after=await page.evaluate(()=>poc.snapshot());
await fs.writeFile(path.join(out,'snapshot.json'),JSON.stringify({start:state,after},null,2));
console.log('AFTER',JSON.stringify({route:after.route,position:after.position,video:after.video,mpv:after.mpv,worker:after.worker,audioOutput:after.audioOutput,clock:after.clock,errors:after.errors}).slice(0,6000));
await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close()}
