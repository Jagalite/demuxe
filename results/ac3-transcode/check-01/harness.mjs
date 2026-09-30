// SPDX-License-Identifier: Apache-2.0
// Isolated URL playback through the maintained bounded RemuxPlayer. Never changes Auto admission.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {serve} from '../pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,processSample,delay} from '../../tests/head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from '../../tests/native-url-audio-probe.mjs';
import {markedAudio,markedImage} from '../../tests/head-to-head/checks.mjs';
const check=process.env.CHECK_ONLY==='1',out=process.env.OUT??`results/ac3-transcode/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const engines=JSON.parse(await readFile(process.env.ENGINES??'build/ac3-transcode-01/engines.json'));
const fixture='build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv';
const sha=b=>createHash('sha256').update(b).digest('hex');
const result={check,fixture,fixtureSHA256:sha(await readFile(fixture)),engines:{},scope:'In-browser AC3 decoding and encoding included. FLAC quantizes float PCM to 24 bits; AAC is lossy 192kbps. Isolated RemuxPlayer prototype; no production Auto routing change. Whole Chrome CPU excludes external OS services.',trials:[]};
for(const [lane,dir] of Object.entries(engines))result.engines[lane]={dir,wasmSHA256:sha(await readFile(dir+'/remux.wasm')),manifest:JSON.parse(await readFile(dir+'/manifest.json'))};
if(!check){const qualified=JSON.parse(await readFile(process.env.CORRECTNESS));assert.ok(qualified.check);assert.equal(qualified.fixtureSHA256,result.fixtureSHA256);for(const lane of ['ac3','flac24','aac']){assert.ok(qualified.trials.some(t=>t.lane===lane&&t.accepted),lane+' not qualified');if(lane!=='ac3')assert.equal(qualified.engines[lane].wasmSHA256,result.engines[lane].wasmSHA256);}result.correctness=process.env.CORRECTNESS;}
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await save();
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:{movie:fixture}});let browser;
try{
 console.log('STARTUP',out);const launch=await launchBenchmarkChrome({headless:false,startupGate:!check});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');
 const cdp=await browser.newBrowserCDPSession();
 for(const lane of (process.env.LANES??(check?'ac3,flac24,aac':'ac3,flac24,aac,ac3')).split(',')){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),trial={lane,errors:[],phases:[],media:[]};result.trials.push(trial);page.setDefaultTimeout(20000);page.on('pageerror',e=>trial.errors.push(String(e)));
  try{
   if(lane!=='ac3')await context.route('**/engine-adaptation/remux.*',async route=>{const ext=new URL(route.request().url()).pathname.endsWith('.wasm')?'wasm':'mjs';await route.fulfill({contentType:ext==='wasm'?'application/wasm':'text/javascript',headers:{'Cross-Origin-Resource-Policy':'same-origin'},body:await readFile(engines[lane]+'/remux.'+ext)});});
   if(check){await page.addInitScript(installAudioProbe);await page.addInitScript(()=>{window.appended=[];const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(bytes){appended.push(new Uint8Array(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength).slice());return append.call(this,bytes);};});const media=await context.newCDPSession(page);await media.send('Media.enable');for(const name of ['playerPropertiesChanged','playerErrorsRaised'])media.on('Media.'+name,e=>trial.media.push({name,...e}));}
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   const before=check?null:await processSample(cdp);
   trial.startup=await page.evaluate(async({lane,check})=>{
    window.failures=[];window.lane=lane;
    const started=performance.now();
    if(lane==='ac3'){
     const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
     await player.open({url:'/media/movie',format:'file'});window.video=player.current.backend.video;
    }else{
     const {RemuxPlayer}=await import('/web/native-remux-player.js');window.video=document.createElement('video');video.playsInline=true;document.querySelector('#surface').append(video);
     // "flac" selects the preparation ABI; the isolated Wasm advertises its actual output codec.
     window.player=new RemuxPlayer(video,{audioAdaptation:'flac',bufferedSeeks:true,mseOwner:'window'});player.onError=e=>failures.push(String(e));
     await player.open({options:{url:location.origin+'/media/movie',format:'file'}});
    }
    window.position=()=>lane==='ac3'?player.state.currentTime:Math.max(0,video.currentTime-player.timelineBias);
    const opened=performance.now();await player.play();if(check&&lane!=='ac3')await urlAudioProbe.observeVideo(video);
    await new Promise((resolve,reject)=>{const until=performance.now()+15000;const poll=()=>{if(position()>.15)return resolve();if(failures.length||performance.now()>until)return reject(Error('No playback: '+failures));setTimeout(poll,20);};poll();});
    return {openMs:opened-started,firstProgressMs:performance.now()-started};
   },{lane,check});
   const snapshot=()=>page.evaluate(()=>{
    const q=video.getVideoPlaybackQuality(),a=lane==='ac3'?player.current.backend.mpvAudio:null,r=lane==='ac3'?null:player;
    return {lane,plan:lane==='ac3'?player.diagnostics.plan.id:'experimental-ac3-'+lane,time:position(),duration:lane==='ac3'?player.state.duration:player.duration,paused:video.paused,ended:video.ended,rate:video.playbackRate,frames:q.totalVideoFrames,drops:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),failures:[...failures,...(r?.stats.errors??[])],videoError:video.error?.message,audioDecodedBytes:video.webkitAudioDecodedByteCount,adaptation:r?.remuxStats.adaptation,audio:a?{underruns:a.diagnostics.preEofUnderruns,errorMs:a.diagnostics.errorMs,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks}:null,range:r?.ranges(),remuxMs:r?.remuxStats.remuxMs,eof:r?.eof};
   });
   const phase=async label=>{const state=await snapshot();trial.phases.push({label,state});assert.deepEqual(state.failures,[]);assert.ok(!state.videoError);if(lane==='ac3'){assert.equal(state.plan,'native-video-mpv-audio');assert.equal(state.audio.videoTracks,0);}else{assert.equal(state.adaptation.codec,lane==='flac24'?'flac':'aac');assert.equal(state.adaptation.videoFramesDecoded,0);assert.equal(state.adaptation.videoFramesEncoded,0);assert.equal(state.adaptation.clippedSamples,0);}return state;};
   if(check){
    const tones=async()=>{await delay(350);const audio=await page.evaluate(()=>urlAudioProbe.sample());trial.phases.push({label:'audio',audio});assert.ok(markedAudio({audio}),JSON.stringify(audio));};
    await page.waitForFunction(()=>position()>1);await tones();await phase('steady');
    await page.evaluate(()=>player.pause());const p=await phase('pause');await delay(500);assert.ok(Math.abs((await snapshot()).time-p.time)<.08);await page.evaluate(()=>player.play());await tones();
    for(const rate of [.5,2,1]){await page.evaluate(async rate=>{if(lane==='ac3')await player.setPlaybackRate(rate);else video.playbackRate=rate;},rate);await delay(650);await tones();assert.equal((await phase('rate-'+rate)).rate,rate);}
    if(lane!=='ac3'){const bytes=await page.evaluate(()=>{const n=appended.reduce((n,b)=>n+b.length,0),all=new Uint8Array(n);let at=0;for(const b of appended){all.set(b,at);at+=b.length;}let binary='';for(let i=0;i<all.length;i+=16384)binary+=String.fromCharCode(...all.subarray(i,i+16384));return btoa(binary);});await writeFile(out+'/'+lane+'-prefix.mp4',Buffer.from(bytes,'base64'));}
    for(const t of [12,2]){await page.evaluate(async t=>{await player.seek(t);await player.play();},t);await page.waitForFunction(t=>position()>t+.3,t);await tones();await phase('seek-'+t);}
    await page.evaluate(async()=>{await player.pause();await player.seek(3);});await page.waitForFunction(()=>!video.seeking);await delay(150);
    const png=await page.locator('#surface').screenshot();await writeFile(out+'/'+lane+'-paused-seek.png',png);assert.ok(markedImage(png,3).markerCorrect);await phase('paused-seek');
    await page.evaluate(async()=>{await player.seek((lane==='ac3'?player.state.duration:player.duration)-1.2);await player.play();});await page.waitForFunction(()=>video.ended,undefined,{timeout:12000});await phase('EOF');
    await page.evaluate(async()=>{await player.seek(2);await player.play();});await page.waitForFunction(()=>position()>2.3);await tones();await phase('replay');
    await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});await delay(300);assert.equal(page.workers().length,0);assert.deepEqual(trial.errors,[]);trial.accepted=true;
   }else{
    const opened=await processSample(cdp,snapshot);await delay(3000);
    const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);const counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
    const nativeBefore=counters(),samples=await collectCpuWindow(cdp,snapshot,{seconds:10}),nativeAfter=counters(),cpu=summarizeCpu(samples);
    Object.assign(trial,{nativeBefore,nativeAfter,samples,cpu});
    // Includes initial demux, decode, encode, buffering, startup and the timed playback.
    const lifecycleSamples=[before,opened,...samples],first=new Map(before.processes.map(p=>[p.id,p])),seen=new Set(),last=samples.at(-1);let seconds=0;const removed=[];
    for(const p of last.processes){seen.add(p.id);seconds+=p.cpuTime-(first.get(p.id)?.cpuTime??0);}
    for(const s of lifecycleSamples)for(const p of s.processes)if(!seen.has(p.id))removed.push(p.id);
    trial.openThroughPlayback={cpuSeconds:seconds,wallSeconds:(last.at-before.at)/1000,oneCorePercent:100*seconds/((last.at-before.at)/1000),newProcessLifetimeCPUIncluded:last.processes.filter(p=>!first.has(p.id)),removed,samples:lifecycleSamples};
    const a=samples[0].state,b=last.state;trial.frames=b.frames-a.frames;trial.drops=b.drops-a.drops;trial.encodedDuringWindow=(b.adaptation?.audioSamplesEncoded??0)-(a.adaptation?.audioSamplesEncoded??0);
    trial.accepted=cpu.processIdsStable&&!removed.length&&trial.frames>=29*cpu.wallSeconds&&!trial.drops&&!trial.errors.length&&samples.every(s=>s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.failures.length&&!s.state.videoError)&&(lane==='ac3'?b.audio.underruns===a.audio.underruns&&Math.abs(b.audio.errorMs)<50&&b.audio.frames-a.audio.frames>470000:trial.encodedDuringWindow>450000&&samples.every(s=>!s.state.eof&&s.state.adaptation.sourceEnd-s.state.time<8&&s.state.adaptation.clippedSamples===0));
    await phase('final');await page.evaluate(()=>player.destroy());
   }
   console.log(lane,trial.accepted?'PASS':'REJECT',trial.cpu?.oneCorePercent??'',trial.encodedDuringWindow??'');
  }catch(error){trial.error=String(error.stack);trial.failure=await page.evaluate(()=>({failures:window.failures,video:window.video?{time:video.currentTime,error:video.error?.message,paused:video.paused}:null,remux:window.lane!=='ac3'?window.player?.snapshot():null})).catch(()=>null);console.error(lane,trial.error);}
  finally{await save();await context.close();}
 }
}finally{await browser?.close();await server.close();await save();}
assert.ok(result.trials.every(t=>t.accepted),'Some arms failed: '+out);console.log('EVIDENCE',out);
