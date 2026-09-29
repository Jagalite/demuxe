// SPDX-License-Identifier: Apache-2.0
// Matched causal contrasts and separate thread-CPU tracing. No production edits.
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serve} from '../pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay,processSample} from '../../tests/head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from '../../tests/native-url-audio-probe.mjs';
import {markedAudio} from '../../tests/head-to-head/checks.mjs';
const check=process.env.CHECK_ONLY==='1',out=process.env.OUT??`results/audio-cost-attribution/${check?'check':'cpu'}-${Date.now()}`;
await mkdir(out,{recursive:true});
const fixture='build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv';
const sha=b=>createHash('sha256').update(b).digest('hex');
const workletOriginal=await readFile('web/selective-sync-worklet.js','utf8');
const worklet=workletOriginal.replace("if (data === 'close') this.closed = true;", "if (data === 'close') this.closed = true; if(data?.kind==='attribution-scan'){this.attributionSkipScan=data.skip;this.port.postMessage({kind:'attribution-ack',skip:this.attributionSkipScan});}").replace('for(let i=Math.max(read,this.scanned);i<write;i++)','if(!this.attributionSkipScan)for(let i=Math.max(read,this.scanned);i<write;i++)');
assert.notEqual(worklet,workletOriginal);assert.ok(worklet.includes('if(!this.attributionSkipScan)for'));
const wasmOriginal=await readFile('web/generated/internal/wasm-player.js','utf8');
const wasm512=wasmOriginal.replace("new AudioContext({ latencyHint: 'interactive' })", "new AudioContext({ latencyHint: 'interactive', ...(this.audioOnly?{renderSizeHint:512}:{}) })");assert.notEqual(wasmOriginal,wasm512);
const workerOriginal=await readFile('web/filter-retained-engine-worker.js','utf8');
const traceWorker=workerOriginal.replace('function pumpAudio() {',"function pumpAudio() { console.timeStamp('attribution:pump:begin'); try {").replace('\nfunction tick() {'," finally {console.timeStamp('attribution:pump:end');} }\nfunction tick() {").replace('    for (let i = 0; i < 64; i++) {',"    console.timeStamp('attribution:events:begin');\n    for (let i = 0; i < 64; i++) {").replace('    if(audioOnly){ticks++;',"    console.timeStamp('attribution:events:end');\n    if(audioOnly){ticks++;");
const files=['web/generated/internal/native-mpv-audio.js','web/generated/internal/native-player.js','web/generated/internal/wasm-player.js','web/filter-retained-engine-worker.js','web/selective-sync-worklet.js','web/native-remux-player.js','web/native-remux-worker.js','web/engine-selective/player.wasm','web/engine-remux/remux.wasm'];
const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(f))])));
const result={check,purpose:'Controlled component contrasts, then separate Chrome trace using tts/tdur thread CPU; never label wall time or wait samples as CPU',fixture,fixtureSHA256:sha(await readFile(fixture)),hashes,workletSHA256:sha(worklet),wasm512SHA256:sha(wasm512),trials:[]};
if(!check){const qs=await Promise.all(process.env.CORRECTNESS.split(',').map(async p=>JSON.parse(await readFile(p))));for(const q of qs){assert.equal(q.fixtureSHA256,result.fixtureSHA256);assert.deepEqual(q.hashes,hashes);assert.equal(q.workletSHA256,result.workletSHA256);assert.equal(q.wasm512SHA256,result.wasm512SHA256);}for(const lane of ['baseline','no-scan','quantum512','video-only'])assert.ok(qs.some(q=>q.trials.some(t=>t.lane===lane&&t.accepted)),'No qualified '+lane);result.correctness=process.env.CORRECTNESS;}

