// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='results/full-completion/r57',flac=await readFile(out+'/six.flac'),mp4=await readFile(out+'/six.mp4');
const result={scope:'Six source channel identities at browser decoded Web Audio boundary; not six physical speakers or full Native adaptation qualification.',fixtures:{flac:createHash('sha256').update(flac).digest('hex'),mp4:createHash('sha256').update(mp4).digest('hex')},cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 for(const mode of ['direct','mse','intentional-downmix']){
  const run=await page.evaluate(async({mode,bytes})=>{
   const element=document.createElement('audio');document.body.append(element);const context=new AudioContext({sampleRate:48000});await context.resume();const source=context.createMediaElementSource(element),splitter=context.createChannelSplitter(6),analysers=[];let mix;
   if(mode==='intentional-downmix'){mix=context.createGain();mix.channelCount=2;mix.channelCountMode='explicit';source.connect(mix);mix.connect(splitter);}else source.connect(splitter);
   // Connect each analysis tap to a silent destination to keep it rendering.
   const sink=context.createGain();sink.gain.value=0;sink.connect(context.destination);
   for(let i=0;i<6;i++){const a=context.createAnalyser();a.fftSize=8192;splitter.connect(a,i);a.connect(sink);analysers.push(a);}
   let url,failed=null,eof=false;const matrix=Array.from({length:6},()=>Array(6).fill(-200));const frequencies=[300,500,700,900,1100,1300];
   const event=(target,name)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{clean();reject(Error(name+' timeout'));},6000);function clean(){clearTimeout(t);target.removeEventListener(name,ok);target.removeEventListener('error',bad);}const ok=()=>{clean();resolve();},bad=()=>{clean();reject(Error(name+' error'));};target.addEventListener(name,ok);target.addEventListener('error',bad);});
   try{
    if(mode==='mse'){const ms=new MediaSource();url=URL.createObjectURL(ms);const opened=event(ms,'sourceopen');element.src=url;await opened;const sb=ms.addSourceBuffer('audio/mp4; codecs="flac"');const appended=event(sb,'updateend');sb.appendBuffer(new Uint8Array(bytes));await appended;ms.endOfStream();}
    else{url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'audio/flac'}));element.src=url;}
    const ended=event(element,'ended');await element.play();const observe=setInterval(()=>{for(let channel=0;channel<6;channel++){const data=new Float32Array(analysers[channel].frequencyBinCount);analysers[channel].getFloatFrequencyData(data);for(let tone=0;tone<6;tone++){const bin=Math.round(frequencies[tone]*8192/context.sampleRate);matrix[channel][tone]=Math.max(matrix[channel][tone],data[bin]);}}},20);
    try{await ended;eof=true;}finally{clearInterval(observe);}
   }catch(e){failed=String(e);}
   finally{element.pause();element.removeAttribute('src');element.load();element.remove();if(url)URL.revokeObjectURL(url);source.disconnect();mix?.disconnect();splitter.disconnect();analysers.forEach(a=>a.disconnect());sink.disconnect();await context.close();}
   const diagonal=matrix.every((row,i)=>row[i]>-50&&row.every((db,j)=>j===i||db<row[i]-30));return {mode,failed,matrix,diagonal,eof,cleanup:true};
  },{mode,bytes:[...(mode==='mse'?mp4:flac)]});result.cases.push(run);
 }
 for(const c of result.cases.slice(0,2)){assert.equal(c.failed,null);assert.ok(c.diagonal,c.mode+' six independent identities');assert.ok(c.eof);}
 assert.equal(result.cases[2].diagonal,false,'stereo downmix must fail identity oracle');await page.evaluate(()=>player.destroy());result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
