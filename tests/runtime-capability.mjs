// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const pcm=process.env.DEMUXE_PCM24_FIXTURE||'build/fixtures/runtime-capability/pcm24.mkv';
const out=`results/runtime-capability/browser-${Date.now()}`;await mkdir(out,{recursive:true});
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={browser:browser.version(),fixture:resolve(pcm),cases:[]};
async function check(name,fn,options={}){
 const page=await browser.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
 const result={name};results.cases.push(result);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async options=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),options);const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);window.states=[];},options);
  await fn(page,requests,result);
  result.diagnostics=await page.evaluate(()=>player.diagnostics);
  await page.evaluate(()=>player.destroy());await page.waitForTimeout(150);
  assert.equal(page.workers().length,0);assert.equal(await page.locator('.demuxe-player video, .deplexr-player video, .demuxe-player canvas, .deplexr-player canvas').count(),0);
  result.passed=true;console.log('PASS',name);
 }catch(error){result.error=String(error.stack);result.diagnostics=await page.evaluate(()=>player.diagnostics).catch(()=>null);process.exitCode=1;console.log('FAIL',name,String(error));}
 finally{result.requests=requests;await page.evaluate(()=>player.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2));}
}
const open=async(page,file)=>{await page.locator('#file').setInputFiles(file);await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));};
const verifyNative=async(page)=>{
 const d=await page.evaluate(()=>player.diagnostics);
 assert.equal(d.mode,'native');assert.equal(d.plan.id,'native-direct');
 const r=d.runtimeCapabilities.find(r=>r.planId==='native-direct');
 assert.equal(r.state,'prepared');assert.equal(r.evidence.prepared,true);assert.notEqual(r.evidence.outputVerified,true);
 assert.equal(d.runtimeCapabilities.find(r=>r.planId==='hybrid').state,'untested');
 await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.15);assert.equal(await page.evaluate(()=>player.diagnostics.runtimeCapabilities.find(r=>r.planId===player.diagnostics.plan.id).state),'verified');await page.evaluate(()=>player.pause());
};
try{
 await check('gain changes synchronize current capability and later failure invalidates it',async(page)=>{
  await open(page,'fixtures/example.mp4');
  await page.evaluate(()=>player.play());await page.evaluate(()=>player.setAudioGain(.5));
  let d=await page.evaluate(()=>player.diagnostics);
  assert.equal(d.plan.id,'native-direct-gain');
  let r=d.runtimeCapabilities.find(r=>r.planId===d.plan.id);
  assert.equal(r.eligible,true);assert.equal(r.state,'verified');assert.equal(r.evidence.playbackReady,true);
  assert.equal(d.runtimeCapabilities.find(r=>r.planId==='native-direct').eligible,false);
  await page.evaluate(()=>player.setAudioGain(1));
  d=await page.evaluate(()=>player.diagnostics);
  assert.equal(d.plan.id,'native-direct');assert.equal(d.runtimeCapabilities.find(r=>r.planId===d.plan.id).state,'verified');
  await page.evaluate(()=>player.setAudioGain(.5));
  // A terminal session error must now invalidate the gain plan rather than being ignored.
  await page.evaluate(()=>player.current.backend.dispatchEvent(new CustomEvent('error',{detail:new Error('Source transport: HTTP 403')})));
  d=await page.evaluate(()=>player.diagnostics);r=d.runtimeCapabilities.find(r=>r.planId==='native-direct-gain');
  assert.equal(r.state,'failed');assert.equal(r.failureKind,'terminal');
 });
 for(const message of ['Remux random-access interval exceeds fragment production budget','Remux timeline gap exceeds forward buffer budget','Adapted track timelines cannot progress within the preparation budget; use Hybrid']){
  await check('preparation limit advances to Hybrid: '+message,async(page)=>{
   await page.evaluate(async message=>{
    const {NativePlayer}=await import('/web/generated/internal/native-player.js');const {PlayerError}=await import('/web/generated/internal/errors.js');let first=true;
    NativePlayer.prototype.open=async function(){if(first){first=false;throw new PlayerError('UNSUPPORTED_MEDIA','Test direct rejection');}throw Error(message);};
   },message);
   await open(page,'fixtures/example.mp4');
   const d=await page.evaluate(()=>player.diagnostics);
   assert.equal(d.plan.id,'hybrid');assert.equal(d.runtimeCapabilities.find(r=>r.planId==='native-remux').failureKind,'compatibility');
   assert.equal(d.runtimeCapabilities.find(r=>r.planId==='hybrid').state,'verified');
  });
 }
 await check('PCM24 original bytes accepted without optional engines',async(page,requests)=>{
  await page.evaluate(()=>{HTMLMediaElement.prototype.canPlayType=()=>'';});
  await open(page,pcm);await verifyNative(page);
  assert.ok(!requests.some(r=>/engine-adaptation|engine-hybrid|engine-software|native-remux-player|wasm-player/.test(r)));
  await page.screenshot({path:out+'/pcm24.png'});
 },{automaticAudioAdaptation:'lossless'});
 await check('every new source validates startup despite prior success',async(page)=>{
  await open(page,pcm);const first=await page.evaluate(()=>({id:player.diagnostics.runtimeCapabilities[0].sourceIdentity,surface:player.surface===player.surface}));
  await page.evaluate(()=>{window.oldSurface=player.surface;});await open(page,pcm);await verifyNative(page);
  assert.notEqual(await page.evaluate(()=>player.diagnostics.runtimeCapabilities[0].sourceIdentity),first.id);
  assert.equal(await page.evaluate(()=>oldSurface.isConnected),false);
 });
 await check('real Native media rejection advances once to remux and retires failed element',async(page)=>{
  // Corrupt only the direct candidate input. Remux still receives the original
  // source; the browser, rather than a fabricated error, rejects the direct bytes.
  await page.evaluate(async()=>{
   const {NativePlayer}=await import('/web/generated/internal/native-player.js');const load=NativePlayer.prototype.load;let first=true;
   NativePlayer.prototype.load=async function(url){if(!first)return load.call(this,url);first=false;window.failedVideo=this.video;const bad=URL.createObjectURL(new Blob(['invalid media']));try{return await load.call(this,bad);}finally{URL.revokeObjectURL(bad);}};
  });
  await open(page,'fixtures/example.mp4');
  await page.evaluate(()=>player.play());const d=await page.evaluate(()=>player.diagnostics);assert.equal(d.plan.id,'native-remux');
  assert.equal(d.runtimeCapabilities.find(r=>r.planId==='native-direct').state,'failed');
  const remux=d.runtimeCapabilities.find(r=>r.planId==='native-remux');assert.equal(remux.state,'verified');
  assert.equal(remux.evidence.sourceBufferCreated,true);assert.equal(remux.evidence.initAccepted,true);assert.equal(remux.evidence.mediaAccepted,true);
  assert.equal(await page.evaluate(()=>failedVideo.isConnected),false);assert.equal(await page.evaluate(()=>failedVideo.getAttribute('src')),null);
  await page.evaluate(()=>{failedVideo.dispatchEvent(new Event('loadeddata'));failedVideo.dispatchEvent(new Event('error'));});
  assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),'native-remux');
 });
 await check('Native failures advance sequentially to actual Hybrid output',async(page)=>{
  await page.evaluate(async()=>{
   const {NativePlayer}=await import('/web/generated/internal/native-player.js');const load=NativePlayer.prototype.load;
   NativePlayer.prototype.load=async function(){const bad=URL.createObjectURL(new Blob(['invalid media']));try{return await load.call(this,bad);}finally{URL.revokeObjectURL(bad);}};
   MediaSource.isTypeSupported=()=>false;
  });
  await open(page,'fixtures/example.mp4');
  const d=await page.evaluate(()=>player.diagnostics);assert.equal(d.plan.id,'hybrid');
  assert.equal(d.runtimeCapabilities.find(r=>r.planId==='native-direct').state,'failed');
  assert.equal(d.runtimeCapabilities.find(r=>r.planId==='native-remux').state,'failed');
  const r=d.runtimeCapabilities.find(r=>r.planId==='hybrid');assert.equal(r.state,'verified');assert.equal(r.evidence.videoPresented,true);assert.equal(r.evidence.decoderOutput,true);
  assert.equal(await page.locator('.demuxe-player video, .deplexr-player video').count(),0);
 });
 await check('Software audio-only readiness comes from the compiled runtime; playback produces PCM',async(page)=>{
  await open(page,'build/fixtures/software-full/control.wav');
  const r=await page.evaluate(()=>player.diagnostics.runtimeCapabilities.find(r=>r.planId==='software'));
  assert.equal(r.state,'verified');assert.equal(r.evidence.audioDecoderConfigured,true);assert.equal(r.evidence.videoPresented,false);
  await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.audioDiagnostics().mediaFrames>0);await page.evaluate(()=>player.pause());
 },{mode:'software'});
 await check('hard filter requirement skips Native allocation',async(page,requests)=>{
  await open(page,'fixtures/example.mp4');assert.equal(await page.evaluate(()=>player.mode),'software');
  assert.ok(!requests.some(r=>r.endsWith('/internal/native-player.js')));
  const record=await page.evaluate(()=>player.diagnostics.runtimeCapabilities.find(r=>r.planId==='native-direct'));
  assert.equal(record.eligible,false);assert.equal(record.state,'untested');assert.match(record.reason,/filters/i);
 },{videoFilters:'hflip'});
 await check('transport failure is terminal and preserves accepted session',async(page)=>{
  await open(page,'fixtures/example.mp4');
  const r=await page.evaluate(async()=>{
   const {NativePlayer}=await import('/web/generated/internal/native-player.js');const original=NativePlayer.prototype.load;
   NativePlayer.prototype.load=async()=>{throw Error('Source transport: HTTP 403');};const old=player.surface;
   try{await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'replacement.mp4'));return {failed:false};}catch(error){return {failed:true,message:String(error),same:old===player.surface,records:player.diagnostics.runtimeCapabilities};}finally{NativePlayer.prototype.load=original;}
  });
  assert.equal(r.failed,true);assert.equal(r.same,true);assert.match(r.message,/403/);assert.equal(r.records.find(r=>r.planId==='native-remux').state,'untested');
 });
 await check('terminal direct transport cannot initialize remux or other engines',async(page,requests)=>{
  await page.evaluate(async()=>{const {NativePlayer}=await import('/web/generated/internal/native-player.js');NativePlayer.prototype.load=async()=>{throw Error('Source transport: HTTP 403');};});
  await assert.rejects(()=>open(page,'fixtures/example.mp4'),/403/);
  const records=await page.evaluate(()=>player.diagnostics.runtimeCapabilities);assert.equal(records.find(r=>r.planId==='native-direct').failureKind,'terminal');
  assert.equal(records.find(r=>r.planId==='native-remux').state,'untested');assert.ok(!requests.some(r=>/native-remux-player|engine-hybrid|engine-software/.test(r)));
 });
 await check('actual HTTP denial is terminal, not codec incompatibility',async(page,requests)=>{
  await page.route('**/denied.mp4',route=>route.fulfill({status:403,body:'forbidden'}));
  await assert.rejects(()=>page.evaluate(url=>player.open(url),server.origin+'/denied.mp4'),/403/);
  const d=await page.evaluate(()=>player.diagnostics);
  // Explicit Native now inspects requested tracks before constructing a plan.
  // Authorization fails at that source boundary: no codec candidate was attempted.
  assert.deepEqual(d.runtimeCapabilities,[]);
  assert.deepEqual(d.planAdmission,[]);
  assert.ok(!requests.some(r=>/native-remux-player|engine-hybrid|engine-software/.test(r)));
 },{mode:'native'});
 await check('destroy interrupts a stalled preparation import without orphan resources',async(page)=>{
  let seen;const requested=new Promise(resolve=>seen=resolve);
  await page.route('**/native-remux-player.js',()=>seen());
  await page.locator('#file').setInputFiles('fixtures/example.mp4');
  await page.evaluate(()=>{window.opening=player.open(document.querySelector('#file').files[0]).then(()=>false,()=>true);});
  await requested;
  const r=await page.evaluate(()=>Promise.race([player.destroy().then(async()=>({destroyed:true,rejected:await opening})),new Promise(resolve=>setTimeout(()=>resolve({destroyed:false}),1500))]));
  assert.deepEqual(r,{destroyed:true,rejected:true});
 },{mode:'native',nativeRemux:'always'});
 await check('destroy during Native readiness cancels candidate and late output',async(page)=>{
  await page.route('**/fixtures/slow.mp4',()=>{});
  await page.evaluate(async url=>{
   const {NativePlayer}=await import('/web/generated/internal/native-player.js');const load=NativePlayer.prototype.load;
   NativePlayer.prototype.load=function(){window.failedVideo=this.video;return load.call(this,url);};
  },server.origin+'/fixtures/slow.mp4');
  await page.locator('#file').setInputFiles('fixtures/example.mp4');
  await page.evaluate(()=>{window.opening=player.open(document.querySelector('#file').files[0]).then(()=>false,()=>true);});
  await page.waitForFunction(()=>window.failedVideo?.getAttribute('src'));
  assert.equal(await page.evaluate(()=>player.diagnostics.runtimeCapabilities.find(r=>r.planId==='native-direct').state),'probing');
  await page.evaluate(()=>player.destroy());assert.equal(await page.evaluate(()=>opening),true);
  assert.equal(await page.evaluate(()=>failedVideo.getAttribute('src')),null);
  await page.evaluate(()=>failedVideo.dispatchEvent(new Event('loadeddata')));
 });
}finally{await browser.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2));console.log(out);}
