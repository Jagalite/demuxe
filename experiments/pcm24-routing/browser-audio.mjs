// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {serve} from '../pipeline-qualification/server.mjs';
const server=await serve({assetRoot:'build/pcm24-routing',mediaPaths:{pcm:'build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv',copy:'build/pcm24-routing/pcm-copy.mp4'}});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});const rows=[];
try{for(const arm of ['direct','flac','pcm-mp4']){
 const page=await browser.newPage();const row={arm};rows.push(row);
 try{
 await page.goto(server.origin+'/experiment/page.html');
 await page.route('**/web/generated/unified-player.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replaceAll("['ac3', 'dts', 'pcm_s24le']","['ac3', 'dts']")});});
 if(arm==='flac'){
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{automaticAudioAdaptation:'lossless'});const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);});
 await page.locator('#source').setInputFiles('build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv');await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
 }
 await page.evaluate(async({arm})=>{
 window.v=arm==='flac'?document.querySelector('video'):document.createElement('video');if(arm!=='flac'){document.body.append(v);v.src='/media/'+(arm==='pcm-mp4'?'copy':'pcm');}
 window.captures=[];window.ctx=new AudioContext({sampleRate:48000});
 const code=`class Capture extends AudioWorkletProcessor {process(inputs,outputs){const a=inputs[0];for(let c=0;c<a.length;c++)outputs[0][c]?.set(a[c]);if(a.length)this.port.postMessage(a.map(c=>Array.from(c)));return true;}}registerProcessor('capture',Capture);`;
 const u=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await ctx.audioWorklet.addModule(u);URL.revokeObjectURL(u);
 const n=new AudioWorkletNode(ctx,'capture',{outputChannelCount:[2]});n.port.onmessage=e=>captures.push(e.data);ctx.createMediaElementSource(v).connect(n);n.connect(ctx.destination);await ctx.resume();await v.play();
 },{arm});
 await page.waitForTimeout(2500);
 Object.assign(row,await page.evaluate(()=>({time:v.currentTime,decodedAudio:v.webkitAudioDecodedByteCount,frames:v.getVideoPlaybackQuality().totalVideoFrames,captures,capabilities:{ipcm:MediaSource.isTypeSupported('video/mp4; codecs="avc1.64000d,ipcm"'),pcm:MediaSource.isTypeSupported('audio/mp4; codecs="ipcm"')},route:window.player?.diagnostics.plan?.id})));
 await page.evaluate(async()=>{if(window.player)await player.destroy();else v.pause();await ctx.close();});
 }catch(e){row.error=String(e.stack??e);}finally{await page.close();}
 }}finally{await browser.close();await server.close();await writeFile('results/pcm24-routing/browser-audio.json',JSON.stringify(rows));}
