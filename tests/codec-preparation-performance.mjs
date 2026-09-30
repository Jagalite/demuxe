// SPDX-License-Identifier: Apache-2.0
// One owned Chrome instance; full-file preparation with matched media and output checks.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const runtime=process.env.BASELINE_RUNTIME??'asyncify';
const setup=JSON.parse(await readFile('build/codec-preparation/installed-'+runtime+'.json','utf8'));
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json','utf8'));
const deployment=JSON.parse(await readFile(setup.work+'/deployed/demuxe-providers.json','utf8'));
const identities=Object.fromEntries(deployment.providers.map(p=>[p.id,p.implementationIdentity]));
const hash=b=>createHash('sha256').update(b).digest('hex'),root=process.cwd();
const baselineFiles=['tests/provider-lossless-broad-worker.mjs','web/private-ffmpeg/bridge.js','web/private-ffmpeg/range-source.js','web/private-ffmpeg/single-owner.js','web/engine-adaptation-'+runtime+'/remux.mjs','web/engine-adaptation-'+runtime+'/remux.wasm'];
const baselineHashes=Object.fromEntries(await Promise.all(baselineFiles.map(async name=>[name,hash(await readFile(name))])));
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<p>Matched preparation measurement</p>');return;}
 let file;
 if(name.startsWith('/repository/')){const rel=name.slice(12);if(!baselineFiles.includes(rel)){res.writeHead(403).end();return;}file=path.resolve(rel);}
 else{const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):path.resolve(setup.work);file=path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}}
 try{const b=await readFile(file);res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={passed:false,setup,runtime,baselineHashes,samples:[],scope:'matched full-file preparation; no-store HTTP with fresh page/instances; existing broad adaptation versus installed split packages. Process CPU is cumulative Chrome process CPU delta; Chrome RSS is sampled every 100 ms across the owned browser processes; it is a sampled peak, not an allocation maximum. Wasm resident bytes exclude JS and output.'};
try{
 browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();const cdp=await browser.newBrowserCDPSession();
 const cpu=async()=>new Map((await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>[p.id,p.cpuTime]));
 const rejected=new Set();
 for(const f of host.results)for(let repetition=0;repetition<3;repetition++)for(const mode of repetition%2?['broad','split']:['split','broad']){
  if(rejected.has(f.id+'/'+mode))continue;
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async f=>{window.fixture=new Blob([await(await fetch('/fixtures/'+f.id+'.mkv')).arrayBuffer()]);},f);
  const before=await cpu();
  let peakChromeRSSBytes=0,rssSamples=0,samplingBusy=false;
  const sampleRSS=async()=>{
   if(samplingBusy)return;samplingBusy=true;
   try{const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');const ids=processInfo.map(p=>p.id).filter(id=>Number.isSafeInteger(id)&&id>0);if(ids.length){const raw=execFileSync('ps',['-o','rss=','-p',ids.join(',')],{encoding:'utf8'});const rss=raw.trim().split(/\s+/).reduce((n,v)=>n+Number(v)*1024,0);if(Number.isFinite(rss)){peakChromeRSSBytes=Math.max(peakChromeRSSBytes,rss);rssSamples++;}}}finally{samplingBusy=false;}
  };
  await sampleRSS();const initialChromeRSSBytes=peakChromeRSSBytes,timer=setInterval(()=>{void sampleRSS().catch(()=>{});},100);
  let sample;
  try{sample=await page.evaluate(async({f,mode,identities,runtime})=>{
   const began=performance.now();
   const profile=f.codec==='dts-hd'?'dts-hd':'truehd-mlp';
   const worker=window.worker=new Worker('/repository/tests/provider-lossless-broad-worker.mjs',{type:'module'});
   const engineURL=mode==='split'?'/deployed/web/providers/preparation/'+profile+'-'+runtime+'/engine-adaptation-'+runtime+'/remux.mjs':undefined;
   const value=await new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('Preparation deadline')),60000);worker.onmessage=({data})=>{clearTimeout(timer);data.passed?r(data):j(Error(data.error));};worker.onerror=e=>j(Error(e.message));worker.postMessage({file:window.fixture,runtime,engineURL});});
   window.output=value.output;return {mode,executionMs:performance.now()-began,wasmResidentBytes:value.wasmResidentBytes,outputBytes:window.output.byteLength};
  },{f,mode,identities,runtime});}catch(error){
   if(mode==='broad'&&String(error).includes('FLAC24 requires a canonical FLAC speaker layout')){
    rejected.add(f.id+'/'+mode);report.samples.push({fixture:f.id,sourceSHA256:f.sourceSHA256,repetition,mode,outcome:'profile-rejected',reason:String(error)});await page.close();continue;
   }
   throw error;
  }finally{clearInterval(timer);}
  await sampleRSS();Object.assign(sample,{initialChromeRSSBytes,peakChromeRSSBytes,rssSamples});
  const after=await cpu();sample.processCpuMs=[...after].reduce((sum,[id,value])=>sum+Math.max(0,value-(before.get(id)??0))*1000,0);
  const output=await page.evaluate(()=>{let text='';const b=new Uint8Array(window.output);for(let offset=0;offset<b.length;offset+=32768)text+=String.fromCharCode(...b.subarray(offset,offset+32768));return btoa(text);});
  const file='build/provider-lossless-audio/performance-'+runtime+'-streaming-'+f.id+'-'+mode+'-'+repetition+'.mp4',bytes=Buffer.from(output,'base64');await writeFile(file,bytes);
  const raw=(file,format)=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',format==='rawvideo'?'0:v:0':'0:a:0','-f',format,'-'],{maxBuffer:128*1024*1024});
  assert.deepEqual(raw(file,'s32le'),raw(f.output,'s32le'),f.id+' '+mode+' audio');assert.deepEqual(raw(file,'rawvideo'),raw(f.output,'rawvideo'),f.id+' '+mode+' video');
  sample.outputSHA256=hash(bytes);sample.audioDecodedExact=sample.videoDecodedExact=true;sample.throughputRatio=f.audioSamples/48000/(sample.executionMs/1000);
  await page.evaluate(async()=>{window.worker?.terminate();window.controller?.abort();await window.acquisition?.dispose();window.output=undefined;});
  report.samples.push({fixture:f.id,sourceSHA256:f.sourceSHA256,repetition,...sample});console.log(f.id,repetition,mode,Math.round(sample.executionMs)+'ms',Math.round(sample.processCpuMs)+' CPU ms');await page.close();
 }
 report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{if(browser)report.cleanup=await closeTestBrowser(browser,'chrome');server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-preparation',{recursive:true});await writeFile('results/media-components/production-preparation/performance-'+runtime+'.json',JSON.stringify(report,null,2)+'\n');console.log(report.passed,report.error??'');}
