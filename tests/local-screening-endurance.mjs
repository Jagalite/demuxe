// SPDX-License-Identifier: Apache-2.0
// One bounded local survivor profile: explicit Native remux, one worker variant.
import {chromium} from 'playwright';import {spawn} from 'node:child_process';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const out=process.env.RESULT_ROOT||`results/local-screening/runs/endurance-${Date.now()}`;await mkdir(out,{recursive:true});
const path=process.env.REMUX_WORKER;assert.ok(path,'Explicit research worker required');const worker=await readFile(path);const sha=b=>createHash('sha256').update(b).digest('hex');
const cycles=Number(process.env.CYCLES||100),soakSeconds=Number(process.env.SOAK_SECONDS||1800);assert.ok(Number.isInteger(cycles)&&cycles>0&&soakSeconds>=0);
const result={worker:path,workerSHA256:sha(worker),fixtureSHA256:sha(await readFile('build/optimization-fixtures/gain.mp4')),cycles:[],samples:[],requestedCycles:cycles,requestedSoakSeconds:soakSeconds,passed:false};
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),10000);app.once('error',reject);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();const page=await browser.newPage();page.setDefaultTimeout(20000);
 await page.route('**/native-remux-worker.js',async r=>r.fulfill({response:await r.fetch(),body:worker}));await page.goto(origin+'/examples/custom-controls.html');
 await page.evaluate(async()=>{await player.destroy();window.API=await import('/web/generated/index.js');const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);window.make=async()=>{window.errors=[];window.player=new API.Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalBufferedNativeSeeks:true});player.addEventListener('error',e=>errors.push(e.detail));await player.open(document.querySelector('#file').files[0]);await player.play();};});await page.locator('#file').setInputFiles('build/optimization-fixtures/gain.mp4');
 for(let i=0;i<cycles;i++){
  await page.evaluate(()=>make());await page.waitForFunction(()=>player.state.currentTime>.1);await page.evaluate(()=>player.seek(6));
  const row=await page.evaluate(()=>({position:player.state.currentTime,plan:player.diagnostics.plan.id,errors,stats:player.current.backend.remux.remuxStats}));assert.equal(row.plan,'native-remux');assert.ok(Math.abs(row.position-6)<.3);assert.deepEqual(row.errors,[]);assert.ok(row.stats.reusedOwnedBatches>0);
  await page.evaluate(()=>player.destroy());await page.waitForTimeout(50);assert.equal(page.workers().length,0);result.cycles.push({cycle:i,position:row.position,reusedOwnedBatches:row.stats.reusedOwnedBatches});
  if(i%10===9){await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log('cycles',i+1);}
 }
 await page.evaluate(()=>make());const start=Date.now();let restarts=0,previous;
 while(Date.now()-start<soakSeconds*1000){
  await page.waitForTimeout(3000);
  const sample=await page.evaluate(()=>{const r=player.current.backend.remux;return {time:player.state.currentTime,ended:player.surface.ended,frames:player.surface.getVideoPlaybackQuality().totalVideoFrames,errors,queue:r.stats.peakQueueDepth,bufferedBytes:r.stats.bufferedBytesUpperBound,heapBytes:r.remuxStats.heapBytes,generatedBytes:r.remuxStats.generatedBytes,reusedOwnedBatches:r.remuxStats.reusedOwnedBatches};});
  sample.elapsedSeconds=(Date.now()-start)/1000;sample.workers=page.workers().length;assert.deepEqual(sample.errors,[]);assert.ok(sample.queue<=1);assert.ok(sample.bufferedBytes<=20*1024*1024);assert.ok(sample.heapBytes<=128*1024*1024);assert.ok(sample.workers<=2);assert.ok(sample.frames>0);
  if(previous&&!sample.ended&&sample.time>=previous.time)assert.ok(sample.frames>previous.frames,'Video stopped advancing');
  result.samples.push(sample);previous=sample;
  if(sample.ended){await page.evaluate(async()=>{await player.seek(0);await player.play();});restarts++;previous=undefined;}
  if(result.samples.length%10===0){await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log('soak seconds',Math.round(sample.elapsedSeconds));}
 }
 result.soakSeconds=(Date.now()-start)/1000;result.restarts=restarts;await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.passed=true;
}catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close();app.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(result.passed?'PASS':result.error);}
