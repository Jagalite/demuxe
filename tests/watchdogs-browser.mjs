// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const out=`results/watchdogs/browser-${Date.now()}`;await mkdir(out,{recursive:true});
const fixtureRoot=`build/watchdog-timing-${Date.now()}`;await mkdir(fixtureRoot,{recursive:true});
execFileSync('ffmpeg',['-v','error','-n','-stream_loop','1','-i','fixtures/example.mp4','-vf',"select='not(between(t,2,14))'",'-fps_mode','vfr','-c:v','libx264','-preset','ultrafast','-c:a','copy',fixtureRoot+'/held.mp4']);
execFileSync('ffmpeg',['-v','error','-n','-i','fixtures/example.mp4','-filter_complex','[0:v]trim=duration=2,setpts=PTS-STARTPTS[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','ultrafast','-c:a','copy',fixtureRoot+'/short-video.mp4']);
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={browser:browser.version(),fixture:'fixtures/example.mp4',cases:[]};
async function check(name,fn,options={},fixture='fixtures/example.mp4'){
 const page=await browser.newPage(),result={name,fixture};results.cases.push(result);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async options=>{
   const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{watchdogs:{nativeProgressTimeoutMs:1000},...options});
   window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));
   const input=document.createElement('input');input.id='file';input.type='file';document.body.append(input);
  },options);
  await page.locator('#file').setInputFiles(fixture);
  await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
  await fn(page);
  result.diagnostics=await page.evaluate(()=>player.diagnostics);result.passed=true;
  await page.evaluate(()=>player.destroy());
  const end=Date.now()+5000;while(page.workers().length&&Date.now()<end)await page.waitForTimeout(50);
  assert.equal(page.workers().length,0);console.log('PASS',name);
 }catch(error){result.passed=false;result.error=String(error.stack);process.exitCode=1;console.log('FAIL',name,String(error));}
 finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2));}
}
const freezeClock=async page=>{
 await page.evaluate(()=>player.play());
 await page.evaluate(()=>{window.oldBackend=player.current.backend;window.video=player.surface;const time=video.currentTime;Object.defineProperty(video,'currentTime',{configurable:true,get:()=>time});});
};
const healthy=async page=>{await page.waitForTimeout(2200);assert.equal(await page.evaluate(()=>player.state.error),null);};
const stalled=async(page,part='clock')=>{
 await page.waitForFunction(()=>player.state.error!==null,null,{timeout:5000});
 const result=await page.evaluate(()=>({error:player.state.error,errors,same:player.current.backend===oldBackend,cached:player.tierAttempts.reason(player.source,player.tierConfiguration(),player.diagnostics.plan.id)}));
 assert.equal(result.error.code,'PLAYBACK_STALLED');assert.equal(result.error.retryable,true);assert.match(result.error.message,new RegExp(part));
 assert.equal(result.same,true);assert.equal(result.cached,undefined);assert.equal(result.errors.length,1);
};
try{
 await check('Native detects a frozen clock once without codec fallback',async page=>{await freezeClock(page);await stalled(page);});
 await check('master disable survives open and runtime enable gets a fresh budget',async page=>{
  await freezeClock(page);await healthy(page);
  assert.equal(await page.evaluate(()=>player.monitor===undefined),true);
  await page.evaluate(()=>player.setWatchdogs({nativeProgressTimeoutMs:1000}));await stalled(page);
 },{watchdogs:false});
 await check('individual disable, policy validation and dynamic master disable',async page=>{
  await freezeClock(page);
  await page.evaluate(()=>player.setWatchdogs({nativeProgress:false}));await healthy(page);
  const state=await page.evaluate(()=>{const before=player.watchdogs;let code;try{player.setWatchdogs({nativeProgress:'false'});}catch(e){code=e.code;}return {code,unchanged:before===player.watchdogs,policy:player.diagnostics.watchdogs};});
  assert.equal(state.code,'INVALID_ARGUMENT');assert.equal(state.unchanged,true);assert.equal(state.policy.decoderOutput,true);assert.equal(state.policy.nativeProgress,false);
  await page.evaluate(()=>{player.setWatchdogs(false);delete video.currentTime;});
  await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
  assert.equal(await page.evaluate(()=>player.watchdogs.nativeProgress),false);
 });
 for(const guard of ['pause','seek','buffering','hidden','eof','unbuffered'])await check('Native suppresses frozen-clock diagnosis during '+guard,async page=>{
  await freezeClock(page);
  await page.evaluate(guard=>{
   if(guard==='pause')Object.defineProperty(video,'paused',{configurable:true,get:()=>true});
   if(guard==='seek')Object.defineProperty(video,'seeking',{configurable:true,get:()=>true});
   if(guard==='buffering')Object.defineProperty(video,'readyState',{configurable:true,get:()=>2});
   if(guard==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}
   if(guard==='eof')Object.defineProperty(video,'currentTime',{configurable:true,get:()=>video.duration-.1});
   if(guard==='unbuffered')Object.defineProperty(video,'buffered',{configurable:true,get:()=>({length:0})});
  },guard);await healthy(page);
 });
 await check('known active video detects frozen frame counters with a moving clock',async page=>{
  await page.evaluate(()=>player.play());
  await page.evaluate(()=>{window.oldBackend=player.current.backend;const video=player.surface,track=player.sourceInspection.probe.tracks.find(t=>t.type==='video');if(!track.frameTiming)throw Error('Production frame timing missing');video.getVideoPlaybackQuality=()=>({totalVideoFrames:100,droppedVideoFrames:0});});
  await stalled(page,'video');
 });
 for(const [name,file] of [['shorter video track','short-video.mp4'],['long-held VFR frame','held.mp4']])await check('Native accepts real '+name,async page=>{
  const timing=await page.evaluate(()=>player.sourceInspection.probe.tracks.find(t=>t.type==='video').frameTiming);
  assert.ok(timing);if(file==='held.mp4')assert.ok(timing.maxIntervalSeconds>=12);else assert.ok(timing.endTime<=2.1);
  await page.evaluate(()=>player.play());await page.waitForTimeout(5500);
  assert.equal(await page.evaluate(()=>player.state.error),null);assert.ok(await page.evaluate(()=>player.state.currentTime>4));
 },{},fixtureRoot+'/'+file);
 await check('normal Native pause, seek, resume and EOF stay healthy',async page=>{
  await page.evaluate(()=>player.play());await healthy(page);await page.evaluate(()=>player.pause());await healthy(page);
  await page.evaluate(()=>player.seek(1));await page.evaluate(()=>player.play());await healthy(page);
  await page.evaluate(async()=>{await player.seek(player.state.duration-.3);await player.play();});
  await page.waitForFunction(()=>player.state.status==='ended');assert.equal(await page.evaluate(()=>player.state.error),null);
 });
 for(const mode of ['native','hybrid'])await check(mode+' monitor sleeps while paused or hidden and resumes',async page=>{
  await page.evaluate(()=>player.play());assert.equal(await page.evaluate(()=>player.monitor!==undefined),true);
  await page.evaluate(()=>player.pause());assert.equal(await page.evaluate(()=>player.monitor===undefined),true);
  await page.evaluate(()=>player.play());assert.equal(await page.evaluate(()=>player.monitor!==undefined),true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>player.monitor===undefined),true);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>player.monitor!==undefined),true);
  await page.evaluate(()=>player.close());assert.equal(await page.evaluate(()=>player.monitor===undefined),true);
 },{mode});
 await check('decoder watchdog policy reaches the worker initially and after updates',async page=>{
  await page.waitForFunction(()=>player.diagnostics.backend.decoderStats?.outputWatchdogEnabled===false);
  await page.evaluate(()=>player.setWatchdogs({decoderOutput:true,hybridDecoder:false}));
  await page.waitForFunction(()=>player.diagnostics.backend.decoderStats?.outputWatchdogEnabled===true);
  await page.evaluate(()=>player.setWatchdogs(false));
  await page.waitForFunction(()=>player.diagnostics.backend.decoderStats?.outputWatchdogEnabled===false);
  const worker=page.workers().find(w=>w.url().includes('/retained-decoder-worker.js'));
  await worker.evaluate(()=>{setTimeout(()=>{throw Error('Crash with watchdogs disabled');},0);});
  await page.waitForFunction(()=>player.state.error!==null);assert.equal(await page.evaluate(()=>player.state.error.code),'ASSET_LOAD_FAILED');
 },{mode:'hybrid',watchdogs:false});
 await check('component supports policy before connection and at runtime',async page=>{
  const result=await page.evaluate(async()=>{
   const {definePlayerElement}=await import('/web/generated/player/index.js');definePlayerElement();
   const element=document.createElement('demuxe-player');element.watchdogs=false;document.body.append(element);
   const core=await element.ready,initial=core.watchdogs;
   element.watchdogs={nativeProgress:false};const updated=core.watchdogs;
   await element.destroy();element.remove();return {initial,updated};
  });
  assert.equal(result.initial.decoderOutput,false);assert.equal(result.updated.nativeProgress,false);assert.equal(result.updated.decoderOutput,true);
 });
 await check('Hybrid decoder-health switch applies independently during playback',async page=>{
  await page.evaluate(()=>player.play());
  await page.evaluate(()=>{const backend=player.current.backend;let diagnostics=backend.diagnostics;Object.defineProperty(backend,'diagnostics',{configurable:true,get:()=>({...diagnostics,decoder:'software'}),set:value=>{diagnostics=value;}});});
  await healthy(page);
  await page.evaluate(()=>player.setWatchdogs({...player.watchdogs,hybridDecoder:true}));
  await page.waitForFunction(()=>player.state.error!==null,null,{timeout:5000});
  assert.equal(await page.evaluate(()=>player.state.error.code),'DECODE_FAILED');
 },{mode:'hybrid',watchdogs:{hybridDecoder:false}});
}finally{await browser.close();await server.close();console.log(out);}
