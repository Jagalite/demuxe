// SPDX-License-Identifier: Apache-2.0
// Requires rebuilt runtime assets and existing row fixtures. Never generates media.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {markedImage,markedAudio} from './head-to-head/checks.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const root=process.env.FIXTURE_ROOT??'build/head-to-head/assets-row-refresh-20260926-01/fixtures';
const cases=[
 ['h264-ac3','native-video-mpv-audio'],
 ['h264-eac3','native-video-mpv-audio'],
 ['h264-dts','native-video-mpv-audio'],
 ['hevc10-ac3','native-video-mpv-audio'],
 ['h264-srt','native-remux-mpv'],
 ['h264-movtext','native-remux-mpv','mp4'],
 ['h264-ass','native-remux-mpv'],
 ['h264-aac-pgs-isolation','native-remux-mpv'],
 ['h264-aac-vobsub-isolation','native-remux-mpv'],
 ['hevc-pgs','native-video-mpv-audio-subtitles'],
 ['h264-vobsub','native-video-mpv-audio-subtitles'],
 ['h264-ts','native-remux','ts'],
];
const output=process.env.RESULT_DIR??`results/native-url-services/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const failures=[];
const selected=process.env.CASES?.split(',');
const server=await serve({mediaPaths:Object.fromEntries(cases.map(([name,,ext='mkv'])=>[name,path.join(root,name,`index.${ext}`)]))});
const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [name,plan] of cases){
  if(selected&&!selected.includes(name))continue;
  const phases=[];
  const page=await browser.newPage();page.setDefaultTimeout(60000);
  try{
   await page.addInitScript(installAudioProbe);
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async({name,plan,local})=>{
    const {Player}=await import('/web/generated/index.js');
    window.errors=[];window.refreshes=0;
    window.player=new Player(document.querySelector('#surface'),local?{nativeRemux:'always'}:{});
    player.addEventListener('error',event=>errors.push(event.detail));
    const source={url:`/media/${name}?auth=1&id=${name}`,format:'file',credentials:'omit',
     refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'Bearer refreshed'}};}};
    if(local){const response=await fetch(`/media/${name}?id=local`);await player.open(new File([await response.arrayBuffer()],name+'.mkv'));}
    else await player.open(source);
    if(!plan.startsWith('native-video-mpv-audio'))await urlAudioProbe.observeVideo(document.querySelector('#surface video'));
    await player.play();
   },{name,plan,local:process.env.SOURCE_KIND==='file'});
   assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),plan,name);
   await page.waitForFunction(()=>player.state.currentTime>1);
   const hasSubtitles=plan.endsWith('mpv')||plan.endsWith('subtitles');
   const textSubtitles=['h264-srt','h264-movtext'].includes(name);
   const bitmapSubtitles=hasSubtitles&&!textSubtitles&&name!=='h264-ass';
   // ffprobe confirms the muxed bitmap packets are shifted to [0,35.3),
   // whereas text/ASS packets retain [0.5,35.8). Check the actual file timeline.
   const captionStart=bitmapSubtitles?0:.5,captionEnd=bitmapSubtitles?35.3:35.8;
   for(const time of [3,6,10,bitmapSubtitles?35.6:.1,3]){
    await page.evaluate(async time=>{await player.pause();await player.seek(time);},time);
    const seekState=await page.evaluate(()=>({position:player.state.currentTime,diagnostics:player.diagnostics}));
    phases.push({phase:'seek',time,...seekState});
    assert.equal(seekState.diagnostics.plan.id,plan,`${name}: route changed after seek to ${time}`);
    assert.ok(Math.abs(seekState.position-time)<.3,name);
    if(hasSubtitles)await page.waitForFunction(time=>{
     const position=player.diagnostics.backend.mpvSubtitles?.position;
     return Number.isFinite(position)&&Math.abs(position-time)<.15;
    },time);
    const image=markedImage(await page.locator('#surface').screenshot(),time);
    assert.ok(image.markerCorrect,`${name}: wrong video marker after seek to ${time}: ${JSON.stringify(image)}`);
    if(hasSubtitles){
     const expected=time>=captionStart&&time<captionEnd;
     const subtitle=await page.evaluate(async()=>{
      const canvas=document.querySelector('.demuxe-native-ass'),style=getComputedStyle(canvas);
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let visiblePixels=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visiblePixels++;
      return {visiblePixels,shown:style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0,
       text:await player.current.backend.mpvSubs.currentText()};
     });
     phases.push({phase:'subtitle',time,subtitle,image});
     assert.equal(subtitle.shown&&subtitle.visiblePixels>0,expected,`${name}: caption presence after seek to ${time}`);
     if(textSubtitles){
      assert.equal(subtitle.text.replace(/[^A-Z0-9]/gi,'').includes('DEMUXETEST123'),expected,`${name}: wrong caption text at ${time}`);
     }else{
      assert.equal(image.magentaPixels>150,expected,`${name}: wrong caption drawing at ${time}`);
     }
    }
    if(time>35)continue; // Near EOF checks caption clearing while paused.
    await page.evaluate(()=>player.play());
    await page.waitForFunction(time=>player.state.currentTime>time+.5,time);
    // Allow the observer's FFT window to refill, then inspect actual stereo
    // output. A running clock or selected audio track cannot satisfy this.
    let audio;
    for(let attempt=0;attempt<20;attempt++){
     audio=await page.evaluate(()=>({audio:urlAudioProbe.sample()}));
     if(markedAudio(audio))break;
     await page.waitForTimeout(50);
    }
    phases.push({time,image,audio,diagnostics:await page.evaluate(()=>player.diagnostics)});
    assert.ok(markedAudio(audio),`${name}: wrong/missing stereo tones after seek to ${time}: ${JSON.stringify(audio)}`);
   }
   await page.evaluate(()=>player.setPlaybackRate(1.25));
   await page.waitForFunction(()=>player.state.playbackRate===1.25);
   const state=await page.evaluate(()=>({plan:player.diagnostics.plan.id,backend:player.diagnostics.backend,errors,refreshes}));
   phases.push({phase:'rate',state,diagnostics:await page.evaluate(()=>player.diagnostics)});
   assert.equal(state.plan,plan,name);assert.deepEqual(state.errors,[],name);if(process.env.SOURCE_KIND!=='file')assert.ok(state.refreshes>0,name);
   if(plan.endsWith('mpv')||plan.endsWith('subtitles')){
    assert.equal(state.backend.mpvSubtitles.avChains,0,name);
    assert.ok(state.backend.mpvSubtitles.renders>0,name);
   }
   if(plan.startsWith('native-video-mpv-audio')){assert.ok(state.backend.mpvAudio,name);assert.equal(state.backend.mpvAudio.mpvVideoTracks,0,name);}
   await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});
   await page.waitForFunction(()=>document.querySelectorAll('iframe').length===0);
   await page.waitForTimeout(500);assert.equal(page.workers().length,0,name);
   console.log('PASS URL marked output after seeks, service ownership, auth, lifecycle, cleanup:',name);
  }catch(error){
   phases.push({error:String(error.stack),diagnostics:await page.evaluate(()=>player?.diagnostics).catch(()=>null)});failures.push({name,error:String(error)});console.error('FAIL',name,String(error));
  }finally{await writeFile(path.join(output,name+'.json'),JSON.stringify(phases,null,2));await page.close();}
 }
 // An identity failure must not be converted into codec fallback.
 const page=await browser.newPage();
 try{
  await page.goto(server.origin+'/experiment/page.html');
  const result=await page.evaluate(async()=>{
   const {Player}=await import('/web/generated/index.js');const player=new Player(document.querySelector('#surface'));
   try{await player.open({url:'/media/h264-ac3?changed=1&id=changed',credentials:'omit'});return {opened:true};}
   catch(error){return {code:error.code,selection:player.diagnostics.selection};}
   finally{await player.destroy();}
  });
  assert.equal(result.code,'SOURCE_CHANGED');
  assert.ok(!result.selection?.attempts?.some(item=>item.mode==='hybrid'&&item.outcome==='selected'));
 }finally{await page.close();}
}finally{await browser.close();await server.close();}
assert.deepEqual(failures,[],`Failed cases; evidence: ${output}`);
console.log('PASS terminal source identity failure;',output);
