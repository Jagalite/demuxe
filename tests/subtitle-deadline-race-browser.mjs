// SPDX-License-Identifier: Apache-2.0
// Controlled browser regression: delay deadline delivery so pumps must recover
// the cue transition. Both arms use the same frozen runtime and media.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve} from './head-to-head/server.mjs';
import {markedImage} from './head-to-head/checks.mjs';
const assets=path.resolve(process.env.SUBTITLE_BASELINE_ASSETS??'build/head-to-head/assets-audio-auto-e974cbdf-20260926-01');
const output=path.resolve(process.env.SUBTITLE_RACE_OUTPUT??`results/subtitle-deadline-race/${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(path.dirname(output),{recursive:true});await mkdir(output);
const baseline=await readFile(path.join(assets,'demuxe/web/mpv-subtitle-worker.js'),'utf8');
const fixed=await readFile('web/mpv-subtitle-worker.js','utf8');
const fixture=JSON.parse(await readFile(path.join(assets,'fixtures/catalogue.json'),'utf8'))['h264-ac3-ass'];
const digest=text=>createHash('sha256').update(text).digest('hex');
const report={assets,assetsManifestSHA256:digest(await readFile(path.join(assets,'manifest.json'))),workerHashes:{baseline:digest(baseline),fixed:digest(fixed)},injection:'Add 2000 ms to subtitle deadline timers in both arms',runs:[]};
const server=await serve(assets,path.resolve('tests/head-to-head'),path.join(output,'requests.jsonl'));
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 for(const [arm,source] of [['baseline',baseline],['fixed',fixed]]){
  const context=await browser.newContext({viewport:{width:960,height:540}});
  const run={arm,console:[]};report.runs.push(run);
  try{
   const target='const ms=Math.max(1,Math.ceil((target-seconds)*1000/rate)+2);';
   assert.ok(source.includes(target));let intercepted=0;
   await context.route('**/mpv-subtitle-worker.js',route=>{intercepted++;return route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'},body:source.replace(target,target.replace('+2);','+2002);'))});});
   const page=await context.newPage();page.on('console',m=>run.console.push(m.text()));page.on('pageerror',e=>run.console.push(String(e)));await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
   await page.waitForFunction(()=>window.api);
   await page.evaluate(config=>api.start(config),{...fixture,player:'demuxe',lane:'auto',correctness:true});
   await page.waitForFunction(()=>api.snapshot().position>1.2,null,{timeout:15000});
   const state=await page.evaluate(()=>api.snapshot());
   const image=markedImage(await page.locator('#stage').screenshot({path:path.join(output,arm+'.png')}),state.position);
   const sub=state.diagnostics.backend.mpvSubtitles;
   assert.ok(intercepted>0);assert.equal(state.route,'native-transcode-mpv');
   assert.equal(sub.scheduler.deadlineWakes,0,'forced race must bypass deadline delivery');
   if(arm==='baseline')assert.equal(image.magentaPixels,0,'baseline must reproduce missing cue');
   else assert.ok(image.magentaPixels>150,JSON.stringify({image,sub}));
   const cleanup=await page.evaluate(()=>api.stop());
   for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);
   assert.equal(page.workers().length,0);
   Object.assign(run,{intercepted,state,image,cleanup,workersAfter:page.workers().length});
   console.log(arm,JSON.stringify({magentaPixels:image.magentaPixels,subtitle:sub}));
  }finally{await context.close();}
 }
 report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser?.close();await server.close();await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(output);}
