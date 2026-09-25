// SPDX-License-Identifier: Apache-2.0
// Test-only sub-lines and deadline probe. Production host/worker files are unchanged.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-stack-upgrade');
const mode=process.env.MODE??'overlap';
const rawEvents=process.env.RAW_EVENTS==='1';
const fixture=({discovery:'late-srt.mkv','discovery-late':'late-srt.mkv',ass:'mixed-ass.mkv',webvtt:'stress-webvtt.mkv',movtext:'stress-movtext.mp4',pgs:'h264-aac-pgs.mkv',vobsub:'h264-aac-vobsub.mkv'})[mode]??'stress-srt.mkv';
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report={mode,fixture,rawEvents,chrome:browser.version(),points:[],renders:[],deadlines:[],invalidations:0,diagnostics:[]};
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 page.on('console',message=>{if(message.type()==='error')report.diagnostics.push('console: '+message.text());});
 page.on('pageerror',error=>report.diagnostics.push('page: '+String(error)));
 page.on('requestfailed',request=>report.diagnostics.push('fetch: '+request.url()+' '+request.failure()?.errorText));
 page.on('worker',worker=>worker.on('close',()=>report.diagnostics.push('worker closed: '+worker.url())));
 await page.route('**/web/engine-subtitles/service.mjs',async route=>{
  let body=await readFile(root+'/engine/'+(rawEvents?'service-raw.mjs':'service.mjs'),'utf8');
  if(rawEvents)body=body.replaceAll('service-raw.mjs','service.mjs').replaceAll('service-raw.wasm','service.wasm');
  await route.fulfill({contentType:'text/javascript',body});
 });
 await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/'+(rawEvents?'service-raw.wasm':'service.wasm'))}));
 if(rawEvents)await page.route('**/web/engine-subtitles/service-raw.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service-raw.wasm')}));
 await page.route('**/web/mpv-subtitle-worker.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const target="}else if(d.type==='render'){";
  if(!source.includes(target))throw Error('Worker patch target drift');
  source=source.replace(target,`}else if(d.type==='timing'){
   const ptr=textPointer,view=new DataView(engine.HEAPU8.buffer),start=performance.now();
   const count=engine._subtitle_poc_lines(ptr,256),lines=[];
   if(count>0)for(let i=0;i<count;i++)lines.push([view.getFloat64(ptr+i*16,true),view.getFloat64(ptr+i*16+8,true)]);
   postMessage({id:d.id,count,lines,workerMs:performance.now()-start});return;
  }else if(d.type==='render'){`);
  await route.fulfill({response,body:source});
 });
 // A single tick still uses the existing production render path. Remove only
 // its unconditional self-scheduling loop for this isolated browser page.
 if(mode!=='baseline-same')await page.route('**/web/generated/internal/native-mpv-subtitles.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const target='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
  if(!source.includes(target))throw Error('Host patch target drift');
  source=source.replace(target,'// Test-only: deadline probe owns the next wakeup.');
  await route.fulfill({response,body:source});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
 const fixturePath=mode==='pgs'||mode==='vobsub'?'build/mpv-subtitle-service/generalization/'+fixture:root+'/../subtitle-deadline-candidate/fixtures/'+fixture;
 report.fixturePath=process.env.FIXTURE??fixturePath;
 await page.locator('#media').setInputFiles(process.env.FIXTURE??fixturePath);
 await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
 await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
 report.route=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,service:player.diagnostics.backend.mpvSubtitles}));
 if(report.route.plan!=='native-direct-mpv'||report.route.service.avChains!==0)throw Error('Route mismatch');
 await page.evaluate(()=>{
  const s=player.current.backend.mpvSubs;
  window.probe={renders:[],deadlines:[],invalidations:0,queries:0,epoch:0,timer:0};
  const p=window.probe,request=s.request.bind(s);
  s.request=async function(type,data){const result=await request(type,data);if(type==='render')p.renders.push({at:s.video.currentTime,requested:data.seconds,text:result.text,hasOverlay:result.hasOverlay});if(type==='timing')p.queries++;return result;};
  const invalidate=s.invalidate.bind(s);
  s.invalidate=function(){p.invalidations++;p.epoch++;clearTimeout(p.timer);p.timer=0;invalidate();if(!s.video.paused)queueMicrotask(()=>window.schedule?.());};
  const destroy=s.destroy.bind(s);
  s.destroy=function(){p.epoch++;clearTimeout(p.timer);p.timer=0;document.removeEventListener('visibilitychange',visibility);return destroy();};
  function visibility(){p.epoch++;clearTimeout(p.timer);p.timer=0;if(!document.hidden){s.invalidate();window.schedule();}}
  document.addEventListener('visibilitychange',visibility);
  window.schedule=async()=>{
   if(s.stopped||s.video.paused||!s.enabled||p.timer)return;
   const epoch=p.epoch,now=s.video.currentTime,meta=await s.request('timing');
   if(epoch!==p.epoch||s.stopped||s.video.paused)return;
   const boundaries=meta.lines.flat().filter(x=>Number.isFinite(x)&&x>now+.001);
   const target=Math.min(...boundaries);p.deadlines.push({now,target,known:meta.lines.length});
   if(!Number.isFinite(target))return;
   p.timer=setTimeout(async()=>{
    p.timer=0;if(epoch!==p.epoch||s.stopped||s.video.paused)return;
    // Timer is only a wakeup: read actual PTS and the current mpv list again.
    const fresh=await s.request('timing');if(epoch!==p.epoch||s.stopped)return;
    const current=s.video.currentTime;
    if(current+0.001<target){window.schedule();return;}
    s.tick();setTimeout(()=>window.schedule(),25);
   },Math.max(1,(target-now)*1000/s.video.playbackRate));
  };
 });
 const point=async(label)=>{const x=await page.evaluate(async()=>{const s=player.current.backend.mpvSubs;const t=performance.now(),meta=await s.request('timing');return {time:s.video.currentTime,meta,roundtripMs:performance.now()-t,renders:window.probe.renders.slice(-5),deadlines:window.probe.deadlines.slice(-5)};});report.points.push({label,...x});console.log(label,JSON.stringify(x));};
 if(mode==='baseline-same'){
  await page.evaluate(()=>player.seek(4.2));await page.waitForFunction(()=>player.state.currentTime>=4.15);
  report.beforeText=await page.evaluate(()=>player.current.backend.mpvSubs.currentText());await point('before-style-clear');
  await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>5.3,null,{timeout:10000});
  report.afterText=await page.evaluate(()=>player.current.backend.mpvSubs.currentText());await point('after-style-clear');
 }else if(['overlap','ass','ass-same','webvtt','movtext'].includes(mode)){
  await page.evaluate(()=>player.seek(4.2));await page.waitForFunction(()=>player.state.currentTime>=4.15);
  await point('overlap-start');
  await page.evaluate(async()=>{await player.play();window.schedule();});
  await page.waitForFunction(()=>player.state.currentTime>5.4,null,{timeout:10000});
  await point('after-short-clear');
  await page.waitForFunction(()=>player.state.currentTime>11.25,null,{timeout:15000});
  await point('after-long-clear');
 }else if(mode==='discovery-late'){
  await page.evaluate(()=>player.seek(199.5));await page.waitForFunction(()=>player.state.currentTime>199.45);
  await point('before-middle');await page.evaluate(async()=>{await player.play();window.schedule();});
  await page.waitForFunction(()=>player.state.currentTime>211,null,{timeout:17000});await point('after-middle-clear');
 }else{
  await page.evaluate(()=>player.seek(1.5));await page.waitForFunction(()=>player.state.currentTime>1.45);
  await point('early');await page.evaluate(async()=>{await player.play();window.schedule();});
  await page.waitForFunction(()=>player.state.currentTime>5,null,{timeout:12000});await point('later-without-periodic-render');
 }
 const end=await page.evaluate(()=>{const p=window.probe;return {renders:p.renders,deadlines:p.deadlines,invalidations:p.invalidations,queries:p.queries};});
 Object.assign(report,end);
 await page.evaluate(()=>player.destroy());
}catch(error){report.error=String(error.stack||error);console.error(report.error);}
finally{await mkdir(root,{recursive:true});await writeFile(root+'/'+mode+(rawEvents?'-raw':'')+'.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
