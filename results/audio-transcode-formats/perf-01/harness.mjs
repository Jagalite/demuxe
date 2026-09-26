// SPDX-License-Identifier: Apache-2.0
// Small matched Auto versus live FLAC24 study. Known correctness blockers unchanged.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from '../pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from '../../tests/head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from '../../tests/native-url-audio-probe.mjs';
const check=process.env.CHECK_ONLY==='1',out=process.env.OUT;assert.ok(out);await mkdir(out,{recursive:false});
const qualified=JSON.parse(await readFile('results/audio-transcode-formats/check-03/result.json'));
const verified=JSON.parse(await readFile('results/audio-transcode-formats/check-03/media-verification.json'));
const cases=qualified.fixtureManifest.cases.filter(c=>['ac3','eac3','dca'].includes(c.id));const engine=qualified.engine.dir,sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await readFile(engine+'/remux.wasm')),qualified.engine.sha256);
for(const c of cases){assert.equal(sha(await readFile(c.file)),c.sha256);assert.ok(qualified.trials.find(t=>t.id===c.id&&t.accepted));assert.ok(verified.find(t=>t.id===c.id&&t.status==='passed'));}
for(const [f,h] of Object.entries(qualified.runtime))assert.equal(sha(await readFile(f)),h);
const runtime={...qualified.runtime};for(const f of ['web/generated/index.js','web/generated/unified-player.js','web/generated/internal/native-player.js','web/generated/internal/native-mpv-audio.js','web/generated/internal/wasm-player.js','web/filter-retained-engine-worker.js','web/selective-sync-worklet.js','web/engine-selective/player.wasm','web/engine-remux/remux.wasm'])runtime[f]=sha(await readFile(f));
const result={check,scope:'Three stereo codecs, same frozen 18-second fixtures and current Auto versus private live FLAC24 engine; 8-second windows; no correctness fixes',correctness:'results/audio-transcode-formats/check-03/result.json',engineSHA256:qualified.engine.sha256,runtime,cases,trials:[]};
if(!check){const q=JSON.parse(await readFile(process.env.BASELINE_CHECK));assert.deepEqual(q.runtime,runtime);assert.equal(q.engineSHA256,result.engineSHA256);for(const c of cases){assert.equal(q.cases.find(x=>x.id===c.id).sha256,c.sha256);assert.ok(q.trials.find(t=>t.codec===c.id&&t.accepted));}result.baselineCheck=process.env.BASELINE_CHECK;}
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await save();await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:Object.fromEntries(cases.map(c=>[c.id,c.file]))});let browser;
const order=check?cases.map(c=>[c.id,'auto']):[['ac3','auto'],['ac3','flac24'],['eac3','flac24'],['eac3','auto'],['dca','auto'],['dca','flac24'],['dca','flac24'],['dca','auto'],['eac3','auto'],['eac3','flac24'],['ac3','flac24'],['ac3','auto']];
try{
 console.log('STARTUP',out);const launch=await launchBenchmarkChrome({headless:false,startupGate:!check});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');const cdp=await browser.newBrowserCDPSession();
 for(const [codec,path] of order){
  const lane=codec+'/'+path,trial={lane,codec,path,errors:[]};result.trials.push(trial);const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>trial.errors.push(String(e)));
  try{
   if(path==='flac24')await context.route('**/engine-adaptation/remux.*',async route=>{const ext=new URL(route.request().url()).pathname.endsWith('.wasm')?'wasm':'mjs';await route.fulfill({contentType:ext==='wasm'?'application/wasm':'text/javascript',headers:{'Cross-Origin-Resource-Policy':'same-origin'},body:await readFile(engine+'/remux.'+ext)});});
   if(check)await page.addInitScript(installAudioProbe);
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   trial.startup=await page.evaluate(async({codec,path})=>{
    window.path=path;window.failures=[];const start=performance.now();
    if(path==='auto'){
     const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));await player.open({url:'/media/'+codec,format:'file'});
     Object.defineProperty(window,'video',{get:()=>player.current.backend.video});
    }else{
     const {RemuxPlayer}=await import('/web/native-remux-player.js');window.video=document.createElement('video');video.playsInline=true;document.querySelector('#surface').append(video);window.player=new RemuxPlayer(video,{audioAdaptation:'flac',bufferedSeeks:true,mseOwner:'window'});player.onError=e=>failures.push(String(e));await player.open({options:{url:location.origin+'/media/'+codec,format:'file'}});
    }
    window.position=()=>path==='auto'?player.state.currentTime:Math.max(0,video.currentTime-player.timelineBias);await player.play();return {openMs:performance.now()-start};
   },{codec,path});
   await page.waitForFunction(()=>position()>.2&&!!video);await delay(2000);
   const snapshot=()=>page.evaluate(()=>{const q=video.getVideoPlaybackQuality(),b=path==='auto'?player.current.backend:null,a=b?.mpvAudio,r=path==='flac24'?player:null;return {path,plan:path==='auto'?player.diagnostics.plan.id:'experimental-flac24',time:position(),videoTime:video.currentTime,paused:video.paused,ended:video.ended,rate:video.playbackRate,frames:q.totalVideoFrames,drops:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),videoError:video.error?.message,failures:[...failures,...(r?.stats.errors??[])],audioDecodedBytes:video.webkitAudioDecodedByteCount,audio:a?{underruns:a.diagnostics.preEofUnderruns,errorMs:a.diagnostics.errorMs,corrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks}:null,adaptation:r?.remuxStats.adaptation,eof:r?.eof};});
   if(check){
    const first=await snapshot();assert.equal(first.plan,'native-video-mpv-audio');assert.equal(first.audio.videoTracks,0);trial.audio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok([440,880].every((hz,ch)=>trial.audio.some(a=>a.channel===ch&&a.rms>.01&&Math.abs(a.hz-hz)<30)));await delay(1200);const last=await snapshot();trial.states=[first,last];assert.ok(last.frames-first.frames>=30);assert.equal(last.drops,first.drops);assert.equal(last.audio.underruns,first.audio.underruns);assert.ok(Math.abs(last.audio.errorMs)<50);assert.deepEqual(last.failures,[]);assert.deepEqual(trial.errors,[]);trial.accepted=true;
   }else{
    const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id),counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
    trial.nativeBefore=counters();trial.samples=await collectCpuWindow(cdp,snapshot,{seconds:8,interval:2});trial.nativeAfter=counters();trial.cpu=summarizeCpu(trial.samples);
    const a=trial.samples[0].state,b=trial.samples.at(-1).state;trial.frames=b.frames-a.frames;trial.drops=b.drops-a.drops;trial.encodedDuringWindow=(b.adaptation?.audioSamplesEncoded??0)-(a.adaptation?.audioSamplesEncoded??0);trial.plan=a.plan;
    const stateOK=trial.samples.every(s=>{const v=s.state;return v.plan===a.plan&&v.focused&&v.visible==='visible'&&!v.paused&&!v.ended&&!v.videoError&&!v.failures.length;});
    const audioOK=path==='auto'?!!b.audio&&a.plan==='native-video-mpv-audio'&&b.audio.underruns===a.audio.underruns&&b.audio.corrections===a.audio.corrections&&Math.abs(b.audio.errorMs)<50&&b.audio.frames-a.audio.frames>360000:trial.encodedDuringWindow>345600&&trial.samples.every(s=>{const v=s.state;return !v.eof&&v.adaptation.codec==='flac'&&v.adaptation.clippedSamples===0&&v.adaptation.videoFramesDecoded===0&&v.adaptation.videoFramesEncoded===0&&v.adaptation.sourceEnd-v.time<8;});
    trial.accepted=trial.cpu.processIdsStable&&stateOK&&audioOK&&trial.frames>=29*trial.cpu.wallSeconds&&!trial.drops&&!trial.errors.length;
    trial.gates={stableProcesses:trial.cpu.processIdsStable,stateOK,audioOK,frames:trial.frames,drops:trial.drops};
   }
   await page.evaluate(async()=>{await player.destroy();if(window.urlAudioProbe)await urlAudioProbe.close();});console.log(lane,trial.accepted?'PASS':'REJECT',trial.cpu?.oneCorePercent??'',trial.plan??trial.states?.[0].plan,trial.encodedDuringWindow??'');
  }catch(e){trial.error=String(e.stack);trial.failure=await page.evaluate(()=>({failures:window.failures,plan:window.path==='auto'?window.player?.diagnostics?.plan:null,video:window.video?{time:video.currentTime,error:video.error?.message}:null})).catch(()=>null);console.log(lane,'FAIL',trial.error);}
  finally{await save();await context.close();await delay(1000);}
 }
}finally{await browser?.close();await server.close();await save();}
assert.ok(result.trials.every(t=>t.accepted),'Rejected trials retained in '+out);console.log('EVIDENCE',out);
