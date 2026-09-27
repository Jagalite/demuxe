// SPDX-License-Identifier: Apache-2.0
// Matched local-file watchdog comparison. Build and freeze assets before running.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {CpuBrowserBlocks,collectCpuWindow,summarizeCpu,benchmarkPolicy} from './head-to-head/benchmark-browser.mjs';
const root=process.env.WATCHDOG_PERF_ROOT??'build/watchdog-performance-20260927';
const out=`results/watchdogs/performance-${Date.now()}`;await mkdir(out,{recursive:true});
const fixture=root+'/repeated-example.mp4';
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
async function manifest(dir,prefix=''){
 const entries={};for(const item of await readdir(dir,{withFileTypes:true})){
  const key=prefix+item.name;if(item.isDirectory())Object.assign(entries,await manifest(dir+'/'+item.name,key+'/'));else entries[key]=await hash(dir+'/'+item.name);
 }return entries;
}
const results={policy:benchmarkPolicy,fixture:{path:fixture,sha256:await hash(fixture),derivation:'ffmpeg -stream_loop 4 -i fixtures/example.mp4 -c copy (60 s packet-copy repetition)'},assets:{before:await manifest(root+'/before'),after:await manifest(root+'/after')},correctness:[],arms:[],notes:['One shared Chrome block; fresh contexts per arm; correlated repeats, no idle subtraction.','before is the pre-review watchdog implementation; after is this review. Not a historical no-watchdog baseline.']};
const servers={before:await serve({assetRoot:root+'/before'}),after:await serve({assetRoot:root+'/after'})};
const save=()=>writeFile(out+'/result.json',JSON.stringify(results,null,2));
async function open(browser,{variant,mode,enabled}){
 const context=await browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});const page=await context.newPage();
 await page.goto(servers[variant].origin+'/experiment/page.html');
 await page.evaluate(async({mode,enabled})=>{
  const original=setInterval,clear=clearInterval;window.timerRecords=new Map();
  window.setInterval=(fn,ms,...args)=>{
   if(ms!==250&&ms!==500)return original(fn,ms,...args);
   const record={ms,calls:0};const id=original(()=>{if(window.player?.monitor===id)record.calls++;fn(...args);},ms);timerRecords.set(id,record);return id;
  };
  window.clearInterval=id=>clear(id);
  const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode,watchdogs:enabled});
  window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));
  const input=document.createElement('input');input.id='file';input.type='file';document.body.append(input);
 },{mode,enabled});
 await page.locator('#file').setInputFiles(fixture);await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
 return {context,page};
}
const snapshot=page=>page.evaluate(()=>({state:player.state,mode:player.mode,plan:player.diagnostics.plan.id,errors:errors.map(e=>({code:e.code,message:e.message})),monitor:player.monitor!==undefined,timerCalls:[...timerRecords.values()].reduce((sum,r)=>sum+r.calls,0),frames:player.surface instanceof HTMLVideoElement?player.surface .getVideoPlaybackQuality().totalVideoFrames-player.surface.getVideoPlaybackQuality().droppedVideoFrames:player.diagnostics.backend.rendered}));
const cleanup=async(context,page)=>{await page.evaluate(()=>player.destroy());await page.waitForFunction(()=>player.destroyed);const end=Date.now()+5000;while(page.workers().length&&Date.now()<end)await page.waitForTimeout(50);assert.equal(page.workers().length,0);await context.close();};
const configs=['native','hybrid'].flatMap(mode=>[{variant:'after',mode,enabled:true},{variant:'after',mode,enabled:false},{variant:'before',mode,enabled:true}]);
const blocks=new CpuBrowserBlocks({launchOptions:{headless:true},progress:{phase:(name,seconds)=>console.log('PHASE',name,seconds??'')}});
try{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{for(const config of configs){const result={...config};results.correctness.push(result);const {context,page}=await open(browser,config);
  try{
   await page.evaluate(()=>player.play());await page.waitForTimeout(1600);const a=await snapshot(page);await page.waitForTimeout(1500);const b=await snapshot(page);assert.ok(b.state.currentTime-a.state.currentTime>.7);assert.equal(b.mode,config.mode);assert.equal(b.errors.length,0);
   await page.evaluate(()=>player.pause());const paused=await snapshot(page);await page.waitForTimeout(500);assert.ok(Math.abs((await snapshot(page)).state.currentTime-paused.state.currentTime)<.15);
   await page.evaluate(async()=>{await player.seek(5);await player.play();});await page.waitForTimeout(1500);assert.ok((await snapshot(page)).state.currentTime>5.5);
   await page.evaluate(async()=>{await player.seek(player.state.duration-.5);await player.play();});await page.waitForFunction(()=>player.state.status==='ended',null,{timeout:10000});assert.equal((await snapshot(page)).errors.length,0);
   result.passed=true;result.route=b.plan;await cleanup(context,page);console.log('CORRECT',config);
  }catch(error){result.error=String(error.stack);await context.close();throw error;}finally{await save();}
 }}finally{await browser.close();}
 for(let round=0;round<3;round++)for(const mode of ['native','hybrid'])for(const state of ['playing','paused']){
  const order=state==='playing'?[{variant:'after',enabled:true},{variant:'after',enabled:false}]:[{variant:'before',enabled:true},{variant:'after',enabled:true}];if(round%2)order.reverse();
  for(const item of order){const config={...item,mode,state,round};console.log('ARM',config);const arm={...config};results.arms.push(arm);
   const {browser,armIndex}=await blocks.acquire('watchdogs');arm.armIndex=armIndex;const {context,page}=await open(browser,config);
   try{
    await page.evaluate(()=>player.play());await page.waitForTimeout(1800);await page.evaluate(async()=>{await player.pause();await player.seek(3);await player.play();});await page.waitForTimeout(5000);
    if(state==='paused'){await page.evaluate(()=>player.pause());await page.waitForTimeout(2000);}
    const cdp=await browser.newBrowserCDPSession();arm.start=await snapshot(page);
    arm.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>({position:player.state.currentTime,status:player.state.status,error:player.state.error})));arm.cpu=summarizeCpu(arm.samples);arm.end=await snapshot(page);await cdp.detach();
    assert.ok(arm.cpu.processIdsStable,'process turnover');assert.equal(arm.end.mode,mode);assert.equal(arm.start.plan,arm.end.plan);assert.equal(arm.end.errors.length,0);assert.equal(arm.end.state.error,null);
    const delta=arm.end.state.currentTime-arm.start.state.currentTime;assert.ok(state==='playing'?delta>18&&delta<22:Math.abs(delta)<.15,'position advancement '+delta);
    if(state==='playing')assert.ok(arm.end.frames-arm.start.frames>450,'frame advancement');
    arm.accepted=true;console.log('CPU',arm.cpu.oneCorePercent,'timer calls',arm.end.timerCalls-arm.start.timerCalls);await cleanup(context,page);
   }catch(error){arm.accepted=false;arm.error=String(error.stack);await context.close();console.log('REJECT',arm.error);process.exitCode=1;}finally{results.blocks=blocks.records;await save();}
  }
 }
}catch(error){results.error=String(error.stack);process.exitCode=1;console.error(error);}finally{await blocks.close();results.blocks=blocks.records;await save();for(const server of Object.values(servers))await server.close();console.log('REPORT',out);}
