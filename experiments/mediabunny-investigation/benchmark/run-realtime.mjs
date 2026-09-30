// SPDX-License-Identifier: Apache-2.0
// Exploratory matched H.264/AAC playback CPU screen; correctness gates are intentionally narrow.
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {collectCpuWindow,summarizeCpu,delay,launchBenchmarkChrome} from '../../../tests/head-to-head/benchmark-browser.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const fixture=path.resolve(process.argv.slice(2).find(x=>!x.startsWith('--'))??'build/hybrid-external-texture/assets/fixtures/h264-720p30-aac.mkv');
const fixtureSha=await new Promise((resolve,reject)=>{const hash=createHash('sha256');const stream=createReadStream(fixture);stream.on('data',chunk=>hash.update(chunk));stream.on('error',reject);stream.on('end',()=>resolve(hash.digest('hex')));});
const duration=Number(process.argv.find(x=>x.startsWith('--seconds='))?.slice(10)??'8');
const arms=(process.argv.find(x=>x.startsWith('--arms='))?.slice(7)??'mediabunny,hybrid').split(',');
const startupGate=process.argv.includes('--startup-gate');
const requests=[];
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=pathname==='/media/fixture.mkv'?fixture:path.resolve(root,'.'+pathname);
  if(!(file===fixture||file.startsWith(root+path.sep))){res.writeHead(403).end();return;}
  try{const info=await stat(file);if(!info.isFile())throw Error('not file');
    let start=0,end=info.size-1,status=200;const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
    if(file===fixture)res.setHeader('ETag',`"${fixtureSha}"`);
    if(match){start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
    if(start<0||end<start||start>=info.size){res.writeHead(416).end();return;}
    const request=file===fixture?{range:req.headers.range??null,plannedBytes:end-start+1,sentBytes:0,status}:null;
    if(request)requests.push(request);
    res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
    res.writeHead(status);const stream=createReadStream(file,{start,end});
    if(request)stream.on('data',chunk=>request.sentBytes+=chunk.length);
    res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const result={schema:1,scope:'exploratory synchronized A/V H.264/AAC only; no seek/fidelity qualification',fixture,seconds:duration,arms:[],createdAt:new Date().toISOString()};
let browser;
try{
  if(startupGate){const launch=await launchBenchmarkChrome({headless:true,channel:'chrome',startupGate:true});browser=launch.browser;result.browserIdentity=launch.identity;}
  else browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
  result.browserVersion=browser.version();const cdp=await browser.newBrowserCDPSession();
  for(const arm of arms){
    const entry={arm},context=await browser.newContext({viewport:{width:960,height:540}});const page=await context.newPage();
    try{
      await page.goto(`${origin}/experiments/mediabunny-investigation/benchmark/page.html`);
      const url=`${origin}/media/fixture.mkv`,before=requests.length;
      if(arm==='mediabunny'||arm==='mediabunny-worker'){
        await page.waitForFunction(()=>typeof globalThis.startMediaBunnyPlayback==='function');
        await page.evaluate(async({url,workerPresenter})=>{window.playback=await globalThis.startMediaBunnyPlayback(url,{workerPresenter});},{url,workerPresenter:arm==='mediabunny-worker'});
        await page.waitForFunction(()=>window.playback?.stats().running,null,{timeout:20000});
      }else if(arm==='hybrid'){
        await page.evaluate(async url=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.body,{mode:'hybrid',assetBase:'/',width:960,height:540});await player.ready;await player.open({url});await player.play();},url);
        await page.waitForFunction(()=>window.player?.state.status==='playing',null,{timeout:20000});
      }else throw Error('Unknown arm');
      const snapshot=()=>page.evaluate(arm=>{
        if(arm.startsWith('mediabunny'))return window.playback.stats();
        const state=window.player.state,diagnostics=window.player.diagnostics;
        return {state:{status:state.status,currentTime:state.currentTime,error:state.error},
          diagnostics:{plan:diagnostics.plan?.id,backend:{decoder:diagnostics.backend?.decoder,decoderStats:diagnostics.backend?.decoderStats,
            presentation:{drawn:diagnostics.backend?.presentation?.drawn,missing:diagnostics.backend?.presentation?.missing},
            heapBytes:diagnostics.backend?.heapBytes}}};
      },arm);
      await delay(4000);const start=await snapshot();const samples=await collectCpuWindow(cdp,snapshot,{seconds:duration,interval:2});const end=await snapshot();
      entry.start=start;entry.end=end;entry.cpu=summarizeCpu(samples);entry.requests=requests.slice(before);entry.transferredBytes=entry.requests.reduce((a,x)=>a+x.sentBytes,0);
      entry.gate=arm.startsWith('mediabunny')?{progressed:end.clock-start.clock>duration*.8,videoFrames:end.presented-start.presented,audioFrames:end.audioReadFrames-start.audioReadFrames,underruns:end.audioUnderruns-start.audioUnderruns,maxAbsDriftMs:end.maxAbsDriftMs,errors:end.errors}:
        {progressed:end.state.currentTime-start.state.currentTime>duration*.8,videoFrames:(end.diagnostics.backend?.decoderStats?.frames??0)-(start.diagnostics.backend?.decoderStats?.frames??0),errors:end.state.error,route:end.diagnostics.plan};
      console.log(arm,entry.cpu.oneCorePercent,entry.gate);
    }catch(error){entry.error=String(error.stack||error);console.error(arm,entry.error);}
    finally{try{await page.evaluate(async()=>{await window.playback?.stop();await window.player?.destroy();});}catch{}await context.close();result.arms.push(entry);await delay(2000);}
  }
  await cdp.detach();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
const target=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)??path.join(here,'../notes/realtime-smoke.json'));
await writeFile(target,JSON.stringify(result,null,2)+'\n');console.log(target);
