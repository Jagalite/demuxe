// SPDX-License-Identifier: Apache-2.0
// Run in the collaborative browser after importing the current generated Player.
// Local server uses no-store: cold means a new owner, warm means retained engine.
window.runSubtitleTiming = async function(Player, trials=3, {instrumentWorker=false}={}) {
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{const start=performance.now();while(!f()){if(performance.now()-start>20000)throw Error('Evidence deadline');await sleep(10);}};
 const check=(v,m)=>{if(!v)throw Error(m);};
 const report={createdAt:new Date().toISOString(),userAgent:navigator.userAgent,isolated:crossOriginIsolated,protocol:'Local no-store HTTP; new owner then retained-engine reselection; animation-frame qualification; 10ms pixel polling',instrumentWorker,trials:[]};
 window.subtitleTimingReport=report;
 await window.player?.destroy();
 const media=new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4');
 const ass=new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'qualification.ass');
 const NativeWorker=window.Worker;
 if(instrumentWorker)window.Worker=class extends NativeWorker {
  constructor(url,options){
   if(String(url).includes('/mpv-subtitle-worker.js')){
    const code=`const queued=[];const hold=e=>{e.stopImmediatePropagation();queued.push(e.data)};self.addEventListener('message',hold);const marks=[];const original=WebAssembly.instantiate;WebAssembly.instantiate=async function(...a){const start=performance.now();try{return await original.apply(this,a)}finally{marks.push({kind:'instantiate',start,end:performance.now()})}};const streaming=WebAssembly.instantiateStreaming;if(streaming)WebAssembly.instantiateStreaming=async function(...a){const start=performance.now();try{return await streaming.apply(this,a)}finally{marks.push({kind:'instantiateStreaming',start,end:performance.now()})}};const send=self.postMessage.bind(self);self.postMessage=(data,...args)=>{send(data,...args);if(data.id)send({type:'timingEvidence',timeOrigin:performance.timeOrigin,marks,resources:performance.getEntriesByType('resource').map(x=>x.toJSON())})};await import(${JSON.stringify(String(url))});self.removeEventListener('message',hold);for(const data of queued)self.dispatchEvent(new MessageEvent('message',{data}));`;
    const blob=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));super(blob,options);URL.revokeObjectURL(blob);
    this.addEventListener('message',e=>{if(e.data.id===this.initRequestId)this.initRpcMs=performance.now()-this.initStarted;if(e.data.type==='timingEvidence')window.workerTiming={...e.data,initRpcMs:this.initRpcMs};});
   }else super(url,options);
  }
  postMessage(message,...args){if(message.type==='init'){this.initRequestId=message.id;this.initStarted=performance.now();}return super.postMessage(message,...args);}
 };
 try{for(let i=0;i<trials;i++){
  const row={trial:i+1,passed:false};report.trials.push(row);
  let frame,monitor,retired=false;const cadence={started:performance.now(),last:performance.now(),frames:0,maxGapMs:0,stalled:false};row.cadence=cadence;
  const heartbeat=()=>{if(retired)return;const now=performance.now();cadence.maxGapMs=Math.max(cadence.maxGapMs,now-cadence.last);cadence.last=now;cadence.frames++;frame=requestAnimationFrame(heartbeat);};frame=requestAnimationFrame(heartbeat);
  monitor=setInterval(()=>{if(performance.now()-cadence.last>250)cadence.stalled=true;},100);
  try{
   const deadline=performance.now()+2000;while(cadence.frames<5&&performance.now()<deadline)await sleep(10);
   check(cadence.frames>=5&&!cadence.stalled&&!document.hidden,'Browser animation-frame qualification unavailable');
   window.workerTiming=null;window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'never',experimentalNativeASS:true});
   const errors=[];player.addEventListener('error',e=>errors.push(String(e.detail)));
   const opened=performance.now();await player.open(media);await player.play();await wait(()=>player.state.currentTime>.2);row.mediaStartupMs=performance.now()-opened;
   const backend=player.current.backend,video=player.surface;
   row.before={time:video.currentTime,audioDecoded:video.webkitAudioDecodedByteCount,plan:player.diagnostics.plan?.id};
   check(!backend.mpvSubs,'Subtitle engine already present');
   const pixels=()=>{const c=document.querySelector('.demuxe-native-ass');if(!c||!c.width||!c.height||getComputedStyle(c).display==='none')return 0;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let j=3;j<a.length;j+=4)if(a[j])n++;return n;};
   const start=performance.now();await player.addSubtitle(ass);row.addSubtitleResolvedMs=performance.now()-start;await player.selectSubtitleTrack(player.state.subtitleTracks.find(t=>t.external).id);
   await wait(()=>pixels()>500);row.firstVisibleMs=performance.now()-start;row.visiblePixels=pixels();row.worker=window.workerTiming;
   row.after={time:player.surface.currentTime,audioDecoded:player.surface.webkitAudioDecodedByteCount,plan:player.diagnostics.plan?.id,stats:player.diagnostics.backend.mpvSubtitles};
   row.backendRetained=player.current.backend===backend;row.mediaElementRetained=player.surface===video;check(player.state.activeMode==='native','Playback left native');check(!player.surface.paused,'Playback paused');check(row.after.time>row.before.time,'Playback did not advance');check(row.after.audioDecoded>0,'No native audio decoder evidence');
   check(row.after.stats.avChains===0,'Subtitle engine has audio/video chains');
   await player.pause();await player.seek(2.25);await wait(()=>pixels()>500);const track=player.state.subtitleTracks.find(t=>t.external).id;
   await player.selectSubtitleTrack(null);await wait(()=>pixels()===0);
   const warm=performance.now();await player.selectSubtitleTrack(track);await wait(()=>pixels()>500);row.reselectionVisibleMs=performance.now()-warm;
   await player.pause();await player.seek(2.25);await wait(()=>{const c=document.querySelector('.demuxe-native-ass');if(!c)return false;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let green=0;for(let j=0;j<a.length;j+=4)if(a[j+1]>150&&a[j]<50&&a[j+2]<50&&a[j+3]>200)green++;row.greenPixels=green;return green>500;});
   row.errors=errors;check(errors.length===0,'Player errors');check(!cadence.stalled,'Browser animation-frame cadence stalled during trial');row.passed=true;
  }catch(e){row.error=String(e.stack??e);row.excluded=cadence.stalled||cadence.frames<5;row.failureDiagnostics=player?.diagnostics.backend;row.worker=window.workerTiming;}finally{retired=true;cancelAnimationFrame(frame);clearInterval(monitor);await player?.destroy();check(!document.querySelector('.demuxe-native-ass'),'Canvas retained');}
 }}finally{window.Worker=NativeWorker;}
 report.passed=report.trials.every(t=>t.passed);report.qualification=report.trials.some(t=>t.excluded)?'environment-unqualified':report.passed?'passed':'failed';return report;
};
