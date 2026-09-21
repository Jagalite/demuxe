// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/fragment-delivery/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const results={browser:browser.version(),measurements:[],scope:'Real Wasm emit boundary; no artificial fragment tail delay; full costs include Player open, playback, seeks and EOF'};
try{
 for(const isolated of [false,true]){
  const server=await serve({isolated,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac-24s.ts'}});
  try{for(let pair=0;pair<2;pair++)for(const mode of pair%2?['progressive','separate','gather']:['gather','separate','progressive']){
   const page=await browser.newPage();page.setDefaultTimeout(30000);
   await page.route('**/native-remux-player.js',async route=>{const body=await readFile('web/native-remux-player.js','utf8');await route.fulfill({contentType:'text/javascript',body:body.replace("fragmentDelivery='separate'",`fragmentDelivery='${mode}'`)});});
   await page.goto(server.origin+'/experiment/page.html');
   const row=await page.evaluate(async url=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});
    const start=performance.now();await player.openRemote({url});const startupMs=performance.now()-start;await player.play();await new Promise(r=>setTimeout(r,1200));
    const beforeSeek=player.current.backend.remux.snapshot();const began=performance.now();await player.seek(12);await new Promise(r=>setTimeout(r,200));await player.seek(22);const seeksMs=performance.now()-began;
    await new Promise((resolve,reject)=>{const end=performance.now()+12000;const check=()=>{if(player.surface.ended)resolve();else if(performance.now()>end)reject(Error('EOF timeout'));else setTimeout(check,25);};check();});
    const after=player.current.backend.remux.snapshot();await player.close();await player.openRemote({url});await player.destroy();return {startupMs,seeksMs,beforeSeek,after,totalMs:performance.now()-start};
   },server.origin+`/media/ts?id=${mode}-${pair}`);
   assert.equal(row.beforeSeek.mseOwner,'worker');assert.deepEqual(row.after.stats.errors,[]);if(mode==='progressive')assert.ok(row.beforeSeek.remux.progressiveFragments>0);if(mode==='separate')assert.ok(row.beforeSeek.remux.separateFragments>0);
   const cleanupDeadline=Date.now()+1500;while(page.workers().length&&Date.now()<cleanupDeadline)await page.waitForTimeout(25);assert.equal(page.workers().length,0);await page.close();results.measurements.push({isolated,pair,mode,...row});console.log('PASS',isolated,pair,mode);await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');
  }}finally{await server.close();}
 }
}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');console.log(out);}
