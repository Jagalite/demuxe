// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=process.env.OUT??`results/jspi-asyncify/private-mpv-player-${Date.now()}`;
await mkdir(out,{recursive:true});
const fixtures=process.env.FIXTURES;
if(!fixtures)throw Error('Set FIXTURES to the component-bound mpv fixture directory');
const audio=process.env.AUDIO==='1';
const report={cases:[]};let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 for(const runtime of (process.env.RUNTIME?[process.env.RUNTIME]:['jspi','asyncify'])){
  const server=await serve({isolated:false,mediaPaths:{movie:audio?(process.env.AUDIO_FIXTURE??fixtures+'/pcm.mkv'):fixtures+'/m0.mkv'}}),page=await browser.newPage();page.setDefaultTimeout(20000);
  const row={runtime};report.cases.push(row);
  page.on('pageerror',e=>console.log('pageerror',String(e)));
  try{
   await page.goto(server.origin+'/experiment/page.html');
   row.open=await page.evaluate(async({runtime,url,audio})=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{remuxRuntime:runtime,...(audio?{audioPlayback:'worklet',nativeRemux:'always'}:{})});
    try{await player.openRemote({url});await player.play();return {diagnostics:player.diagnostics};}catch(e){return {error:{code:e.code,message:e.message},diagnostics:player.diagnostics};}
   },{runtime,audio,url:server.origin+'/media/movie'});
   assert.equal(row.open.error,undefined,JSON.stringify(row.open));
   await page.waitForFunction(()=>player.state.currentTime>.7);
   row.playing=await page.evaluate(()=>player.diagnostics);
   assert.ok(row.playing.backend[audio?'mpvAudio':'mpvSubtitles']);
   assert.equal(row.playing.backend[audio?'mpvAudio':'mpvSubtitles'].privateRuntime.runtime,runtime);
   await page.evaluate(async()=>{await player.pause();await player.seek(2);await player.play();});
   await page.waitForFunction(()=>player.state.currentTime>2.3);
   await page.evaluate(()=>player.destroy());await new Promise(r=>setTimeout(r,200));assert.equal(page.workers().length,0);row.passed=true;
  }catch(e){row.passed=false;row.failure=String(e.stack??e);console.log(row.failure);}
  finally{await page.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
 }
}finally{await browser?.close();}
report.passed=report.cases.every(c=>c.passed);await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(out);if(!report.passed)process.exitCode=1;
