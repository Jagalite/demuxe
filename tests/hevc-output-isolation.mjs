// SPDX-License-Identifier: Apache-2.0
// Test-only component isolation; synthetic output is not a production route.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??'results/hevc-root-isolation/20260926-02');await mkdir(out,{recursive:false});
const assets=path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01');
await writeFile(out+'/page.html','<style>body{margin:0;background:black}#surface{position:relative;width:960px;height:540px}video{width:100%;height:100%;object-fit:contain}</style><div id="surface"></div>');
const server=await serve(assets,out,out+'/requests.jsonl');
const result={purpose:'Isolate native mpv from timestamped PCM output and video; fixed startup gate, no profiler',trials:[]};
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
let browser;
try{
 console.log('STARTUP_GATE');const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;result.browser=launch.identity;await save();console.log('GATE_COMPLETE');
 const cdp=await browser.newBrowserCDPSession();
 for(const lane of ['synthetic-pcm','synthetic-no-control','native-tones','native-tones-playback']){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   const worklet=(await readFile(assets+'/demuxe/web/selective-sync-worklet.js','utf8')).replace("if (data === 'close') this.closed = true;","if (data === 'close') this.closed = true; if(data === 'no-control')this.noControl=true;").replace('if(count){','if(count&&!this.noControl){');
   await context.route('**/web/selective-sync-worklet.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:worklet}));
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async lane=>{
    const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];
    player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:'/fixtures/hevc10-ac3/index.mkv',format:'file'});await player.play();
    const b=player.current.backend,a=b.mpvAudio,e=a.engine;window.video=b.video;
    if(lane.startsWith('synthetic')){
     e.worker.terminate();e.workerOwner.remove();
     const source=`onmessage=({data:{buffer,sampleRate}})=>{const h=new Int32Array(buffer,0,16),pcm=new Float32Array(buffer,64,8192*2),meta=new Float64Array(buffer,64+8192*8,8192*2);let written=Atomics.load(h,0)>>>0,pts=meta[((written-1)%8192)*2]+1/sampleRate;const origin=pts,start=written;const fill=()=>{const read=Atomics.load(h,1)>>>0,room=8192-((written-read)>>>0);for(let i=0;i<room;i++){const t=origin+(written-start)/sampleRate,index=written%8192;pcm[index*2]=.125*Math.sin(t*440*2*Math.PI);pcm[index*2+1]=.125*Math.sin(t*880*2*Math.PI);meta[index*2]=t;meta[index*2+1]=1;written++;}Atomics.store(h,0,written);};fill();setInterval(fill,10);postMessage('ready');};`;
     window.producer=new Worker(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
     const ready=new Promise(r=>producer.onmessage=r);producer.postMessage({buffer:e.audioHeader.buffer,sampleRate:e.audioContext.sampleRate});await ready;
     if(lane==='synthetic-no-control'){clearInterval(a.driftTimer);video.cancelVideoFrameCallback(a.frameCallback);clearInterval(e.timing);e.audioNode.port.postMessage('no-control');}
    }else if(lane.startsWith('native-tones')){await a.destroy();b.mpvAudio=undefined;const c=new AudioContext({latencyHint:lane.endsWith('playback')?'playback':'interactive'}),m=c.createChannelMerger(2);window.toneContext=c;m.connect(c.destination);for(const [channel,hz] of [440,880].entries()){const o=c.createOscillator(),g=c.createGain();o.frequency.value=hz;g.gain.value=.125;o.connect(g).connect(m,0,channel);o.start();}await c.resume();}
    window.lane=lane;
   },lane);
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,q=video.getVideoPlaybackQuality();return {lane,outputLatency:window.toneContext?.outputLatency??a?.context.outputLatency,baseLatency:window.toneContext?.baseLatency??a?.context.baseLatency,position:video.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:video.paused,errors:failures,audio:a?{underruns:a.diagnostics.preEofUnderruns,error:a.diagnostics.errorMs,softCorrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks}:null};});
   const samples=await collectCpuWindow(cdp,snapshot,{seconds:12});const cpu=summarizeCpu(samples);const first=samples[0].state,last=samples.at(-1).state;
   const trial={lane,cpu,samples,errors,frames:last.total-first.total,drops:last.dropped-first.dropped};result.trials.push(trial);
   trial.accepted=cpu.processIdsStable&&trial.frames>=29*cpu.wallSeconds&&trial.drops===0&&samples.every(s=>s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length)&&!errors.length&&(!last.audio||last.audio.underruns===first.audio.underruns&&Math.abs(last.audio.error)<100&&last.audio.frames>first.audio.frames);
   console.log('TRIAL',lane,JSON.stringify({cpu:cpu.oneCorePercent,roles:cpu.roles,accepted:trial.accepted,frames:trial.frames,drops:trial.drops}));await save();
  }finally{await context.close();}
 }
}catch(e){result.error=String(e.stack);await save();throw e;}finally{await browser?.close();await server.close();}
