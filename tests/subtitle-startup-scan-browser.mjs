// SPDX-License-Identifier: Apache-2.0
// Matched worker-only startup/CPU diagnostic; OS file caches are uncontrolled.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
const files=JSON.parse(process.env.SUBTITLE_FILES??'["fixtures/m0.mkv"]');
const rounds=Number(process.env.ROUNDS??2),seconds=Number(process.env.WINDOW??6);
assert.ok(Array.isArray(files)&&files.length>0,'SUBTITLE_FILES must be a nonempty array');
assert.ok(Number.isInteger(rounds)&&rounds>0,'ROUNDS must be a positive integer');
assert.ok(Number.isInteger(seconds)&&seconds>0,'WINDOW must be a positive integer');
const out=process.env.OUT??`results/subtitle-startup/${new Date().toISOString().replaceAll(':','-')}`;
const candidate=await readFile('web/mpv-subtitle-worker.js','utf8');
const workers={candidate,...(process.env.BASELINE_WORKER?{baseline:await readFile(process.env.BASELINE_WORKER,'utf8')}:{})};
await mkdir(dirname(out),{recursive:true});await mkdir(out);
const hash=data=>createHash('sha256').update(data).digest('hex');
const report={protocol:{rounds,seconds,scope:'Fresh Chrome per trial; alternating worker order; same runtime/fixtures; hashing warms OS cache; no idle subtraction; all-process CDP CPU requires stable process membership'},files:[],workers:{},trials:[]};
for(const file of files){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);report.files.push({file,sha256:h.digest('hex')});}
for(const [arm,source]of Object.entries(workers)){report.workers[arm]=hash(source);await writeFile(`${out}/${arm}.js`,source);}
report.runtime={};
for(const path of ['web/generated/internal/native-mpv-subtitles.js','web/engine-subtitles/service.mjs','web/engine-subtitles/service.wasm'])report.runtime[path]=hash(await readFile(path));
const save=()=>writeFile(`${out}/results.json`,JSON.stringify(report,null,2));
const server=await serve();
try{for(const file of files)for(let round=0;round<rounds;round++)for(const arm of round%2?Object.keys(workers).reverse():Object.keys(workers)){
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const trial={file,round,arm,version:browser.version(),accepted:false};report.trials.push(trial);
 try{
  const page=await browser.newPage({viewport:{width:960,height:540}});trial.consoleErrors=[];
  page.on('pageerror',e=>trial.consoleErrors.push(String(e)));
  console.log('START',file,round,arm);
  await page.route('**/web/mpv-subtitle-worker.js',r=>r.fulfill({contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'},body:workers[arm]}));
  await page.goto(server.origin+'/web/player.html');await page.waitForFunction(()=>!!window.player);await page.evaluate(()=>player.preparationReady);
  await page.evaluate(async()=>{
   const {NativeMpvSubtitles}=await import('/web/generated/internal/native-mpv-subtitles.js');
   window.profileMs=[];window.openErrors=[];player.addEventListener('error',e=>openErrors.push(e.detail));const request=NativeMpvSubtitles.prototype.request;
   NativeMpvSubtitles.prototype.request=async function(type,...args){const t=performance.now();try{return await request.call(this,type,...args);}finally{if(type==='profile')profileMs.push(performance.now()-t);}};
   const open=player.open;player.open=async function(...args){const t=performance.now();try{return await open.apply(this,args);}finally{window.openMs=performance.now()-t;}};
  });
  await page.locator('#viewer #file').setInputFiles(file);
  await page.waitForFunction(()=>openErrors.length||!!player.state.sourceId&&!player.state.pendingOperation,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>openErrors),[]);
  Object.assign(trial,await page.evaluate(()=>({openMs,profileMs,route:player.diagnostics.plan.id,mode:player.current.backend.mpvSubs.stats.scheduler})));
  assert.equal(trial.route,'native-direct-mpv');await save();
  await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>1.5,null,{timeout:15000});
  const cdp=await browser.newBrowserCDPSession();trial.samples=[];
  for(let sample=0;sample<=seconds;sample++){
   trial.samples.push({wall:performance.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>({time:player.state.currentTime,route:player.diagnostics.plan.id,mode:player.current.backend.mpvSubs.stats.scheduler,service:player.current.backend.mpvSubs.service}))});
   if(sample<seconds)await page.waitForTimeout(1000);
  }
  const first=trial.samples[0],last=trial.samples.at(-1),elapsed=(last.wall-first.wall)/1000;
  assert.ok(last.state.time-first.state.time>elapsed-1);assert.equal(last.state.route,trial.route);assert.equal(last.state.service.avChains,0);
  const ids=s=>s.processes.map(p=>p.id).sort((a,b)=>a-b).join(',');
  const stableProcesses=trial.samples.every(s=>ids(s)===ids(first));
  if(stableProcesses)trial.cpu=100*last.processes.reduce((sum,p)=>sum+p.cpuTime-first.processes.find(q=>q.id===p.id).cpuTime,0)/elapsed;
  else trial.excluded='Chrome process membership changed';
  trial.io=last.state.service.io;
  trial.seeks=[];
  const duration=await page.evaluate(()=>player.state.duration);
  for(const position of [Math.min(20,duration-.5),2]){
   await page.evaluate(async position=>{await player.pause();await player.seek(position);},position);
   trial.seeks.push(await page.evaluate(async()=>{const s=player.current.backend.mpvSubs;return {time:player.state.currentTime,text:await s.currentText(),mode:s.stats.scheduler,avChains:s.service.avChains};}));
   assert.equal(trial.seeks.at(-1).avChains,0);
  }
  await page.evaluate(()=>player.destroy());
  for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);
  assert.equal(page.workers().length,0);
  assert.deepEqual(trial.consoleErrors,[]);
  const peer=report.trials.find(t=>t.file===file&&t.round===round&&t.arm!==arm&&!t.error&&t.seeks);
  if(peer)assert.deepEqual(trial.seeks.map(s=>s.text),peer.seeks.map(s=>s.text),'Seek text differs between workers');
  for(const [path,expected] of Object.entries(report.runtime))assert.equal(hash(await readFile(path)),expected,`Runtime changed: ${path}`);
  trial.accepted=stableProcesses;
  console.log(JSON.stringify({file,round,arm,openMs:trial.openMs,profileMs:trial.profileMs,mode:trial.mode,cpu:trial.cpu,ioBytes:trial.io?.fetchedBytes,accepted:trial.accepted}));
 }catch(error){trial.accepted=false;trial.excluded='Correctness or provenance check failed';delete trial.cpu;trial.error=String(error.stack);for(const peer of report.trials.filter(t=>t.file===file&&t.round===round)){peer.accepted=false;peer.excluded='Matched pair failed correctness or provenance';delete peer.cpu;}throw error;}
 finally{await save();await browser.close();}
}}finally{await server.close();await save();console.log(out);}
