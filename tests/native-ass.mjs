// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.env.BROWSER||'chrome',out=`results/optimization-completion/ass-${name}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('server timeout')),10000);server.on('error',j);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);r(m[0]);}});});
const browser=await(name==='firefox'?firefox:chromium).launch(name==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),scope:'External authored ASS overlay on Native presentation; no embedded, PiP/casting or physical A/V claim',cases:[]};
try{
 for(const kind of ['direct','remux','flac','flac-gain'].filter(k=>!process.env.CASES||process.env.CASES.split(',').includes(k))){
  const page=await browser.newPage(),item={kind};result.cases.push(item);page.setDefaultTimeout(20000);
  try{
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async kind=>{
    await player.destroy();const {Player}=await import('/web/generated/index.js');window.errors=[];window.frameTrace=[];const request=HTMLVideoElement.prototype.requestVideoFrameCallback;HTMLVideoElement.prototype.requestVideoFrameCallback=function(cb){return request.call(this,(now,m)=>{const r=player?.current?.backend?.remux;frameTrace.push({mediaTime:m.mediaTime,currentTime:this.currentTime,seeking:this.seeking,expected:r?.expectedVideoFrame?.(this.currentTime-(r.timelineBias??0)),bias:r?.timelineBias});if(frameTrace.length>100)frameTrace.shift();cb(now,m);});};
    window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:kind==='direct'?'never':'always',experimentalNativeASS:true,experimentalAudioAdaptation:kind.startsWith('flac')?'flac':undefined,audioGain:kind==='flac-gain'?.5:1,experimentalBufferedNativeSeeks:true});
    player.addEventListener('error',e=>errors.push(e.detail));const input=document.createElement('input');input.type='file';input.id='ass-media';document.body.append(input);
    const font=await(await fetch('/fixtures/DejaVuSans.ttf')).blob();await player.addFont(new File([font],'DejaVuSans.ttf'));
   },kind);
   await page.locator('#ass-media').setInputFiles(kind==='flac-gain'?'results/optimization-integration/reference/web/edge.mkv':kind==='flac'?'build/optimization-fixtures/long-pcm.mkv':'build/optimization-fixtures/gain.mp4');
   await page.evaluate(async()=>{await player.open(document.querySelector('#ass-media').files[0]);window.mediaFile=document.querySelector('#ass-media').files[0];});
   assert.equal(await page.locator('.demuxe-native-ass').count(),0);
   await page.evaluate(async()=>{const b=await(await fetch('/fixtures/qualification.ass')).blob();await player.addSubtitle(new File([b],'qualification.ass'));await player.seek(2.25);});
   const pixels=()=>page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0,green=0;for(let i=0;i<p.length;i+=4){if(p[i+3])visible++;if(p[i+1]>150&&p[i]<50&&p[i+2]<50&&p[i+3]>200)green++;}return {visible,green,width:c.width,height:c.height,image:c.toDataURL(),stats:player.current.backend.ass.stats};});
   await page.waitForFunction(()=>player.current.backend.ass.stats.renders>0);
   await page.waitForTimeout(150);item.active=await pixels();assert.ok(item.active.visible>500);assert.ok(item.active.green>500);
   await page.locator('.demuxe-native-ass').screenshot({path:out+'/'+kind+'-active.png'});
   await page.evaluate(()=>player.seek(2.75));await page.waitForTimeout(150);item.animation=await pixels();assert.notEqual(item.active.image,item.animation.image);
   const before=await page.evaluate(()=>player.current.backend.ass.stats.renders);
   await page.evaluate(()=>{document.querySelector('#surface').style.width='420px';});
   await page.waitForFunction(before=>player.current.backend.ass.stats.renders>before,before);
   item.resize=await pixels();assert.ok(item.resize.visible>200);assert.ok(item.resize.green>200);assert.notEqual(item.resize.width,item.active.width);assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);
   await page.evaluate(()=>player.subtitleVisible(false));assert.equal(await page.locator('.demuxe-native-ass').isVisible(),false);
   await page.evaluate(()=>player.subtitleVisible(true));await page.waitForTimeout(100);assert.ok((await pixels()).green>200);
   await page.evaluate(async()=>{await player.rate(1.5);await player.play();});await page.waitForTimeout(250);
   if(kind!=='direct'){
    const owner=await page.evaluate(()=>player.current.backend.remux.snapshot().mseOwner??'window');
    if(owner==='window'){
     // Window-owned MSE retains the qualified buffered-seek optimization.
     await page.waitForFunction(()=>player.current.backend.remux.canSeekBuffered(4));
     item.playingSeek=await page.evaluate(async()=>{const b=player.current.backend,r=b.remux,w=r.worker,m=r.media,s=r.sb;await player.seek(4);return {owner:'window',playing:!player.surface.paused,same:b===player.current.backend&&w===r.worker&&m===r.media&&s===r.sb,count:r.stats.bufferedSeeks};});
     assert.equal(item.playingSeek.playing,true);assert.equal(item.playingSeek.same,true);assert.ok(item.playingSeek.count>0);
    }else{
     // Worker-owned MSE regenerates a bounded presentation for playing seeks.
     item.playingSeek=await page.evaluate(async()=>{const b=player.current.backend,r=b.remux,w=r.worker,g=r.generation,buffered=r.canSeekBuffered(4);await player.seek(4);return {owner:'worker',playing:!player.surface.paused,same:b===player.current.backend&&w===r.worker,generationAdvanced:r.generation>g,buffered,position:player.state.currentTime};});
     assert.equal(item.playingSeek.playing,true);assert.equal(item.playingSeek.same,true);assert.equal(item.playingSeek.buffered,false);assert.ok(Math.abs(item.playingSeek.position-4)<.25);
     if(kind==='remux')assert.equal(item.playingSeek.generationAdvanced,true);
    }
   }
   await page.evaluate(()=>player.pause());
   item.gain=await page.evaluate(async()=>{const b=player.current.backend,a=b.ass,r=b.remux;await player.setAudioGain(.25);return {same:b===player.current.backend&&a===b.ass&&r===b.remux,diagnostics:player.diagnostics};});assert.equal(item.gain.same,true);
   item.track=await page.evaluate(async()=>{const id=player.state.subtitleTracks.find(t=>t.external).id;await player.selectSubtitleTrack(id);await player.setMode('hybrid');const hybrid=player.state.subtitleTracks.find(t=>t.selected)?.id;await player.setMode('native');return {id,hybrid,native:player.state.subtitleTracks.find(t=>t.selected)?.id};});assert.equal(item.track.id,item.track.hybrid);assert.equal(item.track.id,item.track.native);
   await page.evaluate(()=>{const b=document.createElement('button');b.id='ass-fullscreen';b.textContent='Fullscreen';b.onclick=()=>document.querySelector('#surface').requestFullscreen().catch(e=>window.fullscreenError=String(e));document.body.append(b);});
   await page.locator('#ass-fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement||window.fullscreenError);
   item.fullscreen=await page.evaluate(()=>({active:!!document.fullscreenElement,overlayIncluded:document.fullscreenElement?.contains(document.querySelector('.demuxe-native-ass')),error:window.fullscreenError,pipDisabled:player.surface.disablePictureInPicture,remoteDisabled:player.surface.disableRemotePlayback}));
   assert.equal(item.fullscreen.active,true);assert.equal(item.fullscreen.overlayIncluded,true);assert.equal(item.fullscreen.pipDisabled,true);assert.equal(item.fullscreen.remoteDisabled,true);
   await page.evaluate(()=>document.exitFullscreen());
   item.errors=await page.evaluate(()=>errors);assert.deepEqual(item.errors,[]);
   await page.evaluate(()=>player.open(mediaFile));assert.equal(await page.locator('.demuxe-native-ass').count(),0);
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.frameTrace=await page.evaluate(()=>window.frameTrace);item.passed=true;
   for(const key of ['active','animation','resize'])delete item[key].image;
  }catch(error){item.frameTrace=await page.evaluate(()=>window.frameTrace);item.error=String(error.stack);item.state=await page.evaluate(()=>({diagnostics:player.diagnostics,errors})).catch(()=>null);item.bufferedState=await page.evaluate(()=>{const owner=player.current?.backend?.remux,r=owner?.local??owner,video=r?.video;return r?{raps:r.raps,ranges:r.ranges?.(),canSeek4:owner.canSeekBuffered?.(4),videoBuffered:video?Array.from({length:video.buffered.length},(_,i)=>[video.buffered.start(i),video.buffered.end(i)]):[],targetReady:r.targetReady,acceptedGeneration:r.acceptedGeneration,generation:r.generation,timelineBias:r.timelineBias,mediaReadyState:r.media?.readyState}:null;}).catch(()=>null);process.exitCode=1;}finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(kind,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
 const page=await browser.newPage(),item={kind:'destroy-during-wasm-load'};result.cases.push(item);
 let release,entered;const barrier=new Promise(r=>entered=r),unblock=new Promise(r=>release=r);
 try{
  await page.route('**/engine-ass/subtitles.wasm',async route=>{entered();await unblock;await route.abort().catch(()=>{});});
  await page.goto(origin+'/examples/custom-controls.html');
  await page.evaluate(async()=>{
   await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});
   await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));
   const ass=new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'external.ass');
   window.settled=false;window.pending=player.addSubtitle(ass).then(()=>({accepted:true}),e=>({error:String(e)})).finally(()=>window.settled=true);
  });
  await Promise.race([barrier,new Promise((_,j)=>setTimeout(()=>j(Error('Wasm load barrier not reached')),15000))]);
  assert.equal(await page.evaluate(()=>window.settled),false);
  item.output=await page.evaluate(async()=>{await player.destroy();return await window.pending;});
  assert.match(item.output.error,/destroy|abort/i);release();await page.waitForTimeout(100);assert.equal(page.workers().length,0);assert.equal(await page.locator('.demuxe-native-ass').count(),0);item.frameTrace=await page.evaluate(()=>window.frameTrace);item.passed=true;
 }catch(error){item.frameTrace=await page.evaluate(()=>window.frameTrace);item.error=String(error.stack);process.exitCode=1;}finally{release();await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(item.kind,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}finally{await browser.close();server.kill();}
