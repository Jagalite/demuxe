// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/optimization-final/fractional-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);r(m[0]);}})});
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const result={browser:browser.version(),cases:[]};
try{for(const intent of ['playing','paused'])for(let trial=0;trial<3;trial++){
 const page=await browser.newPage(),item={trial,intent};result.cases.push(item);
 try{
  await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async()=>{
   await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalNativeASS:true,audioGain:.5,experimentalBufferedNativeSeeks:true});
   window.trace=[];const fn=HTMLVideoElement.prototype.requestVideoFrameCallback;HTMLVideoElement.prototype.requestVideoFrameCallback=function(cb){return fn.call(this,(now,m)=>{const r=player.current?.backend?.remux;trace.push({mediaTime:m.mediaTime,currentTime:this.currentTime,seeking:this.seeking,expected:r?.expectedVideoFrame?.(window.target),target:window.target,generation:r?.generation,paused:this.paused});if(trace.length>100)trace.shift();cb(now,m)});};
   const i=document.createElement('input');i.id='file';i.type='file';document.body.append(i);
  });await page.locator('#file').setInputFiles('build/optimization-fixtures/automatic-release.mkv');
  await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'qualification.ass'));await player.play()});
  await page.waitForFunction(()=>player.state.currentTime>5.3);if(intent==='paused')await page.evaluate(()=>player.pause());
  item.seeks=await page.evaluate(async()=>{
   const results=[],canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const context=canvas.getContext('2d');
   const pixels=()=>{context.drawImage(player.surface,0,0,64,36);let hash=2166136261;for(const value of context.getImageData(0,0,64,36).data)hash=Math.imul(hash^value,16777619);return hash>>>0;};
   for(const t of [6.300974,6.3326,6.3331,3.2501,4.9999,6.3001]){
    window.target=t;trace.length=0;
    const b=player.current.backend,r=b.remux,w=r.worker,m=r.media,s=r.sb;
    const buffered=r.canSeekBuffered(t),expected=r.expectedVideoFrame(t),frames=r.frames.filter(([pts])=>Math.abs(pts-t)<.1);
    const bias=r.timelineBias??0,beforeTime=player.surface.currentTime-bias,beforeExpected=r.expectedVideoFrame(beforeTime),beforePixels=pixels();
    const generation=r.generation,retries=b.seekPresentationRetries,started=performance.now();let error;
    try{await player.seek(t);}catch(e){error=e.message;}
    results.push({elapsedMs:performance.now()-started,retries:b.seekPresentationRetries-retries,generation,t,error,buffered,expected,frames,bias,beforeTime,beforeExpected,beforePixels,afterPixels:pixels(),trace:trace.slice(),same:b===player.current.backend&&w===r.worker&&m===r.media&&s===r.sb,time:player.state.currentTime,playing:!player.surface.paused});
    if(error)break;await new Promise(r=>setTimeout(r,80));
   }
   return results;
  });
  const verifiedPixels=new Map();
  for(const s of item.seeks){
   assert.equal(s.error,undefined);assert.equal(s.same,s.buffered);assert.equal(s.playing,intent==='playing');
   if(s.buffered){
    const presented=s.trace.some(f=>f.generation===s.generation&&Math.abs(f.currentTime-s.t-s.bias)<.001);
    // A sub-millisecond move within the same source-frame interval need not
    // request a callback. Its pixels must match an earlier callback-verified
    // presentation of that exact frame in this remux generation.
    const key=`${s.generation}:${s.expected}`;
    const sameFrame=s.beforeExpected===s.expected&&Math.abs(s.beforeTime-s.t)<.001&&verifiedPixels.get(key)===s.afterPixels;
    assert.ok(presented||sameFrame,'Buffered seek must present the target frame or match its previously verified pixels');
    if(presented)verifiedPixels.set(key,s.afterPixels);
   }
  }
  assert.ok(item.seeks.some(s=>s.generation>1&&s.buffered&&s.same),'Buffered seeks must remain available after a remux restart');item.passed=true;
 }catch(e){item.error=String(e.stack);process.exitCode=1;}
 finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await page.waitForTimeout(100);item.workers=page.workers().length;assert.equal(item.workers,0);await page.close();console.log(intent,trial,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}}finally{await browser.close();server.kill();console.log(out)}
