// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {serve} from './server.mjs';
import {decodePNG} from '../../../../tests/head-to-head/checks.mjs';
const home=path.resolve(import.meta.dirname,'..');
const [stage='screen',label=new Date().toISOString().replaceAll(/[-:.]/g,'')+'-'+stage,selection='all',proofArg]=process.argv.slice(2);
const out=path.join(home,'evidence',label);await fs.mkdir(out,{recursive:false});
await fs.cp(import.meta.dirname,path.join(out,'files'),{recursive:true});
const fixtures=JSON.parse(await fs.readFile(path.join(home,'fixtures/manifest.json'))).fixtures;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const configs=[{id:'native',mode:'native'},{id:'hybrid-no',mode:'hybrid',options:{}},{id:'hybrid-yes',mode:'hybrid',options:{cache:'yes'}},{id:'software-no',mode:'software',options:{}},{id:'software-yes',mode:'software',options:{cache:'yes'}}];
if(process.env.CACHE_TUNED==='1')configs.push(...['hybrid','software'].map(mode=>({id:mode+'-24-16',mode,options:{cache:'yes','demuxer-max-bytes':'25165824','demuxer-max-back-bytes':'16777216'}})));
if(process.env.CACHE_AUTO==='1')configs.push({id:'hybrid-auto',mode:'hybrid',options:{cache:'auto'}});
const result={harnessVersion:2,command:process.argv,stage,started:new Date().toISOString(),fixtures,configs,trials:[],host:execFileSync('sw_vers',{encoding:'utf8'}),hostProcesses:execFileSync('ps',['-axo','pid,pcpu,comm'],{encoding:'utf8'}),limits:['Shared Mac host; user workloads remain running. CPU sums CDP Chrome processes; excludes server and physical energy. RSS sum may double count shared pages.','First frame is Native rVFC or Wasm first diagnostics with rendered/drawn > 0 (100-200ms sampling), not physical photon.','Bytes written by server may exceed client-delivered bytes on cancelled responses. CDP dataReceived and RangeReader fetchedBytes are separate.','Wasm heap is committed linear memory, not malloc live/peak allocation; exact allocator peak unavailable. Byte cache is never converted into playable seconds.','Performance phases are sequential with cache carryover, not independent network trials.']};
const save=()=>fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
const proof=proofArg?JSON.parse(await fs.readFile(path.resolve(proofArg,'results.json'))):null;
if(['performance','rate','cold','seeks'].includes(stage))assert.equal(proof?.stage,'correctness');
function difference(png,reference){const im=decodePNG(png);assert.equal(im.width,640);assert.equal(im.height,360);let sum=0;for(let i=0;i<640*360;i++)for(let c=0;c<3;c++)sum+=Math.abs(im.pixels[i*im.channels+c]-reference[i*3+c]);return sum/(640*360*3);}
async function hashFile(p){return createHash('sha256').update(await fs.readFile(p)).digest('hex');}
let cases=[];
for(const fixture of Object.keys(fixtures))for(const config of configs)cases.push({...config,fixture,rate:1,id:fixture+'-'+config.id});
cases=cases.filter(c=>!c.id.includes('24-16')||c.fixture==='high');
if(stage==='screen')cases=cases.filter(c=>c.fixture==='h264');
if(stage==='rate')cases=cases.filter(c=>['h264','high'].includes(c.fixture)).map(c=>({...c,rate:2,id:c.id+'-2x'}));
if(selection!=='all')cases=cases.filter(c=>selection.split(',').some(s=>c.id===s||c.fixture===s));
// Reverse alternating fixtures to reduce systematic warm-order bias.
for(let i=0;i<cases.length;i+=5)if(Math.floor(i/5)%2)cases.splice(i,5,...cases.slice(i,i+5).reverse());
for(const c of cases){
 const trial={config:c,started:Date.now(),phases:[],seeks:[]};result.trials.push(trial);
 if(['performance','rate','cold','seeks'].includes(stage)&&!proof.trials.some(t=>t.config.id===c.id.replace(/-2x$/,'')&&t.correctnessPassed)){trial.skipped='Correctness did not pass';await save();continue;}
 const dir=path.join(out,c.id);await fs.mkdir(dir);
 let server,browser,page,bcdp,cdp,processIDs=[];const network=[];
 try{
  server=await serve(home,dir);browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});trial.browser=browser.version();
  page=await browser.newPage({viewport:{width:640,height:360}});page.setDefaultTimeout(20000);
  bcdp=await browser.newBrowserCDPSession();cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  const mediaIDs=new Set();
  cdp.on('Network.requestWillBeSent',e=>{if(e.request.url.includes('/media/')){mediaIDs.add(e.requestId);network.push({type:'request',...e});}});
  for(const type of ['responseReceived','dataReceived','loadingFinished','loadingFailed'])cdp.on('Network.'+type,e=>{if(mediaIDs.has(e.requestId))network.push({type,...e});});
  await page.goto(server.origin+'/tests/harness-v2.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
  const os=async()=>{const processes=(await bcdp.send('SystemInfo.getProcessInfo')).processInfo;processIDs=[...new Set([...processIDs,...processes.map(p=>p.id)])];let rssKiB=null;try{rssKiB=execFileSync('ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).reduce((s,x)=>s+Number(x),0);}catch{}return {wall:Date.now(),processes,rssKiB,state:await page.evaluate(()=>api.snapshot())};};
  trial.before=await os();
  if(stage==='cold'){trial.startupNetworkBytesPerSecond=fixtures[c.fixture].bitrate*1.05/8;server.control(trial.startupNetworkBytesPerSecond);}
  trial.open=await page.evaluate(c=>api.start(c),{...c,correctness:stage==='correctness'});
  await page.waitForFunction(()=>api.snapshot().firstFrame!==null);
  trial.afterOpen=await os();
  if(stage==='screen'||stage==='correctness'||stage==='cold'){
   await delay(1800);trial.running=await os();
   if(stage==='correctness'){
    trial.pictures=[];trial.audio=[];
    for(const target of [10,30]){
     await page.evaluate(()=>api.pause());const seek=await page.evaluate(t=>api.seek(t),target);trial.seeks.push(seek);await delay(500);
     const png=await page.locator('#stage').screenshot();await fs.writeFile(path.join(dir,'seek-'+target+'.png'),png);
     const ref=await fs.readFile(fixtures[c.fixture].references[target].path),wrong=await fs.readFile(fixtures[c.fixture].references[target===10?30:10].path);
     trial.pictures.push({target,mae:difference(png,ref),wrongFrameMAE:difference(png,wrong),state:await page.evaluate(()=>api.snapshot())});
     await page.evaluate(()=>api.audio());await page.evaluate(()=>api.play());await delay(800);trial.audio.push(await page.evaluate(()=>api.audio()));
    }
    await page.evaluate(()=>api.pause());const pos=(await page.evaluate(()=>api.snapshot())).position;
    for(const [kind,target] of [['back',Math.max(1,pos-5)],['forward',Math.min(fixtures[c.fixture].duration-2,pos+5)],['distant',fixtures[c.fixture].duration*(stage==='rate'?.1:.8)]]){
     const before={wall:Date.now(),requests:server.requests.length,bytes:server.requests.reduce((s,r)=>s+r.bytesWritten,0)};
     const seek=await page.evaluate(t=>api.seek(t),target);await delay(500);
     trial.seeks.push({kind,...seek,confirmedPresentation:true,networkBefore:before,networkAfter:{wall:Date.now(),requests:server.requests.length,bytes:server.requests.reduce((s,r)=>s+r.bytesWritten,0)}});
    }
   }
  }else{
   const bitrate=fixtures[c.fixture].bitrate;
   for(const [name,ms,rate,stall] of (stage==='seeks'?[['fast',10000,100e6/8,false]]:stage==='rate'?[['fast',8000,100e6/8,false],['modest',8000,bitrate*1.5/8,false],['close',8000,bitrate*1.05/8,false],['outage',8000,bitrate/8,true],['recovery',8000,bitrate*2/8,false]]:[['fast',10000,100e6/8,false],['modest',10000,bitrate*1.5/8,false],['close',10000,bitrate*1.05/8,false],['outage',8000,bitrate/8,true],['recovery',12000,bitrate*2/8,false]])){
    server.control(rate,stall);await page.evaluate(n=>api.phase(n),name);const phase={name,bytesPerSecond:rate,stall,begin:await os(),samples:[]};trial.phases.push(phase);
    const end=performance.now()+ms;while(performance.now()<end){await delay(Math.min(1000,end-performance.now()));phase.samples.push(await os());}
    phase.end=phase.samples.at(-1);
   }
   server.control(100e6/8);await page.evaluate(()=>api.pause());const pos=(await page.evaluate(()=>api.snapshot())).position;
   for(const [kind,target] of [['back',Math.max(1,pos-5)],['forward',Math.min(fixtures[c.fixture].duration-2,pos+5)],['distant',fixtures[c.fixture].duration*(stage==='rate'?.1:.8)]]){
    const before={wall:Date.now(),requests:server.requests.length,bytes:server.requests.reduce((s,r)=>s+r.bytesWritten,0)};
    const seek=await page.evaluate(t=>api.seek(t),target);await delay(500);
    seek.confirmedPresentation=true;
    trial.seeks.push({kind,...seek,networkBefore:before,networkAfter:{wall:Date.now(),requests:server.requests.length,bytes:server.requests.reduce((s,r)=>s+r.bytesWritten,0)}});
   }
   await page.evaluate(()=>api.play());await delay(1000);trial.afterSeeks=await os();
  }
  trial.raw=await page.evaluate(()=>api.data());trial.final=await os();
  trial.cleanup=await page.evaluate(()=>api.stop());await delay(600);trial.cleanup.workers=page.workers().map(w=>w.url());trial.cleanup.activeRequests=server.active;
  assert.equal(trial.cleanup.surfaces,0);assert.equal(trial.cleanup.workers.length,0);assert.equal(trial.cleanup.activeRequests,0);
  assert.equal(trial.raw.errors.length,0,JSON.stringify(trial.raw.errors));
  if(c.mode!=='native')assert.equal(trial.running?.state.diagnostics.decoder??trial.final.state.diagnostics.decoder,c.mode==='hybrid'?'webcodecs':'software','Decoder changed/fell back');
  if(stage==='correctness'){
   trial.correctnessPassed=trial.pictures.every(p=>p.mae<18&&p.wrongFrameMAE>p.mae+3)&&trial.audio.some(a=>a.rms>.0001);
   assert.ok(trial.correctnessPassed,'Picture/oracle/adverse/audio gate failed');
  }
  trial.passed=true;
  await fs.writeFile(path.join(dir,'network.json'),JSON.stringify(network,null,2));
 }catch(e){trial.passed=false;trial.error=String(e.stack??e);if(page)try{trial.raw=await page.evaluate(()=>api.data());trial.failureState=await page.evaluate(()=>api.snapshot());await page.screenshot({path:path.join(dir,'failure.png')});}catch{}}
 finally{
  if(browser){try{await page?.context().close();}catch{}let done=false;browser.close().then(()=>done=true,()=>done=true);for(let i=0;i<100&&!done;i++)await delay(100);trial.browserCloseAcknowledged=done;}
  trial.remainingProcessIDs=[];for(const pid of processIDs)try{process.kill(pid,0);trial.remainingProcessIDs.push(pid);}catch{}
  if(trial.remainingProcessIDs.length){trial.passed=false;trial.teardownError='Chrome processes did not all exit';}
  if(server){trial.networkChanges=server.changes;await server.close();}
  await fs.writeFile(path.join(dir,'network.json'),JSON.stringify(network,null,2));
  trial.finished=Date.now();await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(trial,null,2)+'\n');await save();
 }
 console.log(JSON.stringify({id:c.id,passed:trial.passed,correctnessPassed:trial.correctnessPassed,error:trial.error,firstFrame:trial.raw?.firstFrame,cache:trial.final?.state.props['demuxer-cache-state']}));
 if(trial.remainingProcessIDs?.length)break;
}
result.finished=new Date().toISOString();await save();
const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=await hashFile(path.join(out,name));
for(const name of await fs.readdir(import.meta.dirname))hashes['../../tests/'+name]=await hashFile(path.join(import.meta.dirname,name));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');
console.log('Output:',out);
