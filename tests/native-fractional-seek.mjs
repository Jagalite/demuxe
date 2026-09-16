import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/optimization-final/fractional-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);r(m[0]);}})});
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const result={browser:browser.version(),cases:[]};
try{for(let trial=0;trial<3;trial++){
 const page=await browser.newPage(),item={trial};result.cases.push(item);
 try{
  await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async()=>{
   await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalNativeASS:true,audioGain:.5,experimentalBufferedNativeSeeks:true});
   window.trace=[];const fn=HTMLVideoElement.prototype.requestVideoFrameCallback;HTMLVideoElement.prototype.requestVideoFrameCallback=function(cb){return fn.call(this,(now,m)=>{const r=player.current?.backend?.remux;trace.push({mediaTime:m.mediaTime,currentTime:this.currentTime,seeking:this.seeking,expected:r?.expectedVideoFrame?.(window.target),target:window.target,generation:r?.generation,paused:this.paused});if(trace.length>100)trace.shift();cb(now,m)});};
   const i=document.createElement('input');i.id='file';i.type='file';document.body.append(i);
  });await page.locator('#file').setInputFiles('build/optimization-fixtures/automatic-lossless.mkv');
  await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'qualification.ass'));await player.play()});
  await page.waitForFunction(()=>player.state.currentTime>5.3);
  item.seeks=await page.evaluate(async()=>{const results=[];for(const t of [6.300974,6.3326,6.3331,3.2501,4.9999,6.3001]){window.target=t;trace.length=0;const b=player.current.backend,r=b.remux,w=r.worker,m=r.media,s=r.sb;const buffered=r.canSeekBuffered(t),expected=r.expectedVideoFrame(t),frames=r.frames.filter(([pts])=>Math.abs(pts-t)<.1);let error;try{await player.seek(t);}catch(e){error=e.message;}results.push({t,error,buffered,expected,frames,trace:trace.slice(),same:b===player.current.backend&&w===r.worker&&m===r.media&&s===r.sb,time:player.state.currentTime,playing:!player.surface.paused});if(error)break;await new Promise(r=>setTimeout(r,80));}return results;});
  for(const s of item.seeks){assert.equal(s.error,undefined);assert.equal(s.same,s.buffered);assert.equal(s.playing,true);}item.passed=true;
 }catch(e){item.error=String(e.stack);process.exitCode=1;}
 finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await page.waitForTimeout(100);item.workers=page.workers().length;assert.equal(item.workers,0);await page.close();console.log(trial,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}}finally{await browser.close();server.kill();console.log(out)}
