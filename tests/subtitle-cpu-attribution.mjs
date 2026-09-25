// SPDX-License-Identifier: Apache-2.0
// Disposable whole-player subtitle CPU experiment. No production code changes.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const cases={
  srt:'build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',
  mov_text:'build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4',
  ass:'build/head-to-head/assets-component-isolation-01/fixtures/h264-ass/index.mkv',
  pgs:'build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv',
  vobsub:'build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv',
};
const wanted=(process.env.CASES??Object.keys(cases).join(',')).split(',');
const variant=process.env.VARIANT??'baseline';
const rounds=Number(process.env.ROUNDS??3),warmup=Number(process.env.WARMUP??2),windowSeconds=Number(process.env.WINDOW??8);
const out=process.env.OUT??`results/subtitle-cpu/${new Date().toISOString().replaceAll(':','-')}`;
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),protocol:{rounds,warmup,windowSeconds,variant,viewport:[960,540],freshChromePerTrial:true,unit:'CDP Chrome process CPU seconds / wall seconds * 100; one logical core',order:'alternating within pairs'},fixtures:{},trials:[]};
for(const name of wanted)report.fixtures[name]={path:cases[name],sha256:await hash(cases[name])};
await mkdir(out,{recursive:true});
const save=()=>writeFile(`${out}/result.json`,JSON.stringify(report,null,2)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve();
try{
 for(const name of wanted)for(let round=1;round<=rounds;round++)for(const lane of round%2?['off','on']:['on','off']){
  const trial={name,round,lane,accepted:false};report.trials.push(trial);
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  trial.chrome=browser.version();
  const page=await browser.newPage({viewport:{width:960,height:540}});
  try{
   if(variant==='10hz')await page.route('**/web/generated/internal/native-mpv-subtitles.js',async route=>{
    const response=await route.fetch(),source=await response.text();
    const before='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
    if(!source.includes(before))throw Error('Test-only cadence patch target changed');
    await route.fulfill({response,body:source.replace(before,'if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = setTimeout(() => this.tick(), 100);')});
   });
   if(variant==='instrument')await page.route('**/web/mpv-subtitle-worker.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    const edits=[
     ['const overlay=new SubtitleOverlay();','const overlay=new SubtitleOverlay();\nconst profile={calls:0,renderMs:0,overlayMs:0,canvasMs:0,textMs:0,changed:0};'],
     ['lastTime=d.seconds;engine._subtitle_service_block(0);let ready=0;','lastTime=d.seconds;const p0=performance.now();engine._subtitle_service_block(0);let ready=0;'],
     ['engine._subtitle_service_block(1);if(!ready)','engine._subtitle_service_block(1);profile.calls++;profile.renderMs+=performance.now()-p0;if(!ready)'],
     ['const previous=overlay.serial,snapshot=overlay.read(engine);','const p1=performance.now();const previous=overlay.serial,snapshot=overlay.read(engine);profile.overlayMs+=performance.now()-p1;'],
     ['let bitmap;\n    if(d.force','const p2=performance.now();let bitmap;\n    if(d.force'],
     ['const textLength=engine._subtitle_service_text(textPointer,4096);','profile.canvasMs+=performance.now()-p2;if(bitmap)profile.changed++;const p3=performance.now();const textLength=engine._subtitle_service_text(textPointer,4096);'],
     ["catch{throw Error('Subtitle decode failed');}","catch{throw Error('Subtitle decode failed');}\n    profile.textMs+=performance.now()-p3;"],
     ['service:{avChains:0,heapBytes:engine.HEAPU8.byteLength,io:ioStats}','service:{avChains:0,heapBytes:engine.HEAPU8.byteLength,io:ioStats,profile:{...profile},overlay:{...overlay.stats}}'],
    ];
    for(const [before,after] of edits){if(!source.includes(before))throw Error(`Test-only instrumentation target changed: ${before}`);source=source.replaceAll(before,after);}
    await route.fulfill({response,body:source});
   });
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(cases[name]);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   if(lane==='off')await page.evaluate(()=>player.selectSubtitleTrack(null));
   else await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
   const setup=await page.evaluate(()=>({plan:player.diagnostics.plan,selection:player.diagnostics.selection,backend:player.diagnostics.backend,tracks:player.state.subtitleTracks,audioTracks:player.state.audioTracks,activeMode:player.state.activeMode,video:(()=>{const v=player.current.backend.video;return v?{width:v.videoWidth,height:v.videoHeight,muted:v.muted,volume:v.volume}:null})()}));
   trial.route=setup;
   if(!['native-direct-mpv','native-remux-mpv'].includes(setup.plan?.id)||setup.backend.mpvSubtitles?.avChains!==0)throw Error(`Unexpected route/AV chain: ${JSON.stringify(setup)}`);
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.currentTime>.5,null,{timeout:15000});
   await sleep(warmup*1000);
   const cdp=await browser.newBrowserCDPSession();
   const sample=async()=>{
    const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
    const state=await page.evaluate(()=>{const v=player.current.backend.video,s=player.current.backend.mpvSubs,q=v?.getVideoPlaybackQuality?.();return {time:player.state.currentTime,status:player.state.status,plan:player.diagnostics.plan?.id,mpv:player.diagnostics.backend.mpvSubtitles,renderStats:s?{...s.stats}:null,subtitleSelected:player.state.subtitleTracks.map(t=>({id:t.id,selected:t.selected})),video:v?{width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,quality:q?{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames}:null,muted:v.muted,volume:v.volume,audioDecodedBytes:v.webkitAudioDecodedByteCount??null}:null};});
    return {wall:performance.now(),processes,state,workers:page.workers().map(w=>w.url())};
   };
   const samples=[await sample()];for(let i=0;i<windowSeconds;i++){await sleep(1000);samples.push(await sample());}
   const a=samples[0],b=samples.at(-1),elapsed=(b.wall-a.wall)/1000;
   const pids=a.processes.map(p=>p.id).sort((x,y)=>x-y).join(',');
   for(const s of samples)if(s.processes.map(p=>p.id).sort((x,y)=>x-y).join(',')!==pids)throw Error('Chrome process membership changed');
   const cpu=b.processes.reduce((n,p)=>n+p.cpuTime-a.processes.find(q=>q.id===p.id).cpuTime,0);
   const videoDelta=(b.state.video?.quality?.totalVideoFrames??0)-(a.state.video?.quality?.totalVideoFrames??0);
   const droppedDelta=(b.state.video?.quality?.droppedVideoFrames??0)-(a.state.video?.quality?.droppedVideoFrames??0);
   const audioBytesDelta=a.state.video?.audioDecodedBytes===null?null:(b.state.video?.audioDecodedBytes??0)-(a.state.video?.audioDecodedBytes??0);
   if(b.state.time-a.state.time<elapsed-1||videoDelta<elapsed*20||droppedDelta>5||audioBytesDelta!==null&&audioBytesDelta<=0||b.state.mpv?.avChains!==0)throw Error(`Playback correctness: ${JSON.stringify({timeDelta:b.state.time-a.state.time,elapsed,videoDelta,droppedDelta,audioBytesDelta,mpv:b.state.mpv})}`);
   const stats=(key)=>(b.state.renderStats?.[key]??0)-(a.state.renderStats?.[key]??0);
   trial.steady={elapsed,cpuSeconds:cpu,oneCorePercent:cpu/elapsed*100,timeDelta:b.state.time-a.state.time,videoFrames:videoDelta,droppedFrames:droppedDelta,audioBytesDelta,renderCalls:stats('renders'),bitmapUpdates:stats('bitmapUpdates'),bitmapBytes:stats('bytes'),ioStart:a.state.mpv?.io,ioEnd:b.state.mpv?.io,profileStart:a.state.mpv?.profile,profileEnd:b.state.mpv?.profile,overlayStart:a.state.mpv?.overlay,overlayEnd:b.state.mpv?.overlay,workers:b.workers,heapBytes:b.state.mpv?.heapBytes,processes:b.processes.map(p=>({id:p.id,type:p.type,cpuSeconds:p.cpuTime-a.processes.find(q=>q.id===p.id).cpuTime}))};
   trial.accepted=true;
   await page.evaluate(()=>player.destroy());
  }catch(error){trial.error=String(error.stack??error);console.error(name,round,lane,trial.error);}
  finally{await browser.close();await save();}
  console.log(name,round,lane,trial.accepted?JSON.stringify(trial.steady):'REJECTED');
 }
}finally{await server.close();await save();}
