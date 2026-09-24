// SPDX-License-Identifier: Apache-2.0
// Public Player defaults must never opt Software playback into lossy decoding.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';

const bytes=(await readFile('build/fixtures/software-full/h264-aac.mp4')).toString('base64');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(60000);
 await page.goto(origin+'/examples/custom-controls.html');
 const diagnostics=await page.evaluate(async encoded=>{
  const {Player}=await import('/web/generated/index.js');
  window.player=new Player(document.querySelector('#surface'),{mode:'software',width:640,height:360});
  const data=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
  await player.open(new File([data],'h264-aac.mp4'));await player.play();
  return player.diagnostics;
 },bytes);
 await page.waitForFunction(()=>player.diagnostics.backend?.rendered>=20);
 const active=await page.evaluate(()=>player.diagnostics);
 assert.equal(diagnostics.decodeQuality,'exact');
 assert.equal(diagnostics.adaptiveFrameDrop,false);
 assert.equal(active.backend.decodePolicy.requested,'exact');
 assert.equal(active.backend.decodePolicy.effective,'exact');
 assert.equal(active.backend.decodePolicy.adaptiveState,'normal');
 assert.deepEqual(active.backend.decodePolicy.shortcuts,[]);
 assert.equal(active.backend.adaptiveFrameDrop,false);
 assert.deepEqual(active.backend.decodePolicy.ffmpegOptions,{max_pixels:'8294400'});
 await page.evaluate(()=>player.destroy());
 assert.equal(await page.evaluate(()=>document.querySelectorAll('iframe').length),0);
 console.log('Software default: exact, no shortcuts, adaptive frame drop off');
}finally{await browser.close();server.kill();}
