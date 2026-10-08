// SPDX-License-Identifier: Apache-2.0
// Run after npm run build. Delayed observations must not miss a moving target.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
let server,browser;
const report={cases:[]},output=process.env.SEEK_REPORT??`results/seek-delayed-observation-${Date.now()}.json`;
try{
 let origin=process.env.SEEK_ORIGIN;
 if(!origin){
  server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
  origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test server timeout')),30000);server.once('exit',code=>{clearTimeout(timer);reject(Error(`Server exited ${code}`));});server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});});
 }
 browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],args:['--autoplay-policy=no-user-gesture-required']});
 report.browser=browser.version();report.scope='Synthetic 1000 ms readiness waits; ordinary background flags; autoplay bypass; muted';
 const page=await browser.newPage();await page.goto(origin);await page.setContent('<main id="stage"></main>');await page.bringToFront();
 report.cases=await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js'),results=[],file=new File([await(await fetch('/fixtures/example.mp4')).blob()],'example.mp4',{type:'video/mp4'});
  for(const mode of ['hybrid','software'])for(const paused of [false,true])for(const action of ['seek','range','loop']){
   const p=new Player(document.querySelector('#stage'),{mode,preview:false}),row={mode,paused,action};results.push(row);
   const timeout=window.setTimeout.bind(window);
   try{
    await p.setMuted(true);await p.open(file);await p.play();await new Promise(r=>timeout(r,500));if(paused)await p.pause();
    // Apply after startup so this regression specifically delays seek observation.
    let delayed=0;window.setTimeout=(fn,ms,...args)=>timeout(fn,ms===25?(delayed++,1000):ms,...args);
    const start=performance.now();if(action==='seek')await p.seek(4);else if(action==='range')await p.setPlaybackRange({start:4,end:8});else await p.setLoop({start:4,end:8});row.elapsed=performance.now()-start;row.delayed=delayed;row.time=p.state.currentTime;
    row.intentPaused=p.settings.pause;row.backendPaused=p.current.backend.properties.get('pause');
   }finally{window.setTimeout=timeout;await p.destroy();row.cleaned=document.querySelector('#stage').childElementCount===0;}
  }return results;
 });
 for(const row of report.cases){assert.ok(row.delayed>0);assert.ok(row.elapsed<15000);assert.ok(Math.abs(row.time-4)<.15);assert.equal(row.intentPaused,row.paused);assert.equal(row.backendPaused,row.paused);assert.equal(row.cleaned,true);}
 report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;}finally{await browser?.close();server?.kill();await mkdir(new URL('../results/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
