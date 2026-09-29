// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
// SHORT_TAIL=1 retains the 120 ms startup-timeout reproducer (also failed with the HEAD controller).
const shortTail=process.env.SHORT_TAIL==='1';
const baseline=process.env.BASELINE==='1';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
import {markedAudio,markedImage} from './head-to-head/checks.mjs';
const root='build/head-to-head/assets-row-refresh-20260926-01/fixtures';
const cases=(process.env.CASES??'hevc10-ac3,h264-dts,hevc-pgs').split(',');
const out=process.env.RESULT_DIR??`results/selective-audio-scheduling/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const server=await serve({mediaPaths:Object.fromEntries(cases.map(c=>[c,path.join(root,c,'index.mkv')]))});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const name of cases){
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],phases=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(String(e)));
  const result={name,baseline,shortTail,phases,errors};results.push(result);
  try{
   if(baseline)for(const file of ['web/generated/internal/native-mpv-audio.js','web/filter-retained-engine-worker.js'])await page.route('**/'+file+'*',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'},body:execFileSync('git',['show','HEAD:'+file])}));
   if(process.env.LATENCY_HINT==='playback'){const body=(await readFile('web/generated/internal/wasm-player.js','utf8')).replace("latencyHint: 'interactive'","latencyHint: this.audioOnly ? 'playback' : 'interactive'");await page.route('**/web/generated/internal/wasm-player.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body}));}
   await page.addInitScript(installAudioProbe);
   await page.addInitScript(()=>{window.frameRequests=0;const original=HTMLVideoElement.prototype.requestVideoFrameCallback;HTMLVideoElement.prototype.requestVideoFrameCallback=function(...args){frameRequests++;return original.apply(this,args);};});
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async name=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:'/media/'+name,format:'file'});await player.play();
   },name);
   const plan=name==='hevc-pgs'?'native-video-mpv-audio-subtitles':'native-video-mpv-audio';
   const snapshot=async label=>{const state=await page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,h=a.engine.audioHeader;return {plan:player.diagnostics.plan.id,time:player.state.currentTime,duration:player.state.duration,paused:b.video.paused,rate:player.state.playbackRate,frameRequests,ticks:a.engine.diagnostics?.pumpTicks,sampleRate:a.engine.audioContext.sampleRate,header:Array.from(h),audio:a.diagnostics,videoEnded:b.video.ended,failures};});phases.push({label,state});assert.equal(state.plan,plan);assert.deepEqual(state.failures,[]);assert.equal(state.audio.mpvVideoTracks,0);return state;};
   const tones=async()=>{await page.waitForTimeout(250);const audio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok(markedAudio({audio}),JSON.stringify(audio));};
   await page.waitForFunction(()=>player.state.currentTime>1);
   await tones();const first=await snapshot('steady-start');await page.waitForTimeout(1500);const steady=await snapshot('steady-end');
   if(!baseline)assert.equal(steady.frameRequests,first.frameRequests,'no continuous video-frame EOF observer');
   await page.evaluate(()=>player.pause());const paused=await snapshot('pause');await page.waitForTimeout(700);const still=await snapshot('paused');assert.ok(Math.abs(still.time-paused.time)<.08);
   await page.evaluate(()=>player.play());await tones();await snapshot('resume');
   for(const rate of [.5,2,1]){await page.evaluate(rate=>player.setPlaybackRate(rate),rate);await page.waitForTimeout(700);await tones();const s=await snapshot('rate-'+rate);assert.equal(s.rate,rate);}
   for(const target of [12,2]){await page.evaluate(t=>player.seek(t),target);await page.waitForFunction(t=>player.state.currentTime>t+.3,target);await tones();await snapshot('seek-'+target);}
   await page.evaluate(async()=>{await player.pause();await player.seek(3);});
   assert.ok(markedImage(await page.locator('#surface').screenshot(),3).markerCorrect,'paused seek video marker');
   const sought=await snapshot('paused-seek');assert.ok(sought.paused);assert.ok(Math.abs(sought.time-3)<.3);
   await page.evaluate(()=>player.play());await tones();await snapshot('paused-seek-resume');
   const drain=async label=>{
    await page.waitForFunction(()=>{const b=player.current.backend,a=b.mpvAudio,h=a.engine.audioHeader;return b.video.ended&&a.engine.audioContext.state==='suspended'&&Atomics.load(h,0)===Atomics.load(h,1);},undefined,{timeout:10000});
    const end=await snapshot(label);assert.equal(end.header[7],2);assert.equal(end.header[12],0);assert.equal(end.header[0],end.header[1]);assert.equal(end.audio.preEofUnderruns,0);
   };
   for(const rate of [.5,2]){
    await page.evaluate(async rate=>{await player.setPlaybackRate(rate);await player.seek(player.state.duration-1.2);},rate);
    await drain('EOF-'+rate);
    await page.evaluate(async()=>{await player.seek(2);await player.play();});await tones();await snapshot('replay-'+rate);
   }
   await page.evaluate(async remaining=>{await player.setPlaybackRate(1);await player.pause();await player.seek(player.state.duration-remaining);},shortTail?.12:1.2);
   const tail=await snapshot('paused-tail');if(shortTail&&!baseline)assert.equal(tail.header[7],1,'tail is armed before playback');
   await page.evaluate(()=>player.play());await drain('paused-tail-EOF');
   await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});await page.waitForTimeout(300);assert.equal(page.workers().length,0);assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(errors,[]);
   result.passed=true;console.log('PASS',name,'rates, seeks, EOF drain, replay, cleanup');
  }catch(error){result.error=String(error.stack);result.failureState=await page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio;return {state:player.state,video:{time:b.video.currentTime,ended:b.video.ended,paused:b.video.paused,readyState:b.video.readyState},audio:a?.diagnostics,header:a?Array.from(a.engine.audioHeader):null,diagnostics:player.diagnostics,failures};}).catch(()=>null);console.error('FAIL',name,result.error);}
  finally{await writeFile(path.join(out,name+'.json'),JSON.stringify(result,null,2));await page.close();}
 }
}finally{await browser.close();await server.close();}
assert.ok(results.every(r=>r.passed),`Failed scenarios: ${out}`);console.log('Evidence:',out);
