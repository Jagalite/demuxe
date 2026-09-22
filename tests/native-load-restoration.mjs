// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/startup-timeout/restoration-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
execFileSync('ffmpeg',['-v','error','-i','fixtures/example.mp4','-map','0:v:0','-map','0:a:0','-c','copy',out+'/timeout.mkv']);
const server=await serve({mediaPaths:{fixture:out+'/timeout.mkv'}}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),results=[];
try{for(const variant of ['missing','missing-gain','unsupported','bounded','abort','permission','identity']){
 const page=await browser.newPage();
 try{
  if(variant.startsWith('missing'))await page.route('**/native-remux-player.js',r=>r.fulfill({status:404,body:'Missing runtime module'}));
  await page.goto(server.origin+'/experiment/page.html');
  const result=await page.evaluate(async variant=>{
   const {Player}=await import('/web/generated/index.js'),{NativePlayer}=await import('/web/generated/internal/native-player.js'),{PlayerError}=await import('/web/generated/internal/errors.js');
   const p=new Player(document.querySelector('#surface'),{audioGain:variant.includes('gain')?.5:1});
   const file=new File([await(await fetch('/media/fixture')).arrayBuffer()],'fixture.mkv');
   const controller=new AbortController(),wait=NativePlayer.prototype.wait,startRemux=NativePlayer.prototype.startRemux;const budgets=[];let remuxCalls=0;
   NativePlayer.prototype.wait=function(event,start){
    if(this.requestedPlan?.startsWith('native-direct')&&['loadeddata','loadedmetadata'].includes(event)){
     budgets.push(this.loadTimeoutMs);
     if(variant.startsWith('missing')){let timer;return wait.call(this,event,()=>{timer=setTimeout(start,2000);}).finally(()=>clearTimeout(timer));}
     const timeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timeout(fn,[1500,25000].includes(ms)?50:ms,...args);
     try{return wait.call(this,event,()=>{if(budgets.length>1&&variant!=='bounded')start();});}finally{window.setTimeout=timeout;}
    }return wait.call(this,event,start);
   };
   NativePlayer.prototype.startRemux=function(...args){
    remuxCalls++;
    if(variant.startsWith('missing'))return startRemux.apply(this,args);
    if(variant==='abort'){controller.abort();throw new PlayerError('ABORTED','Operation aborted');}
    if(variant==='permission')throw new PlayerError('SOURCE_PERMISSION','Source permission denied');
    if(variant==='identity')throw new PlayerError('SOURCE_CHANGED','Source changed');
    throw new PlayerError('UNSUPPORTED_MEDIA','Injected remux incompatibility');
   };
   let error,playback;
   try{await p.open(file,{signal:controller.signal});await p.volume(0);await p.play();await new Promise(r=>setTimeout(r,150));await p.pause();playback={time:p.state.currentTime,frames:p.diagnostics.backend.rendered};}catch(e){error=e.code;}
   const diagnostics=p.diagnostics;await p.destroy();NativePlayer.prototype.wait=wait;NativePlayer.prototype.startRemux=startRemux;
   return {variant,error,budgets,remuxCalls,playback,gain:diagnostics.audioGain,plan:diagnostics.plan?.id,attempts:diagnostics.selection.attempts,surfaces:document.querySelectorAll('.demuxe-player video').length};
  },variant);results.push(result);
  assert.equal(result.remuxCalls,1);assert.equal(result.surfaces,0);
  if(['abort','permission','identity'].includes(variant)){
   assert.deepEqual(result.budgets,[1500]);assert.equal(result.error,{abort:'ABORTED',permission:'SOURCE_PERMISSION',identity:'SOURCE_CHANGED'}[variant]);
  }else{
   assert.deepEqual(result.budgets,[1500,25000]);
   if(variant==='bounded')assert.equal(result.error,'NETWORK_TIMEOUT');
   else{assert.equal(result.error,undefined);assert.equal(result.plan,variant.includes('gain')?'native-direct-gain':'native-direct');assert.equal(result.gain,variant.includes('gain')?.5:1);assert.ok(result.playback.time>0);assert.ok(result.playback.frames>0);}
  }
  for(const deadline=Date.now()+2000;page.workers().length&&Date.now()<deadline;)await page.waitForTimeout(25);
  assert.equal(page.workers().length,0);console.log('PASS',variant);
 }finally{await page.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');}
}}finally{await browser.close();await server.close();console.log(out);}
