// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from './server.mjs';
import {decodePNG} from '../head-to-head/checks.mjs';
const rtt=Number(process.env.RTT_MS??75);assert.ok(Number.isFinite(rtt)&&rtt>=0&&rtt<=1000);
const root=process.cwd(),family=process.env.BROWSER??'chrome',stage=process.env.STAGE??'screen';
const runtimeRoot=path.resolve(process.env.BUFFERING_RUNTIME??root);
const runtimeFile=name=>name.startsWith('web/')?path.join(runtimeRoot,name):path.join(root,name);
const out=path.join(root,'results/buffering',new Date().toISOString().replaceAll(':','-')+'-'+family+'-'+stage);await fs.mkdir(out,{recursive:true});console.log(out);
const fixtures=JSON.parse(await fs.readFile('research/items/mpv-cache-browser-stream/fixtures/manifest.json')).fixtures;
const result={family,stage,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),host:execFileSync('sw_vers',{encoding:'utf8'}),rttMs:rtt,runtimeRoot,fixtureManifestSHA256:createHash('sha256').update(await fs.readFile('research/items/mpv-cache-browser-stream/fixtures/manifest.json')).digest('hex'),hashes:{},trials:[]};
for(const name of ['src/types.ts','src/unified-player.ts','src/internal/buffering.ts','src/internal/wasm-player.ts','src/internal/native-player.ts','src/internal/shaka-backend.ts','web/native-remux-player.js','web/range-reader.js','web/io-worker.js','web/native-remux-source-worker.js','web/filter-retained-engine-worker.js','web/software-full-engine-worker.js','web/generated/unified-player.js','web/generated/internal/buffering.js','web/generated/internal/wasm-player.js','web/generated/internal/native-player.js','web/generated/internal/shaka-backend.js','tests/buffering/page.mjs','tests/buffering/server.mjs','tests/buffering/run.mjs']){const data=await fs.readFile(runtimeFile(name));result.hashes[name]=createHash('sha256').update(data).digest('hex');await fs.mkdir(path.join(out,'source',path.dirname(name)),{recursive:true});await fs.writeFile(path.join(out,'source',name),data);}
for(const name of ['web/engine-hybrid/player.wasm','web/engine-hybrid/player.mjs','web/engine-software-full/player.wasm','web/engine-software-full/player.mjs'])result.hashes[name]=createHash('sha256').update(await fs.readFile(runtimeFile(name))).digest('hex');
function browserProcesses(){
 const entries=execFileSync('ps',['-axo','pid=,ppid=,time=,rss=,comm='],{encoding:'utf8'}).trim().split('\n').map(line=>{const m=/^\s*(\d+)\s+(\d+)\s+([\d:.]+)\s+(\d+)\s+(.+)$/.exec(line);if(!m)return null;return {id:Number(m[1]),parent:Number(m[2]),cpuTime:m[3].split(':').reduce((n,v)=>n*60+Number(v),0),rssKiB:Number(m[4]),command:m[5]};}).filter(Boolean);
 const descendants=new Set([process.pid]);for(let i=0;i<8;i++)for(const e of entries)if(descendants.has(e.parent))descendants.add(e.id);
 return entries.filter(e=>descendants.has(e.id)&&e.id!==process.pid&&!e.command.endsWith('/ps'));
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let cases=[];
for(const fixture of (process.env.FIXTURES?.split(',')??(stage==='screen'?['h264']:['h264','high','long'])))for(const mode of ['native','hybrid','software','remux'])for(const rate of (stage==='screen'?[1]:[1,2]))cases.push({id:`${fixture}-${mode}-${rate}`,fixture,rate,options:mode==='native'?undefined:mode==='remux'?{mode:'native',nativeRemux:'always'}:{mode}});
if(stage==='profiles')cases=['native','hybrid','software','remux'].flatMap(mode=>[['none','low-latency'],['metadata','balanced'],['auto','resilient']].map(([preload,profile])=>({id:`${mode}-${preload}-${profile}`,fixture:process.env.PROFILE_FIXTURE??'h264',rate:1,options:{mode:mode==='remux'?'native':mode,nativeRemux:mode==='remux'?'always':'auto',buffering:{preload,profile}}})));
if(stage==='profiles')cases.push(...[['hybrid',8],['software',64]].map(([mode,budget])=>({id:`${mode}-budget-${budget}`,fixture:'high',rate:1,options:{mode,buffering:{profile:budget===64?'resilient':'balanced',preload:'auto',memoryBudget:budget*1024*1024}}})));
if(stage==='cleanup')cases=cases.filter(c=>c.fixture==='high'&&c.rate===1);
if(stage==='baseline')cases=['h264','high','long'].flatMap(fixture=>['hybrid','software'].flatMap(mode=>[1,2].map(rate=>({id:`${fixture}-${mode}-${rate}-no`,fixture,rate,options:{mode},baseline:true}))));
if(process.env.BUFFERING_PROFILE)cases=cases.map(c=>({...c,options:{...c.options,buffering:{profile:process.env.BUFFERING_PROFILE}}}));
if(process.env.ONLY)cases=cases.filter(c=>process.env.ONLY.split(',').some(x=>c.id.includes(x)));
for(const c of cases){
 const trial={config:c,phases:[],seeks:[]};result.trials.push(trial);const dir=path.join(out,c.id);await fs.mkdir(dir);
 let server,browser,page,bcdp;
 try{
  server=await serve(root,dir,{rtt,runtimeRoot});browser=await(family==='firefox'?firefox:chromium).launch({headless:false,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}})});trial.browser=browser.version();
  page=await browser.newPage({viewport:{width:640,height:360}});page.setDefaultTimeout(35000);trial.console=[];page.on('pageerror',e=>trial.console.push(String(e)));page.on('console',m=>{if(m.type()==='error')trial.console.push(m.text());});
  if(family==='chrome')bcdp=await browser.newBrowserCDPSession();
  const sample=async()=>({wall:Date.now(),state:await page.evaluate(()=>api.snapshot()),processes:bcdp?(await bcdp.send('SystemInfo.getProcessInfo')).processInfo:browserProcesses()});
  const network=()=>({requests:server.requests.length,bytes:server.requests.reduce((n,r)=>n+r.bytesWritten,0),active:server.active});
  await page.goto(server.origin+'/tests/buffering/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);trial.open=await page.evaluate(c=>api.open(c),c);await delay(1200);await page.waitForFunction(()=>api.snapshot().state.currentTime>.1,null,{timeout:15000});trial.running=await sample();
  assert.ok(trial.running.state.state.currentTime>0,'source clock advanced');
  if(!c.options?.buffering){
   assert.equal(trial.open.initial.diagnostics.buffering.preload,'auto');assert.equal(trial.open.initial.diagnostics.buffering.requestedProfile,'balanced');
   if(c.options?.mode==='hybrid'||c.options?.mode==='software'){
    const bytes=value=>parseFloat(value)*(value.includes('MiB')?1024*1024:1);
    assert.equal(bytes(trial.open.effective['demuxer-max-bytes']),32*1024*1024);assert.equal(bytes(trial.open.effective['demuxer-max-back-bytes']),8*1024*1024);
   }else assert.equal(await page.evaluate(()=>player.surface.preload),'auto');
  }
  if(c.options?.mode==='hybrid'||c.options?.mode==='software'){assert.equal(trial.open.effective.cache,c.baseline?'no':'yes');assert.equal(trial.running.state.state.buffered,null);}
  else assert.equal(trial.running.state.state.capabilities.buffering.control,c.options?.nativeRemux==='always'?'profile':'hint');
  if(stage==='cleanup'){
   server.control(1,true);await delay(2000);const started=performance.now(),before=network();const released=await page.evaluate(()=>api.close());const closeMs=performance.now()-started;await delay(500);
   trial.blockedClose={ms:closeMs,before,after:network(),released,workers:page.workers().length};assert.equal(server.active,0);assert.equal(page.workers().length,0);assert.ok(released.every(r=>r.audioState===null||r.audioState==='closed'));
   server.control(100e6/8);await page.evaluate(f=>api.reopen(f),c.fixture);await page.evaluate(()=>api.play());
  }
  if(!['screen','profiles','seeks','cleanup'].includes(stage)){
   for(const [name,ms,speed,stall] of [['fast',6000,100e6/8,false],['near',6000,fixtures[c.fixture].bitrate*1.05/8,false],['outage',18000,fixtures[c.fixture].bitrate/8,true],['recovery',6000,100e6/8,false]]){
    server.control(speed,stall);await page.evaluate(n=>api.phase(n),name);const phase={name,start:await sample(),networkBefore:network(),samples:[]};trial.phases.push(phase);
    for(let t=0;t<ms;t+=1000){await delay(1000);phase.samples.push(await sample());}phase.networkAfter=network();
   }
   assert.notEqual((await page.evaluate(()=>api.snapshot())).state.status,'error','outage recovery');
  }
  server.control(100e6/8);await page.evaluate(()=>api.pause());
  if(stage==='profiles'){
   await delay(c.options.buffering.preload==='auto'?6000:1000);trial.pausedPreload=await sample();
   if(c.fixture==='high'&&(c.options.buffering.profile==='resilient'||c.options.buffering.memoryBudget===64*1024*1024)&&['hybrid','software'].includes(c.options.mode)&&rtt===0)assert.ok(trial.pausedPreload.state.properties['demuxer-cache-state']['fw-bytes']>32*1024*1024,'resilient actually exercises additional forward packet memory');
   trial.pictures=[];
   for(const target of [10,30]){
    await page.evaluate(t=>api.seek(t),target);await delay(350);const png=await page.locator('#stage').screenshot({scale:'css'});await fs.writeFile(path.join(dir,`seek-${target}.png`),png);
    const image=decodePNG(png),reference=await fs.readFile(path.join(root,'research/items/mpv-cache-browser-stream/fixtures',path.basename(fixtures[c.fixture].references[target].path)));let sum=0;assert.equal(image.width,640);assert.equal(image.height,360);
    for(let i=0;i<640*360;i++)for(let channel=0;channel<3;channel++)sum+=Math.abs(image.pixels[i*image.channels+channel]-reference[i*3+channel]);
    const mae=sum/(640*360*3);trial.pictures.push({target,mae});assert.ok(mae<18,'independent FFmpeg target picture');
   }
  }
  await page.evaluate(()=>api.seek(40));
  for(const distance of (stage==='profiles'?[2]:[2,5,15,30]))for(const sign of [-1,1]){
   const target=(await page.evaluate(()=>api.snapshot())).state.currentTime+sign*distance,before=network();const seek=await page.evaluate(t=>api.seek(t),target);await delay(250);trial.seeks.push({...seek,distance,sign,networkBefore:before,networkAfter:network()});
  }
  const distantBefore=network(),distant=await page.evaluate(t=>api.seek(t),fixtures[c.fixture].duration*.8);await delay(250);trial.seeks.push({...distant,kind:'distant',networkBefore:distantBefore,networkAfter:network()});
  trial.preClose=await sample();trial.released=await page.evaluate(()=>api.close());assert.ok(trial.released.every(r=>r.audioState===null||r.audioState==='closed'));assert.ok(trial.released.every(r=>r.retainedFrames===null||r.retainedFrames===0));await delay(700);trial.close={liveObjectURLs:await page.evaluate(()=>api.snapshot().liveObjectURLs),network:network(),workers:page.workers().length,surfaces:await page.locator('#stage video,#stage canvas').count()};assert.equal(server.active,0);assert.equal(trial.close.workers,0);assert.equal(trial.close.liveObjectURLs,0);assert.equal(trial.close.surfaces,0);
  trial.replacements=[];for(const fixture of ['h264','high']){const retired=await page.evaluate(f=>api.reopen(f),fixture);trial.replacements.push(retired);assert.ok(retired.every(r=>r.audioState===null||r.audioState==='closed'));await page.evaluate(()=>api.play());await delay(300);}await page.evaluate(()=>api.close());await page.evaluate(()=>api.reopen('h264'));await page.evaluate(()=>api.play());await delay(300);
  trial.data=await page.evaluate(()=>api.data());trial.destroyed=await page.evaluate(()=>api.destroy());assert.ok(trial.destroyed.released.every(r=>r.audioState===null||r.audioState==='closed'));await delay(700);trial.cleanup={liveObjectURLs:await page.evaluate(()=>api.snapshot().liveObjectURLs),network:network(),workers:page.workers().length,surfaces:await page.locator('#stage video,#stage canvas').count()};assert.equal(server.active,0);assert.equal(trial.cleanup.workers,0);assert.equal(trial.cleanup.liveObjectURLs,0);assert.equal(trial.cleanup.surfaces,0);trial.passed=true;
 }catch(error){trial.error=String(error.stack);trial.state=await page?.evaluate(()=>api.snapshot()).catch(()=>null);trial.data=await page?.evaluate(()=>api.data()).catch(()=>null);process.exitCode=1;}
 finally{await browser?.close();trial.requests=server?.requests.map(({writes,...r})=>r);await server?.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(trial.passed?'PASS':'FAIL',c.id,trial.error?.split('\n')[0]??'');}
}
console.log(out);
