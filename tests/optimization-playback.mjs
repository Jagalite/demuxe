// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.env.BROWSER||'chrome';
const out=`results/optimization-integration/playback-${name}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.on('error',reject);server.stdout.on('data',d=>{const m=String(d).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}})});
const browser=await (name==='firefox'?firefox:chromium).launch(name==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const result={browser:browser.version(),scope:'Short output and lifecycle checks, not performance or endurance',cases:[]};
try{
 for(const kind of ['native-direct','native-remux','native-gain','hybrid','hybrid-filter','software'].filter(kind=>!process.env.CASES||process.env.CASES.split(',').includes(kind))){
  const page=await browser.newPage();page.setDefaultTimeout(20000);const item={kind};result.cases.push(item);
  try{
   await page.route('**/optimization-signal.mp4',async route=>route.fulfill({contentType:'video/mp4',body:await readFile('build/optimization-fixtures/gain.mp4')}));
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async kind=>{
    await window.player?.destroy();const {Player}=await import('/web/generated/index.js');
    window.errors=[];window.player=new Player(document.querySelector('#surface'),{mode:kind.startsWith('native')?'native':kind.startsWith('hybrid')?'hybrid':'software',experimentalBufferedNativeSeeks:true,nativeRemux:kind==='native-remux'?'always':'auto',experimentalHybridAudioFilters:kind==='hybrid-filter',audioGain:kind==='native-gain'?0.5:1,audioFilters:kind==='hybrid-filter'?'lavfi=[volume=0.5]':''});
    player.addEventListener('error',e=>errors.push(e.detail));
    const b=await(await fetch(kind==='native-gain'||kind==='hybrid-filter'?'/optimization-signal.mp4':'/fixtures/example.mp4')).arrayBuffer();await player.open(new File([b],'example.mp4'));await player.play();
   },kind);
   await page.waitForFunction(()=>player.state.currentTime>.6);
   await page.evaluate(()=>player.pause());
   item.before=await page.evaluate(()=>player.diagnostics);
   if(kind==='native-remux'){
    await page.waitForFunction(()=>player.surface.buffered.length&&player.surface.buffered.end(0)>4);
    item.seek=await page.evaluate(async()=>{
     const backend=player.current.backend,r=backend.remux,worker=r.worker,media=r.media,sb=r.sb;
     const target=2;const frame=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('correct frame timeout')),5000);const next=(_,m)=>{if(Math.abs(m.mediaTime-(target+r.timelineBias))<.15){clearTimeout(timer);resolve(m.mediaTime)}else player.surface.requestVideoFrameCallback(next)};player.surface.requestVideoFrameCallback(next)});
     await player.seek(target);const presented=await frame;
     return {presented,sameWorker:worker===r.worker,sameMedia:media===r.media,sameBuffer:sb===r.sb,paused:player.surface.paused,diagnostics:player.diagnostics};
    });
    assert.equal(item.seek.sameWorker,true);assert.equal(item.seek.sameMedia,true);assert.equal(item.seek.sameBuffer,true);assert.equal(item.seek.paused,true);
    await page.evaluate(async()=>{await player.play()});await page.waitForFunction(()=>player.state.currentTime>5);await page.evaluate(()=>player.pause());
   }
   if(kind==='hybrid-filter'){
    assert.equal(item.before.backend.decoder,'webcodecs');assert.equal(item.before.plan.id,'hybrid-audio-filter');
    await page.evaluate(async()=>{await player.setAudioFilters('volume=0.25');await player.seek(2);await player.rate(1.25);});
    assert.equal(await page.evaluate(()=>player.mode),'hybrid');
    assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);
   }
   if(kind==='native-gain'||kind==='hybrid-filter'){
    item.signal=await page.evaluate(async kind=>{
     const contexts=[];
     const sample=async()=>{
      await player.play();await new Promise(r=>setTimeout(r,300));
      const backend=player.current.backend;let analyser;
      if(kind==='native-gain'){contexts.push(backend.gainContext);analyser=backend.gainContext.createAnalyser();backend.gainNode.connect(analyser);}
      const values=[];for(let i=0;i<8;i++){if(analyser){const data=new Float32Array(2048);analyser.getFloatTimeDomainData(data);values.push(Math.sqrt(data.reduce((a,b)=>a+b*b,0)/data.length));}else values.push(player.audioDiagnostics().rms);await new Promise(r=>setTimeout(r,25));}
      if(analyser)backend.gainNode.disconnect(analyser);await player.pause();return values.sort((a,b)=>a-b)[4];
     };
     // Restore the same initial filter before measuring the dedicated gain stage.
     if(kind==='hybrid-filter')await player.setAudioFilters('volume=0.5');
     const half=await sample();
     if(kind==='native-gain')await player.setAudioGain(.25);else await player.setAudioFilters('volume=0.25');
     const quarter=await sample();await player.setMuted(true);const mute=await sample();await player.setMuted(false);
     if(kind==='native-gain'){await player.setAudioGain(0);const zero=await sample();await player.setAudioGain(1);const unity=await sample();return {unity,half,quarter,mute,zero,oldContexts:contexts.map(c=>c.state),restored:player.current.backend.gainNode.gain.value===1};}
     return {half,quarter,mute};
    },kind);
    assert.ok(item.signal.half>.005);assert.ok(Math.abs(item.signal.quarter/item.signal.half-.5)<.06);assert.ok(item.signal.mute<.00001);
    if(kind==='native-gain'){assert.ok(item.signal.zero<.00001);assert.equal(item.signal.restored,true);assert.ok(item.signal.oldContexts.every(s=>s==='running'));}
   }
   item.after=await page.evaluate(()=>({diagnostics:player.diagnostics,audio:player.audioDiagnostics(),errors}));assert.deepEqual(item.after.errors,[]);
   await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);assert.equal(await page.locator('#surface video,#surface canvas,iframe').count(),0);item.passed=true;
  }catch(error){item.error=String(error.stack);process.exitCode=1;}finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(kind,item.passed?'PASS':item.error);}
 }
}finally{await browser.close();server.kill();}
