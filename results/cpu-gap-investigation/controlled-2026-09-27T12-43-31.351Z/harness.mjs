// SPDX-License-Identifier: Apache-2.0
// Frozen-runtime investigation. CPU values are diagnostic until full qualification.
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,settleBrowser,collectCpuWindow,summarizeCpu} from './head-to-head/benchmark-browser.mjs';
import {validateFrameWindow} from './head-to-head/performance-metrics.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const assets=resolve('build/head-to-head/assets-auto-main-a563f345-20260927-02');
const out=`results/cpu-gap-investigation/controlled-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
const server=await serve(assets,resolve('tests/head-to-head'),out+'/requests.jsonl');
const report={assets,trials:[],hashes:{},scope:'Controlled diagnostic; original fixture retained, corrected HLS is a separate variant'};
for(const file of ['manifest.json','fixtures/pcm-ass/pcm.mkv','fixtures/captions.ass','fixtures/hls-hevc/index.m3u8','demuxe/web/generated/internal/native-ass.js'])report.hashes[file]=createHash('sha256').update(await readFile(assets+'/'+file)).digest('hex');
console.log('Waiting for Chrome hardware-key startup gate');
const {browser,identity}=await launchBenchmarkChrome({headless:false,startupGate:true});report.identity=identity;
const save=()=>writeFile(out+'/results.json',JSON.stringify(report,null,2));
try{
const idleContext=await browser.newContext();report.idle=await settleBrowser(browser,await idleContext.newPage());await idleContext.close();await save();
for(const [index,arm] of JSON.parse(process.env.ARMS??'["pcm-ass","pcm-ass","pcm-ass","hls-original","hls-corrected","hls-corrected","hls-original"]').entries()){
 console.log('START',index,arm);const trial={index,arm};report.trials.push(trial);
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1}),page=await context.newPage();
 const cdp=await browser.newBrowserCDPSession();
 try{
 if(arm.includes('hls'))await page.route('**/fixtures/hls-hevc/*',r=>r.fulfill({path:resolve(arm.endsWith('corrected')?'results/cpu-gap-investigation/corrected-hls':assets+'/fixtures/hls-hevc',new URL(r.request().url()).pathname.split('/').at(-1)),headers:{'Access-Control-Allow-Origin':'*'},contentType:r.request().url().endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp4'}));
 await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
 const config=arm==='pcm-ass'?{id:'diagnostic',player:'demuxe',lane:'auto',file:'pcm-ass/pcm.mkv',subtitleIntegration:'built-in'}:{id:'diagnostic',player:arm.startsWith('plain')?'video':'demuxe',lane:'auto',file:'hls-hevc/index.m3u8',streamFormat:'hls'};
 await page.evaluate(async c=>{window.adapter=await import('/harness/adapters.mjs');await adapter.start(c);},config);
 await page.waitForTimeout(5000);
 // No screenshots or canvas reads within CPU windows.
 trial.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>adapter.snapshot()));
 trial.cpu=summarizeCpu(trial.samples);
 try{trial.quality=validateFrameWindow(trial.samples,config);}catch(e){trial.qualityError=String(e);}
 trial.visual=await page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass');if(!c)return null;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<a.length;i+=4)if(a[i])pixels++;return {pixels,width:c.width,height:c.height,display:getComputedStyle(c).display,rect:c.getBoundingClientRect().toJSON(),visible:document.visibilityState,focus:document.hasFocus()};});
 await page.screenshot({path:out+`/${index}-${arm}.png`});
 await page.evaluate(()=>adapter.stop());for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);trial.workersAfter=page.workers().length;
 console.log(JSON.stringify({index,arm,cpu:trial.cpu.oneCorePercent,roles:trial.cpu.roles,quality:trial.quality??trial.qualityError,visual:trial.visual}));
 }catch(e){trial.error=String(e.stack);console.log(trial.error);}
 finally{await cdp.detach();await context.close();await save();}
}
}finally{await browser.close();await server.close();await save();console.log(out);}
