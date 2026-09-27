// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {CpuBrowserBlocks,collectCpuWindow,summarizeCpu,benchmarkPolicy,delay} from './head-to-head/benchmark-browser.mjs';

const assets=path.resolve(process.argv[2]),qualification=path.resolve(process.argv[3]),out=path.resolve(process.argv[4]);
await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(manifestBytes);
for(const [name,item] of Object.entries(manifest.files))assert.equal(hash(await fs.readFile(path.join(assets,name))),item.sha256,name);
const correctnessBytes=await fs.readFile(path.join(qualification,'result.json')),correctness=JSON.parse(correctnessBytes);
assert.equal(correctness.assetsSHA256,hash(manifestBytes));assert.equal(correctness.passed,true);
await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));await fs.writeFile(path.join(out,'assets-manifest.json'),manifestBytes);
const report={assetsSHA256:hash(manifestBytes),correctness:{path:qualification,sha256:hash(correctnessBytes)},policy:benchmarkPolicy,cases:[],rows:[],scope:'Matched full Player CPU, one Chrome launch per row; raw total CPU, no idle subtraction'};
const blocks=new CpuBrowserBlocks({progress:{phase:(name,seconds)=>console.log(JSON.stringify({phase:name,seconds}))}});
report.blocks=blocks.records;
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
const policies=[{name:'pthread',isolated:true,policy:'off'},{name:'jspi',isolated:false,policy:'auto'},{name:'asyncify',isolated:false,policy:'auto',noJSPI:true}];
try{
 for(const file of ['m0-long.mkv','pcm-long.mkv']){
  const audio=file.startsWith('pcm'),probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',path.join(assets,'fixtures',file)],{encoding:'utf8'}));
  const [num,den]=probe.streams.find(s=>s.codec_type==='video').avg_frame_rate.split('/').map(Number),fps=num/den;
  report.rows.push({file,fps});
  for(let round=0;round<3;round++)for(let slot=0;slot<3;slot++){
   const c=policies[(round+slot)%3],row={file,round:round+1,slot:slot+1,...c,errors:[],workerPatches:[]};report.cases.push(row);
   let context,server;
   try{
    const {browser,identity,blockId,armIndex}=await blocks.acquire(file);row.blockId=blockId;row.armIndex=armIndex;
    assert.equal(identity.version.product,'Chrome/'+correctness.browser,'CPU browser differs from correctness browser');
    server=await serve({isolated:c.isolated,assetRoot:assets,mediaPaths:{movie:path.join(assets,'fixtures',file)}});
    context=await browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});const page=await context.newPage();page.setDefaultTimeout(20000);
    page.on('pageerror',e=>row.errors.push(String(e)));
    if(c.noJSPI){
     await context.addInitScript(()=>{WebAssembly.Suspending=undefined;WebAssembly.promising=undefined;});
     await context.route(/\/(mpv-subtitle-worker|audio-worker|native-remux-worker)\.js$/,async route=>{
      const original=await(await route.fetch()).body(),bytes=Buffer.concat([Buffer.from('WebAssembly.Suspending=undefined;WebAssembly.promising=undefined;\n'),original]);
      row.workerPatches.push({url:new URL(route.request().url()).pathname,originalSHA256:hash(original),servedSHA256:hash(bytes)});await route.fulfill({status:200,contentType:'text/javascript',body:bytes});
     });
    }
    await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
    await page.evaluate(async({policy,audio,url})=>{
     const {Player}=await import('/web/generated/index.js');const surface=document.querySelector('#surface');surface.style.cssText='position:relative;width:960px;height:540px';
     window.player=new Player(surface,{assetBase:'/',remuxRuntime:policy,nativeRemux:'always',...(audio?{audioPlayback:'worklet'}:{})});
     window.playerErrors=[];player.addEventListener('error',e=>playerErrors.push(e.detail));
     await player.openRemote({url});await player.play();
     window.snapshot=()=>{
      const video=player.surface,q=video.getVideoPlaybackQuality(),canvas=document.querySelector('.demuxe-native-ass');
      const pixels=canvas?.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let marked=0;if(pixels)for(let i=3;i<pixels.length;i+=4)if(pixels[i])marked++;
      return {time:player.state.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,paused:video.paused,ended:video.ended,hidden:document.hidden,marked,errors:playerErrors,diagnostics:player.diagnostics};
     };
    },{policy:c.policy,audio,url:server.origin+'/media/movie'});
    await page.waitForFunction(()=>player.state.currentTime>.2);await delay(benchmarkPolicy.warmupSeconds*1000);
    const cdp=await browser.newBrowserCDPSession();
    try{row.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>snapshot()),{seconds:benchmarkPolicy.measureSeconds,interval:benchmarkPolicy.sampleIntervalSeconds});}
    finally{await cdp.detach();}
    row.cpu=summarizeCpu(row.samples);assert.ok(row.cpu.processIdsStable,'Chrome process turnover inside CPU window');
    const first=row.samples[0].state,last=row.samples.at(-1).state,wall=row.cpu.wallSeconds;
    row.playback={advance:last.time-first.time,wall,frames:last.total-first.total,dropped:last.dropped-first.dropped};
    assert.ok(Math.abs(row.playback.advance-wall)<.5,'Media clock did not advance at 1x');
    assert.ok(row.playback.frames>=fps*wall*.95,'Decoded cadence below 95%');assert.ok(row.playback.dropped<=Math.max(2,row.playback.frames*.01),'Dropped-frame budget exceeded');
    for(const sample of row.samples){
     const s=sample.state;assert.equal(s.hidden,false);assert.equal(s.paused,false);assert.equal(s.ended,false);assert.deepEqual(s.errors,[]);
     assert.equal(s.diagnostics.remuxRuntime.runtime,c.name);assert.equal(s.diagnostics.plan.id,audio?'native-video-mpv-audio':'native-remux-mpv');
     const service=s.diagnostics.backend[audio?'mpvAudio':'mpvSubtitles'];assert.ok(service);
     if(c.name!=='pthread'){assert.equal(service.privateRuntime.memory,'ArrayBuffer');assert.equal(service.privateRuntime.crossOriginIsolated,false);if(c.noJSPI)assert.equal(service.privateRuntime.jspiPromising,'undefined');}
     if(audio){assert.equal(service.mpvVideoTracks,0);assert.ok(service.queuedFrames<=8192);assert.ok(service.absErrorP95Ms<150,'A/V p95 exceeds 150 ms');}
    }
    if(!audio)assert.ok(row.samples.some(s=>s.state.marked>0),'No subtitle pixels observed');
    row.cleanup=await page.evaluate(async()=>{const backend=player.current.backend,sub=backend.mpvSubs,audio=backend.mpvAudio;await player.destroy();return {subtitles:sub?.service,audio:audio?.diagnostics};});
    for(let i=0;i<30&&page.workers().length;i++)await delay(50);assert.deepEqual(page.workers().map(w=>w.url()),[]);assert.deepEqual(row.errors,[]);row.passed=true;
   }catch(error){row.passed=false;row.failure=String(error.stack??error);}
   finally{await context?.close();await server?.close();await save();console.log(JSON.stringify({file,round:row.round,runtime:c.name,passed:row.passed,cpu:row.cpu?.oneCorePercent,failure:row.failure}));}
  }
  await blocks.close();await save();
 }
 for(const entry of report.rows){entry.results=policies.map(c=>{const cells=report.cases.filter(r=>r.file===entry.file&&r.name===c.name);const accepted=cells.filter(r=>r.passed).map(r=>r.cpu.oneCorePercent).sort((a,b)=>a-b);return {runtime:c.name,accepted:accepted.length,attempted:cells.length,medianOneCorePercent:accepted.length===3?accepted[1]:null,min:accepted[0]??null,max:accepted.at(-1)??null};});}
 report.passed=report.cases.length===18&&report.cases.every(c=>c.passed);
}finally{await blocks.close();await save();}
if(!report.passed)process.exitCode=1;
