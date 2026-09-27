// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
async function withDeadline(promise,ms){
 let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio case watchdog')),ms);})]);}finally{clearTimeout(timer);}
}
const root=path.resolve(import.meta.dirname,'../../../..'),exp=path.join(root,'experiments/jspi-asyncify');
const build=process.env.MPV_AUDIO_BUILD;if(!build)throw Error('MPV_AUDIO_BUILD required');
const out=path.join(root,'results/jspi-asyncify',process.env.RUN_NAME??'mpv-audio-'+Date.now());await mkdir(out);
const files=new Map(),hashes={};
async function add(url,file){const b=await readFile(file);files.set(url,b);hashes[url]={path:file,sha256:createHash('sha256').update(b).digest('hex')};return b;}
for(const name of ['mpv/tests/run-audio.mjs','mpv/tests/audio-worker.mjs','mpv/runtime/audio-worklet.mjs','mpv/runtime/engine.mjs','runtime/scheduler.mjs','runtime/continuations.mjs','stage2/runtime/range-source.mjs']){
 const b=await add('/experiment/'+name,path.join(exp,name)),dest=path.join(out,'sources',name);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,b);
}
const manifest=JSON.parse(await readFile(path.join(build,'result.json')));assert.equal(manifest.status,'built_service_only');assert.equal(manifest.profile,'audio');
for(const name of ['service.mjs','service.wasm','service.asyncify.wasm']){await add('/candidate/'+name,path.join(build,name));assert.equal(hashes['/candidate/'+name].sha256,manifest.artifacts[name]);}
for(const name of ['pcm.wav','pcm.s16','replacement.wav','replacement.s16'])await add('/fixtures/'+name,path.join(root,'build/jspi-asyncify/mpv-frozen/fixtures',name));
await writeFile(path.join(out,'build.json'),JSON.stringify(manifest,null,2)+'\n');
let pendingReads=0;
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Private mpv audio</title>');return;}
 if(req.url==='/pending-state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({pendingReads}));return;}
 if(req.url==='/fixtures/pending.wav'){pendingReads++;return;}
 const b=files.get(req.url);if(!b){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',req.url.endsWith('.wasm')?'application/wasm':req.url.endsWith('.mjs')?'text/javascript':'application/octet-stream');
 if(req.headers.range){const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range);if(!m||+m[1]>+m[2]||+m[2]>=b.length){res.writeHead(416).end();return;}res.writeHead(206,{'Content-Range':`bytes ${m[1]}-${m[2]}/${b.length}`});res.end(b.subarray(+m[1],+m[2]+1));}else res.end(b);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const result={schema:2,scope:'Restricted stereo PCM mpv and AudioWorklet component; not Player, device or codec qualification',inputs:hashes,cases:[]};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const scenario of ['media','pending-close','active-close','worklet-fault','rate-replacement','suspended-close'])for(const backend of ['jspi','asyncify']){
  const item={backend,scenario};result.cases.push(item);const page=await browser.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error(msg.text().slice(0,600));});
  try{
   const response=await page.goto('http://127.0.0.1:'+server.address().port);item.headers=response.headers();
   assert.equal(item.headers['cross-origin-opener-policy'],undefined);assert.equal(item.headers['cross-origin-embedder-policy'],undefined);
   item.evidence=await withDeadline(page.evaluate(async({backend,scenario,size,replacementSize})=>{
    const ensure=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const requestedRate=scenario==='rate-replacement'?44100:48000;
    const audio=new AudioContext({sampleRate:requestedRate});await audio.audioWorklet.addModule('/experiment/mpv/runtime/audio-worklet.mjs');
    const node=new AudioWorkletNode(audio,'demuxe-private-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    // A real rendering graph with muted output, suitable for deterministic capture.
    const gain=audio.createGain();gain.gain.value=0;node.connect(gain).connect(audio.destination);await audio.resume();
    ensure(audio.sampleRate===requestedRate&&audio.state==='running','AudioContext contract');
    const worker=new Worker('/experiment/mpv/tests/audio-worker.mjs',{type:'module'}),pending=new Map(),inspections=new Map();let next=1,fatal,faultCleanup;
    worker.onerror=e=>{fatal=e.message;for(const p of pending.values())p.reject(Error(fatal));};
    worker.onmessage=({data:d})=>{
     if(d.type==='transportError'){fatal=d.error;faultCleanup=d.cleanup;}
     if(d.type==='log')console.log(d.message);
     const p=pending.get(d.id);if(p){pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(Error(d.error)):p.resolve(d.result);}
    };
    node.port.onmessage=({data:d})=>{if(d.type==='error')fatal=d.error;const p=inspections.get(d.id);if(p){inspections.delete(d.id);p(d);}};
    const rpc=(op,args={},transfer=[])=>new Promise((resolve,reject)=>{const id=next++,timer=setTimeout(()=>{pending.delete(id);reject(Error('RPC deadline '+op));},15000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,op,...args},transfer);});
    const requestWorklet=type=>new Promise((resolve,reject)=>{const id=next++,timer=setTimeout(()=>{inspections.delete(id);reject(Error('Worklet deadline '+type));},15000);inspections.set(id,data=>{clearTimeout(timer);resolve(data);});node.port.postMessage({type,id});});
    const inspect=()=>requestWorklet('inspect');
    const waitFor=async(predicate,label)=>{let last;for(let i=0;i<1500;i++){if(fatal)throw Error(fatal);last=await rpc('status');if(predicate(last))return last;await delay(10);}throw Error(label+' deadline '+JSON.stringify(last));};
    try{
     const channel=new MessageChannel();node.port.postMessage({type:'connect',port:channel.port2},[channel.port2]);
     const facts=await rpc('init',{backend,rate:audio.sampleRate,port:channel.port1},[channel.port1]);
     ensure(!facts.crossOriginIsolated&&facts.sharedArrayBuffer==='undefined'&&facts.memory==='ArrayBuffer','Private memory facts');
     if(backend==='asyncify')ensure(facts.jspi==='undefined'&&facts.jspiPromising==='undefined','JSPI disabled');
     const duplicate=new MessageChannel();let duplicateInitRejected=false;
     try{await rpc('init',{backend,rate:44100,port:duplicate.port1},[duplicate.port1]);}catch(e){duplicateInitRejected=String(e).includes('already initialized');}finally{duplicate.port2.close();}
     ensure(duplicateInitRejected,'Duplicate init leaked/replaced the engine');
     if(scenario==='pending-close'){
      const before=(await(await fetch('/pending-state')).json()).pendingReads;
      const loading=rpc('load',{url:'/fixtures/pending.wav',size}).then(result=>({result}),error=>({error:String(error)}));
      let observed=false;for(let i=0;i<200&&!observed;i++){observed=(await(await fetch('/pending-state')).json()).pendingReads>before;if(!observed)await delay(10);}
      ensure(observed,'No real pending HTTP read observed');
      const start=performance.now(),cleanup=await rpc('close'),closeMs=performance.now()-start,loadOutcome=await loading,stopped=await inspect();
      ensure(loadOutcome.error&&closeMs<1500,'Close waited behind pending load '+JSON.stringify({closeMs,loadOutcome}));
      ensure(cleanup.source.cancelled>0&&cleanup.source.timeouts===0&&!cleanup.live&&!cleanup.scheduler.liveTasks&&!cleanup.scheduler.retainedTasks&&!cleanup.source.pending&&!cleanup.source.handles,'Pending-close cleanup');
      ensure(stopped.stopped&&stopped.read===0&&stopped.written===0,'Close did not flush worklet');
      return {facts,sampleRate:audio.sampleRate,duplicateInitRejected,observedPending:true,closeMs,loadOutcome,stopped:{stopped:stopped.stopped,read:stopped.read,written:stopped.written},cleanup};
     }
     ensure(await rpc('load',{url:'/fixtures/pcm.wav',size})===1,'Audio-only chain');
     if(scenario==='rate-replacement'){
      const before=await rpc('status');ensure(before.header[4]===44100,'Initial device rate');
      ensure(await rpc('load',{url:'/fixtures/replacement.wav',size:replacementSize,replace:true})===1,'Replacement chain');
      const after=await rpc('status');ensure(after.header[4]===44100,'Replacement reset the device rate');
      const cleanup=await rpc('close');ensure(!cleanup.live&&!cleanup.scheduler.liveTasks&&!cleanup.scheduler.retainedTasks&&!cleanup.source.handles,'Rate replacement cleanup');
      return {facts,sampleRate:audio.sampleRate,duplicateInitRejected,beforeRate:before.header[4],afterRate:after.header[4],cleanup};
     }
     await requestWorklet('record');await rpc('pause',{value:false});
     await waitFor(s=>s.header[1]>4096,'Initial consumption');
     if(scenario==='active-close'||scenario==='suspended-close'){
      if(scenario==='suspended-close'){await rpc('context',{value:false});await audio.suspend();}
      const cleanup=await rpc('close'),stopped=await inspect();
      ensure(!cleanup.live&&!cleanup.scheduler.liveTasks&&!cleanup.scheduler.retainedTasks&&!cleanup.source.pending&&!cleanup.source.handles,'Active-close cleanup');
      ensure(stopped.stopped&&stopped.read===0&&stopped.written===0,'Active close did not flush worklet');
      return {facts,sampleRate:audio.sampleRate,duplicateInitRejected,stopped:{stopped:stopped.stopped,read:stopped.read,written:stopped.written},cleanup};
     }
     if(scenario==='worklet-fault'){
      const extra=new MessageChannel();node.port.postMessage({type:'connect',port:extra.port1},[extra.port1]);extra.port2.close();
      for(let i=0;i<200&&!faultCleanup;i++)await delay(5);
      ensure(faultCleanup&&fatal,'Transport fault was not reported');const stopped=await inspect();
      ensure(stopped.failed&&stopped.stopped&&stopped.read===0&&stopped.written===0,'Fault retained playable PCM');
      ensure(faultCleanup.scheduler.stopped&&!faultCleanup.scheduler.liveTasks&&!faultCleanup.scheduler.retainedTasks&&!faultCleanup.scheduler.timers&&!faultCleanup.source.pending&&!faultCleanup.source.handles&&!faultCleanup.source.timers,'Fault retained work');
      let reuseRejected=false;try{await rpc('pause',{value:false});}catch{reuseRejected=true;}ensure(reuseRejected,'Poisoned host accepted work');
      return {facts,sampleRate:audio.sampleRate,duplicateInitRejected,reuseRejected,stopped:{failed:stopped.failed,stopped:stopped.stopped,read:stopped.read,written:stopped.written},cleanup:faultCleanup};
     }
     await rpc('context',{value:false});await audio.suspend();await delay(80);
     const suspended=await rpc('status');await delay(160);const suspendedAfter=await rpc('status');
     ensure(suspended.header[1]===suspendedAfter.header[1],'Consumption advanced with suspended AudioContext');
     await audio.resume();await rpc('context',{value:true});await delay(50);
     await rpc('pause',{value:true});await delay(80);
     const paused=await rpc('status');await delay(160);const pausedAfter=await rpc('status');
     ensure(Math.abs(paused.time-paused.header[1]/48000)<.025,'Paused mpv clock diverged from consumption '+JSON.stringify(paused));
     ensure(paused.header[1]===pausedAfter.header[1],'Consumed frames advanced while paused '+JSON.stringify({paused,pausedAfter}));
     await rpc('pause',{value:false});
     const eof=await waitFor(s=>s.eof&&s.header[0]===s.header[1],'EOF drain'),first=await inspect();
     const reference=new Int16Array(await(await fetch('/fixtures/pcm.s16')).arrayBuffer()),pcm=new Float32Array(first.pcm);
     let maxError=0;ensure(pcm.length===reference.length,'PCM length '+pcm.length+' != '+reference.length);
     for(let i=0;i<pcm.length;i++)maxError=Math.max(maxError,Math.abs(pcm[i]-reference[i]/32768));
     ensure(maxError===0,'PCM mismatch '+maxError);ensure(first.maxQueued<=8192&&eof.maxOutstanding<=8192,'Unbounded queue');
     const oldEpoch=eof.epoch;await rpc('seek',{value:0.5});await rpc('pause',{value:false});
     const sought=await waitFor(s=>s.epoch>oldEpoch&&s.ack&&s.header[1]>1024,'Seek consumption');
     ensure(sought.chains===1,'Video chain after seek');
     await rpc('pause',{value:true});await rpc('speed',{value:2});await rpc('seek',{value:0});
     await requestWorklet('record');await rpc('pause',{value:false});
     const speed=await waitFor(s=>s.eof&&s.header[0]===s.header[1],'Speed EOF'),sped=await inspect();
     const speedFrames=sped.pcm.byteLength/8;ensure(speedFrames>40000&&speedFrames<56000,'2x sample count '+speedFrames);
     const beforeReplacement=speed.epoch;
     ensure(await rpc('load',{url:'/fixtures/replacement.wav',size:replacementSize,replace:true})===1,'Replacement audio chain');
     await requestWorklet('record');await rpc('pause',{value:false});
     const replacementEnd=await waitFor(s=>s.eof&&s.header[0]===s.header[1]&&s.epoch>beforeReplacement,'Replacement EOF');
     const replacementCapture=await inspect(),replacementPCM=new Float32Array(replacementCapture.pcm);
     const replacementReference=new Int16Array(await(await fetch('/fixtures/replacement.s16')).arrayBuffer());
     ensure(replacementPCM.length===replacementReference.length,'Replacement PCM length');
     let replacementError=0;for(let i=0;i<replacementPCM.length;i++)replacementError=Math.max(replacementError,Math.abs(replacementPCM[i]-replacementReference[i]/32768));
     ensure(replacementError===0,'Replacement PCM mismatch '+replacementError);
     const cleanup=await rpc('close');ensure(!cleanup.live&&!cleanup.scheduler.liveTasks&&!cleanup.scheduler.retainedTasks&&!cleanup.scheduler.timers&&!cleanup.source.pending&&!cleanup.source.handles&&!cleanup.source.timers&&!cleanup.error,'Close leaked state');
     return {facts,sampleRate:audio.sampleRate,duplicateInitRejected,suspended,suspendedAfter,paused,pausedAfter,eof,pcm:{samples:pcm.length,maxError},worklet:{maxQueued:first.maxQueued,underruns:first.underruns},sought,speed,speedFrames,replacementEnd,replacement:{samples:replacementPCM.length,maxError:replacementError},cleanup};
    }finally{worker.terminate();node.disconnect();await audio.close();}
   },{backend,scenario,size:files.get('/fixtures/pcm.wav').length,replacementSize:files.get('/fixtures/replacement.wav').length}),90000);
   item.passed=true;console.log('PASS',backend,scenario);
  }catch(error){item.passed=false;item.error=String(error.stack);console.error('FAIL',backend,scenario,item.error);process.exitCode=1;}
  finally{await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.passed=result.cases.filter(x=>x.passed).length;result.total=result.cases.length;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(out,result.passed+'/'+result.total);}
