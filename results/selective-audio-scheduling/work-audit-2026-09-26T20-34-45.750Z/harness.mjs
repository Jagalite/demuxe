// SPDX-License-Identifier: Apache-2.0
// Count existing work; no CPU benchmark and no changed scheduling.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/selective-audio-scheduling/work-audit-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const server=await serve({mediaPaths:{movie:'build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv'}});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(60000);
 await page.goto(server.origin+'/experiment/page.html');await page.evaluate(async()=>{
  const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));await player.open({url:'/media/movie',format:'file'});await player.play();
  const a=player.current.backend.mpvAudio,e=a.engine;
  window.counts={timingChecks:0,timingPosts:0,output:{},worker:{},properties:{},observe:0,presentationLookups:0};
  const timing=e.sendTiming.bind(e);e.sendTiming=(...args)=>{counts.timingChecks++;return timing(...args);};
  const post=e.worker.postMessage.bind(e.worker);e.worker.postMessage=(m,...args)=>{if(m.type==='timing')counts.timingPosts++;return post(m,...args);};
  e.addEventListener('output',ev=>{const k=ev.detail.kind;counts.output[k]=(counts.output[k]??0)+1;});
  e.addEventListener('mpv',ev=>{if(ev.detail.event==='property-change'){const k=ev.detail.name;counts.properties[k]=(counts.properties[k]??0)+1;}});
  const received=e.worker.onmessage;e.worker.onmessage=ev=>{const k=ev.data.type;counts.worker[k]=(counts.worker[k]??0)+1;return received(ev);};
  const observe=a.observe.bind(a);a.observe=()=>{counts.observe++;return observe();};
  const lookup=a.estimatedAudioPresentationTime.bind(a);a.estimatedAudioPresentationTime=(...args)=>{counts.presentationLookups++;return lookup(...args);};
 });
 await page.waitForTimeout(2000);
 const snapshot=()=>page.evaluate(()=>{const a=player.current.backend.mpvAudio,e=a.engine,h=e.audioHeader,v=player.current.backend.video;return {at:performance.now(),counts:structuredClone(counts),mediaFrames:Atomics.load(h,5),underruns:Atomics.load(h,8),pumpTicks:e.diagnostics.pumpTicks,sampleRate:e.audioContext.sampleRate,audio:a.diagnostics,quality:v.getVideoPlaybackQuality().toJSON?.()??{frames:v.getVideoPlaybackQuality().totalVideoFrames,drops:v.getVideoPlaybackQuality().droppedVideoFrames},plan:player.diagnostics.plan.id};});
 const before=await snapshot();await page.waitForTimeout(10000);const after=await snapshot();
 await page.evaluate(()=>player.pause());const pausedBefore=await snapshot();await page.waitForTimeout(3000);const pausedAfter=await snapshot();
 await writeFile(out+'/result.json',JSON.stringify({purpose:'Callback and message counts only; no CPU attribution',before,after,pausedBefore,pausedAfter},null,2));
 console.log(JSON.stringify({out,before:before.counts,after:after.counts,pausedBefore:pausedBefore.counts,pausedAfter:pausedAfter.counts,frames:after.mediaFrames-before.mediaFrames,underruns:after.underruns-before.underruns}));
}finally{await browser.close();await server.close();}
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
