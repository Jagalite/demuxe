import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/optimization-integration/stage3/regressions-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),10000);app.on('error',reject);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0])}})});
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),cases:[]};
try{
 for(const kind of ['audio-tail','public-track','low-fps']){
  const page=await browser.newPage();page.setDefaultTimeout(15000);const item={kind};result.cases.push(item);
  try{
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async()=>{await player.destroy();const {Player}=await import('/web/generated/index.js');window.errors=[];window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalBufferedNativeSeeks:true});player.addEventListener('error',e=>errors.push(e.detail));const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f)});
   const fixture=kind==='public-track'?'multi-audio':kind==='low-fps'?'low-fps-inter':'audio-tail';
   await page.locator('#file').setInputFiles('build/optimization-fixtures/'+fixture+'.mkv');await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
   if(kind==='audio-tail'){
    await page.waitForTimeout(700);item.paused=await page.evaluate(()=>player.diagnostics);await page.waitForTimeout(500);item.idle=await page.evaluate(()=>player.diagnostics);
    const stats=d=>d.backend.remux.remux.adaptation;
    assert.ok(stats(item.idle).audioSamplesDecoded<48000*7);assert.equal(stats(item.paused).audioSamplesDecoded,stats(item.idle).audioSamplesDecoded);
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>errors.length>0,null,{timeout:6000});
    item.failure=await page.evaluate(()=>({errors,diagnostics:player.diagnostics}));assert.match(JSON.stringify(item.failure.errors),/preparation budget/);assert.ok(stats(item.failure.diagnostics).audioSamplesDecoded<48000*8);
    // Explicit Native reports the limitation; the application can choose the
    // existing eligible Hybrid backend without losing the source.
    await page.evaluate(()=>player.setMode('hybrid'));assert.equal(await page.evaluate(()=>player.mode),'hybrid');
    await page.waitForFunction(()=>player.state.currentTime>2,null,{timeout:6000});
    item.hybridAfterVideoEnd=await page.evaluate(()=>({position:player.state.currentTime,audio:player.audioDiagnostics()}));
    assert.ok(item.hybridAfterVideoEnd.audio.mediaFrames>48000);
   }else if(kind==='public-track'){
    item.selectedId=await page.evaluate(async()=>{const id=player.state.audioTracks[1].id;await player.selectAudioTrack(id);return id});
    for(const mode of ['hybrid','native']){await page.evaluate(mode=>player.setMode(mode),mode);assert.equal(await page.evaluate(()=>player.state.audioTracks.find(t=>t.selected)?.id),item.selectedId)}
    item.native=await page.evaluate(()=>player.diagnostics);
    assert.equal(item.native.backend.remux.remux.adaptation.sampleRate,44100);
    assert.ok(item.native.backend.remux.stats.cancellations.every(c=>!c.adaptation||c.adaptation.sampleRate===44100));
    await page.evaluate(()=>player.setAudioGain(.5));assert.equal(await page.evaluate(()=>player.state.audioTracks.find(t=>t.selected)?.id),item.selectedId);
    await page.evaluate(()=>player.setAutomaticSelection(true));assert.equal(await page.evaluate(()=>player.state.audioTracks.find(t=>t.selected)?.id),item.selectedId);assert.equal(await page.evaluate(()=>player.mode),'hybrid');
   }else{
    await page.waitForTimeout(700);item.seeks=[];
    for(const target of Array.from({length:3},()=>[2.5,2.75,4.5,2.25]).flat()){
     // Refilling after the previous seek can temporarily make admission unsafe.
     // Wait for actual idle buffered eligibility, not a fixed sleep.
     await page.waitForFunction(target=>{const r=player.current.backend.remux;return !r.busy&&r.canSeekBuffered(target)},target);
     const seek=await page.evaluate(async target=>{const r=player.current.backend.remux,worker=r.worker,generation=r.generation;const start=performance.now();await player.seek(target);const c=document.createElement('canvas');c.width=player.surface.videoWidth;c.height=player.surface.videoHeight;c.getContext('2d').drawImage(player.surface,0,0);return {target,ms:performance.now()-start,sameWorker:r.worker===worker,sameGeneration:r.generation===generation,paused:player.properties.get('pause'),pixels:c.toDataURL()}},target);
     item.seeks.push(seek);assert.equal(seek.sameWorker,true);assert.equal(seek.sameGeneration,true);assert.equal(seek.paused,true);assert.ok(seek.ms<2000);
    }
    assert.equal(item.seeks[0].pixels,item.seeks[1].pixels);assert.equal(item.seeks[0].pixels,item.seeks[3].pixels);assert.notEqual(item.seeks[0].pixels,item.seeks[2].pixels);
   }
   await page.evaluate(()=>player.destroy());for(let i=0;i<20&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.passed=true;
  }catch(error){item.error=String(error.stack);item.state=await page.evaluate(()=>({diagnostics:player.diagnostics,errors})).catch(()=>null);process.exitCode=1}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(kind,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n')}
 }
}finally{await browser.close();app.kill()}
