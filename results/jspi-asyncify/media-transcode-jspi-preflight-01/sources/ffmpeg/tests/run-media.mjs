// SPDX-License-Identifier: MIT
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'../../../..');
const experiment=path.resolve(import.meta.dirname,'../..');
const frozen=path.join(root,'build/jspi-asyncify/frozen');
const builds=process.env.BUILD_ROOT??'/Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927';
const out=path.join(root,'results/jspi-asyncify',process.env.RUN_NAME??`media-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(out,{recursive:false});
const profiles=(process.env.PROFILES??'remux,transcode').split(',');
const runtimes=(process.env.RUNTIMES??'pthread,jspi,asyncify').split(',');
const transcodeFixture=process.env.TRANSCODE_FIXTURE??'h264-pcm.mkv';
assert.ok(['h264-pcm.mkv','ac3.mkv'].includes(transcodeFixture));
const hash=b=>createHash('sha256').update(b).digest('hex');
const cache=new Map(),captures=new Map(),requests=[];
const load=async p=>{if(!cache.has(p))cache.set(p,await readFile(p));return cache.get(p);};
const engines={};
for(const profile of profiles)for(const runtime of runtimes){
 const dir=runtime==='pthread'?path.join(frozen,'baseline-'+profile):path.join(builds,`${profile}-${runtime}-${process.env.BUILD_ATTEMPT??'01'}`,'engine');
 engines[profile+'-'+runtime]={dir,wasmSHA256:hash(await load(path.join(dir,'remux.wasm'))),glueSHA256:hash(await load(path.join(dir,'remux.mjs')))};
}
const result={scope:'Actual FFmpeg component output and lifecycle; no Player, MSE, physical playback or performance qualification',
 recordedAt:new Date().toISOString(),engines,files:{worker:hash(await readFile(path.join(import.meta.dirname,'media-worker.mjs'))),runner:hash(await readFile(import.meta.filename))},cases:[]};
result.sourceSHA256={};
for(const name of ['ffmpeg/tests/media-worker.mjs','ffmpeg/tests/run-media.mjs','ffmpeg/runtime/ffmpeg-bridge.mjs',
 'ffmpeg/runtime/single-owner.mjs','stage2/runtime/range-source.mjs']){
 const bytes=await readFile(path.join(experiment,name)),dest=path.join(out,'sources',name);
 await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);result.sourceSHA256[name]=hash(bytes);
}
async function serve(isolated){
 const server=http.createServer(async(req,res)=>{
  if(isolated){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}
  res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>FFmpeg component qualification</title>');return;}
   if(url.pathname==='/capture'&&req.method==='POST'){
    const id=url.searchParams.get('id');if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid capture ID');
    let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>64*1024*1024)throw Error('Capture limit');chunks.push(chunk);}
    const bytes=Buffer.concat(chunks);const dest=path.join(out,id+'.mp4');await writeFile(dest,bytes);captures.set(id,{path:dest,bytes:bytes.length,sha256:hash(bytes)});res.end('ok');return;
   }
   let file;
   if(url.pathname.startsWith('/engine/')){
    const [, , id, name]=url.pathname.split('/');if(!engines[id]||!['remux.mjs','remux.wasm'].includes(name))throw Error('Invalid engine');file=path.join(engines[id].dir,name);
   } else if(url.pathname.startsWith('/frozen/')){
    file=path.resolve(frozen,url.pathname.slice('/frozen/'.length));if(!file.startsWith(frozen+path.sep))throw Error('Invalid fixture path');
   } else if(url.pathname.startsWith('/experiment/')){
    file=path.resolve(experiment,url.pathname.slice('/experiment/'.length));if(!file.startsWith(experiment+path.sep))throw Error('Invalid source path');
   } else {res.writeHead(404).end();return;}
   const bytes=await load(file);res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
   if(req.headers.range){
    const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range);if(!m)throw Error('Bad range');const a=+m[1],b=+m[2];if(a>b||b>=bytes.length)throw Error('Range bounds');
    requests.push({file:path.basename(file),start:a,end:b,isolated});res.writeHead(206,{'Content-Range':`bytes ${a}-${b}/${bytes.length}`,'Content-Length':b-a+1});res.end(bytes.subarray(a,b+1));
   }else {res.setHeader('Content-Length',bytes.length);res.end(bytes);}
  }catch(error){if(!res.headersSent)res.writeHead(500);res.end(String(error));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
const privateServer=await serve(false),sharedServer=await serve(true);
const browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();
const references=new Map();
function packets(file,videoOnly=false){return JSON.parse(execFileSync('ffprobe',['-v','error',...(videoOnly?['-select_streams','v:0']:[]),'-show_packets','-show_data_hash','sha256','-of','json',file],{maxBuffer:32*1024*1024})).packets.map(p=>Object.fromEntries(['stream_index','pts','dts','duration','data_hash'].map(k=>[k,p[k]])));}
function decoded(file,kind){return execFileSync('ffmpeg',['-v','error','-i',file,'-map',`0:${kind}:0`,...(kind==='v'?['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo']:['-c:a','pcm_s32le','-f','s32le']),'-'],{maxBuffer:256*1024*1024});}
try{
 for(const profile of profiles)for(const scenario of ['media','cancel','reader-failure','replace','fatal-output'])for(const transport of scenario==='media'?['blob','range']:['range'])for(const target of scenario==='media'?[0,2]:[0])for(const runtime of runtimes){
  if(scenario!=='media'&&runtime==='pthread')continue;
  const fixture=profile==='remux'?'avc-aac.ts':transcodeFixture;
  const file=path.join(frozen,'fixtures',fixture),bytes=await load(file);
  const key=`${profile}-${scenario}-${transport}-${target}`,id=`${key}-${runtime}`,entry={id,profile,runtime,scenario,transport,target,fixture,sourceSHA256:hash(bytes)};
  result.cases.push(entry);const page=await browser.newPage();
  try{
   const server=runtime==='pthread'?sharedServer:privateServer;await page.goto(server.origin);
   const start=requests.length;
   entry.evidence=await page.evaluate(async config=>{
    const worker=new Worker('/experiment/ffmpeg/tests/media-worker.mjs',{type:'module'}),chunks=[];let timer,poll,reading=false,mailbox,observedPending=false;
    const bytes=config.transport==='blob'?new Uint8Array(await(await fetch(config.sourceURL)).arrayBuffer()):null;
    const replacementBytes=config.scenario==='replace'?await(await fetch(config.replacementURL)).arrayBuffer():undefined;
    if(config.runtime==='pthread'){
     mailbox=new SharedArrayBuffer(64+262144);const header=new Int32Array(mailbox,0,16),view=new DataView(mailbox);
     poll=setInterval(async()=>{
      if(reading||Atomics.load(header,0)!==1)return;reading=true;
      try{const offset=view.getFloat64(32,true),count=Atomics.load(header,2);let data;
       if(config.transport==='blob')data=bytes.slice(offset,offset+count);
       else {const response=await fetch(config.sourceURL,{headers:{Range:`bytes=${offset}-${offset+count-1}`}});if(response.status!==206)throw Error('Baseline range');data=new Uint8Array(await response.arrayBuffer());}
       new Uint8Array(mailbox,64,data.length).set(data);Atomics.store(header,3,data.length);Atomics.store(header,0,2);Atomics.notify(header,0);
      }catch{Atomics.store(header,3,-1);Atomics.store(header,0,2);Atomics.notify(header,0);}finally{reading=false;}
     },0);
    }
    try{
     const evidence=await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('Component watchdog timeout')),60000);
      worker.onerror=e=>reject(Error(e.message));
      worker.onmessage=({data})=>{
       if(data.type==='bytes')chunks.push(data.buffer);
       if(data.type==='pending'){observedPending=true;worker.postMessage({type:'cancel'});}
       if(data.type==='error')reject(Error(JSON.stringify(data)));
       if(data.type==='done')resolve(data);
      };
      worker.postMessage({...config,mailbox,blobBytes:bytes?.buffer,replacementBytes});
     });
     if(config.scenario==='media'){
      const response=await fetch('/capture?id='+config.id,{method:'POST',body:new Blob(chunks)});if(!response.ok)throw Error('Capture failed');
     }
     return {...evidence,observedPending};
    }finally{clearTimeout(timer);clearInterval(poll);worker.terminate();}
   },{id,runtime,scenario,transport,target,size:bytes.length,sourceURL:'/frozen/fixtures/'+fixture,
    replacementURL:'/frozen/fixtures/'+(profile==='remux'?'h264-pcm.mkv':'avc-aac.ts'),
    engineURL:'/engine/'+profile+'-'+runtime+'/remux.mjs',adapt:profile==='transcode'?(fixture==='ac3.mkv'?3:1):0});
   entry.rangeRequests=requests.length-start;
   const e=entry.evidence;assert.equal(e.state,scenario==='fatal-output'?'failed':'closed');
   if(runtime!=='pthread'){assert.equal(e.source.pending,0);assert.equal(e.source.handles,0);assert.equal(e.source.timers,0);}
   if(scenario==='cancel'){assert.equal(e.observedPending,true);assert.equal(e.requiresDiscard,false);}
   if(scenario==='media'){
    entry.output=captures.get(id);assert.ok(entry.output?.bytes>0);
    const packetData=packets(entry.output.path,profile==='transcode'),video=hash(decoded(entry.output.path,'v')),audio=hash(decoded(entry.output.path,'a'));
    const packetTiming=packets(entry.output.path).map(({data_hash,...timing})=>timing);
    entry.decoded={video,audio};entry.packetSHA256=hash(JSON.stringify(packetData));
    entry.packetTimingSHA256=hash(JSON.stringify(packetTiming));
    if(runtime==='pthread')references.set(key,{probe:e.probe,codecs:e.codecs,packetData,packetTiming,video,audio});
    else{
     const ref=references.get(key);assert.ok(ref,'Matching pthread baseline must run first');assert.deepEqual(e.probe,ref.probe);assert.deepEqual(e.codecs,ref.codecs);
     assert.deepEqual(packetData,ref.packetData);assert.deepEqual(packetTiming,ref.packetTiming);assert.equal(video,ref.video);assert.equal(audio,ref.audio);entry.pthreadIdentity=true;
    }
    if(target===0){
     assert.equal(video,hash(decoded(file,'v')));
     if(fixture==='ac3.mkv'){
      const actual=decoded(entry.output.path,'a'),reference=decoded(file,'a');assert.equal(actual.length,reference.length);
      let maxDifference=0;for(let i=0;i<actual.length;i+=4)maxDifference=Math.max(maxDifference,Math.abs(actual.readInt32LE(i)-reference.readInt32LE(i)));
      entry.sourcePCM={policy:'24-bit rounding, at most one 24-bit LSB from native decoded s32 reference',maxDifferenceS32:maxDifference,samples:actual.length/4};
      assert.ok(maxDifference<=256,`PCM differs by ${maxDifference}, exceeds declared 24-bit policy`);
     }else {assert.equal(audio,hash(decoded(file,'a')));entry.sourceDecodeIdentity=true;}
    }
    if(transport==='range')assert.ok(entry.rangeRequests>0);
    if(profile==='transcode'){assert.equal(e.adaptation.videoFramesDecoded,0);assert.equal(e.adaptation.videoFramesEncoded,0);}
   }
   entry.passed=true;console.log('PASS',id);
  }catch(error){entry.passed=false;entry.error=String(error.stack);console.error('FAIL',id,entry.error.slice(0,500));process.exitCode=1;}
  finally{await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{
 await browser.close();await privateServer.close();await sharedServer.close();
 result.passed=result.cases.filter(x=>x.passed).length;result.total=result.cases.length;
 await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
 await writeFile(path.join(out,'ranges.json'),JSON.stringify(requests,null,2)+'\n');console.log(out,result.passed+'/'+result.total);
}
