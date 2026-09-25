// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-poc/eof-${Date.now()}`);await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(path.resolve('build/selective-audio-poc/assets'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
await page.evaluate(()=>poc.start('C'));await page.evaluate(()=>poc.seek(26));await page.waitForFunction(()=>poc.snapshot().ended,{timeout:12000});
await page.waitForTimeout(1200);const state=await page.evaluate(()=>poc.snapshot());
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(state,null,2));
console.log(JSON.stringify({ended:state.ended,clock:state.clock,audioOutput:state.audioOutput,mpv:state.mpv,errors:state.errors}));
await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close()}
