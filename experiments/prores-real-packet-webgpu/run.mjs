// SPDX-License-Identifier: Apache-2.0
// Local, isolated browser runner. CPU is total Chrome descendant process time.
import http from 'node:http';
import {readFile,writeFile,open} from 'node:fs/promises';
import {dirname,extname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';

const here=dirname(fileURLToPath(import.meta.url));
const root=dirname(dirname(here));
execFileSync(process.execPath,[join(here,'prepare.mjs')],{cwd:root,stdio:'ignore'});
const sha=async path=>createHash('sha256').update(await readFile(join(root,path))).digest('hex');
const allowed=[join(root,'web')+sep,join(root,'experiments')+sep,
  join(root,'build/experiments/prores-real-packet-webgpu')+sep,join(root,'fixtures')+sep];
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    const oracle=/^\/oracle\/(000|090|179)$/.exec(path);
    if(oracle){
      const index=Number(oracle[1]),size=640*360*4;
      const handle=await open(join(root,'build/experiments/prores-idct-webgpu/frames.yuv'),'r');
      const bytes=Buffer.alloc(size);
      try{const {bytesRead}=await handle.read(bytes,0,size,index*size);
        if(bytesRead!==size)throw Error('Truncated ProRes pixel oracle');}
      finally{await handle.close();}
      res.setHeader('Content-Type','application/octet-stream');
      res.end(bytes);return;
    }
    const local=path==='/'?join(here,'page.html'):
      path==='/fixture.mov'?join(root,'experiments/webgpu-compute-decoder/raw/prores-proxy.mov'):
      path==='/oracle-hashes.json'?join(root,'build/experiments/prores-real-packet-webgpu/oracle-hashes.json'):
      resolve(root,'.'+path);
    if(!(local===join(here,'page.html')||local===join(root,'experiments/webgpu-compute-decoder/raw/prores-proxy.mov')||
      local===join(root,'build/experiments/prores-real-packet-webgpu/oracle-hashes.json')||
      allowed.some(prefix=>local.startsWith(prefix)))){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',extname(local)==='.mjs'||extname(local)==='.js'?'text/javascript':
      extname(local)==='.html'?'text/html':'application/octet-stream');
    res.end(await readFile(local));
  }catch(error){res.writeHead(500).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const modes=process.env.MODES?.split(',')??['gpu-validation','gpu','software'];
const assetPaths=[
  'build/experiments/prores-real-packet-webgpu/engine/player.wasm',
  'build/experiments/prores-real-packet-webgpu/direct/player.wasm',
  'build/experiments/prores-real-packet-webgpu/software/player.wasm',
  'build/experiments/prores-real-packet-webgpu/software-profile/player.wasm',
  'experiments/prores-real-packet-webgpu/worker.js',
  'experiments/prores-real-packet-webgpu/service.js',
  'web/webgpu/presenter.js',
];
if(modes.some(mode=>mode.includes('fast')))assetPaths.push(
  'build/experiments/prores-real-packet-webgpu/engine-fast/player.wasm',
  'build/experiments/prores-real-packet-webgpu/direct-fast/player.wasm');
const assetHashes=async()=>Object.fromEntries(await Promise.all(assetPaths.map(async path=>[path,await sha(path)])));
const result={at:new Date().toISOString(),fixture:'prores-proxy.mov',
  fixtureSha256:await sha('experiments/webgpu-compute-decoder/raw/prores-proxy.mov'),
  assets:await assetHashes(),
  host:{cpu:os.cpus()[0].model,arch:os.arch(),platform:os.platform(),release:os.release()},
  cpuDefinition:'sum of Chrome process cpuTime deltas across sampled steady playback; no idle subtraction',
  rounds:[],passed:false};
try{
  for(const mode of modes){
    const browser=await chromium.launch({channel:'chrome',headless:true,
      args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling',
        '--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
    const round={mode,browser:browser.version(),samples:[],pageErrors:[]};
    result.rounds.push(round);
    let page;
    try{
      page=await browser.newPage();page.on('pageerror',error=>round.pageErrors.push(String(error)));
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const cdp=await browser.newBrowserCDPSession();
      const processes=async()=>(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
      await page.evaluate(({mode,poolLimit,backpressureProbeAt})=>startPlayback(
        mode.replace('-validation',''),mode.endsWith('-validation'),poolLimit,
        backpressureProbeAt),{mode,poolLimit:Number(process.env.POOL_LIMIT??8),
          backpressureProbeAt:mode.endsWith('-validation')&&process.env.BACKPRESSURE_PROBE==='1'?30:null});
      const start=Date.now();
      for(let i=0;i<16;i++){
        await page.waitForTimeout(500);
        await page.evaluate(()=>requestStats());
        await page.waitForTimeout(20);
        const state=await page.evaluate(()=>playbackState());
        round.samples.push({elapsedMs:Date.now()-start,state:state.latest,
          processes:await processes()});
        if(state.errors.length)throw Error(state.errors.at(-1));
        if((mode.startsWith('gpu')?state.latest?.decoder?.packets>=180:state.latest?.presented>=180)&&
            state.latest?.position>=5.9)break;
      }
      if(mode.endsWith('-validation'))round.validation=await page.evaluate(()=>finalizePlayback());
      round.final=await page.evaluate(()=>stopPlayback());
      const first=round.samples[0],last=round.samples.at(-1),prior=new Map(first.processes.map(p=>[p.id,p.cpuTime]));
      const after=new Set(last.processes.map(p=>p.id));
      round.summary={elapsedSeconds:(last.elapsedMs-first.elapsedMs)/1000,
        chromeCpuSeconds:last.processes.reduce((total,p)=>total+Math.max(0,p.cpuTime-(prior.get(p.id)??p.cpuTime)),0),
        processTurnover:{added:last.processes.filter(p=>!prior.has(p.id)).map(p=>p.id),
          removed:first.processes.filter(p=>!after.has(p.id)).map(p=>p.id)},
        final:round.final.latest,errors:round.final.errors,pageErrors:round.pageErrors};
      round.summary.chromeCpuCorePercent=100*round.summary.chromeCpuSeconds/round.summary.elapsedSeconds;
      const final=round.summary.final;
      round.passed=round.final.errors.length===0&&round.pageErrors.length===0&&
        round.final.destroyed&&final?.position>=5.8&&final?.eof&&
        round.summary.processTurnover.added.length===0&&
        round.summary.processTurnover.removed.length===0&&
        (!mode.startsWith('gpu')?final.presented>=180:
          final.decoder?.packets===180&&final.decoded===180&&final.presented===180&&
          final.dropped===0&&final.missing===0&&final.retained===0&&
          final.decoder?.runtime?.liveBufferBytes===0&&
          final.decoder?.allocatedSurfaces<=8&&final.pts.length===180&&
          final.pts.every((pts,index)=>Math.abs(pts-index*1e6/30)<=1))&&
        (!mode.endsWith('-validation')||(round.validation?.decoder?.coefficientParity===180&&
          (process.env.BACKPRESSURE_PROBE!=='1'||round.validation?.decoder?.backpressure>=1)&&
          round.validation?.pixelComparisons?.length===3&&
          round.validation.pixelComparisons.every(item=>item.mismatches===0)));
      await page.close();
    }catch(error){round.error=String(error.stack??error);round.failureState=await page?.evaluate(()=>playbackState()).catch(()=>null);round.passed=false;}
    finally{await browser.close();}
  }
  result.passed=result.rounds.every(round=>round.passed);
}finally{
  result.assetsAfter=await assetHashes();
  result.runtimeUnchanged=JSON.stringify(result.assets)===JSON.stringify(result.assetsAfter);
  if(!result.runtimeUnchanged)result.passed=false;
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await writeFile(join(here,process.env.RESULT_FILE??'attribution-result.json'),
    JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:result.passed,rounds:result.rounds.map(round=>({mode:round.mode,
    passed:round.passed,error:round.error,failureState:round.failureState,summary:round.summary}))},null,2));
  if(!result.passed)process.exitCode=1;
}
