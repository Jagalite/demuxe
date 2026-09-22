// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from './server.mjs';
const root=process.cwd(),family=process.env.BROWSER??'chrome',stage=process.env.STAGE??'screen';
const out=path.join(root,'results/buffering',new Date().toISOString().replaceAll(':','-')+'-'+family+'-'+stage);await fs.mkdir(out,{recursive:true});console.log(out);
const fixtures=JSON.parse(await fs.readFile('research/items/mpv-cache-browser-stream/fixtures/manifest.json')).fixtures;
const result={family,stage,started:new Date().toISOString(),host:execFileSync('sw_vers',{encoding:'utf8'}),rttMs:75,hashes:{},trials:[]};
for(const name of ['src/types.ts','src/unified-player.ts','src/internal/buffering.ts','src/internal/wasm-player.ts','src/internal/native-player.ts','src/internal/shaka-backend.ts','web/native-remux-player.js','web/range-reader.js','web/io-worker.js','tests/buffering/page.mjs','tests/buffering/server.mjs','tests/buffering/run.mjs']){const data=await fs.readFile(name);result.hashes[name]=createHash('sha256').update(data).digest('hex');await fs.mkdir(path.join(out,'source',path.dirname(name)),{recursive:true});await fs.writeFile(path.join(out,'source',name),data);}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let cases=[];
for(const fixture of (stage==='screen'?['h264']:['h264','high','long']))for(const mode of ['native','hybrid','software','remux'])for(const rate of (stage==='screen'?[1]:[1,2]))cases.push({id:`${fixture}-${mode}-${rate}`,fixture,rate,options:mode==='native'?undefined:mode==='remux'?{mode:'native',nativeRemux:'always'}:{mode}});
if(stage==='profiles')cases=['native','hybrid','software','remux'].flatMap(mode=>['none','metadata','auto'].flatMap(preload=>['low-latency','balanced','resilient'].map(profile=>({id:`${mode}-${preload}-${profile}`,fixture:'h264',rate:1,options:{mode:mode==='remux'?'native':mode,nativeRemux:mode==='remux'?'always':'auto',buffering:{preload,profile}}}))));
if(stage==='baseline')cases=['h264','high','long'].flatMap(fixture=>['hybrid','software'].flatMap(mode=>[1,2].map(rate=>({id:`${fixture}-${mode}-${rate}-no`,fixture,rate,options:{mode},baseline:true}))));
if(process.env.ONLY)cases=cases.filter(c=>process.env.ONLY.split(',').some(x=>c.id.includes(x)));
for(const c of cases){
 const trial={config:c,phases:[],seeks:[]};result.trials.push(trial);const dir=path.join(out,c.id);await fs.mkdir(dir);
 let server,browser,page,bcdp;
 try{
  server=await serve(root,dir);browser=await(family==='firefox'?firefox:chromium).launch({headless:false,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}})});trial.browser=browser.version();
  page=await browser.newPage({viewport:{width:640,height:360}});page.setDefaultTimeout(35000);trial.console=[];page.on('pageerror',e=>trial.console.push(String(e)));page.on('console',m=>{if(m.type()==='error')trial.console.push(m.text());});
  if(family==='chrome')bcdp=await browser.newBrowserCDPSession();
  const sample=async()=>({wall:Date.now(),state:await page.evaluate(()=>api.snapshot()),processes:bcdp?(await bcdp.send('SystemInfo.getProcessInfo')).processInfo:null});
  const network=()=>({requests:server.requests.length,bytes:server.requests.reduce((n,r)=>n+r.bytesWritten,0),active:server.active});
  await page.goto(server.origin+'/tests/buffering/harness.html');await page.waitForFunction(()=>window.api);trial.open=await page.evaluate(c=>api.open(c),c);await delay(1200);trial.running=await sample();
  assert.ok(trial.running.state.state.currentTime>0,'source clock advanced');
  if(c.options?.mode==='hybrid'||c.options?.mode==='software'){assert.equal(trial.open.effective.cache,c.baseline?'no':'yes');assert.equal(trial.running.state.state.buffered,null);}
  else assert.equal(trial.running.state.state.capabilities.buffering.control,c.options?.nativeRemux==='always'?'profile':'hint');
  if(!['screen','profiles'].includes(stage)){
   for(const [name,ms,speed,stall] of [['fast',6000,100e6/8,false],['near',6000,fixtures[c.fixture].bitrate*1.05/8,false],['outage',18000,fixtures[c.fixture].bitrate/8,true],['recovery',6000,100e6/8,false]]){
    server.control(speed,stall);await page.evaluate(n=>api.phase(n),name);const phase={name,start:await sample(),networkBefore:network(),samples:[]};trial.phases.push(phase);
    for(let t=0;t<ms;t+=1000){await delay(1000);phase.samples.push(await sample());}phase.networkAfter=network();
   }
   assert.notEqual((await page.evaluate(()=>api.snapshot())).state.status,'error','outage recovery');
  }
  server.control(100e6/8);await page.evaluate(()=>api.pause());await page.evaluate(()=>api.seek(40));
  for(const distance of (stage==='profiles'?[2]:[2,5,15,30]))for(const sign of [-1,1]){
   const target=40+sign*distance,before=network();const seek=await page.evaluate(t=>api.seek(t),target);await delay(250);trial.seeks.push({...seek,distance,sign,networkBefore:before,networkAfter:network()});
  }
  trial.seeks.push(await page.evaluate(t=>api.seek(t),fixtures[c.fixture].duration*.8));
  trial.preClose=await sample();await page.evaluate(()=>api.close());await delay(700);trial.close={network:network(),workers:page.workers().length,surfaces:await page.locator('#stage video,#stage canvas').count()};assert.equal(server.active,0);assert.equal(trial.close.workers,0);assert.equal(trial.close.surfaces,0);
  for(const fixture of ['h264','high']){await page.evaluate(f=>api.reopen(f),fixture);await page.evaluate(()=>api.play());await delay(300);}await page.evaluate(()=>api.close());await page.evaluate(()=>api.reopen('h264'));await page.evaluate(()=>api.play());await delay(300);
  trial.data=await page.evaluate(()=>api.data());await page.evaluate(()=>api.destroy());await delay(700);trial.cleanup={network:network(),workers:page.workers().length,surfaces:await page.locator('#stage video,#stage canvas').count()};assert.equal(server.active,0);assert.equal(trial.cleanup.workers,0);assert.equal(trial.cleanup.surfaces,0);trial.passed=true;
 }catch(error){trial.error=String(error.stack);trial.state=await page?.evaluate(()=>api.snapshot()).catch(()=>null);trial.data=await page?.evaluate(()=>api.data()).catch(()=>null);process.exitCode=1;}
 finally{await browser?.close();trial.requests=server?.requests.map(({writes,...r})=>r);await server?.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(trial.passed?'PASS':'FAIL',c.id,trial.error?.split('\n')[0]??'');}
}
console.log(out);
