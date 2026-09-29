// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';

const out=`results/private-adaptation-ass/${Date.now()}`;
await mkdir(out,{recursive:true});
const file=out+'/pcm24.mkv';
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','8','-c:v','libx264','-g','24','-bf','2','-c:a','pcm_s24le',file]);
const server=await serve({isolated:process.env.ISOLATED!=='0',mediaPaths:{pcm24:file}});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report={browser:browser.version(),cases:[]};
try{for(const runtime of (process.env.RUNTIME?[process.env.RUNTIME]:['jspi','asyncify']))for(const policy of (process.env.POLICY?[process.env.POLICY]:['auto','lossless','explicit'])){
 const item={runtime,policy};report.cases.push(item);
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(installAudioProbe);
  await page.evaluate(async({runtime,policy})=>{
   const {Player}=await import('/web/generated/index.js');
   window.player=new Player(document.querySelector('#surface'),{remuxRuntime:runtime,nativeRemux:'always',...(policy==='lossless'?{automaticAudioAdaptation:'lossless'}:policy==='explicit'?{mode:'native',experimentalAudioAdaptation:'flac',experimentalNativeASS:true}:{})});
   await player.open(new File([await(await fetch('/media/pcm24')).arrayBuffer()],'pcm24.mkv'));
   await player.addFont(new File([await(await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer()],'DejaVuSans.ttf'));
   await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'captions.ass'));
   window.probedSurface=undefined;
   window.observeCurrentSurface=async()=>{if(probedSurface!==player.surface){probedSurface=player.surface;await urlAudioProbe.observeVideo(probedSurface);}};
   await observeCurrentSurface();
   await player.play();
  },{runtime,policy});
  await page.waitForFunction(async()=>{
   await observeCurrentSurface();
   const c=document.querySelector('.demuxe-native-ass');
   return player.surface.getVideoPlaybackQuality().totalVideoFrames>5&&urlAudioProbe.sample(player.surface).some(s=>s.rms>.01)&&c?.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
  });
  item.output=await page.evaluate(()=>({frames:player.surface.getVideoPlaybackQuality().totalVideoFrames,audio:urlAudioProbe.sample(player.surface),sameSurface:probedSurface===player.surface}));
  item.diagnostics=await page.evaluate(()=>player.diagnostics);
  assert.equal(item.diagnostics.plan.id,policy==='auto'?'native-transcode-ass':'native-flac-ass');
  assert.equal(item.diagnostics.plan.owners.subtitle,'mpv-subtitle-service');
  assert.equal(item.diagnostics.backend.remux.remux.transport,runtime==='off'?'pthread':runtime);
  await page.evaluate(async()=>{await player.pause();await player.seek(3);});
  await page.waitForFunction(()=>{const ass=player.current.backend.mpvSubs;return Math.abs(player.state.currentTime-3)<.3&&ass.stats.renders>0&&ass.canvas.getContext('2d').getImageData(0,0,ass.canvas.width,ass.canvas.height).data.some((v,i)=>i%4===3&&v>0);});
  await page.evaluate(()=>player.subtitleVisible(false));
  assert.equal(await page.locator('.demuxe-native-ass').isVisible(),false);
  await page.evaluate(async()=>{await player.subtitleVisible(true);await player.play();await observeCurrentSurface();});
  await page.waitForFunction(async()=>{await observeCurrentSurface();return player.state.currentTime>3.5&&urlAudioProbe.sample(player.surface).some(s=>s.rms>.01);});
  await page.evaluate(async()=>{await urlAudioProbe.close();await player.destroy();});
  await page.waitForFunction(()=>!document.querySelector('.demuxe-native-ass'));
  await new Promise(r=>setTimeout(r,150));assert.equal(page.workers().length,0);
  item.passed=true;
 }catch(e){item.error=String(e.stack??e);item.failureState=await page.evaluate(()=>({state:player?.state,diagnostics:player?.diagnostics,audio:urlAudioProbe.sample(),sameSurface:probedSurface===player.surface})).catch(()=>null);item.passed=false;process.exitCode=1;}
 finally{await page.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(runtime,policy,item.passed,item.error??'');}
}}finally{try{report.browserTeardown=await closeTestBrowser(browser,'chrome');}finally{await server.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(out);}}
