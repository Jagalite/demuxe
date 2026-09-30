// SPDX-License-Identifier: Apache-2.0
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
import {markedAudio} from './head-to-head/checks.mjs';
const root=path.resolve('results/mpv-runtime-isolation'),check=!!process.env.CHECK_ONLY;
const out=path.join(root,process.env.RUN??(check?'check-01':'cpu-01'));await mkdir(out,{recursive:false});
await writeFile(root+'/page.html','<style>body{margin:0;background:black}#surface{position:relative;width:960px;height:540px}video{width:100%;height:100%;object-fit:contain}</style><div id="surface"></div>');
await writeFile(root+'/scheduled-pcm.mjs',await readFile('tests/scheduled-pcm-prototype.mjs'));
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
await writeFile(out+'/scheduled-pcm.mjs',await readFile('tests/scheduled-pcm-prototype.mjs'));
const server=await serve(path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01'),root,out+'/requests.jsonl');
const result={purpose:'Selective mpv runtime isolation: original AC3, predecoded float PCM substituted only in mpv, and 40 ms worker polling. Test-only; not production qualification.',check,trials:[]};
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));let browser;
try{
 console.log('STARTUP');const launch=await launchBenchmarkChrome({headless:false,startupGate:!check});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');const cdp=await browser.newBrowserCDPSession();
 for(const lane of (process.env.LANES??'ac3,pcm,pump40').split(',')){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   if(check)await page.addInitScript(installAudioProbe);
   if(lane==='pump40'){
    const source=await readFile('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/demuxe/web/filter-retained-engine-worker.js','utf8');
    const anchor='schedulePump(paused&&pendingTarget===null&&pendingFrames.size===0&&performance.now()>=busyUntil?100:10);';assert.equal(source.split(anchor).length,2);
    const patched=source.replace(anchor,anchor.replace('?100:10','?100:40')).replace('audioOnly:true,pumpTicks:ticks','audioOnly:true,diagnosticPumpMs:40,pumpTicks:ticks');
    await writeFile(out+'/worker-pump40.js',patched);
    await context.route('**/web/filter-retained-engine-worker.js?*',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'},body:patched}));
   }
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async({lane,check})=>{
    const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{assetBase:'/demuxe/',...(lane==='aac-remux'?{nativeRemux:'always'}:{})});window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:lane.startsWith('aac')?'/harness/fixtures/aac.mkv':'/fixtures/hevc10-ac3/index.mkv',format:'file'});await player.play();
    window.video=player.current.backend.video;if(!video)throw Error('Did not select native video');
    await player.pause();
    if(lane==='pcm'){
     const a=player.current.backend.mpvAudio;
     await a.engine.openRemote({url:new URL('/harness/fixtures/pcm.mkv',location.href).href,format:'file'});
     await a.engine.inspectMetadata();
    }
    await player.seek(3);
    if(lane==='scheduled'){const {attachScheduledPCM}=await import('/harness/scheduled-pcm.mjs');window.scheduled=await attachScheduledPCM(player);}
    await player.play();if(check&&lane.startsWith('aac'))await urlAudioProbe.observeVideo(video);
   },{lane,check});
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,q=video.getVideoPlaybackQuality();return {mode:player.mode,plan:b.planId,position:player.state.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:video.paused,errors:failures,browserAudioBytes:video.webkitAudioDecodedByteCount,codec:a?.engine.properties.get('audio-codec-name'),worker:a?.engine.diagnostics,scheduled:window.scheduled?.stats,audio:a?{underruns:a.diagnostics.preEofUnderruns,error:a.diagnostics.errorMs,softCorrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks}:null};});
   if(check){const state=await snapshot(),audio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok(markedAudio({audio}),'stereo markers');assert.equal(state.mode,'native');if(lane==='pcm')assert.equal(state.codec,'pcm_f32le');if(lane==='pump40')assert.equal(state.worker.diagnosticPumpMs,40);assert.equal(!!state.audio,!lane.startsWith('aac'));assert.deepEqual(state.errors,[]);assert.ok(!state.scheduled||!state.scheduled.errors.length);if(state.audio)assert.ok(Math.abs(state.audio.error)<50);result.trials.push({lane,state,audio,errors,accepted:!errors.length});await save();console.log('CHECK',lane,JSON.stringify(state));continue;}
   const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id),counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
   const nativeBefore=counters(),samples=await collectCpuWindow(cdp,snapshot,{seconds:10}),nativeAfter=counters(),cpu=summarizeCpu(samples),first=samples[0].state,last=samples.at(-1).state;
   const trial={lane,cpu,nativeBefore,nativeAfter,samples,errors,frames:last.total-first.total,drops:last.dropped-first.dropped,fullState:await page.evaluate(()=>player.current.backend.diagnostics)};
   trial.accepted=(lane!=='pcm'||last.codec==='pcm_f32le')&&(lane!=='pump40'||last.worker?.diagnosticPumpMs===40)&&cpu.processIdsStable&&trial.frames>=29*cpu.wallSeconds&&trial.drops===0&&samples.every(s=>s.state.mode==='native'&&s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length&&!!s.state.audio===!lane.startsWith('aac'))&&!errors.length&&(!last.audio||last.audio.underruns===first.audio.underruns&&Math.abs(last.audio.error)<50&&last.audio.frames-first.audio.frames>470000)&&(!last.scheduled||!last.scheduled.errors.length&&last.scheduled.underruns===0&&last.scheduled.maxAbsSyncMs<50);
   result.trials.push(trial);await save();console.log('CPU',JSON.stringify({lane,accepted:trial.accepted,total:cpu.oneCorePercent,roles:cpu.roles,frames:trial.frames,drops:trial.drops,plan:last.plan}));
  }finally{await context.close();}
 }
}catch(error){result.error=String(error.stack);await save();throw error;}finally{await browser?.close();await server.close();}
