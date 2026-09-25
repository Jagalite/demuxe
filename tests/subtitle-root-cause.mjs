// SPDX-License-Identifier: Apache-2.0
// Test-only CPU attribution for Native A/V + mpv subtitles. No production edits.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

const fixtures={
 srt:'build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',
 mov_text:'build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4',
 ass:'build/head-to-head/assets-component-isolation-01/fixtures/h264-ass/index.mkv',
 pgs:'build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv',
 vobsub:'build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv',
};
const format=process.env.CASE??'srt';
const variant=process.env.VARIANT??'full';
const rounds=Number(process.env.ROUNDS??(format==='srt'?5:3));
const warmupSeconds=Number(process.env.WARMUP??3);
const steadySeconds=Number(process.env.STEADY??12);
const out=resolve(process.env.OUT??`results/subtitle-root-cause/${new Date().toISOString().replaceAll(':','-')}-${format}`);
const guardLog=process.env.GUARD_LOG;
const guardInterrupts=async()=>guardLog?(await readFile(guardLog,'utf8')).split('\n').filter(line=>line.includes('"event":"interrupted"')).length:0;
const threadTool=process.env.THREAD_TOOL?resolve(process.env.THREAD_TOOL):null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const host=()=>execFileSync('ps',['-axo','pid=,ppid=,%cpu=,command='],{encoding:'utf8'}).split('\n').filter(Boolean).map(row=>{
 const m=/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/.exec(row);return m?{pid:Number(m[1]),ppid:Number(m[2]),percent:Number(m[3]),command:m[4]}:null;
}).filter(Boolean);
const competingChrome=(rows,ownPids)=>rows.filter(r=>/\/Contents\/MacOS\/Google Chrome(?! Helper)(?:\s|$)/.test(r.command)&&!ownPids.has(r.pid)&&(r.ppid!==1||r.command.includes('playwright_chromiumdev_profile')||r.command.includes('--remote-debugging-pipe')));
const activeBuilds=rows=>rows.filter(r=>/\/(?:ffmpeg|cargo|rustc|clang|ninja|make)(?:\s|$)/.test(r.command));
const add=(a,b)=>Object.fromEntries(Object.keys(b).filter(k=>typeof b[k]==='number'&&typeof a[k]==='number').map(k=>[k,b[k]-a[k]]));
const report={createdAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),originMain:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),fixture:{path:fixtures[format],sha256:await sha(fixtures[format])},protocol:{format,variant,rounds,warmupSeconds,steadySeconds,viewport:[960,540],freshChromePerTrial:true,persistentProfile:true,order:'off/on for odd pairs, on/off for even pairs',cpuUnit:'one logical core percent from summed CDP process cpuTime',hostGate:'reject other Playwright Chrome browser process at every sample'},trials:[]};
await mkdir(out,{recursive:true});
const profile=resolve(process.env.PROFILE??resolve(out,'chrome-profile'));
report.protocol.profilePath=profile;
const save=()=>writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2)+'\n');
const server=await serve();
try{
 for(let pair=1;pair<=rounds;pair++)for(const lane of pair%2?['off','on']:['on','off']){
  const trial={pair,lane,accepted:false,createdAt:new Date().toISOString()};report.trials.push(trial);
  const initialGuardInterrupts=await guardInterrupts();
  const beforeHost=host();
  if(competingChrome(beforeHost,new Set()).length||activeBuilds(beforeHost).length){trial.error='Competing Chrome experiment or build before launch';trial.competing=[...competingChrome(beforeHost,new Set()),...activeBuilds(beforeHost)].map(x=>({pid:x.pid,percent:x.percent,command:x.command.slice(0,180)}));await save();throw Error(trial.error);}
  const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:960,height:540},args:['--autoplay-policy=no-user-gesture-required']});
  const browser=context.browser();
  if(!browser)throw Error('Persistent Chrome browser handle unavailable');
  const page=await context.newPage();
  trial.chrome=browser.version();
  try{
   const fixedHz=/^(?:60|30|15|10|5|1)hz$/.test(variant)?Number.parseInt(variant):null;
   if(fixedHz!==null||['invalidation','rvfc','video30','host_no_style','host_no_geometry'].includes(variant))await page.route('**/web/generated/internal/native-mpv-subtitles.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    const finalTick='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
    if(!source.includes(finalTick))throw Error('Test-only scheduling patch target drift');
    if(fixedHz!==null&&fixedHz!==60)source=source.replace(finalTick,`if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = setTimeout(() => this.tick(), ${Math.round(1000/fixedHz)});`);
    if(variant==='invalidation')source=source.replace(finalTick,'/* Test only: wait for explicit invalidation */');
    if(variant==='rvfc')source=source.replace(finalTick,'if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = this.video.requestVideoFrameCallback(() => this.tick());');
    if(variant==='video30'){
     const key='${sourceWidth}:${sourceHeight}:${seconds}`';
     if(!source.includes(key))throw Error('Video-time key patch target drift');
     source=source.replace(key,'${sourceWidth}:${sourceHeight}:${Math.floor(seconds*30)/30}`');
    }
    if(variant==='host_no_style'){
     const before='        this.canvas.style.left = `${rect.left - parent.left + (rect.width - width) / 2}px`;\n        this.canvas.style.top = `${rect.top - parent.top + (rect.height - height) / 2}px`;\n        this.canvas.style.width = `${width}px`;\n        this.canvas.style.height = `${height}px`;';
     if(!source.includes(before))throw Error('Test-only style patch target drift');
     source=source.replace(before,`        if (!window.__subtitleVariantActive) {\n${before}\n        }`);
    }
    if(variant==='host_no_geometry'){
     const before='const rect = this.video.getBoundingClientRect(), parent = this.video.parentElement.getBoundingClientRect();';
     if(!source.includes(before))throw Error('Test-only geometry patch target drift');
     source=source.replace(before,'const rect = window.__subtitleVariantActive ? this.__testRect : this.video.getBoundingClientRect(), parent = window.__subtitleVariantActive ? this.__testParent : this.video.parentElement.getBoundingClientRect(); if (!window.__subtitleVariantActive) { this.__testRect = rect; this.__testParent = parent; }');
    }
    await route.fulfill({response,body:source});
   });
   if(['rpc_only','wasm_trivial','mpv_no_output','block_only','render_only','post_without_reply'].includes(variant))await page.route('**/web/mpv-subtitle-worker.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    const before="}else if(d.type==='render'){",after=`}else if(['noop','wasm_trivial','mpv_no_output','block_only','render_only','fire'].includes(d.type)){
      if(d.type==='fire')return;
      if(d.type==='wasm_trivial')engine._web_subtitle_overlay_version();
      if(d.type==='block_only'){engine._subtitle_service_block(0);engine._subtitle_service_block(1);}
      if(d.type==='render_only')engine._subtitle_service_render(d.seconds,d.width,d.height);
      if(d.type==='mpv_no_output'){
        engine._subtitle_service_block(0);let ready=0;
        for(let i=0;i<400&&!ready;i++){
          check();ready=engine._subtitle_service_render(d.seconds,d.width,d.height);
          if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
        }
        engine._subtitle_service_block(1);if(!ready)throw Error('Subtitle packet deadline exceeded');
      }
      postMessage({id:d.id,unchanged:true,size:0,service:{avChains:engine._subtitle_service_av_chains(),heapBytes:engine.HEAPU8.byteLength,io:ioStats}});return;
   }else if(d.type==='render'){`;
    if(!source.includes(before))throw Error('Test-only worker patch target drift');
    source=source.replace(before,after);
    await route.fulfill({response,body:source});
   });
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const i=document.createElement('input');i.type='file';i.id='media';document.body.append(i);});
   await page.locator('#media').setInputFiles(fixtures[format]);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   if(lane==='off')await page.evaluate(()=>player.selectSubtitleTrack(null));
   else await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
   await page.evaluate(variant=>{
    const s=player.current.backend.mpvSubs,c={ticks:0,requests:0,messages:0,replies:0,geometryReads:0};window.__subtitleCpuCounters=c;window.__subtitleVariantActive=false;
    const tick=s.tick;s.tick=function(...a){c.ticks++;if(window.__subtitleVariantActive&&variant==='host_callback_only'){this.frame=requestAnimationFrame(()=>this.tick());return;}return tick.apply(this,a);};
    const request=s.request;s.request=function(type,data){
      if(type==='render'){
        c.requests++;
        if(window.__subtitleVariantActive&&['host_only','host_no_style','host_no_geometry','host_callback_only','static_canvas','no_request_after_initial'].includes(variant))return Promise.resolve({unchanged:true,size:0,service:s.service});
        const replacement=window.__subtitleVariantActive?{rpc_only:'noop',wasm_trivial:'wasm_trivial',mpv_no_output:'mpv_no_output',block_only:'block_only',render_only:'render_only',post_without_reply:'fire'}[variant]:undefined;
        if(replacement){
          if(replacement==='fire'){s.worker.postMessage({type:'fire',...data});return Promise.resolve({unchanged:true,size:0,service:s.service});}
          return request.call(this,replacement,data);
        }
      }
      return request.call(this,type,data);
    };
    const post=s.worker.postMessage.bind(s.worker);s.worker.postMessage=function(...a){c.messages++;return post(...a);};
    const receive=s.worker.onmessage;s.worker.onmessage=function(e){c.replies++;return receive.call(this,e);};
    const video=player.current.backend.video,rect=video.getBoundingClientRect.bind(video);video.getBoundingClientRect=function(){c.geometryReads++;return rect();};
   },variant);
   trial.route=await page.evaluate(()=>({plan:player.diagnostics.plan,mode:player.state.activeMode,subtitleTracks:player.state.subtitleTracks,audioTracks:player.state.audioTracks,backend:player.diagnostics.backend.mpvSubtitles}));
   if(trial.route.plan?.id!=='native-direct-mpv'||trial.route.backend?.avChains!==0)throw Error('Unexpected route or mpv A/V chains');
   const browserCdp=await browser.newBrowserCDPSession(),rendererCdp=await context.newCDPSession(page);
   await rendererCdp.send('Performance.enable');
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.currentTime>.5,null,{timeout:15000});
   await sleep(warmupSeconds*1000);
   await page.evaluate(variant=>{window.__subtitleVariantActive=true;const s=player.current.backend.mpvSubs;if(variant==='host_detached')s.canvas.remove();if(variant==='static_canvas'){cancelAnimationFrame(s.frame);s.frame=0;}},variant);
   const subtitleImage=()=>page.evaluate(()=>{
    const c=player.current.backend.mpvSubs.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let alphaPixels=0,checksum=2166136261;
    for(let i=0;i<d.length;i+=4){if(d[i+3])alphaPixels++;checksum=Math.imul(checksum^d[i],16777619);checksum=Math.imul(checksum^d[i+1],16777619);checksum=Math.imul(checksum^d[i+2],16777619);checksum=Math.imul(checksum^d[i+3],16777619);}
    return {width:c.width,height:c.height,display:getComputedStyle(c).display,attached:c.isConnected,alphaPixels,checksum:checksum>>>0};
   });
   const visualStart=await subtitleImage();
   const sample=async(withThreads=false)=>{
    const info=(await browserCdp.send('SystemInfo.getProcessInfo')).processInfo;
    const pids=new Set(info.map(x=>x.id));
    const hostRows=host(),competitors=[...competingChrome(hostRows,pids),...activeBuilds(hostRows)].map(x=>({pid:x.pid,percent:x.percent,command:x.command.slice(0,180)}));
    const rssRows=execFileSync('ps',['-o','pid=,rss=','-p',[...pids].join(',')],{encoding:'utf8'}).trim().split('\n').map(x=>x.trim().split(/\s+/).map(Number));
    const rss=Object.fromEntries(rssRows.map(([pid,kib])=>[pid,kib]));
    const metrics=Object.fromEntries((await rendererCdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
    const state=await page.evaluate(()=>{const p=player,b=p.current.backend,v=b.video,s=b.mpvSubs,q=v.getVideoPlaybackQuality();return {time:p.state.currentTime,status:p.state.status,plan:p.diagnostics.plan?.id,renderStats:{...s.stats},counters:{...window.__subtitleCpuCounters},service:p.diagnostics.backend.mpvSubtitles,video:{width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,frames:q.totalVideoFrames,dropped:q.droppedVideoFrames,audioBytes:v.webkitAudioDecodedByteCount??null,muted:v.muted,volume:v.volume},subtitleSelected:p.state.subtitleTracks.map(t=>t.selected),audioSelected:p.state.audioTracks.map(t=>t.selected)};});
    const threads=withThreads&&threadTool?Object.fromEntries(info.filter(p=>p.type==='renderer'||p.type==='browser').map(p=>[p.id,JSON.parse(execFileSync(threadTool,[String(p.id)],{encoding:'utf8'}))])):null;
    return {wall:performance.now(),info,rss,metrics,state,threads,competitors,workerUrls:page.workers().map(w=>w.url())};
   };
   const samples=[await sample(true)];for(let i=0;i<steadySeconds;i++){await sleep(1000);samples.push(await sample(i===steadySeconds-1));}
   const first=samples[0],last=samples.at(-1),wall=(last.wall-first.wall)/1000;
   trial.guardInterruptions=(await guardInterrupts())-initialGuardInterrupts;
   if(trial.guardInterruptions)throw Error(`Competing benchmark guard interrupted ${trial.guardInterruptions} process(es) during trial`);
   const visualEnd=await subtitleImage();
   const ids=first.info.map(x=>x.id).sort((a,b)=>a-b).join(',');
   for(const s of samples){if(s.competitors.length)throw Error(`Competing Playwright Chrome during steady window: ${JSON.stringify(s.competitors)}`);if(s.info.map(x=>x.id).sort((a,b)=>a-b).join(',')!==ids)throw Error('Chrome process creation/exit during steady window');if(Object.keys(s.rss).map(Number).sort((a,b)=>a-b).join(',')!==ids)throw Error('RSS process membership incomplete');}
   const videoFrames=last.state.video.frames-first.state.video.frames,dropped=last.state.video.dropped-first.state.video.dropped,audioBytes=last.state.video.audioBytes===null?null:last.state.video.audioBytes-first.state.video.audioBytes;
   if(last.state.time-first.state.time<wall-1||videoFrames<20*wall||dropped>5||audioBytes!==null&&audioBytes<=0||last.state.video.muted||!last.state.audioSelected.some(Boolean)||last.state.service.avChains!==0)throw Error(`A/V correctness gate: ${JSON.stringify({time:last.state.time-first.state.time,wall,videoFrames,dropped,audioBytes})}`);
   if(lane==='on'&&!last.state.subtitleSelected.some(Boolean)||lane==='off'&&last.state.subtitleSelected.some(Boolean))throw Error('Subtitle selection changed');
   if(lane==='on'&&(visualStart.alphaPixels<100||visualEnd.alphaPixels<100||visualStart.checksum!==visualEnd.checksum))throw Error(`Static subtitle visual gate: ${JSON.stringify({visualStart,visualEnd})}`);
   if(lane==='off'&&visualEnd.display!=='none'&&visualEnd.alphaPixels>0)throw Error(`Disabled subtitle visual gate: ${JSON.stringify(visualEnd)}`);
   const processes=last.info.map(p=>({id:p.id,type:p.type,cpuSeconds:p.cpuTime-first.info.find(q=>q.id===p.id).cpuTime,initialRssKiB:first.rss[p.id],finalRssKiB:last.rss[p.id]}));
   trial.steady={wallSeconds:wall,totalCpuPercent:100*processes.reduce((n,p)=>n+p.cpuSeconds,0)/wall,processes,peakSummedRssKiB:Math.max(...samples.map(s=>Object.values(s.rss).reduce((n,x)=>n+x,0))),videoFrames,dropped,audioBytes,mediaSeconds:last.state.time-first.state.time,visualStart,visualEnd,renderRequests:last.state.renderStats.renders-first.state.renderStats.renders,counters:add(first.state.counters,last.state.counters),bitmapChanges:last.state.renderStats.bitmapUpdates-first.state.renderStats.bitmapUpdates,bitmapBytes:last.state.renderStats.bytes-first.state.renderStats.bytes,io:add(first.state.service.io,last.state.service.io),workers:last.workerUrls,heapBytes:last.state.service.heapBytes,rendererMetrics:add(first.metrics,last.metrics),threadSnapshots:threadTool?{first:first.threads,last:last.threads}:undefined};
   await page.evaluate(()=>player.destroy());
   await page.close();
   trial.accepted=true;
   console.log(format,pair,lane,trial.steady.totalCpuPercent.toFixed(2),'accepted');
  }catch(error){trial.error=String(error.stack??error);console.error(format,pair,lane,trial.error);}
  finally{await context.close();await save();}
  if(trial.error?.includes('Competing Chrome experiment or build')||trial.error?.includes('Competing Playwright Chrome')||trial.error?.includes('Competing benchmark guard interrupted'))throw Error(trial.error);
 }
}finally{await server.close();await save();}
