// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',runtime=process.env.CODEC_RUNTIME??'asyncify';
const setup=JSON.parse(await readFile('build/codec-preparation/installed-'+runtime+'.json','utf8'));
const dts=path.resolve('build/codec-preparation/fixtures/long-dtshd.mkv');
try{await stat(dts);}catch{execFileSync('ffmpeg',['-v','error','-y','-stream_loop','-1','-i','build/provider-lossless-audio/dtshd-71.mkv','-t','60','-map','0:v:0','-map','0:a:0','-c','copy',dts],{stdio:'inherit'});}
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<input type="file"><button>Start</button><div id="player"></div>');return;}
 const base=path.resolve(setup.work),file=path.resolve(base,name.slice(1));if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const b=await readFile(file);res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const report={passed:false,family,runtime,setup,cases:[],scope:'Complete 120-second TrueHD and 60-second DTS-HD playback at 2x; bounded reads, heap, startup and EOF evidence; technical streams, not a broad corpus or long-duration benchmark'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 for(const fixture of [{id:'truehd',file:path.resolve('build/codec-preparation/fixtures/large-truehd.mkv'),duration:120},{id:'dtshd',file:dts,duration:60}]){
  const page=await browser.newPage();page.setDefaultTimeout(90000);await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('button').click();await page.locator('input').setInputFiles(fixture.file);
  const sample=await page.evaluate(async({fixture,runtime})=>{
   const {Player}=await import('/node_modules/demuxe/dist/index.js');File.prototype.arrayBuffer=()=>{throw Error('Whole-file materialization forbidden');};
   const p=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed/',location.href).href,preview:false,remuxRuntime:runtime}),samples=[];const failures=[];p.addEventListener('error',e=>failures.push(String(e.detail)));
   try{
    await p.open(document.querySelector('input').files[0]);await p.setPlaybackRate(2);await p.play();
    const deadline=performance.now()+120000;let previous=-1,changed=performance.now(),ended=false;p.addEventListener('ended',()=>{ended=true;});
    while(p.state.currentTime<fixture.duration-.2&&!ended&&performance.now()<deadline){
     const d=p.diagnostics.backend?.remux,s=d?.source,r=d?.remux;samples.push({position:p.state.currentTime,heapBytes:r?.heapBytes,generatedBytes:r?.generatedBytes,fetchedBytes:s?.fetchedBytes,peakActiveBytes:s?.peakActiveBytes,peakOwnedBytes:s?.peakOwnedBytes,ranges:d?.ranges});
     if(p.state.currentTime>previous+.01){previous=p.state.currentTime;changed=performance.now();}else if(performance.now()-changed>10000)throw Error('Playback stalled: '+JSON.stringify(p.diagnostics));
     if(r?.heapBytes>128*1024*1024||s?.peakActiveBytes>262144||s?.peakOwnedBytes>524288)throw Error('Preparation exceeded its memory/read budget');
     await new Promise(r=>setTimeout(r,500));
    }
    if(p.state.currentTime<fixture.duration-.2&&!ended)throw Error('EOF deadline');if(failures.length)throw Error('Playback failures: '+JSON.stringify(failures));
    return {completed:true,ended,position:p.state.currentTime,samples,diagnostics:p.diagnostics};
   }finally{await p.destroy();}
  },{fixture,runtime});
  const deadline=Date.now()+5000;while(page.workers().length&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25));assert.equal(page.workers().length,0);report.cases.push({id:fixture.id,...sample,workersRemaining:0});await page.close();console.log(fixture.id,'complete playback passed');
 }
 report.passed=true;
}catch(e){report.error=String(e.stack);process.exitCode=1;}
finally{if(browser)try{report.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});}catch(e){report.cleanupError=String(e);report.passed=false;process.exitCode=1;}server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-preparation',{recursive:true});await writeFile('results/media-components/production-preparation/soak-'+runtime+'-'+family+'.json',JSON.stringify(report,null,2)+'\n');console.log(report.passed,report.error??'');}
