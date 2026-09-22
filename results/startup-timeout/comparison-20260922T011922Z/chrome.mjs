// SPDX-License-Identifier: Apache-2.0
import {chromium} from '/Volumes/seed2/Projects/demuxe/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out='/Volumes/seed2/Projects/demuxe/results/startup-timeout/chrome-'+new Date().toISOString().replaceAll(':','-');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4179/');await page.waitForFunction(()=>!!window.player);await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});await page.locator('body > #file').setInputFiles('/Volumes/seed2/Projects/startup-repro/stuck.mkv');
 const result=await page.evaluate(`(async()=>{
 const {NativePlayer}=await import('/web/generated/internal/native-player.js');
 const load=NativePlayer.prototype.load;const events=[];
 NativePlayer.prototype.load=async function(url){
  for(const e of ['loadstart','loadedmetadata','loadeddata','canplay','suspend','stalled','error'])this.video.addEventListener(e,()=>events.push({event:e,at:performance.now(),ready:this.video.readyState,network:this.video.networkState,error:this.video.error?.message}));
  try{return await load.call(this,url);}finally{events.push({event:'load-finished',ready:this.video.readyState,network:this.video.networkState,error:this.video.error?.message});}
 };
 const v=document.querySelector('#viewer');await v.ready;if(${JSON.stringify(process.env.REMUX==='1')})player.nativeRemux='always';const start=performance.now();let error;let playback;let openMs,playMs;
 try{await v.open(document.querySelector('#file').files[0]);openMs=performance.now()-start;await player.volume(0);await player.play();playMs=performance.now()-start;await new Promise(r=>setTimeout(r,1200));await player.pause();playback={time:player.state.currentTime,frames:player.diagnostics.backend.rendered};await player.seek(120);playback.seek=player.state.currentTime;}catch(e){error=String(e);}
 const result={ms:performance.now()-start,error,openMs,playMs,events,playback,state:player.state,diagnostics:player.diagnostics};
 await player.destroy();return JSON.stringify(result);
 })()`);
const data=JSON.parse(result);await writeFile(out+'/result.json',JSON.stringify(data,null,2));console.log(JSON.stringify({out,browser:browser.version(),openMs:data.openMs,playMs:data.playMs,error:data.error,plan:data.diagnostics.plan?.id,events:data.events}));}finally{await browser.close();}
