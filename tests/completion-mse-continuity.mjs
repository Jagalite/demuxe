// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='results/full-completion/continuity';
const red=await readFile(out+'/red.mp4'),green=await readFile(out+'/green-ordered.webm');
const result={scope:'Browser MSE component: rendered color and decoded tone across container/codec change; not integrated Demuxe queue or timing qualification.',fixtures:{red:createHash('sha256').update(red).digest('hex'),green:createHash('sha256').update(green).digest('hex')},cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');const cdp=await page.context().newCDPSession(page);result.mediaLog=[];for(const name of ['playerErrorsRaised','playerMessagesLogged'])cdp.on('Media.'+name,e=>result.mediaLog.push({name,...e}));await cdp.send('Media.enable');
 for(const mode of ['retained-changeType','restart-baseline']){
  const run=await page.evaluate(async({red,green,mode})=>{
   const video=document.createElement('video');video.width=160;video.height=96;document.body.append(video);const audio=new AudioContext({sampleRate:48000});await audio.resume();const source=audio.createMediaElementSource(video),analyser=audio.createAnalyser();analyser.fftSize=4096;source.connect(analyser);analyser.connect(audio.destination);
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true});const observed=[];const urls=[];let sb,ms,raf,failed=null,stage=null;
   const event=(target,name)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{clean();reject(Error(name+' deadline'));},6000);const ok=()=>{clean();resolve();},bad=()=>{clean();reject(Error(name+' error'));};function clean(){clearTimeout(t);target.removeEventListener(name,ok);target.removeEventListener('error',bad);}target.addEventListener(name,ok,{once:true});target.addEventListener('error',bad,{once:true});});
   const open=async mime=>{ms=new MediaSource();const u=URL.createObjectURL(ms);urls.push(u);const e=event(ms,'sourceopen');video.src=u;await e;sb=ms.addSourceBuffer(mime);};
   const append=async bytes=>{stage=bytes===red?'append-red':'append-green';const e=event(sb,'updateend');sb.appendBuffer(new Uint8Array(bytes));await e;};
   const observe=()=>{if(video.readyState>=2){ctx.drawImage(video,0,0);const pixel=[...ctx.getImageData(80,48,1,1).data];const spectrum=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(spectrum);let best=1;for(let i=2;i<spectrum.length;i++)if(spectrum[i]>spectrum[best])best=i;observed.push({time:video.currentTime,pixel,hz:best*audio.sampleRate/analyser.fftSize,db:spectrum[best]});}raf=requestAnimationFrame(observe);};
   try{
    await open('video/mp4; codecs="avc1.64000b,mp4a.40.2"');await append(red);observe();
    if(mode==='retained-changeType'){
     sb.changeType('video/webm; codecs="vp9,opus"');sb.timestampOffset=2.05;await append(green);ms.endOfStream();const ended=event(video,'ended');await video.play();await ended;
    }else{
     ms.endOfStream();let ended=event(video,'ended');await video.play();await ended;
     await open('video/webm; codecs="vp9,opus"');await append(green);ms.endOfStream();ended=event(video,'ended');await video.play();await ended;
    }
   }catch(e){failed=String(e);}
   finally{cancelAnimationFrame(raf);video.pause();video.removeAttribute('src');video.load();video.remove();source.disconnect();analyser.disconnect();await audio.close();for(const u of urls)URL.revokeObjectURL(u);}
   return {mode,failed,stage,mediaError:video.error?.message,observed,redAV:observed.filter(o=>o.pixel[0]>180&&o.pixel[1]<60&&Math.abs(o.hz-440)<20&&o.db>-70).length,greenAV:observed.filter(o=>o.pixel[1]>180&&o.pixel[0]<60&&Math.abs(o.hz-880)<20&&o.db>-70).length,cleanup:true};
  },{red:[...red],green:[...green],mode});result.cases.push(run);
 }
 result.negative=await page.evaluate(()=>{const ms=new MediaSource();return {invalidMime:MediaSource.isTypeSupported('video/invalid; codecs="not-codec"'),ordinaryMSE:typeof ms.addSourceBuffer==='function'};});
 for(const c of result.cases){assert.equal(c.failed,null);assert.ok(c.redAV>=3,c.mode+' red/440Hz output');assert.ok(c.greenAV>=3,c.mode+' green/880Hz output');}
 assert.equal(result.negative.invalidMime,false);assert.equal(result.negative.ordinaryMSE,true);await page.evaluate(()=>player.destroy());result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:result.cases.map(({observed,...c})=>({...c,observations:observed.length}))},null,2));}
