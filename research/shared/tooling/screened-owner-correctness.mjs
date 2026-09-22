// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {serveLab,profiles,playerTrial,bounded} from './screened-owner-lab.mjs';
const context=JSON.parse(await readFile(process.argv[2],'utf8')),out=context.run+'/'+(process.env.VARIANT||'correctness-v3');await mkdir(out,{recursive:true});
const server=await serveLab(context),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result=process.env.REUSE?JSON.parse(await readFile(context.run+'/correctness-v2/results.json','utf8')):{browser:browser.version(),profiles:[],offlineAudio:[],controls:[]};
if(process.env.REUSE)result.reusedCorrectness='correctness-v2/results.json';
const save=()=>writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');
try{
 if(!process.env.REUSE){
 const page=await browser.newPage();await page.goto(server.origin+'/current/');
 const cases=[
  ...['mulaw','alaw'].flatMap(law=>[
   {id:'D32-'+law,source:context.build+`/batch06/pcm_${law}.au`,reference:context.build+`/batch06/pcm_${law}_reference.wav`,adapter:'auToWave'},
   {id:'D32-'+law+'-allcodes',source:context.build+`/batch06/pcm_${law}_allcodes.au`,reference:context.build+`/batch06/pcm_${law}_allcodes_reference.wav`,adapter:'auToWave'}]),
  ...['float_le','float_be','s24_le','s24_be','s16_be'].map(n=>({id:'D68-'+n,source:context.build+'/batch16/'+n+'.caf',reference:context.build+'/batch16/'+n+'_ref.wav',adapter:'cafPcmToWave'})),
  {id:'D69',source:context.build+'/batch16/opus_declared.caf',reference:context.build+'/batch16/opus_ref.ogg',adapter:'cafOpusToOgg'},
 ];
 for(const row of cases){
  const value=await page.evaluate(async row=>{
   const adapters=await import('/research/shared/tooling/finite-native-audio.mjs'),source=new Uint8Array(await(await fetch('/'+row.source)).arrayBuffer()),reference=await(await fetch('/'+row.reference)).arrayBuffer();
   const out=adapters[row.adapter](source),context=new AudioContext({sampleRate:48000});
   try{const a=await context.decodeAudioData(out.bytes.buffer.slice(0)),b=await context.decodeAudioData(reference);let differences=0,maxError=0;
    if(a.length===b.length&&a.numberOfChannels===b.numberOfChannels)for(let ch=0;ch<a.numberOfChannels;ch++){const x=a.getChannelData(ch),y=b.getChannelData(ch);for(let i=0;i<x.length;i++){const e=Math.abs(x[i]-y[i]);if(e!==0)differences++;maxError=Math.max(maxError,e);}}
    return {id:row.id,frames:a.length,referenceFrames:b.length,channels:a.numberOfChannels,referenceChannels:b.numberOfChannels,differences,maxError,exact:a.length===b.length&&a.numberOfChannels===b.numberOfChannels&&differences===0};
   }finally{await context.close();}
  },row);result.offlineAudio.push(value);await save();console.log(row.id,value.exact?'EXACT':'FAILED');
 }
 result.controls=await page.evaluate(async build=>{
  const a=await import('/research/shared/tooling/finite-native-audio.mjs'),load=async n=>new Uint8Array(await(await fetch('/'+build+'/'+n)).arrayBuffer()),au=await load('batch06/pcm_mulaw.au'),caf=await load('batch16/float_be.caf'),opus=await load('batch16/opus_declared.caf');
  const controls=[];const reject=(name,fn)=>{try{fn();controls.push({name,rejected:false});}catch(e){controls.push({name,rejected:true,error:e.message});}};
  reject('AU truncation',()=>a.auToWave(au.subarray(0,au.length-1)));let x=au.slice();new DataView(x.buffer).setUint32(8,0xffffffff);reject('AU unknown size',()=>a.auToWave(x));
  let y=au.slice();new DataView(y.buffer).setUint32(12,3);reject('AU unsupported codec',()=>a.auToWave(y));
  reject('CAF truncated data',()=>a.cafPcmToWave(caf.subarray(0,caf.length-1)));reject('CAF wrong adapter',()=>a.cafPcmToWave(opus));
  reject('Opus truncated table',()=>a.cafOpusToOgg(opus.subarray(0,opus.length-1)));let z=opus.slice(),at=8;
  while(at<z.length){const tag=String.fromCharCode(...z.subarray(at,at+4)),size=Number(new DataView(z.buffer).getBigInt64(at+4));if(tag==='pakt'){new DataView(z.buffer).setInt32(at+12+20,new DataView(z.buffer).getInt32(at+12+20)+1);break;}at+=12+size;}
  reject('Opus contradictory trim',()=>a.cafOpusToOgg(z));
  const ac=new AudioContext({sampleRate:48000});try{const correct=await ac.decodeAudioData(a.auToWave(au).bytes.buffer),bad=au.slice();new DataView(bad.buffer).setUint32(12,27);const wrong=await ac.decodeAudioData(a.auToWave(bad).bytes.buffer);const p=correct.getChannelData(0),q=wrong.getChannelData(0);controls.push({name:'wrong law remains decodable but violates output oracle',detected:p.length!==q.length||p.some((v,i)=>v!==q[i])});}finally{await ac.close();}
  return controls;
 },context.build);await page.close();await save();
 for(const profile of profiles(context)){
  const row={id:profile.id};result.profiles.push(row);
  try{
   row.reference=await playerTrial(browser,server,profile,false,{lifecycle:true});row.candidate=await playerTrial(browser,server,profile,true,{lifecycle:true});
   assert.deepEqual(row.candidate.errors,[]);assert.ok(row.candidate.seeks.every(s=>Math.abs(s.target-s.actual)<.02));
   assert.deepEqual(row.candidate.frames.map(f=>f?.hash),row.reference.frames.map(f=>f?.hash));
   assert.equal(row.candidate.duration,row.reference.duration);row.passed=true;console.log(profile.id,'PLAYER CORRECT');
  }catch(e){row.passed=false;row.error=String(e.stack);console.log(profile.id,'PLAYER FAILED',e.message);}
  await save();
 }
 }
 // Actual overlapping maintained source opens: an obsolete source must not win.
 const page2=await browser.newPage();await page2.goto(server.origin+'/candidate/');
 result.sourceReplacement=await bounded(page2.evaluate(async build=>{
  const {Player}=await import('/candidate/web/generated/index.js');const player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});window.p=player;
  const one=new File([await(await fetch('/'+build+'/batch01/av_pce.mp4')).arrayBuffer()],'pce.mp4'),two=new File([await(await fetch('/'+build+'/batch02/explicit_rate.mp4')).arrayBuffer()],'rate.mp4');
  const outcomes=[];
  for(let i=0;i<3;i++){
   const first=player.open(one).then(()=>({resolved:true}),e=>({error:String(e)}));const second=player.open(two);await second;const earlier=await first;await player.play();await new Promise((resolve,reject)=>{const started=performance.now(),timer=setInterval(()=>{if(player.properties.get('time-pos')>.1){clearInterval(timer);resolve();}else if(performance.now()-started>5000){clearInterval(timer);reject(Error('replacement output did not advance'));}},30);});outcomes.push({earlier,sourceName:player.source?.file?.name,mode:player.mode,time:player.properties.get('time-pos')});await player.pause();
  }
  await player.destroy();return outcomes;
 },context.build),25000).catch(e=>({error:String(e)}));await page2.waitForTimeout(100);result.replacementWorkers=page2.workers().length;await page2.close();
 result.passed=result.offlineAudio.every(r=>r.exact)&&result.controls.every(r=>r.rejected||r.detected)&&result.profiles.every(r=>r.passed)&&Array.isArray(result.sourceReplacement)&&result.sourceReplacement.every(r=>r.mode==='native'&&r.sourceName==='rate.mp4'&&r.time>0)&&result.replacementWorkers===0;
}finally{result.assets=[...server.assets.values()];await browser.close();await server.close();await save();}
console.log('Correctness passed:',result.passed);if(!result.passed)process.exitCode=1;
