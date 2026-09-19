// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='results/full-completion/r59',identity=JSON.parse(await readFile(out+'/identity.json','utf8'));
const inputs=[];for(const [name,file,hz,view] of [['default-control','two-tail.mp4',440,false],['selected-reference','selected-reference.mp4',880,false],['front-view','two-front.mp4',880,true],['tail-view','two-tail.mp4',880,true]])inputs.push({name,bytes:[...await readFile(out+'/'+file)],hz,metadata:view?identity.cases.find(c=>file===c.name+'.mp4'):null});
const result={scope:'Known local three-track MP4 metadata view; both moov layouts, actual marked output, seek and EOF. No general track admission, remote proxy or redacted export.',identity,cases:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 result.cases=await page.evaluate(async inputs=>{
  const results=[];for(const input of inputs){
  const v=document.createElement('video');document.body.append(v);const ac=new AudioContext({sampleRate:48000});await ac.resume();const source=ac.createMediaElementSource(v),analyser=ac.createAnalyser();analyser.fftSize=4096;source.connect(analyser);analyser.connect(ac.destination);const canvas=new OffscreenCanvas(160,96),ctx=canvas.getContext('2d');
  try{
   const original=new Blob([new Uint8Array(input.bytes)],{type:'video/mp4'});let selected=original,copied=0;
   if(input.metadata){const {offset,size,replacements,enabledFlagOffsets}=input.metadata;const moov=new Uint8Array(await original.slice(offset,offset+size).arrayBuffer());for(const p of replacements)moov.set([102,114,101,101],p-offset);for(const p of enabledFlagOffsets)moov[p-offset]|=1;copied=moov.length;selected=new Blob([original.slice(0,offset),moov,original.slice(offset+size)],{type:'video/mp4'});}
   const url=URL.createObjectURL(selected);let error=null,ended=false,seeked=false,before=0,after=0;const observations=[];v.onerror=()=>error=v.error?.message;v.onended=()=>ended=true;v.src=url;v.play().catch(e=>error=String(e));const end=performance.now()+6000;
   while(performance.now()<end&&!error&&!ended){if(v.readyState>=2){ctx.drawImage(v,0,0,160,96);const color=ctx.getImageData(80,48,1,1).data;const bins=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(bins);let best=1;for(let i=2;i<bins.length;i++)if(bins[i]>bins[best])best=i;observations.push({t:v.currentTime,pixel:[...color],hz:best*ac.sampleRate/analyser.fftSize,db:bins[best]});const correct=color[0]>180&&color[1]<60&&Math.abs(best*ac.sampleRate/analyser.fftSize-input.hz)<20&&bins[best]>-70;if(correct){if(seeked)after++;else before++;}if(before>=5&&!seeked){v.currentTime=1.5;seeked=true;}}await new Promise(r=>setTimeout(r,20));}
   v.pause();v.removeAttribute('src');v.load();URL.revokeObjectURL(url);results.push({name:input.name,observations,expectedTone:input.hz,error,ended,seeked,correctBeforeSeek:before,correctAfterSeek:after,sourceBytes:original.size,viewBytes:selected.size,metadataBytesCopied:copied});
  }finally{v.remove();source.disconnect();analyser.disconnect();await ac.close();}}
  return results;
 },inputs);
 for(const c of result.cases){assert.equal(c.error,null);assert.ok(c.ended&&c.seeked&&c.correctBeforeSeek>=5&&c.correctAfterSeek>=5);assert.equal(c.sourceBytes,c.viewBytes);}
 await page.evaluate(()=>player.destroy());result.cleanup=true;result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
