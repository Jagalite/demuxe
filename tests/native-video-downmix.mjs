// SPDX-License-Identifier: Apache-2.0
// Compare selected 5.1 AC-3 -> stereo PCM with Demuxe's existing Hybrid path.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const fixture='build/native-video-component-routing/ac3-51-channel-markers.mkv';
await mkdir('build/native-video-component-routing',{recursive:true});
execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
  'aevalsrc=exprs=0.12*sin(2*PI*440*t)|0.12*sin(2*PI*550*t)|0.12*sin(2*PI*660*t)|0.12*sin(2*PI*770*t)|0.12*sin(2*PI*880*t)|0.12*sin(2*PI*990*t):s=48000:c=5.1',
  '-i','build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-ac3/index.mkv',
  '-map','1:v:0','-map','0:a:0','-c:v','copy','-c:a','ac3','-b:a','448k','-t','8',fixture],{timeout:30000});
const sha256=createHash('sha256').update(await readFile(fixture)).digest('hex');
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[];
try{
  for(const arm of ['hybrid','native']){
    const page=await browser.newPage();
    try{
      await page.goto(server.origin+'/experiment/page.html');
      await page.evaluate(async arm=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),arm==='hybrid'?{mode:'hybrid'}:{});const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);},arm);
      await page.locator('#source').setInputFiles(fixture);
      await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
      await page.evaluate(()=>player.play());await page.waitForTimeout(2500);
      const row=await page.evaluate(arm=>{
        const backend=player.current.backend,engine=arm==='native'?backend.mpvAudio?.engine:backend;
        if(!engine)throw Error('Expected mpv PCM service missing');
        const header=arm==='native'?engine.selectiveAudioState().header:engine.audioHeader;
        const diagnostics=engine.audioDiagnostics(),capacity=8192,length=4096,channels=diagnostics.outputChannels;
        const pcm=new Float32Array(header.buffer,64,capacity*channels),end=Atomics.load(header,0);
        const samples=Array.from({length},(_,i)=>Array.from({length:channels},(_,channel)=>pcm[((end-length+i+capacity)%capacity)*channels+channel]));
        return {arm,plan:player.diagnostics.plan?.id,frames:backend.video?.getVideoPlaybackQuality?.().totalVideoFrames??backend.diagnostics?.rendered??0,
          writeFrame:end,diagnostics,samples};
      },arm);
      rows.push(row);await page.evaluate(()=>player.destroy());
    }finally{await page.close();}
  }
}finally{await browser.close();await server.close();}
const tones=[440,550,660,770,880,990];
function spectrum(row){
  const rate=row.diagnostics.sampleRate,n=row.samples.length,window=Array.from({length:n},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(n-1))),scale=2/window.reduce((a,b)=>a+b,0);
  return tones.map(frequency=>({frequency,amplitude:[0,1].map(channel=>{
    let real=0,imag=0;for(let i=0;i<n;i++){const value=row.samples[i][channel]*window[i],angle=2*Math.PI*frequency*i/rate;real+=value*Math.cos(angle);imag+=value*Math.sin(angle);}
    return scale*Math.hypot(real,imag);
  })}));
}
const summary={fixture,sha256,browser:'Chrome',rows:rows.map(row=>({arm:row.arm,plan:row.plan,frames:row.frames,writeFrame:row.writeFrame,audio:{sampleRate:row.diagnostics.sampleRate,outputChannels:row.diagnostics.outputChannels,mediaFrames:row.diagnostics.mediaFrames,rms:row.diagnostics.rms},spectrum:spectrum(row)}))};
await mkdir('results/native-video-component-routing',{recursive:true});
await writeFile('results/native-video-component-routing/downmix.json',JSON.stringify(summary,null,2)+'\n');
assert.equal(rows[0].plan,'hybrid');assert.equal(rows[1].plan,'native-video-mpv-audio');
for(const row of rows)assert.ok(row.frames>0&&row.writeFrame>4096&&row.diagnostics.outputChannels===2&&row.diagnostics.rms>.001);
const baseline=summary.rows[0].spectrum,native=summary.rows[1].spectrum;
for(const frequency of [440,550,660,880,990]){
  const index=tones.indexOf(frequency);
  for(let channel=0;channel<2;channel++){
    const expected=baseline[index].amplitude[channel],actual=native[index].amplitude[channel];
    if(expected>.003)assert.ok(actual>expected*.65&&actual<expected*1.5,`${frequency} Hz, channel ${channel}: ${actual} versus Hybrid ${expected}`);
  }
}
console.log(JSON.stringify(summary.rows.map(row=>({arm:row.arm,plan:row.plan,audio:row.audio,spectrum:row.spectrum}))));