const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await save();
await writeFile(out+'/trace-worker.js',traceWorker);await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));await writeFile(out+'/worklet.js',worklet);await writeFile(out+'/wasm-player-512.js',wasm512);
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:{movie:fixture}});let browser;
async function setup(lane,correctness,tracing=false){
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),errors=[],served=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(String(e)));
 const override=new Map([['/web/selective-sync-worklet.js',worklet]]);
 if(lane==='quantum512')override.set('/web/generated/internal/wasm-player.js',wasm512);
 if(tracing)override.set('/web/filter-retained-engine-worker.js',traceWorker);
 const proxy=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(override.has(pathname)){served.push(pathname);res.writeHead(200,{'Content-Type':'text/javascript','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'});res.end(override.get(pathname));return;}
  const upstream=http.request(new URL(req.url,server.origin),{method:req.method,headers:req.headers},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);});upstream.on('error',e=>{res.writeHead(502).end(String(e));});req.pipe(upstream);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${proxy.address().port}`;
 const close=context.close.bind(context);context.close=async()=>{await close();proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));};
 try{
 if(correctness)await page.addInitScript(installAudioProbe);
 await page.goto(origin+'/experiment/page.html');await page.bringToFront();
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));await player.open({url:'/media/movie',format:'file'});await player.play();await player.pause();await player.seek(3);await player.play();});
 await delay(1000);
 await page.evaluate(async lane=>{
  window.lane=lane;window.scanAck=null;const b=player.current.backend,a=b.mpvAudio;window.startingVideo=b.video;
  if(!a)throw Error('Missing selective audio backend');
  if(lane==='video-only'){await a.destroy();b.mpvAudio=undefined;return;}
  a.engine.addEventListener('output',e=>{if(e.detail.kind==='attribution-ack')window.scanAck=e.detail.skip;});
  a.engine.audioNode.port.postMessage({kind:'attribution-scan',skip:lane==='no-scan'});
 },lane);
 if(lane!=='video-only')await page.waitForFunction(lane=>scanAck===(lane==='no-scan'),lane,{timeout:5000});
 const snapshot=()=>page.evaluate(()=>{
  const b=player.current.backend,a=b.mpvAudio,v=b.video,q=v.getVideoPlaybackQuality();
  return {lane,position:player.state.currentTime,videoTime:v.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:v.paused,errors:failures,sameVideo:v===startingVideo,scanAck,quantum:a?.engine.audioContext.renderQuantumSize,contextState:a?.engine.audioContext.state,latency:a?[a.engine.audioContext.baseLatency,a.engine.audioContext.outputLatency]:null,audio:a?{underruns:a.diagnostics.preEofUnderruns,errorMs:a.diagnostics.errorMs,corrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks,pumpTicks:a.engine.diagnostics?.pumpTicks}:null};
 });
 return {context,page,snapshot,errors,served};
 }catch(error){error.details={served,errors,state:await page.evaluate(()=>({scanAck:window.scanAck,failures:window.failures})).catch(()=>null)};await context.close();throw error;}
}
try{
 console.log('STARTUP',out);const launch=await launchBenchmarkChrome({headless:false,startupGate:!check});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');const cdp=await browser.newBrowserCDPSession();
 const lanes=process.env.TRACE_ONLY==='1'?[]:(process.env.LANES??(check?'baseline,no-scan,quantum512,video-only':'baseline,no-scan,quantum512,video-only,baseline,video-only,quantum512,no-scan,baseline')).split(',');
 for(const lane of lanes){
  const trial={lane};result.trials.push(trial);let setupResult;
  try{
   setupResult=await setup(lane,check);const {page,snapshot,errors,served}=setupResult;Object.assign(trial,{errors,served});
   await delay(check?1500:3000);const first=await snapshot();assert.deepEqual(first.errors,[]);assert.ok(first.sameVideo);assert.equal(!!first.audio,lane!=='video-only');if(first.audio){assert.equal(first.quantum,lane==='quantum512'?512:128);assert.equal(first.scanAck,lane==='no-scan');assert.equal(first.audio.videoTracks,0);}
   if(check){
    if(first.audio){trial.audio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok(markedAudio({audio:trial.audio}));assert.ok(Math.abs(first.audio.errorMs)<50);}
    await delay(2000);const last=await snapshot();trial.states=[first,last];assert.ok(last.total-first.total>=50);assert.equal(last.dropped,first.dropped);if(first.audio){assert.equal(last.audio.underruns,first.audio.underruns);assert.ok(Math.abs(last.audio.errorMs)<50);}trial.accepted=!errors.length&&!last.errors.length;
    await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});
   }else{
    const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id),counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
    trial.nativeBefore=counters();trial.samples=await collectCpuWindow(cdp,snapshot,{seconds:10});trial.nativeAfter=counters();trial.cpu=summarizeCpu(trial.samples);
    const a=trial.samples[0].state,b=trial.samples.at(-1).state;trial.frames=b.total-a.total;trial.drops=b.dropped-a.dropped;
    trial.accepted=trial.cpu.processIdsStable&&trial.frames>=29*trial.cpu.wallSeconds&&!trial.drops&&!errors.length&&trial.samples.every(s=>s.state.sameVideo&&s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length&&!!s.state.audio===(lane!=='video-only'))&&(!b.audio||b.audio.underruns===a.audio.underruns&&Math.abs(b.audio.errorMs)<50&&b.audio.frames-a.audio.frames>470000&&b.audio.corrections===a.audio.corrections);
   }
   console.log(lane,trial.accepted?'PASS':'REJECT',trial.cpu?.oneCorePercent??'');
  }catch(e){trial.error=String(e.stack);trial.details=e.details;trial.failure=await setupResult?.snapshot().catch(()=>null);console.error(lane,trial.error);}
  finally{await save();await setupResult?.context.close();}
 }
 if(!check&&result.trials.every(t=>t.accepted)&&process.env.NO_TRACE!=='1'){
  // Separate profile. No trace-derived figure is substituted into the unprofiled CPU table.
  console.log('TRACE START');const s=await setup('baseline',false,true);await delay(3000);const events=[];const onData=e=>events.push(...e.value);cdp.on('Tracing.dataCollected',onData);
  const record={scope:'Instrumented thread CPU profile; complete-event exclusive accounting; sampling/wall waits are not CPU',errors:s.errors};result.trace=record;
  try{
   await cdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,webaudio,disabled-by-default-webaudio.audionode,disabled-by-default-audio-worklet,audio,media,v8,blink.user_timing',options:'record-as-much-as-possible',transferMode:'ReportEvents'});
   const workers=s.page.workers();record.workers=workers.map((w,index)=>({index,url:w.url()}));
   const stamps=async phase=>Promise.allSettled(workers.map(async(w,index)=>{let timer;try{await Promise.race([w.evaluate(tag=>console.timeStamp(tag),'attribution:thread:'+phase+':'+index),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Stamp timeout')),2000);})]);record.workers[index][phase]=true;}catch(e){record.workers[index][phase]=String(e);}finally{clearTimeout(timer);}}));
   record.before=await processSample(cdp,s.snapshot);
   const threadCounters=()=>JSON.parse(execFileSync('python3',['experiments/audio-cost-attribution/thread-counters.py',...record.before.processes.map(p=>String(p.id))],{encoding:'utf8'}));
   record.threadBefore=threadCounters();
   await s.page.evaluate(()=>console.timeStamp('attribution:window:start'));
   await stamps('start');
   record.samples=await collectCpuWindow(cdp,s.snapshot,{seconds:8,interval:2});record.cpu=summarizeCpu(record.samples);
   await stamps('end');
   await s.page.evaluate(()=>console.timeStamp('attribution:window:end'));
   record.threadAfter=threadCounters();
   record.after=await processSample(cdp,s.snapshot);record.bracketCpu=summarizeCpu([record.before,record.after]);
   const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await done;
   await writeFile(out+'/trace.json',JSON.stringify({traceEvents:events}));record.eventCount=events.length;
  }finally{cdp.off('Tracing.dataCollected',onData);await s.context.close();await save();}
  console.log('TRACE DONE',record.eventCount);
 }
}finally{await browser?.close();await server.close();await save();}
assert.ok(result.trials.every(t=>t.accepted),'Rejected arms; retain evidence: '+out);console.log('EVIDENCE',out);
