// SPDX-License-Identifier: Apache-2.0
// Build first, then: node tests/shared-runtime-live.mjs
// GENERATED_ROOT can select an isolated build of the intended commit.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
const output=path.resolve(process.env.LIVE_OUTPUT??'build/shared-runtime-live');
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['tests/shared-runtime-browser-server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
const report={passed:false,runs:[],pageErrors:[],qualification:'Local Chromium native playback and viewport fallback; not native fullscreen/PiP or packaged release qualification'};
try{
 const origin=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Browser fixture server startup timed out')),10000);
  server.once('error',error=>{clearTimeout(timer);reject(error);});
  server.once('exit',code=>{clearTimeout(timer);reject(Error('Browser fixture server exited: '+code));});
  server.stdout.on('data',bytes=>{const match=String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
 });
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 report.browserVersion=browser.version();report.generatedRoot=process.env.GENERATED_ROOT??path.resolve('web/generated');
 for(const [name,viewport,file,method] of [
  ['runtime',{width:1440,height:900},'shared-runtime-adversarial.browser.js','runRuntimeAdversarial'],
  ['presentation-desktop',{width:1440,height:900},'api-stability/live-presentation-adversarial.mjs','runPresentationAdversarial'],
  ['presentation-narrow',{width:390,height:844},'api-stability/live-presentation-adversarial.mjs','runPresentationAdversarial'],
 ]){
  const context=await browser.newContext({viewport}),page=await context.newPage();
  page.on('pageerror',error=>report.pageErrors.push({name,error:String(error)}));
  try{await page.goto(origin);const result=await page.evaluate(async({file,method})=>(await import('/tests/'+file))[method](),{file,method});report.runs.push({name,...result});}
  finally{await context.close();}
 }
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push({name:'trusted-keyboard',error:String(error)}));
 try{
  await page.goto(origin);
  await page.evaluate(async()=>{const {definePlayerElement}=await import('/web/generated/player/index.js');definePlayerElement();const v=document.createElement('demuxe-player');v.controls=true;v.previewOptions=false;document.body.append(v);await v.ready;await v.setMuted(true);await v.open('/fixtures/example.mp4');v.requestFullscreen=async()=>{throw new DOMException('Test denial','NotAllowedError');};});
  await page.locator('demuxe-player').locator('#fullscreen').click();
  await page.waitForFunction(()=>document.querySelector('demuxe-player').player.presentation.state.viewportExpanded);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('demuxe-player')),true,'Tab escaped the expanded player');
  await page.screenshot({path:path.join(output,'narrow-expanded.png')});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('demuxe-player').player.presentation.state.viewportExpanded);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  report.runs.push({name:'trusted-keyboard',passed:true,cases:[{name:'Trusted click enters fallback; Tab retains focus; Escape restores document',passed:true}]});
 }finally{await context.close();}
 assert.ok(report.runs.every(run=>run.passed),JSON.stringify(report.runs.flatMap(run=>run.cases.filter(c=>!c.passed)),null,2));
 assert.deepEqual(report.pageErrors,[]);report.passed=true;
 console.log('Browser scenarios passed:',report.runs.reduce((n,run)=>n+run.cases.length,0));
}finally{
 await browser?.close();server.kill();await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('Browser report:',output);
}
