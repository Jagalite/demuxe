// SPDX-License-Identifier: Apache-2.0
// Test-only, matched HEVC component ablations; never changes production routing.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
import {markedImage,markedAudio} from './head-to-head/checks.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
const assets=path.resolve('build/head-to-head/assets-native-url-main-20260926-01');
const out=path.resolve(process.env.OUT??'results/hevc-audio-cost/check-20260926-01');
const lanes=(process.env.LANES??'split,split-eac3,split-dts,split-clock,split-ordinary,video-remux').split(',');
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),protocol:{rounds:3,seconds:20,warmup:5,order:'rotating',headless:false,viewport:[960,540],cpu:'whole Chrome, one-core percent, no idle subtraction',gates:'stable processes, >=29 presented fps, <=1% dropped, no errors, route retained',ablation:'Same HEVC packets; alternate codecs; exact timeOrigin hoist; ordinary Software audio-only AC3 plus same video remux; audio removal'},identity:{manifest:await hash(path.join(assets,'manifest.json')),videoOnly:await hash(path.join(out,'video-only.mp4')),script:await hash(import.meta.filename)},correctness:[],idles:[],trials:[]};
const save=()=>writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
await writeFile(path.join(out,'page.html'),'<style>body{margin:0;background:black}#surface{width:960px;height:540px;position:relative}video{width:100%;height:100%;object-fit:contain}</style><div id="surface"></div>');
const server=await serve(assets,out,path.join(out,'requests.jsonl'));
let browser,cdp;
async function setup(lane,probe=false){
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const media=await context.newCDPSession(page),properties={};
 media.on('Media.playerPropertiesChanged',e=>{const p=properties[e.playerId]??={};for(const v of e.properties)p[v.name]=v.value;});
 await media.send('Media.enable');
 if(probe)await page.addInitScript(installAudioProbe);
 await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
 await page.evaluate(async lane=>{
  window.failures=[];window.lane=lane;
  if(lane==='video-direct'){
   window.video=document.createElement('video');video.src='/harness/video-only.mp4';video.muted=true;document.querySelector('#surface').append(video);
   await video.play();
  }else{
   const {Player}=await import('/demuxe/web/generated/index.js');
   window.player=new Player(document.querySelector('#surface'));
   player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
   await player.open({url:`/fixtures/${lane==='split-eac3'?'hevc10-eac3':lane==='split-dts'?'hevc10-dts':'hevc10-ac3'}/index.mkv`,format:'file'});
   await player.play();
   if(lane==='video-remux'||lane==='split-ordinary'){const backend=player.current.backend;await backend.mpvAudio.destroy();backend.mpvAudio=undefined;}
   if(lane==='split-clock'){
    const a=player.current.backend.mpvAudio,original=a.estimatedAudioPresentationTime;
    a.estimatedAudioPresentationTime=function(at=performance.now()){
     const origin=performance.timeOrigin;let latest;
     for(const point of this.points)if(point.generation===this.generation&&point.wallTime!==null&&point.wallTime-origin<=at&&(!latest||point.wallTime>latest.wallTime))latest=point;
     const age=latest?at-(latest.wallTime-origin):Infinity;
     const answer=age>250?null:latest.mediaTime+(this.running?age*latest.rate/1000:0);
     if(window.urlAudioProbe&&answer!==original.call(this,at))throw Error('Clock lookup differs');
     return answer;
    };
   }
   if(lane==='split-ordinary'){
    await player.current.backend.pause();const target=player.state.currentTime;
    const hidden=document.createElement('div');hidden.style.display='none';document.body.append(hidden);
    window.otherAudio=new Player(hidden,{mode:'software'});otherAudio.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await otherAudio.open({url:'/harness/audio-only.mka',format:'file'});await otherAudio.seek(target);await otherAudio.play();await player.current.backend.play();
   }
   window.video=player.current.backend.video;
  }
  Object.defineProperty(window,'video',{configurable:true,get:()=>document.querySelector('#surface video')});
 },lane);
 console.log('SETUP',lane,await page.evaluate(()=>({selected:video?{time:video.currentTime,width:video.videoWidth}:null,all:[...document.querySelectorAll('video')].map(v=>({time:v.currentTime,width:v.videoWidth,hidden:v.hidden})),plan:window.player?.diagnostics.plan.id})));
 await page.waitForFunction(()=>video.currentTime>1&&video.videoWidth>0);
 return {context,page,media,properties,errors};
}
const snapshot=page=>page.evaluate(()=>{
 const q=video.getVideoPlaybackQuality(),b=window.player?.diagnostics.backend,a=b?.mpvAudio;
 return {position:window.player?player.state.currentTime:video.currentTime,route:window.player?player.diagnostics.plan.id:'plain-video',total:q.totalVideoFrames,dropped:q.droppedVideoFrames,paused:video.paused,ready:video.readyState,focused:document.hasFocus(),visible:document.visibilityState,errors:failures,ordinary:window.otherAudio?{position:otherAudio.state.currentTime,route:otherAudio.diagnostics.plan.id,underruns:Atomics.load(otherAudio.current.backend.audioHeader,6),frames:Atomics.load(otherAudio.current.backend.audioHeader,5),backend:otherAudio.diagnostics.backend,videoTracks:[...otherAudio.current.backend.properties.get('track-list')??[]].filter(t=>t.type==='video'&&t.selected).length}:null,audio:a?{videoTracks:a.mpvVideoTracks,worker:a.worker,underruns:a.preEofUnderruns}:null,subtitles:b?.mpvSubtitles,remux:b?.remux};
});
try{
 const launched=await launchBenchmarkChrome({headless:false,startupGate:!process.env.CHECK_ONLY});browser=launched.browser;result.browser=launched.identity;cdp=await browser.newBrowserCDPSession();await save();
 // Output checks are separate contexts; no analyser or screenshot during CPU.
 for(const lane of lanes){
  const s=await setup(lane,true);
  try{
   await s.page.evaluate(async()=>{if(window.player){await player.current.backend.pause();await window.otherAudio?.pause();if(window.otherAudio)await player.current.backend.seek(3);else await player.seek(3);await window.otherAudio?.seek(3);}else{video.pause();video.currentTime=3;await new Promise(r=>video.addEventListener('seeked',r,{once:true}));}});
   const image=markedImage(await s.page.locator('#surface').screenshot(),3);assert.ok(image.markerCorrect,`${lane} image`);
   await s.page.evaluate(async()=>{await window.otherAudio?.play();await (window.otherAudio?player.current.backend.play():window.player?player.play():video.play());});await delay(800);
   const audio=await s.page.evaluate(()=>window.urlAudioProbe.sample());if(lane.startsWith('split'))assert.ok(markedAudio({audio}),`${lane} audio`);
   
   result.correctness.push({lane,image,audio,decoder:s.properties,state:await snapshot(s.page),errors:s.errors});
   console.log('CORRECT',lane,[...new Set(Object.values(s.properties).map(p=>p.kVideoDecoderName))]);
  }finally{await s.context.close();await save();}
 }
 for(let round=0;round<(process.env.CHECK_ONLY?0:3);round++){
  const idleContext=await browser.newContext();const blank=await idleContext.newPage();await blank.goto('about:blank');await blank.bringToFront();
  const idle=await collectCpuWindow(cdp,null,{seconds:20});result.idles.push({round:round+1,cpu:summarizeCpu(idle),samples:idle});await idleContext.close();await save();
  for(let i=0;i<lanes.length;i++){
   const lane=lanes[(i+round)%lanes.length],trial={round:round+1,lane};result.trials.push(trial);
   const s=await setup(lane);
   try{
    await delay(5000);trial.decoder=s.properties;await s.media.send('Media.disable');
    trial.samples=await collectCpuWindow(cdp,()=>snapshot(s.page),{seconds:20});trial.cpu=summarizeCpu(trial.samples);
    const first=trial.samples[0].state,last=trial.samples.at(-1).state;
    assert.ok(trial.samples.every(x=>lane==='split-ordinary'?x.state.ordinary?.videoTracks===0&&x.state.audio===null:lane.startsWith('split')?x.state.audio?.videoTracks===0:x.state.audio===null),'Ablation ownership changed');
    trial.frames=last.total-first.total-(last.dropped-first.dropped);trial.drops=last.dropped-first.dropped;
    trial.accepted=trial.cpu.processIdsStable&&trial.frames>=29*trial.cpu.wallSeconds&&trial.drops<=.01*(last.total-first.total)&&trial.samples.every(x=>!x.state.paused&&x.state.focused&&x.state.visible==='visible'&&!x.state.errors.length&&x.state.route===first.route)&&!s.errors.length;
    if(lane==='split-ordinary'){trial.avOffsets=trial.samples.map(x=>x.state.ordinary.position-x.state.position);trial.audioUnderruns=last.ordinary.underruns-first.ordinary.underruns;trial.accepted&&=trial.audioUnderruns===0&&trial.avOffsets.every(x=>Math.abs(x)<.25)&&last.ordinary.frames>first.ordinary.frames;}
    if(lane.startsWith('split')&&lane!=='split-ordinary')trial.accepted&&=last.audio.underruns===first.audio.underruns;
    trial.errors=s.errors;console.log('CPU',round+1,lane,trial.cpu.oneCorePercent,'frames',trial.frames,'drops',trial.drops,'accepted',trial.accepted);
   }catch(e){trial.error=String(e);console.error(e);}
   finally{await s.context.close();await save();await delay(2000);}
  }
 }
}catch(e){result.error=String(e.stack);await save();throw e;}
finally{await browser?.close();await server.close();}
