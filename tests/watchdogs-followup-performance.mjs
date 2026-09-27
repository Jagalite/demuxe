// SPDX-License-Identifier: Apache-2.0
// Direct callback timing and within-session Hybrid watchdog CPU isolation.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,settleBrowser} from './head-to-head/benchmark-browser.mjs';
const root=process.env.WATCHDOG_PERF_ROOT??'build/watchdog-performance-20260927';
const evidence=process.env.WATCHDOG_PERF_REPORT;
if(!evidence)throw Error('Set WATCHDOG_PERF_REPORT to the completed matching CPU/correctness result.json');
const prior=JSON.parse(await readFile(evidence,'utf8'));assert.equal(prior.correctness.filter(c=>c.passed).length,6);
const fixture=root+'/repeated-example.mp4',hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(await readFile(fixture)),prior.fixture.sha256);
for(const [path,digest] of Object.entries(prior.assets.after))assert.equal(hash(await readFile(root+'/after/'+path)),digest,path);
const out=`results/watchdogs/callback-cost-${Date.now()}`;await mkdir(out,{recursive:true});
const server=await serve({assetRoot:root+'/after'});
const {browser,identity}=await launchBenchmarkChrome({headless:true,startupGate:true,progress:{phase:(name,seconds)=>console.log('PHASE',name,seconds)}});
const results={browser:browser.version(),evidence,identity,kind:'Main-thread callback wall-time plus within-session Hybrid CPU switch isolation; callback times exclude worker/GPU/wake-up cost',cases:[],hybrid:[]};
try{const idleContext=await browser.newContext(),idlePage=await idleContext.newPage();results.idle=await settleBrowser(browser,idlePage);await idleContext.close();for(const mode of ['native','hybrid']){
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async mode=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode});const input=document.createElement('input');input.id='file';input.type='file';document.body.append(input);},mode);
  await page.locator('#file').setInputFiles(fixture);await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));await page.evaluate(()=>player.play());await page.waitForTimeout(5000);
  await page.evaluate(()=>{
   player.stopWatchdogs();window.callbackCosts=[];const original=window.setInterval;
   window.setInterval=(fn,ms,...args)=>{if(ms!==250&&ms!==500)return original(fn,ms,...args);const id=original(()=>{const start=performance.now();try{fn(...args);}finally{if(player.monitor===id)callbackCosts.push(performance.now()-start);}},ms);return id;};
   player.startWatchdogs();window.costStart=performance.now();
  });
  await page.waitForTimeout(20000);
  const result=await page.evaluate(()=>({samples:callbackCosts,wallMs:performance.now()-costStart,state:player.state,mode:player.mode,plan:player.diagnostics.plan.id}));
  assert.equal(result.state.error,null);assert.equal(result.mode,mode);assert.ok(result.samples.length>=35);
  result.totalMs=result.samples.reduce((a,b)=>a+b,0);result.averageMs=result.totalMs/result.samples.length;result.maxMs=Math.max(...result.samples);results.cases.push(result);console.log(mode,result.samples.length,result.totalMs,result.maxMs);
  if(mode==='hybrid'){
   const policies=[{name:'all on',policy:true},{name:'all off',policy:false},{name:'health timer off',policy:{hybridDecoder:false}},{name:'decoder output off',policy:{decoderOutput:false}}];
   const cdp=await browser.newBrowserCDPSession();
   for(let round=0;round<2;round++)for(const item of round?[...policies].reverse():policies){
    console.log('ARM',round,item.name);const arm={round,...item};results.hybrid.push(arm);
    await page.evaluate(async policy=>{await player.pause();player.setWatchdogs(policy);await player.seek(3);await player.play();},item.policy);await page.waitForTimeout(5000);
    await page.waitForFunction(expected=>player.diagnostics.backend.decoderStats.outputWatchdogEnabled===expected,item.policy!==false&&item.policy.decoderOutput!==false);
    arm.start=await page.evaluate(()=>{callbackCosts=[];return {time:player.state.currentTime,frames:player.diagnostics.backend.rendered,plan:player.diagnostics.plan.id};});
    arm.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>({time:player.state.currentTime,error:player.state.error})));
    arm.cpu=summarizeCpu(arm.samples);arm.end=await page.evaluate(()=>({time:player.state.currentTime,frames:player.diagnostics.backend.rendered,plan:player.diagnostics.plan.id,error:player.state.error,callbackCosts,watchdogs:player.watchdogs,decoder:player.diagnostics.backend.decoderStats.outputWatchdogEnabled}));
    assert.equal(arm.end.error,null);assert.equal(arm.start.plan,arm.end.plan);assert.ok(arm.end.time-arm.start.time>18);assert.ok(arm.end.frames-arm.start.frames>450);assert.ok(arm.cpu.processIdsStable);
    arm.accepted=true;console.log('CPU',arm.cpu.oneCorePercent);await writeFile(out+'/result.json',JSON.stringify(results,null,2));
   }await cdp.detach();
  }
  await page.evaluate(()=>player.destroy());
 }finally{await context.close();}
}}finally{await browser.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(out);}
