// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='research/shared/runs/20260919T213800Z-transaction-failed-append';const fixtures='research/shared/runs/20260919T200300Z-mse-transactions';
const paths={old:fixtures+'/old-audio.mp4',next:fixtures+'/new-audio.mp4',small:'results/top100/lanes/small.mp4',large:'results/top100/lanes/large.mp4',red:'results/top100/mse/red.mp4',green:'results/top100/mse/lime.mp4'};
const files={};for(const [k,p] of Object.entries(paths))files[k]=[...await readFile(p)];
files.next=files.small;const result={scope:'Bounded separate MSE buffers: paused/future AAC audio replacement, compatible video queue, future AVC configuration changes. Frequency/color/dimension observation only, not gapless PCM or numbered-frame qualification.',cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server deadline')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 for(const mode of ['paused-audio','future-audio']){
  const row=await page.evaluate(async({mode,files})=>{
   const v=document.createElement('video');document.body.append(v);const ac=new AudioContext();await ac.resume();const source=ac.createMediaElementSource(v),an=ac.createAnalyser();an.fftSize=4096;source.connect(an);an.connect(ac.destination);const ms=new MediaSource(),url=URL.createObjectURL(ms),r={mode,observed:[]};let timer;
   const event=(o,n)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{clean();reject(Error(n+' deadline'));},10000);function clean(){clearTimeout(t);o.removeEventListener(n,ok);o.removeEventListener('error',bad);}function ok(){clean();resolve();}function bad(){clean();reject(Error(n+' failed'));}o.addEventListener(n,ok);o.addEventListener('error',bad);});
   const until=async f=>{const end=performance.now()+5000;while(!f()){if(performance.now()>end)throw Error('until deadline');await new Promise(r=>setTimeout(r,10));}};
   const canvas=new OffscreenCanvas(16,16),ctx=canvas.getContext('2d');const observe=()=>{if(v.readyState<2)return;const f=new Float32Array(an.frequencyBinCount);an.getFloatFrequencyData(f);let best=1;for(let i=2;i<f.length;i++)if(f[i]>f[best])best=i;ctx.drawImage(v,0,0,16,16);r.observed.push({time:v.currentTime,width:v.videoWidth,height:v.videoHeight,frames:v.getVideoPlaybackQuality().totalVideoFrames,hz:best*ac.sampleRate/an.fftSize,db:f[best],pixel:[...ctx.getImageData(8,8,1,1).data]});};
   try{
    const open=event(ms,'sourceopen');v.src=url;await open;const video=ms.addSourceBuffer('video/mp4; codecs="avc3.42C00D"'),audio=ms.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');const append=async(sb,k)=>{const done=event(sb,'updateend');sb.appendBuffer(new Uint8Array(files[k]));await done;};const remove=async(sb,a,b)=>{const done=event(sb,'updateend');sb.remove(a,b);await done;};
    await append(audio,'old');const initial=mode==='queue'?'red':'small';await append(video,initial);video.timestampOffset=2;await append(video,initial);video.timestampOffset=4;await append(video,initial);
    timer=setInterval(observe,25);await v.play();await until(()=>v.currentTime>.5);const videoIdentity=video,audioIdentity=audio,sourceIdentity=v.src;let generation=2;
    const ranges=sb=>Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);const before=JSON.stringify([ranges(video),ranges(audio)]);
    const commit=async epoch=>{if(epoch!==generation)return false;if(mode.includes('audio')){await remove(audio,2,7);audio.appendWindowStart=2;audio.appendWindowEnd=6;audio.timestampOffset=2;await append(audio,'next');}else{await remove(video,2,6);video.timestampOffset=2;await append(video,mode==='queue'?'green':'large');video.timestampOffset=4;await append(video,initial);}return true;};
    r.staleGenerationRejected=!(await commit(1))&&JSON.stringify([ranges(video),ranges(audio)])===before;
    r.invalidPreparationRejected=!MediaSource.isTypeSupported('audio/invalid; codecs="not-real"')&&JSON.stringify([ranges(video),ranges(audio)])===before;
    if(mode==='paused-audio'){v.pause();r.pausedBeforeCommit=v.paused;v.currentTime=.25;await event(v,'seeked');r.seekBeforeCommit=v.currentTime;}
    r.wasPlayingAtCommit=!v.paused;r.commitTime=v.currentTime;r.committed=await commit(2);r.sameObjects=video===videoIdentity&&audio===audioIdentity&&v.src===sourceIdentity&&ms.sourceBuffers.length===2;r.afterRanges={video:ranges(video),audio:ranges(audio)};ms.endOfStream();const ended=event(v,'ended');await v.play();await ended;r.eof=true;
    v.currentTime=.5;await event(v,'seeked');observe();r.reverseSeek=v.currentTime;v.currentTime=4.5;await event(v,'seeked');observe();r.forwardSeek=v.currentTime;
   }catch(e){r.error=String(e);r.mediaError=v.error?.message;r.failedCommit={readyState:ms.readyState,ranges:Array.from(ms.sourceBuffers,sb=>Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)])),sameMediaSource:v.src===url};r.oldFutureRetained=r.failedCommit.ranges[1]?.some(([a,b])=>a<=2&&b>=5.9)??false;}finally{clearInterval(timer);v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);source.disconnect();an.disconnect();await ac.close();r.cleanup=true;}return r;
  },{mode,files});result.cases.push(row);await writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');
 }
 result.expectedIncomingRejected=result.cases.every(r=>r.error);result.transactionalRollbackPassed=result.cases.every(r=>r.oldFutureRetained);
 await page.evaluate(()=>player.destroy());result.completed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}finally{await browser?.close();server.kill();await writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:result.cases.map(({observed,...r})=>({...r,observations:observed.length}))},null,2));}
