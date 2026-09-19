// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const directEngineSeek=process.env.DIRECT_ENGINE_SEEK==='1';
const family=process.env.BROWSER||'chrome',archive=path.resolve(process.env.BETA_ARCHIVE||'build/beta/demuxe-0.3.0-beta.3.tgz');
await mkdir('build/streaming-consumers',{recursive:true});
const root=await mkdtemp(path.resolve('build/streaming-consumers/run-'));
execFileSync('tar',['-xzf',archive,'-C',root]);
const assets=path.join(root,'package'),manifest=JSON.parse(await readFile(path.join(assets,'release-manifest.json')));
for(const [name,expected]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(path.join(assets,name))).digest('hex'),expected.sha256,name);
const overridden=process.env.UNIFIED_PLAYER_OVERRIDE?await readFile(path.resolve(process.env.UNIFIED_PLAYER_OVERRIDE)):null;
const media=path.resolve(process.env.STREAMING_FIXTURE||'build/fixtures/playback-performance/bbb-stream.mp4'),size=(await stat(media)).size;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let state,replacementState;
const server=http.createServer(async(req,res)=>{
 for(const [k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  if(u.pathname==='/media.mp4'||u.pathname==='/replacement.mp4'){
   const current=u.pathname==='/replacement.mp4'?replacementState:state,m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
   if(!m){res.writeHead(400).end();return;}
   const start=Number(m[1]),end=Math.min(size-1,m[2]?Number(m[2]):size-1);
   let complete=false;const slow=current.mode!=='normal';
   current.requests++;if(slow){current.slowRequests++;current.startedAt??=Date.now();}
   res.on('close',()=>{if(!complete&&slow)current.aborts++;});
   res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1,ETag:'"streaming-fixture-v1"'});
   const stream=createReadStream(media,{start,end,highWaterMark:slow?(current.mode==='deadline'?1024:32768):65536});res.on('close',()=>stream.destroy());
   for await(const chunk of stream){
    if(slow&&current.mode!=='normal')await delay(current.mode==='deadline'?100:250);
    if(res.destroyed)break;res.write(chunk);if(slow)current.progress+=chunk.length;
   }
   if(!res.destroyed){complete=true;if(slow)current.completed++;res.end();}return;
  }
  const file=path.resolve(assets,u.pathname.slice('/vendor/'.length));
  if(!u.pathname.startsWith('/vendor/')||!file.startsWith(assets+path.sep)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');res.end(overridden&&u.pathname==='/vendor/web/generated/unified-player.js'?overridden:await readFile(file));
 }catch(e){if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end(String(e));}}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
const out=path.resolve(process.env.OUT);await mkdir(out,{recursive:true});console.log(out);
const fixtureHash=createHash('sha256');for await(const bytes of createReadStream(media))fixtureHash.update(bytes);
const result={scope:'Actual accepted-seek cancellation and forward playback regression; injected network faults',releaseQualified:false,directEngineSeek,overrides:overridden?{'web/generated/unified-player.js':createHash('sha256').update(overridden).digest('hex')}:{},testHarnessSHA256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex'),archiveSHA256:createHash('sha256').update(await readFile(archive)).digest('hex'),sourceCommit:manifest.sourceCommit,browser:browser.version(),family,fixture:{bytes:size,sha256:fixtureHash.digest('hex')},cases:[]};
async function until(fn,ms=5000){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('Server progress deadline exceeded');await delay(25);}}
try{
 for(const mode of ['hybrid','software'])for(const scenario of ['accepted-seek-cancel','read-deadline','destroy-progress','replace-progress']){
  const name=mode+':'+scenario;if(process.env.CASES&&!process.env.CASES.split(',').includes(name))continue;
  state={mode:'normal',requests:0,slowRequests:0,progress:0,aborts:0,completed:0};
  const r={name,server:state};result.cases.push(r);const page=await browser.newPage();page.setDefaultTimeout(30000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);
   await page.evaluate(async mode=>{window.errors=[];window.cancellations=[];window.player=new Player(document.querySelector('#host'),{mode,width:640,height:360});player.addEventListener('error',e=>{if(e.detail?.code==='ABORTED')cancellations.push(e.detail);else errors.push(String(e.detail?.message||e.detail));});window.seekError=e=>{if(e.code!=='ABORTED')errors.push(String(e));};await player.openRemote({url:location.origin+'/media.mp4'});await player.play();},mode);
   await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.2);await page.evaluate(()=>player.pause());
   r.before=await page.evaluate(()=>player.diagnostics.backend);
   state.mode=scenario==='accepted-seek-cancel'?'slow':'deadline';
   await page.evaluate(direct=>{window.seekTarget=t=>direct?player.current.backend.seek(t):player.seek(t);window.firstSeek=seekTarget(500).catch(seekError);},directEngineSeek);
   await until(()=>state.progress>0);await page.waitForFunction(()=>player.diagnostics?.backend?.ioPending);
   const began=Date.now();
   if(scenario==='destroy-progress'){
    await page.evaluate(()=>player.destroy());r.destroyMs=Date.now()-began;assert.ok(r.destroyMs<5000);
    await until(()=>state.aborts>0);await page.waitForTimeout(200);assert.equal(page.workers().length,0);
   }else if(scenario==='replace-progress'){
    replacementState={mode:'normal',requests:0,slowRequests:0,progress:0,aborts:0,completed:0};r.replacementServer=replacementState;
    await page.evaluate(async()=>{await player.openRemote({url:location.origin+'/replacement.mp4'});await player.play();});
    await until(()=>state.aborts>0);r.replacementMs=Date.now()-began;
    await page.waitForFunction(()=>player.properties.get('time-pos')>2&&player.properties.get('time-pos')<10);
    assert.deepEqual(await page.evaluate(()=>errors),[]);
    assert.ok(await page.evaluate(()=>player.audioDiagnostics().rms)>.001);
    r.after=await page.evaluate(()=>({diagnostics:player.diagnostics.backend,errors,cancellations}));
    assert.ok(r.after.diagnostics.presentedPosition<10,'Old seek output must not enter the new source');
    await page.evaluate(()=>player.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);
   }else{
    if(scenario==='accepted-seek-cancel'){
     await page.evaluate(()=>{window.secondSeek=seekTarget(40).catch(seekError);});
     await until(()=>state.aborts>0,1500);r.cancellationMs=Date.now()-began;assert.ok(r.cancellationMs<1500,'Accepted seek must cancel abandoned I/O promptly');
     state.mode='normal';await page.waitForFunction(()=>!player.diagnostics?.backend?.seeking&&Math.abs(player.diagnostics?.backend?.presentedPosition-40)<.3);
     assert.deepEqual(await page.evaluate(()=>errors),[]);
     await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.properties.get('time-pos')>42);
     assert.ok(await page.evaluate(()=>player.audioDiagnostics().rms)>.001);
    }else{
     await page.waitForFunction(()=>errors.some(e=>e.includes('Media read retry deadline exceeded')),{},{timeout:18000});
     r.deadlineMs=Date.now()-state.startedAt;assert.ok(r.deadlineMs>=14000&&r.deadlineMs<18000);
     assert.ok(state.progress>1024,'successful progress continued before deadline');
     // The browser error arrives over Playwright before Node necessarily
     // observes TCP closure. Require closure before teardown, with its own
     // short bound, rather than sampling another event loop synchronously.
     const failedAt=Date.now();await until(()=>state.aborts>0,1000);r.deadlineCloseMs=Date.now()-failedAt;
    }
    r.after=await page.evaluate(()=>({diagnostics:player.diagnostics.backend,errors,cancellations}));
    if(scenario==='accepted-seek-cancel'&&!directEngineSeek)assert.ok(r.after.cancellations.some(e=>e.operation==='seeking'||e.operationKind==='seeking'),'Superseded seek reports operation cancellation');
    if(scenario==='accepted-seek-cancel')assert.ok(r.after.diagnostics.interruptions>r.before.interruptions,'Demux accepted cancellation must advance its epoch');
    await page.evaluate(()=>player.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);
   }
   r.passed=true;console.log('PASS',name);
  }catch(e){r.error=String(e.stack);r.state=await page.evaluate(()=>({diagnostics:window.player?.diagnostics,errors:window.errors})).catch(()=>null);process.exitCode=1;console.log('FAIL',name,r.error);}
  finally{await page.evaluate(()=>window.player?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.cases.length>0&&result.cases.every(r=>r.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
