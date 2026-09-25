// SPDX-License-Identifier: Apache-2.0
// Test-only native wakeup probe. Production player, worker, and mpv archives stay unchanged.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,readdir,symlink,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const kind=process.env.KIND??'srt';
const wakeMode=process.env.WAKE_MODE??'deadline';
const lateFromStart=kind==='late'&&process.env.LATE_FROM_START==='1';
const discoveryPoll=kind==='late'&&process.env.DISCOVERY_POLL==='1';
const noPlayInvalidate=kind==='late'&&process.env.NO_PLAY_INVALIDATE==='1';
const lateStartPts=kind==='late'?Number(process.env.LATE_START_PTS??(lateFromStart?0:199.5)):0;
const armBeforePlay=kind==='late'&&process.env.ARM_BEFORE_PLAY==='1';
const runId=process.env.RUN_ID?.replace(/[^a-z0-9_-]/gi,'')??'';
if(!['srt','ass','late'].includes(kind)||!['client','deadline'].includes(wakeMode))throw Error('Invalid probe mode');
const root=resolve('results/subtitle-stack-upgrade');
const fixture=kind==='ass'?root+'/same-text-style.mkv':kind==='late'?root+'/late-three.mkv':root+'/wakeup-static.mkv';
const report={kind,wakeMode,lateFromStart,lateStartPts,armBeforePlay,discoveryPoll,noPlayInvalidate,fixture,points:[],renderResponses:[],workerWakes:0,discoveryWakeups:0,discoveryRearms:[],polls:[],errors:[]};
// Pthread workers fetch their own JS and bypass Playwright's page routes.
// Serve a test-only asset mirror so every thread loads matching glue code.
const assetRoot=root+'/wakeup-assets',assetWeb=assetRoot+'/web';
await mkdir(assetWeb+'/engine-subtitles',{recursive:true});
for(const entry of await readdir('web'))if(entry!=='engine-subtitles'){
 try{await symlink(resolve('web',entry),assetWeb+'/'+entry);}catch(error){if(error.code!=='EEXIST')throw error;}
}
try{await symlink(resolve('fixtures'),assetRoot+'/fixtures');}catch(error){if(error.code!=='EEXIST')throw error;}
const glue=(await readFile(root+'/engine/service-raw.mjs','utf8')).replaceAll('service-raw.mjs','service.mjs').replaceAll('service-raw.wasm','service.wasm');
await writeFile(assetWeb+'/engine-subtitles/service.mjs',glue);
await copyFile(root+'/engine/service-raw.wasm',assetWeb+'/engine-subtitles/service.wasm');
const server=await serve({assetRoot});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 report.chrome=browser.version();
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
 page.on('pageerror',error=>report.errors.push(String(error)));
 page.on('requestfailed',request=>report.errors.push('fetch '+request.url()+' '+request.failure()?.errorText));
 await page.route('**/web/mpv-subtitle-worker.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const replace=(a,b)=>{if(!source.includes(a))throw Error('Worker patch target drift: '+a);source=source.replace(a,b);};
  replace("if(engine._subtitle_service_create()<0)throw Error('Subtitle service initialization failed');","if(engine._subtitle_service_create()<0)throw Error('Subtitle service initialization failed');engine._subtitle_poc_watch_client();");
  replace("if(d.type==='close'){","if(d.type==='close'){engine?._subtitle_poc_cancel_deadline();");
  replace("if(d.type==='select'){","if(d.type==='select'){engine._subtitle_poc_cancel_deadline();");
  replace("if(d.type==='seek'){","if(d.type==='seek'){engine._subtitle_poc_cancel_deadline();");
  replace("}else if(d.type==='render'){",`}else if(d.type==='metrics'){
   postMessage({id:d.id,clientWakeups:engine._subtitle_poc_client_wakeups(),deadlineWakeups:engine._subtitle_poc_deadline_wakeups(),deadlineArms:engine._subtitle_poc_deadline_arms(),decodeNotifications:engine._subtitle_poc_decode_notifications(),discoveryMessages:engine._subtitle_poc_discovery_messages(),allDecodes:engine._subtitle_poc_all_decodes(),registeredDecodes:engine._subtitle_poc_registered_decodes(),setters:engine._subtitle_poc_timing_setters()});return;
  }else if(d.type==='arm'){
   const next=engine._subtitle_poc_arm_deadline(d.seconds,d.rate||1);
   postMessage({id:d.id,next});return;
  }else if(d.type==='discover'){
   const begin=performance.now();engine._subtitle_service_block(0);
   const ready=engine._subtitle_poc_discover(d.seconds);engine._subtitle_service_block(1);
   const count=engine._subtitle_poc_lines(textPointer,256);
   postMessage({id:d.id,ready,count,workerMs:performance.now()-begin});return;
  }else if(d.type==='lines'){
   const count=engine._subtitle_poc_lines(textPointer,256),view=new DataView(engine.HEAPU8.buffer),lines=[];
   if(count>0)for(let i=0;i<count;i++)lines.push([view.getFloat64(textPointer+16*i,true),view.getFloat64(textPointer+16*i+8,true)]);
   postMessage({id:d.id,count,lines});return;
  }else if(d.type==='render'){`);
  replace('postMessage({id:d.id,bitmap,unchanged:',`if(d.running===false)engine._subtitle_poc_cancel_deadline();
    const next=d.running&&${wakeMode==='deadline'}?engine._subtitle_poc_arm_deadline(d.seconds,d.rate||1):NaN;
    postMessage({id:d.id,bitmap,next,unchanged:`);
  await route.fulfill({response,body:source});
 });
 await page.route('**/web/generated/internal/native-mpv-subtitles.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const loop='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
  if(!source.includes(loop))throw Error('Host loop patch target drift');
  source=source.replace(loop,'// Test-only: mpv native callback owns steady wakeups.');
  const render='force: this.lastRevision !== revision';
  if(!source.includes(render))throw Error('Host render patch target drift');
  source=source.replace(render,'force: this.lastRevision !== revision, running: !this.video.paused, rate: this.video.playbackRate');
  if(kind==='late'){
   const verify='if (track)\n                await this.verify();';
   if(!source.includes(verify))throw Error('Late probe verifier patch target drift');
   source=source.replace(verify,'// Test only: avoid sampling far future cues before the discovery trial.');
  }
  await route.fulfill({response,body:source});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.id='media';input.type='file';document.body.append(input);});
 await page.locator('#media').setInputFiles(fixture);
 await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
 await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
 report.route=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,service:player.diagnostics.backend.mpvSubtitles}));
 if(report.route.plan!=='native-direct-mpv'||report.route.service.avChains!==0)throw Error('Route mismatch');
 await page.evaluate(late=>{
  const s=player.current.backend.mpvSubs,probe={late,renderResponses:[],workerWakes:0,discoveryWakeups:0,discoveryRearms:[]};window.wakeupProbe=probe;
  const request=s.request.bind(s);
  s.request=async function(type,data){const response=await request(type,data);if(type==='render')probe.renderResponses.push({at:s.video.currentTime,requested:data.seconds,text:response.text,hasOverlay:response.hasOverlay,next:response.next,running:data.running});return response;};
  const original=s.worker.onmessage;
  s.worker.onmessage=function(event){
   if(event.data.type==='subtitleWake'){
    probe.workerWakes++;
    if(!s.video.paused&&!s.stopped){
     if(s.video.currentTime+.005<event.data.target)void s.request('arm',{seconds:s.video.currentTime,rate:s.video.playbackRate});
     else queueMicrotask(()=>s.tick());
    }
    return;
   }
   if(event.data.type==='subtitleTimingChanged'){
    probe.discoveryWakeups++;
    if(!s.video.paused&&!s.stopped)void s.request('arm',{seconds:s.video.currentTime,rate:s.video.playbackRate}).then(async result=>{
     const lines=probe.late?(await s.request('lines')).lines:undefined;
     probe.discoveryRearms.push({at:s.video.currentTime,next:result.next,lines});
    });
    return;
   }
   original.call(this,event);
  };
 },kind==='late');
 if(kind==='late')report.initial=await page.evaluate(async()=>({pts:player.state.currentTime,lines:await player.current.backend.mpvSubs.request('lines'),metrics:await player.current.backend.mpvSubs.request('metrics')}));
 if(lateFromStart)report.initialArm=await page.evaluate(()=>player.current.backend.mpvSubs.request('arm',{seconds:player.state.currentTime,rate:1}));
 else await page.evaluate(value=>player.seek(value),lateStartPts);
 report.startMetrics=await page.evaluate(()=>player.current.backend.mpvSubs.request('metrics'));
 if(kind==='late')report.preplay=await page.evaluate(async()=>({pts:player.state.currentTime,lines:await player.current.backend.mpvSubs.request('lines'),metrics:await player.current.backend.mpvSubs.request('metrics')}));
 if(armBeforePlay)report.preplayArm=await page.evaluate(()=>player.current.backend.mpvSubs.request('arm',{seconds:player.state.currentTime,rate:1}));
 if(noPlayInvalidate)await page.evaluate(()=>{player.current.backend.mpvSubs.invalidate=()=>{};});
 await page.evaluate(()=>player.play());
 if(discoveryPoll)await page.evaluate(()=>{
  window.wakeupProbe.polls=[];
  window.wakeupProbe.pollTimer=setInterval(async()=>{
   const s=player.current.backend.mpvSubs,at=s.video.currentTime;
   const result=await s.request('discover',{seconds:at});
   window.wakeupProbe.polls.push({at,...result});
  },1000);
 });
 const targets=lateFromStart?[.25,.75,1.25,2.5,4.25,5.5]:kind==='late'&&lateStartPts<100?[lateStartPts+.25,lateStartPts+.75,lateStartPts+1.25,lateStartPts+2.25]:kind==='late'?[199.6,199.8,199.95,200.25,202]:kind==='ass'?[3.25,4.25,5.25,11.25]:[1.25,2.25,3.25,7.25,8.25,9.25];
 for(const target of targets){
  await page.waitForFunction(t=>player.state.currentTime>=t,target,{timeout:18000});
  report.points.push(await page.evaluate(async t=>({target:t,pts:player.state.currentTime,renders:window.wakeupProbe.renderResponses.length,last:window.wakeupProbe.renderResponses.at(-1),discoveryWakeups:window.wakeupProbe.discoveryWakeups,discoveryRearms:window.wakeupProbe.discoveryRearms.slice(),...(window.wakeupProbe.late?{lines:await player.current.backend.mpvSubs.request('lines'),metrics:await player.current.backend.mpvSubs.request('metrics')}:{})}),target));
 }
 report.metrics=await page.evaluate(()=>player.current.backend.mpvSubs.request('metrics'));
 report.renderResponses=await page.evaluate(()=>window.wakeupProbe.renderResponses);
 report.workerWakes=await page.evaluate(()=>window.wakeupProbe.workerWakes);
 report.discoveryWakeups=await page.evaluate(()=>window.wakeupProbe.discoveryWakeups);
 report.discoveryRearms=await page.evaluate(()=>window.wakeupProbe.discoveryRearms);
 if(discoveryPoll)report.polls=await page.evaluate(()=>{clearInterval(window.wakeupProbe.pollTimer);return window.wakeupProbe.polls;});
 if(kind!=='late'){
  await page.evaluate(()=>player.pause());
  await page.evaluate(()=>player.seek(4.2));
  report.seekInto=await page.evaluate(()=>player.current.backend.mpvSubs.currentText());
  const resumeStart=await page.evaluate(()=>window.wakeupProbe.renderResponses.length);
  await page.evaluate(()=>player.play());
  await page.waitForFunction(t=>player.state.currentTime>=t,kind==='ass'?5.3:7.3,{timeout:12000});
  report.seekResumeRenders=await page.evaluate(start=>window.wakeupProbe.renderResponses.slice(start),resumeStart);
  await page.evaluate(()=>player.pause());
  await page.evaluate(value=>player.seek(value),kind==='ass'?5.2:7.2);
  report.seekOut=await page.evaluate(()=>player.current.backend.mpvSubs.currentText());
 }
 await page.evaluate(()=>player.destroy());
}catch(error){report.error=String(error.stack||error);}
finally{await mkdir(root,{recursive:true});await writeFile(root+`/wakeup-${kind}-${wakeMode}${lateFromStart?'-from-start':''}${lateStartPts===5?'-at-five':''}${discoveryPoll?'-poll':''}${noPlayInvalidate?'-no-play-render':''}${runId?'-'+runId:''}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
if(report.error)throw Error(report.error);
