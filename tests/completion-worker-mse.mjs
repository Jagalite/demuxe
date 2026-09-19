// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='results/full-completion/continuity',data=await readFile(out+'/red.mp4');
const result={scope:'Worker MediaSourceHandle append and actual output, malformed-input and forced worker teardown controls; no production scheduler change or performance claim.',cases:[]};
const workerSource=`let ms,sb;onmessage=({data})=>{if(data.start){ms=new MediaSource();postMessage({handle:ms.handle},[ms.handle]);ms.addEventListener('sourceopen',()=>{sb=ms.addSourceBuffer('video/mp4; codecs="avc1.64000a,mp4a.40.2"');sb.addEventListener('error',()=>postMessage({rejected:true}));sb.addEventListener('updateend',()=>{if(ms.readyState==='open'&&!sb.updating){try{ms.endOfStream();postMessage({appended:true});}catch(e){postMessage({error:String(e)});}}});sb.appendBuffer(data.bytes);});}};`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 for(const mode of ['play-to-eof','malformed-input','terminate-after-frame','seek-after-frame']){
  const run=await page.evaluate(async({bytes,workerSource,mode})=>{
   const video=document.createElement('video');document.body.append(video);const audio=new AudioContext({sampleRate:48000});await audio.resume();const source=audio.createMediaElementSource(video),analyser=audio.createAnalyser();analyser.fftSize=4096;source.connect(analyser);analyser.connect(audio.destination);const canvas=document.createElement('canvas');canvas.width=160;canvas.height=96;const ctx=canvas.getContext('2d');
   const u=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'})),w=new Worker(u);let rejected=false,appended=false,failed=null,ended=false,redTone=false,frames=0,seeked=false;
   w.onmessage=({data})=>{if(data.handle){video.srcObject=data.handle;video.play().catch(e=>{if(mode!=='malformed-input')failed=String(e);});}if(data.rejected)rejected=true;if(data.appended)appended=true;if(data.error)failed=data.error;};w.onerror=e=>failed=e.message;video.addEventListener('ended',()=>ended=true);
   const buffer=new Uint8Array(mode==='malformed-input'?Array(256).fill(255):bytes).buffer;w.postMessage({start:true,bytes:buffer},[buffer]);const inputDetached=buffer.byteLength===0;
   const deadline=performance.now()+7000;
   while(performance.now()<deadline&&!failed){
    if(video.readyState>=2){ctx.drawImage(video,0,0);const p=ctx.getImageData(80,48,1,1).data;const spectrum=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(spectrum);let best=1;for(let i=2;i<spectrum.length;i++)if(spectrum[i]>spectrum[best])best=i;redTone||=p[0]>180&&p[1]<60&&Math.abs(best*audio.sampleRate/analyser.fftSize-440)<20&&spectrum[best]>-70;frames++;}
    if(mode==='seek-after-frame'&&redTone&&!seeked){video.currentTime=1.2;seeked=true;}
    if(mode==='malformed-input'&&rejected||(mode==='play-to-eof'||mode==='seek-after-frame')&&ended||mode==='terminate-after-frame'&&redTone)break;
    await new Promise(r=>setTimeout(r,16));
   }
   const position=video.currentTime;video.pause();video.srcObject=null;video.removeAttribute('src');video.load();w.terminate();URL.revokeObjectURL(u);video.remove();source.disconnect();analyser.disconnect();await audio.close();
   return {mode,rejected,appended,failed,ended,redTone,observations:frames,position,inputDetached,seeked,cleanup:true};
  },{bytes:[...data],workerSource,mode});result.cases.push(run);
 }
 const normal=result.cases[0];assert.equal(normal.failed,null);assert.ok(normal.redTone&&normal.ended&&normal.appended);assert.ok(result.cases[1].rejected);assert.ok(result.cases[2].redTone);assert.ok(result.cases[3].seeked&&result.cases[3].ended);for(const r of result.cases)assert.ok(r.inputDetached&&r.cleanup);
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/worker-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
