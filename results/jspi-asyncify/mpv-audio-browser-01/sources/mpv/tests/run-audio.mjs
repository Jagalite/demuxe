// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
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
for(const name of ['pcm.wav','pcm.s16'])await add('/fixtures/'+name,path.join(root,'build/jspi-asyncify/mpv-frozen/fixtures',name));
await writeFile(path.join(out,'build.json'),JSON.stringify(manifest,null,2)+'\n');
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Private mpv audio</title>');return;}
 const b=files.get(req.url);if(!b){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',req.url.endsWith('.wasm')?'application/wasm':req.url.endsWith('.mjs')?'text/javascript':'application/octet-stream');
 if(req.headers.range){const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range);if(!m||+m[1]>+m[2]||+m[2]>=b.length){res.writeHead(416).end();return;}res.writeHead(206,{'Content-Range':`bytes ${m[1]}-${m[2]}/${b.length}`});res.end(b.subarray(+m[1],+m[2]+1));}else res.end(b);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const result={scope:'Restricted stereo PCM mpv and AudioWorklet component; not Player, device or codec qualification',inputs:hashes,cases:[]};
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const backend of ['jspi','asyncify']){
  const item={backend};result.cases.push(item);const page=await browser.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error(msg.text().slice(0,600));});
  try{
   const response=await page.goto('http://127.0.0.1:'+server.address().port);item.headers=response.headers();
   assert.equal(item.headers['cross-origin-opener-policy'],undefined);assert.equal(item.headers['cross-origin-embedder-policy'],undefined);
   item.evidence=await page.evaluate(async({backend,size})=>{
    const ensure=(ok,message)=>{if(!ok)throw Error(message);},delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const audio=new AudioContext({sampleRate:48000});await audio.audioWorklet.addModule('/experiment/mpv/runtime/audio-worklet.mjs');
    const node=new AudioWorkletNode(audio,'demuxe-private-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    // A real rendering graph with muted output, suitable for deterministic capture.
    const gain=audio.createGain();gain.gain.value=0;node.connect(gain).connect(audio.destination);await audio.resume();
    ensure(audio.sampleRate===48000&&audio.state==='running','AudioContext contract');
    const worker=new Worker('/experiment/mpv/tests/audio-worker.mjs',{type:'module'}),pending=new Map(),inspections=new Map();let next=1,fatal;
    worker.onerror=e=>{fatal=e.message;for(const p of pending.values())p.reject(Error(fatal));};
    worker.onmessage=({data:d})=>{
     if(d.type==='transportError')fatal=d.error;
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
     if(backend==='asyncify')ensure(facts.jspi==='undefined','JSPI disabled');
     ensure(await rpc('load',{url:'/fixtures/pcm.wav',size})===1,'Audio-only chain');
     await requestWorklet('record');await rpc('pause',{value:false});
     await waitFor(s=>s.header[1]>4096,'Initial consumption');
     await audio.suspend();await rpc('context',{value:false});await delay(80);
     const suspended=await rpc('status');await delay(160);const suspendedAfter=await rpc('status');
     ensure(suspended.header[1]===suspendedAfter.header[1],'Consumption advanced with suspended AudioContext');
     await rpc('context',{value:true});await audio.resume();await delay(50);
     await rpc('pause',{value:true});await delay(80);
     const paused=await rpc('status');await delay(160);const pausedAfter=await rpc('status');
     ensure(paused.header[1]===pausedAfter.header[1],'Consumed frames advanced while paused');
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
     const cleanup=await rpc('close');ensure(!cleanup.live&&!cleanup.scheduler.liveTasks&&!cleanup.scheduler.retainedTasks&&!cleanup.scheduler.timers&&!cleanup.source.pending&&!cleanup.source.handles&&!cleanup.source.timers&&!cleanup.error,'Close leaked state');
     return {facts,sampleRate:audio.sampleRate,suspended,suspendedAfter,paused,pausedAfter,eof,pcm:{samples:pcm.length,maxError},worklet:{maxQueued:first.maxQueued,underruns:first.underruns},sought,speed,speedFrames,cleanup};
    }finally{worker.terminate();node.disconnect();await audio.close();}
   },{backend,size:files.get('/fixtures/pcm.wav').length});
   item.passed=true;console.log('PASS',backend);
  }catch(error){item.passed=false;item.error=String(error.stack);console.error('FAIL',backend,item.error);process.exitCode=1;}
  finally{await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.passed=result.cases.filter(x=>x.passed).length;result.total=result.cases.length;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(out,result.passed+'/'+result.total);}
