// SPDX-License-Identifier: Apache-2.0
// Test-only comparison: existing 60 Hz loop, cheap timing RPC poll, and deadline scheduling.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-timing-poc');
const fixture='results/subtitle-timing-poc/fixtures/h264-aac-two-cues.mkv';
const threadTool=resolve('results/subtitle-root-cause/subtitle-thread-cpu');
const mode=process.env.MODE??'baseline';
if(!['baseline','poll20','deadline'].includes(mode))throw Error('Unknown mode');
const rounds=Number(process.env.ROUNDS??1);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve();
const report={mode,createdAt:new Date().toISOString(),trials:[]};
const workerPatch=async route=>{
 const response=await route.fetch();let source=await response.text();
 const before="}else if(d.type==='render'){";
 const replacement=`}else if(d.type==='timing'){
   const pointer=textPointer,view=new DataView(engine.HEAPU8.buffer);
   const a=performance.now(),mask=engine._subtitle_poc_current(pointer),currentMs=performance.now()-a;
   const current=[view.getFloat64(pointer,true),view.getFloat64(pointer+8,true)];
   const b=performance.now(),stepStatus=engine._subtitle_poc_step(d.seconds,1,pointer),stepMs=performance.now()-b;
   const next=stepStatus>0?view.getFloat64(pointer,true):null;
   postMessage({id:d.id,mask,current,currentMs,stepStatus,next,stepMs});return;
 }else if(d.type==='render'){const __pocRenderStart=performance.now();`;
 if(!source.includes(before))throw Error('Worker patch target drift');
 source=source.replace(before,replacement);
 const output='postMessage({id:d.id,bitmap,unchanged:';
 if(!source.includes(output))throw Error('Worker render output target drift');
 source=source.replace(output,'postMessage({id:d.id,pocRenderMs:performance.now()-__pocRenderStart,bitmap,unchanged:');
 await route.fulfill({response,body:source});
};
const hostPatch=async route=>{
 const response=await route.fetch();let source=await response.text();
 const before='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
 if(!source.includes(before))throw Error('Host patch target drift');
 source=source.replace(before,`if(this.__pocMode){
            if(this.busy)this.frame=requestAnimationFrame(()=>this.tick());
            else this.__pocSchedule();
        }else if (!this.video.paused || this.busy || this.last !== key)
            this.frame = requestAnimationFrame(() => this.tick());`);
 const tickStart='this.frame = 0;\n        if (this.stopped || !this.enabled || this.changingTrack)';
 if(!source.includes(tickStart))throw Error('Host tick-start patch target drift');
 source=source.replace(tickStart,'this.frame = 0;\n        if(this.__pocMode && !this.__pocNextAllowed && !this.busy){this.__pocSchedule();return;}\n        if (this.stopped || !this.enabled || this.changingTrack)');
 const requestStart='if (!this.busy && key !== this.last) {\n            this.busy = true;';
 if(!source.includes(requestStart))throw Error('Host request-start patch target drift');
 source=source.replace(requestStart,'if (!this.busy && key !== this.last) {\n            this.busy = true;\n            if(this.__pocMode)this.__pocNextAllowed=false;');
 await route.fulfill({response,body:source});
};
try{
 for(let round=1;round<=rounds;round++){
  const trial={round,mode,accepted:false};report.trials.push(trial);
  const context=await chromium.launchPersistentContext(root+'/profile',{channel:'chrome',headless:true,viewport:{width:960,height:540},args:['--autoplay-policy=no-user-gesture-required']});
  const browser=context.browser(),page=await context.newPage();
  try{
   trial.chrome=browser.version();
   await page.route('**/web/engine-subtitles/service.mjs',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(root+'/engine/service.mjs')}));
   await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service.wasm')}));
   await page.route('**/web/mpv-subtitle-worker.js',workerPatch);
   await page.route('**/web/generated/internal/native-mpv-subtitles.js',hostPatch);
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(fixture);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
   trial.route=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,service:player.diagnostics.backend.mpvSubtitles}));
   if(trial.route.plan!=='native-direct-mpv'||trial.route.service.avChains!==0)throw Error('Unexpected route');
   await page.evaluate(mode=>{
    const s=player.current.backend.mpvSubs,c={timing:0,render:0,timingWorkerMs:0,timingRoundtripMs:0,renderWorkerMs:0,states:[],scheduled:[],invalidations:0};
    window.__poc=c;
    const baseRequest=s.request;
    s.request=function(type,data){
      const started=performance.now();
      return baseRequest.call(this,type,data).then(result=>{
        if(type==='timing'){c.timing++;c.timingWorkerMs+=(result.currentMs||0)+(result.stepMs||0);c.timingRoundtripMs+=performance.now()-started;}
        if(type==='render'){
          c.render++;c.renderWorkerMs+=result.pocRenderMs||0;
          if(typeof result.hasOverlay==='boolean'&&c.states.at(-1)?.visible!==result.hasOverlay)c.states.push({visible:result.hasOverlay,videoTime:s.video.currentTime,requestedTime:data?.seconds,wallTime:performance.now()});
        }
        return result;
      });
    };
    if(mode==='baseline')return;
    s.__pocMode=mode;s.__pocEpoch=0;s.__pocTarget=Infinity;s.__pocNextAllowed=true;
    const originalInvalidate=s.invalidate.bind(s);
    s.invalidate=function(){c.invalidations++;this.__pocEpoch++;if(this.frame){cancelAnimationFrame(this.frame);clearTimeout(this.frame);this.frame=0;}this.__pocTarget=Infinity;this.__pocNextAllowed=true;originalInvalidate();};
    const choose=(meta,now)=>{
      const end=meta.mask&2?meta.current[1]:Infinity;
      const next=meta.stepStatus>0?meta.next-.01:Infinity;
      return Math.min(end>now+.001?end:Infinity,next>now+.001?next:Infinity);
    };
    const query=()=>s.request('timing',{seconds:s.video.currentTime});
    s.__pocSchedule=function(){
      if(this.stopped||!this.enabled||this.video.paused||this.frame)return;
      const epoch=this.__pocEpoch;
      if(mode==='deadline'){
        query().then(meta=>{
          if(epoch!==this.__pocEpoch||this.stopped||this.frame)return;
          const now=this.video.currentTime,target=choose(meta,now),ms=Number.isFinite(target)?Math.max(1,(target-now)*1000):1000;
          c.scheduled.push({now,target,ms});
          this.frame=setTimeout(()=>{this.frame=0;if(Number.isFinite(target)){this.__pocNextAllowed=true;this.tick();}else this.__pocSchedule();},ms);
        },e=>this.fail(e));
      }else{
        this.frame=setTimeout(async()=>{
          this.frame=0;if(epoch!==this.__pocEpoch||this.stopped)return;
          const now=this.video.currentTime;
          if(now>=this.__pocTarget-.001){this.__pocTarget=Infinity;this.__pocNextAllowed=true;this.tick();return;}
          try{
            const meta=await query();
            if(epoch!==this.__pocEpoch||this.stopped)return;
            const target=choose(meta,this.video.currentTime);
            if(target<this.__pocTarget)this.__pocTarget=target;
            this.__pocSchedule();
          }catch(e){this.fail(e);}
        },50);
      }
    };
    if(s.frame){cancelAnimationFrame(s.frame);s.frame=0;}
    s.last='';
   },mode);
   const cdp=await browser.newBrowserCDPSession();
   const sample=async()=>{
   const info=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
    const threads=Object.fromEntries(info.filter(p=>p.type==='renderer').map(p=>[p.id,JSON.parse(execFileSync(threadTool,[String(p.id)],{encoding:'utf8'}))]));
    const state=await page.evaluate(()=>{const p=player,s=p.current.backend.mpvSubs,v=p.current.backend.video,q=v.getVideoPlaybackQuality();return {time:p.state.currentTime,render:s.stats.renders,bitmap:s.stats.bitmapUpdates,counters:{...window.__poc,states:[...window.__poc.states],scheduled:window.__poc.scheduled.slice(-12)},video:{frames:q.totalVideoFrames,dropped:q.droppedVideoFrames,audioBytes:v.webkitAudioDecodedByteCount??null},service:p.diagnostics.backend.mpvSubtitles};});
    return {wall:performance.now(),info,threads,state};
   };
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.currentTime>2,null,{timeout:15000});
   const start=await sample();
   await page.waitForFunction(()=>player.state.currentTime>10,null,{timeout:15000});
   const end=await sample();
   const wall=(end.wall-start.wall)/1000;
   const cpu=type=>100*end.info.filter(p=>type==='all'||p.type===type).reduce((n,p)=>n+p.cpuTime-start.info.find(x=>x.id===p.id).cpuTime,0)/wall;
   const workerCpu=()=>{let used=0;for(const [pid,list] of Object.entries(end.threads)){const first=new Map((start.threads[pid]||[]).map(x=>[x.id,x]));for(const t of list){const prior=first.get(t.id);if(prior&&t.name==='DedicatedWorker thread')used+=(t.userNs+t.systemNs-prior.userNs-prior.systemNs)/1e9;}}return 100*used/wall;};
   const diff=(key)=>end.state.counters[key]-start.state.counters[key];
   trial.steady={wall,rendererCpu:cpu('renderer'),workerCpu:workerCpu(),wholeCpu:cpu('all'),gpuCpu:cpu('GPU'),browserCpu:cpu('browser'),rendersPerSecond:diff('render')/wall,timingPerSecond:diff('timing')/wall,timingWorkerMs:diff('timingWorkerMs'),timingRoundtripMs:diff('timingRoundtripMs'),renderWorkerMs:diff('renderWorkerMs'),bitmaps:end.state.bitmap-start.state.bitmap,frames:end.state.video.frames-start.state.video.frames,dropped:end.state.video.dropped-start.state.video.dropped,audioBytes:end.state.video.audioBytes-start.state.video.audioBytes};
   await page.waitForFunction(()=>player.state.currentTime>17,null,{timeout:15000});
   trial.natural=await page.evaluate(()=>({time:player.state.currentTime,states:[...window.__poc.states],counters:{timing:window.__poc.timing,render:window.__poc.render},scheduled:window.__poc.scheduled.slice(0,20)}));
   await page.evaluate(()=>player.seek(5));
   await page.waitForFunction(()=>player.state.currentTime>4.9&&player.state.currentTime<7,null,{timeout:10000});
   await sleep(400);
   trial.seekIntoCue=await page.evaluate(()=>({time:player.state.currentTime,visible:window.__poc.states.at(-1)?.visible}));
   await page.evaluate(()=>player.pause());await sleep(150);
   trial.paused=await page.evaluate(()=>({time:player.state.currentTime,visible:window.__poc.states.at(-1)?.visible}));
   await page.evaluate(()=>player.play());await sleep(150);
   trial.resumed=await page.evaluate(()=>({time:player.state.currentTime,visible:window.__poc.states.at(-1)?.visible}));
   await page.evaluate(()=>player.seek(14));
   await page.waitForFunction(()=>player.state.currentTime>13.9&&player.state.currentTime<15,null,{timeout:10000});
   await sleep(400);
   trial.seekGap=await page.evaluate(()=>({time:player.state.currentTime,visible:window.__poc.states.at(-1)?.visible}));
   trial.accepted=trial.steady.dropped<=5&&trial.steady.frames>=20*wall&&trial.steady.audioBytes>0;
   await page.evaluate(()=>player.destroy());
   console.log(mode,round,JSON.stringify({accepted:trial.accepted,steady:trial.steady,natural:trial.natural,seekIntoCue:trial.seekIntoCue,seekGap:trial.seekGap}));
  }catch(e){trial.error=String(e.stack||e);console.error(mode,round,trial.error);}
  finally{await context.close();await writeFile(root+`/${mode}.json`,JSON.stringify(report,null,2)+'\n');}
 }
}finally{await server.close();}
