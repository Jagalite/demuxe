// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const family=process.env.BROWSER??'chrome',out=`results/api-integration/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
const hashes={};for(const file of ['tests/integration-browser.mjs','examples/integration.html','web/generated/unified-player.js','web/generated/presentation.js','web/generated/integration/index.js','web/generated/integration/media-view.js','web/generated/media-element/index.js','web/generated/adapters/videojs.js',...(process.env.DEMUXE_RUNTIME_ROOT?[]:['web/engine-hybrid/player.wasm','web/engine-software-yuv/player.wasm']),'node_modules/media-chrome/dist/index.js','node_modules/video.js/dist/video.js'])hashes[file]=createHash('sha256').update(await readFile(file.startsWith('web/')&&process.env.DEMUXE_RUNTIME_ROOT?path.join(process.env.DEMUXE_RUNTIME_ROOT,file):file)).digest('hex');
let browser,server;const checks=[],errors=[];
try{
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);}));
 browser=await (family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
 const page=await browser.newPage();
 await page.addInitScript(()=>{const schedule=window.setInterval,cancel=window.clearInterval;window.integrationTimers={created:0,active:new Set()};window.setInterval=(...args)=>{integrationTimers.created++;const id=schedule(...args);integrationTimers.active.add(id);return id;};window.clearInterval=id=>{integrationTimers.active.delete(id);cancel(id);};});
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(String(e.stack)));
 // Serve exact installed host packages; test is offline after npm install.
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{const path=new URL(route.request().url()).pathname.replace('/npm/','').replace(/@(4\.19\.2|8\.24\.1)/,'');try{await route.fulfill({body:await readFile('node_modules/'+path),contentType:path.endsWith('.css')?'text/css':'text/javascript',headers:{'Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin'}});}catch{await route.abort();}});
 for(const provider of ['chrome','videojs']){
  if(process.env.ONLY&&provider!==process.env.ONLY)continue;
  let workers=0,requests=0;const worker=()=>workers++,request=r=>{if(r.url().includes('/fixtures/'))requests++;};page.on('worker',worker);page.on('request',request);
  try{
   await page.goto(origin+'/examples/integration.html?provider='+provider);await page.waitForFunction(()=>window.integrationReady);
   const before=await page.evaluate(()=>({id:player.state.sourceId,path:player.diagnostics.plan,host:host===player.host}));
   if(provider==='chrome')await page.locator('media-play-button').click();else await page.locator('.vjs-big-play-button').click();
   await page.waitForFunction(()=>player.state.currentTime>.25&&player.state.status==='playing');
   const play=await page.evaluate(()=>({intent:player.state.playbackIntent,paused:window.controls?controls.paused():document.querySelector('#media').paused}));assert.equal(play.paused,false);
   if(provider==='chrome')await page.locator('media-play-button').click();else await page.locator('.vjs-play-control').click();
   await page.waitForFunction(()=>player.state.playbackIntent==='pause');
   await page.evaluate(provider=>{if(provider==='chrome'){const m=document.querySelector('#media');m.volume=.4;m.muted=true;m.currentTime=1;}else{controls.volume(.4);controls.muted(true);controls.currentTime(1);}},provider);
   await page.waitForFunction(()=>Math.abs(player.state.currentTime-1)<.15&&player.state.muted&&player.state.volume===.4&&!player.state.pendingOperation);
   if(provider==='chrome'){
    await page.locator('media-fullscreen-button').click();await page.waitForFunction(()=>player.presentation.state.fullscreen);await page.evaluate(()=>player.presentation.exitFullscreen());
    await page.evaluate(()=>{const m=document.querySelector('#media');m.style.display='none';m.style.width='0px';m.style.display='block';m.style.width='320px';});
   }
   if(provider==='videojs')await page.evaluate(async()=>{
    const Tech=videojs.getTech('Demuxe');let duplicate;try{new Tech({demuxePlayer:player});}catch(error){duplicate=error.code;}if(duplicate!=='UNSUPPORTED_FEATURE')throw Error('Concurrent host ownership accepted');
    player.emit('error',new Error('Integration session failure'));if(!controls.error())throw Error('Session error missing');
    await player.open('/fixtures/example.mp4');if(controls.error())throw Error('Recovered source kept the previous fatal error');
    await player.seek(1);await player.setVolume(.4);await player.setMuted(true);
   });
   const result=await page.evaluate(async provider=>{
    const id=player.state.sourceId;const node=player.host;const pending=[];
    if(provider==='chrome'){const m=document.querySelector('#media');m.addEventListener('operationerror',e=>pending.push(e.detail));m.currentTime=-1;await new Promise(r=>setTimeout(r,20));if(pending.length!==1)throw Error('Missing setter rejection');if(m.error)throw Error('Operation poisoned session');try{m.src='https://private.example/?token=secret';throw Error('Source was accepted');}catch(e){if(e.code!=='UNSUPPORTED_FEATURE')throw e;}}
    if(provider==='videojs'){controls.on('demuxeoperationerror',e=>pending.push(e.detail));controls.playbackRate(100);await new Promise(r=>setTimeout(r,20));if(pending.length!==1||controls.error())throw Error('Video.js setter error mapping failed');}
    const failed=await player.open('/fixtures/missing-integration.mp4').then(()=>null,e=>e.code);if(!failed||id!==player.state.sourceId)throw Error('Replacement rollback lost');
    await player.setMode('hybrid');if(player.host!==node)throw Error('Host changed');await player.setMode('software');if(player.host!==node)throw Error('Host changed');await player.setMode('native');
    const oldTime=player.state.currentTime;
    if(provider==='chrome')await document.querySelector('#media').dispose();else {const relocated=document.createElement('section');document.body.append(relocated);relocated.append(node);controls.dispose();if(node.parentNode!==relocated)throw Error('Tech disposal stole a relocated host');}
    if(player.isDestroyed||!node.isConnected)throw Error('Borrowed teardown damaged owner/host');await player.play();await new Promise(r=>setTimeout(r,350));await player.pause();
    return {sourceRetained:player.state.sourceId===id,hostRetained:player.host===node,continued:player.state.currentTime>oldTime,failed,mode:player.mode};
   },provider);
   assert.equal(result.sourceRetained,true);assert.equal(result.continued,true);assert.equal(result.hostRetained,true);
   const startWorkers=workers,startRequests=requests;
   const overhead=await page.evaluate(async provider=>{
    await player.seek(1);const original=player.subscribe.bind(player);let subscriptions=0,notifications=0;const initialIntervals=integrationTimers.created;
    player.subscribe=fn=>{subscriptions++;const stop=original(state=>{notifications++;fn(state);});return()=>{subscriptions--;stop();};};
    const observe=async()=>{const start=performance.now(),before=notifications;await new Promise(r=>setTimeout(r,300));return {elapsedMs:performance.now()-start,notifications:notifications-before,subscriptions,intervalsCreated:integrationTimers.created-initialIntervals,activeIntervals:integrationTimers.active.size,plan:player.diagnostics.plan,time:player.state.currentTime,volume:player.state.volume,muted:player.state.muted};};
    try{
     const baseline=await observe();
     if(provider==='chrome'){const media=document.querySelector('#media');let synchronized=0;const listener=event=>{if(event.detail?.initial)synchronized++;};media.addEventListener('volumechange',listener);media.bind(player);media.removeEventListener('volumechange',listener);if(synchronized!==1)throw Error('Rebind failed to synchronize accepted settings');}
     else {const el=document.createElement('div');el.id='vjs-remount';el.className='video-js';document.body.append(el);window.controls=videojs(el,{techOrder:['Demuxe'],demuxe:{demuxePlayer:player},controls:true,controlBar:{progressControl:false,pictureInPictureToggle:false,subsCapsButton:false,fullscreenToggle:false},bigPlayButton:true,loadingSpinner:false,textTrackSettings:false});await new Promise(resolve=>controls.ready(resolve));}
     const mounted=await observe();
     if(provider==='chrome')await document.querySelector('#media').dispose();else controls.dispose();
     const disposed=await observe();return {baseline,mounted,disposed,cpu:null,heap:null,scope:'same paused Native runtime, warm host imports; 300ms per phase; setInterval instrumentation installed before host imports; timeout/RAF/CPU/heap not measured'};
    }finally{player.subscribe=original;}
   },provider);
   assert.equal(overhead.mounted.subscriptions,1);assert.equal(overhead.disposed.subscriptions,0);assert.equal(overhead.disposed.activeIntervals,0);assert.deepEqual(overhead.baseline.plan,overhead.mounted.plan);assert.equal(overhead.baseline.time,overhead.mounted.time);assert.equal(overhead.baseline.volume,overhead.mounted.volume);assert.equal(overhead.baseline.muted,overhead.mounted.muted);
   overhead.newWorkers=workers-startWorkers;overhead.fixtureRequests=requests-startRequests;
   assert.equal(overhead.newWorkers,0);assert.equal(overhead.fixtureRequests,0);
   await page.evaluate(async provider=>{if(provider==='videojs'){const Tech=videojs.getTech('Demuxe'),tech=new Tech({demuxePlayer:player});document.body.append(tech.el());const host=player.host;await player.destroy();tech.dispose();if(host.isConnected)throw Error('Disposed Tech resurrected destroyed host');}else await player.destroy();},provider);
   if(errors.length)throw Error('Unexpected page errors: '+errors.join('\n'));
   checks.push({provider,passed:true,before,result,overhead,workers,fixtureRequests:requests});console.log('PASS',provider);
  }catch(error){checks.push({provider,passed:false,error:String(error.stack),pageErrors:[...errors]});process.exitCode=1;console.log('FAIL',provider,String(error));}
  page.off('worker',worker);page.off('request',request);
 }
}finally{
 const fixture=await readFile('fixtures/example.mp4');
 await writeFile(out+'/result.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser?await browser.version():null,family,hashes,platform:process.platform,hosts:{'media-chrome':'4.19.2','video.js':'8.24.1'},fixtureSha256:createHash('sha256').update(fixture).digest('hex'),checks,pageErrors:errors},null,2));
 await browser?.close();server?.kill();console.log(out);
}
