// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-sync/eof-${Date.now()}`);await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(path.resolve('build/selective-audio-sync'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
await page.evaluate(()=>poc.start('C'));await page.evaluate(()=>poc.seek(26));await page.waitForFunction(()=>poc.snapshot().ended,{timeout:12000});
await page.waitForTimeout(1200);const state=await page.evaluate(()=>poc.snapshot());
const replaySeek=await page.evaluate(()=>poc.seek(4));
await page.evaluate(()=>poc.resume());await page.waitForTimeout(1500);
const replay=await page.evaluate(()=>poc.snapshot());
await fs.writeFile(path.join(out,'result.json'),JSON.stringify({state,replaySeek,replay},null,2));
console.log(JSON.stringify({ended:state.ended,epoch:state.clock.nativeEpoch,ack:state.clock.ackEpoch,
  pre:state.preEofUnderruns,post:state.postEofDrainCallbacks,audioState:state.audioOutput.state,
  replay:replay.position,replayErrorMs:replay.clock.errorMs,replayUnderruns:replay.preEofUnderruns,
  errors:[...state.errors,...replay.errors]}));
await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close()}
