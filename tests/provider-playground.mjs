// SPDX-License-Identifier: Apache-2.0
// Exercise the regular UI against the explicitly installed local deployment.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const deployment=JSON.parse(await readFile('build/provider-demo/latest.json','utf8'));
const family=process.env.BROWSER??'chrome';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0',DEMUXE_RUNTIME_ROOT:deployment.runtime},stdio:['ignore','pipe','inherit']});
const fixtureDir=await mkdtemp('fixtures/provider-playground-');
execFileSync('ffmpeg',['-v','error','-i','fixtures/example.mp4','-map','0:v:0','-map','0:a:0','-c','copy',fixtureDir+'/copy.mkv']);
let browser;
const result={family,deployment,cases:[],passed:false};
try {
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup deadline')),15000);server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});});
 browser=await (family==='firefox'?firefox:chromium).launch({headless:true,timeout:30000,...(family==='firefox'?{}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});
 result.browser=browser.version();
 const page=await browser.newPage();const errors=[],requests=[],failed=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto(origin);await page.waitForFunction(()=>!!window.player);
 assert.equal(await page.locator('#viewer').getAttribute('prepare'),null);
 assert.ok(!requests.some(p=>p.endsWith('.wasm')),'Idle playground loaded an engine');
 await page.locator('#viewer').locator('#open-menu').click();await page.locator('#demo').click();await page.waitForFunction(()=>window.player.state.currentTime>0.5,null,{timeout:20000});
 const sample=await page.evaluate(async()=>{
   const p=window.player,c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.drawImage(p.surface,0,0,160,90);
   return {plan:p.diagnostics.plan?.id,time:p.state.currentTime,nonblack:ctx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60),errors:window.playerErrors};
 });
 assert.equal(sample.plan,'native-direct');assert.equal(sample.nonblack,true);assert.deepEqual(sample.errors,[]);
 assert.ok(requests.some(p=>p.endsWith('demuxe-providers.json')),'UI bypassed provider deployment');assert.ok(!requests.some(p=>p.endsWith('.wasm')),'Native example loaded optional engine');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 result.cases.push({id:'normal-playground-example',...sample,requests});
 await mkdir('results/media-components/local-playground',{recursive:true});await page.screenshot({path:`results/media-components/local-playground/${family}.png`});
 for(const mode of ['native','software']){
  const media=await page.evaluate(async({mode,fixtureDir})=>{
   await window.player.setMode(mode);
   if(mode==='native')await document.querySelector('#viewer').open(new File([await(await fetch('/'+fixtureDir+'/copy.mkv')).blob()],'copy.mkv'));
   await window.player.play();
   const deadline=performance.now()+20000;while(window.player.state.currentTime<0.5&&performance.now()<deadline)await new Promise(r=>setTimeout(r,50));
   const p=window.player,c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');ctx.drawImage(p.surface,0,0,160,90);
   return {plan:p.diagnostics.plan?.id,time:p.state.currentTime,nonblack:ctx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60),errors:window.playerErrors};
  },{mode,fixtureDir});
  if(mode==='native')assert.ok(['native-direct','native-remux'].includes(media.plan));else assert.equal(media.plan,'software');assert.ok(media.time>=0.5);assert.equal(media.nonblack,true);assert.deepEqual(media.errors,[]);
  result.cases.push({id:'normal-playground-'+mode,...media});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await page.evaluate(()=>window.player.destroy());result.passed=true;
} finally {
 if(browser)result.cleanup=await closeTestBrowser(browser,family);
 server.kill('SIGTERM');await rm(fixtureDir,{recursive:true,force:true});
 await mkdir('results/media-components/local-playground',{recursive:true});await writeFile(`results/media-components/local-playground/${family}.json`,JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({family,passed:result.passed,cases:result.cases.map(c=>c.id)}));
