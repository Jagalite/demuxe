// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const baseline=process.env.BASELINE??'build/production-main-baseline',out=`results/production-pipeline/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const fixtures={mp4:'results/full-completion/r59/two-front.mp4',fmp4:'results/production-pipeline-fixtures/canonical_rate.mp4',remux:'build/remux-jspi-fixtures-v1/avc-aac-24s.ts'};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),baseline:execFileSync('git',['-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),sharedRemuxWasmSHA256:createHash('sha256').update(await readFile('web/engine-remux/remux.wasm')).digest('hex'),note:'Same current pthread artifact used for both source revisions; no clean historical engine rebuild or release claim. MP4 local acquisition is included. Timings are descriptive paired samples, not additive component savings.',measurements:[]};
try{
 for(let pair=0;pair<3;pair++)for(const variant of pair%2?['optimized','main']:['main','optimized']){
  const server=await serve({isolated:true,assetRoot:variant==='main'?baseline:'.',mediaPaths:fixtures});
  try{for(const workload of ['mp4','fmp4','remux'])for(const load of [0,35]){
   const page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const before=await cdp.send('Performance.getMetrics');
   const row=await page.evaluate(async({url,local,load})=>{
    const start=performance.now();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});
    const contention=load?setInterval(()=>{const end=performance.now()+load;while(performance.now()<end){}},50):null;
    try{
     if(local)await player.open(new File([await(await fetch(url)).arrayBuffer()],'movie.mp4'));else await player.openRemote({url});const startupMs=performance.now()-start;
     await player.play();await new Promise(r=>setTimeout(r,500));await player.pause();const seekStart=performance.now();await player.seek(1);const seekMs=performance.now()-seekStart;
     const canvas=document.createElement('canvas');canvas.width=player.surface.videoWidth;canvas.height=player.surface.videoHeight;const context=canvas.getContext('2d');context.drawImage(player.surface,0,0);const bytes=context.getImageData(0,0,canvas.width,canvas.height).data;
     const pixels=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
     const diagnostics=player.diagnostics;const cleanup=performance.now();await player.destroy();return {startupMs,seekMs,cleanupMs:performance.now()-cleanup,pixels,diagnostics};
    }finally{clearInterval(contention);await player.destroy();}
   },{url:server.origin+`/media/${workload}?delay=${load?40:0}`,local:workload==='mp4',load});
   const after=await cdp.send('Performance.getMetrics'),metric=(m,n)=>m.metrics.find(v=>v.name===n)?.value??0;row.mainTaskSeconds=metric(after,'TaskDuration')-metric(before,'TaskDuration');
   const deadline=Date.now()+1500;while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(25);assert.equal(page.workers().length,0);await page.close();
   if(variant==='optimized'){if(workload==='mp4')assert.ok(row.diagnostics.backend.projection);else assert.equal(row.diagnostics.backend.remux.mseOwner,'worker');}
   const other=result.measurements.find(v=>v.workload===workload&&v.load===load);if(other)assert.equal(row.pixels,other.pixels,`seek pixels differ: ${workload}`);
   result.measurements.push({pair,variant,workload,load,...row});console.log('PASS',pair,variant,workload,load);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
  }}finally{await server.close();}
 }
}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out);}
