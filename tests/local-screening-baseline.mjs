// SPDX-License-Identifier: Apache-2.0
// Narrow direct-route baseline; no optimization or fidelity qualification claim.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.env.RESULT_ROOT||`results/local-screening/runs/direct-${Date.now()}`;
await mkdir(out,{recursive:true});
const result={scope:'Native direct lifecycle and missing-video evidence control; audio counters are not a PCM oracle',cases:[],assets:{}};
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try {
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.once('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 result.origin=origin;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const negative of [false,true]){
  const page=await browser.newPage(),row={name:negative?'missing-video-negative':'direct-lifecycle'};result.cases.push(row);
  const pending=[];
  page.on('response',response=>{const url=new URL(response.url());if(/\.(js|mjs|wasm)$/.test(url.pathname))pending.push((async()=>{const bytes=await response.body(),local=url.pathname==='/index.js'?Buffer.from("export * from './web/generated/index.js';"):await readFile('.'+url.pathname);assert.equal(hash(bytes),hash(local));result.assets[url.pathname]=hash(bytes);})().catch(error=>({error:String(error)})));});
  try {
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async()=>{await window.player?.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'never'});window.errors=[];player.addEventListener('error',e=>errors.push(e.detail));await player.open(new File([await (await fetch('/fixtures/example.mp4')).blob()],'example.mp4'));window.preparedSurface=player.surface;window.preparedBackend=player.current.backend;});
   row.prepared=await page.evaluate(()=>({state:player.state,diagnostics:player.diagnostics,isolation:crossOriginIsolated}));
   assert.equal(row.prepared.diagnostics.plan.id,'native-direct');
   if(negative){
    await page.evaluate(()=>{Object.defineProperty(player.surface,'getVideoPlaybackQuality',{value:()=>({totalVideoFrames:0,droppedVideoFrames:0})});Object.defineProperty(player.surface,'requestVideoFrameCallback',{value:()=>0});});
    await assert.rejects(()=>page.evaluate(()=>player.play()),/evidence timed out/);
    row.rejected=await page.evaluate(()=>player.diagnostics);
    assert.notEqual(row.rejected.runtimeCapabilities.find(x=>x.planId==='native-direct').state,'verified');
   }else{
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.25);
    row.playing=await page.evaluate(()=>({state:player.state,diagnostics:player.diagnostics,frames:{totalVideoFrames:player.surface.getVideoPlaybackQuality().totalVideoFrames,droppedVideoFrames:player.surface.getVideoPlaybackQuality().droppedVideoFrames}}));
    assert.ok(row.playing.frames.totalVideoFrames>0);
    row.retainedPreparation=await page.evaluate(()=>({surface:preparedSurface===player.surface,backend:preparedBackend===player.current.backend}));assert.deepEqual(row.retainedPreparation,{surface:true,backend:true});
    await page.evaluate(()=>player.seek(6));row.seek=await page.evaluate(()=>player.state);
    assert.ok(Math.abs(row.seek.currentTime-6)<1);
    await page.evaluate(()=>player.seek(11));await page.waitForFunction(()=>player.surface.ended,null,{timeout:15000});row.eof=true;
    assert.deepEqual(await page.evaluate(()=>errors),[]);
   }
   await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);row.workersAfter=page.workers().length;assert.equal(row.workersAfter,0);
   const assets=await Promise.all(pending);assert.deepEqual(assets.filter(x=>x?.error),[]);row.passed=true;
  }catch(error){row.error=String(error.stack);process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();}
 }
 const page=await browser.newPage(),scrub={name:'R40-maintained-component-scrub'};result.cases.push(scrub);
 try{
  await page.goto(origin+'/web/player.html');
  await page.evaluate(async()=>{const viewer=document.querySelector('#viewer');window.player=await viewer.ready;await viewer.open(new File([await(await fetch('/fixtures/example.mp4')).blob()],'example.mp4'));await player.play();await player.pause();window.seekCalls=[];const backend=player.current.backend,seek=backend.seek.bind(backend);backend.seek=async target=>{seekCalls.push(target);return seek(target);};});
  scrub.trace=await page.evaluate(async()=>{const viewer=document.querySelector('#viewer'),timeline=viewer.shadowRoot.querySelector('#timeline');for(let i=0;i<81;i++){timeline.value=String(i%2?2+i/20:9-i/20);timeline.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(r));}const beforeCommit=seekCalls.slice();timeline.value='7.3';timeline.dispatchEvent(new Event('change',{bubbles:true}));return {beforeCommit};});
  await page.waitForFunction(()=>seekCalls.length===1&&!player.state.pendingOperation&&Math.abs(player.state.currentTime-7.3)<.15);
  scrub.calls=await page.evaluate(()=>seekCalls);scrub.position=await page.evaluate(()=>player.state.currentTime);
  assert.deepEqual(scrub.trace.beforeCommit,[]);assert.deepEqual(scrub.calls,[7.3]);scrub.passed=true;
 }catch(error){scrub.error=String(error.stack);process.exitCode=1;}
 finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();}
 result.fixtureSHA256=hash(await readFile('fixtures/example.mp4'));
}catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out,JSON.stringify(result.cases.map(({name,passed,error})=>({name,passed,error}))));}
