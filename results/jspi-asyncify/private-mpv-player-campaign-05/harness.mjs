// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const assets=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(manifestBytes);
for(const [name,item] of Object.entries(manifest.files))assert.equal(hash(await fs.readFile(path.join(assets,name))),item.sha256,name);
await fs.writeFile(path.join(out,'assets-manifest.json'),manifestBytes);await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
const report={assetsSHA256:hash(manifestBytes),cases:[],scope:'Full Player finite-file private mpv campaign; no device or broad codec qualification'};
const fixtures=['m0.mkv','replacement.mkv','movtext.mp4','pgs.mkv','vobsub.mkv','pcm.mkv','pcm-ass.mkv','m0-long.mkv','pcm-long.mkv'];
const policies=[{name:'pthread',isolated:true,policy:'off',runtime:'pthread'},{name:'jspi',isolated:false,policy:'auto',runtime:'jspi'},{name:'asyncify',isolated:false,policy:'auto',runtime:'asyncify',noJSPI:true}];
const cases=fixtures.flatMap(file=>policies.map(policy=>({...policy,file})));
cases.push({name:'on-isolated',isolated:true,policy:'on',runtime:'jspi',file:'m0.mkv'},{name:'asyncify-isolated',isolated:true,policy:'asyncify',runtime:'asyncify',file:'m0.mkv'},{name:'off-no-isolation',isolated:false,policy:'off',file:'m0.mkv',reject:true},{name:'missing-mpv-wasm',isolated:false,policy:'jspi',runtime:'jspi',file:'m0.mkv',missing:true,reject:true});
if(process.env.ROUTES)cases.splice(0,cases.length,...policies.flatMap(policy=>[
 {...policy,file:'movtext.mp4',remux:'never',expectedPlan:'native-direct-mpv'},
 {...policy,file:'m0.mkv',local:true,expectedPlan:'native-remux-mpv'},
 {...policy,file:'pcm.mkv',local:true,expectedPlan:'native-video-mpv-audio'},
 {...policy,file:'pcm24-ass.mkv',expectedPlan:'native-transcode-mpv',transcode:true},
]));
let browser;const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 for(const c of cases){
  if(process.env.ONLY&&!`${c.name}:${c.file}`.includes(process.env.ONLY))continue;
  const row={...c,requests:[],workerPatches:[],errors:[]};report.cases.push(row);
  const server=await serve({isolated:c.isolated,assetRoot:assets,mediaPaths:{movie:path.join(assets,'fixtures',c.file),replacement:path.join(assets,'fixtures',c.remux==='never'||c.transcode?c.file:c.file.startsWith('pcm')?'pcm.mkv':'replacement.mkv')}}),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>row.errors.push(String(e)));page.on('request',r=>{if(/engine-|private-mpv|subtitle-worker/.test(r.url()))row.requests.push(new URL(r.url()).pathname);});
  try{
   if(c.noJSPI){
    await context.addInitScript(()=>{WebAssembly.Suspending=undefined;WebAssembly.promising=undefined;});
    await context.route(/\/(mpv-subtitle-worker|audio-worker|native-remux-worker)\.js$/,async route=>{
     const original=await(await route.fetch()).body();const bytes=Buffer.concat([Buffer.from('WebAssembly.Suspending=undefined;WebAssembly.promising=undefined;\n'),original]);
     row.workerPatches.push({url:new URL(route.request().url()).pathname,originalSHA256:hash(original),servedSHA256:hash(bytes)});await route.fulfill({status:200,contentType:'text/javascript',body:bytes});
    });
   }
   if(c.missing)await context.route('**/engine-mpv-subtitles-jspi/service.wasm',route=>route.fulfill({status:404,body:'missing'}));
   const response=await page.goto(server.origin+'/experiment/page.html');row.headers=response.headers();
   row.open=await page.evaluate(async({c,url})=>{
    const {Player}=await import('/web/generated/index.js');const stage=document.querySelector('#surface');stage.style.cssText='position:relative;width:640px;height:360px';
    const audio=c.file.startsWith('pcm')&&!c.transcode;window.player=new Player(stage,{assetBase:'/',remuxRuntime:c.policy,nativeRemux:c.remux??'always',...(audio?{audioPlayback:'worklet'}:{})});
    try{if(c.local){const blob=await(await fetch(url)).blob();await player.open(new File([blob],c.file));}else await player.openRemote({url});
     if(audio&&c.runtime!=='pthread'){
      const port=player.current.backend.mpvAudio.node.port;let id=0;
      window.inspectPCM=type=>new Promise((resolve,reject)=>{const sequence=++id;const timeout=setTimeout(()=>{port.removeEventListener('message',listener);reject(Error('PCM inspection deadline'));},3000);const listener=({data})=>{if(data.id===sequence){clearTimeout(timeout);port.removeEventListener('message',listener);resolve(data);}};port.addEventListener('message',listener);port.postMessage({type,id:sequence});});
      await inspectPCM('record');
     }
     await player.play();return {selection:player.diagnostics.remuxRuntime};}catch(e){return {error:{code:e.code,message:e.message},diagnostics:player.diagnostics};}
   },{c,url:server.origin+'/media/movie'});
   if(c.reject){assert.ok(row.open.error,'Required subtitle route must reject unavailable service');}
   else{
    assert.equal(row.open.error,undefined,JSON.stringify(row.open));await page.waitForFunction(()=>player.state.currentTime>.5);
    const audio=c.file.startsWith('pcm')&&!c.transcode,sub=!['pcm.mkv','pcm-long.mkv'].includes(c.file);
    row.initial=await page.evaluate(()=>player.diagnostics);
    if(audio&&c.runtime!=='pthread'){
     row.pcm=await page.evaluate(async()=>{const capture=await inspectPCM('inspect'),samples=new Float32Array(capture.pcm);return {samples:Array.from(samples.subarray(0,8192)),totalSamples:samples.length,maxQueued:capture.maxQueued,failed:capture.failed};});
     const raw=await fs.readFile(path.join(assets,'fixtures/pcm.s16'));
     assert.ok(row.pcm.samples.length>=4096);let maxError=0;
     row.pcm.samples.forEach((sample,i)=>{maxError=Math.max(maxError,Math.abs(sample-raw.readInt16LE(i*2)/32768));});
     assert.equal(maxError,0);assert.ok(row.pcm.maxQueued<=8192);assert.equal(row.pcm.failed,null);row.pcm={...row.pcm,samples:row.pcm.samples.length,maxError};
    }
    assert.equal(row.initial.remuxRuntime.runtime,c.runtime);
    assert.equal(row.initial.plan.id,c.expectedPlan??(audio?(sub?'native-video-mpv-audio-subtitles':'native-video-mpv-audio'):'native-remux-mpv'));
    if(c.runtime!=='pthread')for(const name of [...(audio?['mpvAudio']:[]),...(sub?['mpvSubtitles']:[])]){
     const facts=row.initial.backend[name].privateRuntime;assert.equal(facts.runtime,c.runtime);assert.equal(facts.memory,'ArrayBuffer');assert.equal(facts.crossOriginIsolated,c.isolated);
     if(c.noJSPI){assert.equal(facts.jspiSuspending,'undefined');assert.equal(facts.jspiPromising,'undefined');}
    }
    await page.evaluate(()=>player.pause());const before=await page.evaluate(()=>player.state.currentTime);await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>player.state.currentTime)-before)<.05,'Paused clock moved');
    row.frames=[];
    if(sub)for(const seconds of c.file==='pgs.mkv'||c.file==='vobsub.mkv'?[1,33,35.6,1]:[1,3,1]){
     await page.evaluate(async seconds=>{await player.seek(seconds);await player.current.backend.mpvSubs.currentText();},seconds);
     await page.waitForTimeout(100);
     const frame=await page.evaluate(async()=>{const canvas=document.querySelector('.demuxe-native-ass');const b=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return {width:canvas.width,height:canvas.height,marked:b.filter((_,i)=>i%4===3&&b[i]>0).length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('')};});
     if(seconds===35.6)assert.equal(frame.marked,0);else assert.ok(frame.marked>0,'Required subtitle pixels absent');row.frames.push({seconds,...frame});
    }
    await page.evaluate(async()=>{await player.seek(2);await player.setPlaybackRate(2);await player.play();});await page.waitForFunction(()=>player.state.currentTime>2.4);
    if(audio){
     await page.waitForTimeout(750);row.audio=await page.evaluate(()=>player.diagnostics.backend.mpvAudio);assert.equal(row.audio.mpvVideoTracks,0);assert.ok(row.audio.absErrorP95Ms<150,'A/V clock p95 exceeded 150ms');
     await page.evaluate(async()=>{const service=player.current.backend.mpvAudio;const context=service.context??service.engine.selectiveAudioState().context;await context.suspend();});const frozen=await page.evaluate(()=>player.state.currentTime);await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>player.state.currentTime)-frozen)<.08,'Suspended context moved video');
     await page.evaluate(async()=>{const service=player.current.backend.mpvAudio;const context=service.context??service.engine.selectiveAudioState().context;await context.resume();});
    }
    await page.evaluate(async url=>{await player.pause();await player.setPlaybackRate(1);await player.openRemote({url});await player.play();},server.origin+'/media/replacement');await page.waitForFunction(()=>player.state.currentTime>.3);
    row.replaced=await page.evaluate(()=>player.diagnostics);
    await page.evaluate(async()=>{await player.seek(Math.max(0,player.state.duration-.6));await player.play();});
    await page.waitForFunction(()=>player.surface.ended);row.eof=await page.evaluate(()=>({state:player.state,diagnostics:player.diagnostics}));
    await page.evaluate(async()=>{await player.seek(0);await player.play();});await page.waitForFunction(()=>player.state.currentTime>3&&!player.surface.ended);
    row.cleanup=await page.evaluate(async()=>{const backend=player.current.backend,subs=backend.mpvSubs,audio=backend.mpvAudio;await player.destroy();return {subtitles:subs?.service,audio:audio?.diagnostics};});
    if(c.runtime!=='pthread'){
     const subClose=row.cleanup.subtitles?.cleanup,audioClose=row.cleanup.audio?.cleanup;
     for(const close of [subClose,audioClose].filter(Boolean)){assert.equal(close.live,0);assert.equal(close.scheduler.liveTasks,0);assert.equal(close.scheduler.retainedTasks,0);assert.equal(close.source.pending,0);assert.equal(close.source.handles,0);}
     assert.ok(!row.cleanup.subtitles?.closeError);assert.ok(!audioClose?.error);
    }
   }
   await page.evaluate(()=>window.player?.destroy());for(let i=0;i<30&&page.workers().length;i++)await page.waitForTimeout(50);row.remainingWorkers=page.workers().map(w=>w.url());assert.equal(row.remainingWorkers.length,0,JSON.stringify(row.remainingWorkers));assert.deepEqual(row.errors,[]);row.passed=true;
  }catch(e){row.passed=false;row.failure=String(e.stack??e);}
  finally{await context.close();await server.close();await save();console.log(JSON.stringify({case:c.name,file:c.file,passed:row.passed,failure:row.failure}));}
 }
 for(const file of fixtures){const rows=report.cases.filter(c=>c.file===file&&c.passed&&c.frames?.length);const reference=rows.find(c=>c.runtime==='pthread');if(reference)for(const row of rows)try{assert.deepEqual(row.frames,reference.frames);row.matchesPthreadPixels=true;}catch(e){row.passed=false;row.failure='Subtitle pixels differ from pthread Player: '+String(e);}}
 report.passed=report.cases.length>0&&report.cases.every(c=>c.passed);
}finally{await browser?.close();await save();}
if(!report.passed)process.exitCode=1;
