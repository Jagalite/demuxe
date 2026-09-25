// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const out=path.resolve(`results/selective-audio-timeline/pause-backend-${Date.now()}`);
await fs.mkdir(out,{recursive:true});const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,file),path.join(harness,file));
const server=await serve(path.resolve('build/selective-audio-timeline/assets'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  const media=await page.context().newCDPSession(page),mediaEvents=[];
  media.on('Media.playerPropertiesChanged',event=>mediaEvents.push(event));await media.send('Media.enable');
  await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
  await page.evaluate(()=>poc.start('C'));await page.waitForTimeout(2500);
  const before=await page.evaluate(()=>poc.pause());await page.waitForTimeout(8000);
  const paused=await page.evaluate(()=>poc.snapshot());
  await page.evaluate(()=>poc.resume());await page.waitForTimeout(3000);
  const resumed=await page.evaluate(()=>poc.snapshot());
  const props=mediaEvents.flatMap(e=>e.properties??[]);
  const property=name=>props.find(p=>p.name===name)?.value??null;
  const result={browser:browser.version(),before,paused,resumed,
    browserVideoDecoder:{name:property('kVideoDecoderName'),platform:property('kIsPlatformVideoDecoder')},
    samples:await page.evaluate(()=>poc.samples())};
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({decoder:result.browserVideoDecoder,
    pausedVideoAdvance:paused.position-before.position,
    pausedAudioFrames:paused.audioOutput.mediaFrames-before.audioOutput.mediaFrames,
    resumedErrorMs:resumed.clock.errorMs,
    hardSeeks:resumed.corrections.filter(c=>c.type==='user-seek'||c.type==='user-rate').length,
    preEofUnderruns:resumed.preEofUnderruns,errors:resumed.errors}));
  await page.evaluate(()=>poc.stop());
}finally{await browser.close();await server.close();}
