// SPDX-License-Identifier: Apache-2.0
import {firefox} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/startup-timeout/contracts-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
execFileSync('ffmpeg',['-v','error','-i','fixtures/example.mp4','-map','0:v:0','-map','0:a:0','-c','copy',out+'/timeout.mkv']);
const server=await serve({mediaPaths:{timeout:'fixtures/example.mp4',matroska:out+'/timeout.mkv'}}),browser=await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}}),results=[];
try{
 for(const variant of ['local','matroska','matroska-gain','metadata','remote','remote-matroska','never','matroska-never','abort']){
  const page=await browser.newPage();
  try{
   await page.goto(server.origin+'/experiment/page.html');
   const result=await page.evaluate(async variant=>{
    const {Player}=await import('/web/generated/index.js');
    const {NativePlayer}=await import('/web/generated/internal/native-player.js');
    const matroska=variant.includes('matroska');
    const p=new Player(document.querySelector('#surface'),{...(variant.includes('gain')?{audioGain:.5}:{}),...(variant.endsWith('never')?{nativeRemux:'never'}:{}),...(variant==='metadata'?{buffering:{preload:'metadata'}}:{})});
    const file=new File([await(await fetch(matroska?'/media/matroska':'/fixtures/example.mp4')).arrayBuffer()],matroska?'example.mkv':'example.mp4',{type:matroska?'video/x-matroska':'video/mp4'});
    const controller=new AbortController(),wait=NativePlayer.prototype.wait;let injected=0,deadline;
    NativePlayer.prototype.wait=function(event,start){
     if(!injected&&this.requestedPlan?.startsWith('native-direct')&&['loadeddata','loadedmetadata'].includes(event)){
      injected++;const timeout=window.setTimeout;
      // Exercise the real readiness deadline without waiting 25 seconds. Withhold
      // the load action to represent a candidate that never delivers readiness.
      window.setTimeout=(fn,ms,...args)=>{deadline=ms;return timeout(fn,ms===25000?100:ms,...args);};
      try{const work=wait.call(this,event,()=>{});if(variant==='abort')timeout(()=>controller.abort(),10);return work;}
      finally{window.setTimeout=timeout;}
     }
     return wait.call(this,event,start);
    };
    let code,playback;
    try{
     await p.open(variant.startsWith('remote')?location.origin+(matroska?'/media/matroska':'/media/timeout'):file,{signal:controller.signal});
     await p.volume(0);await p.play();await new Promise(r=>setTimeout(r,250));await p.pause();
     playback={time:p.state.currentTime,frames:p.diagnostics.backend.rendered};
    }catch(e){code=e.code;}
    const diagnostics=p.diagnostics;let reopened;
    if(variant==='local'&&!code){await p.close();await p.open(file);reopened={plan:p.diagnostics.plan?.id,attempts:p.diagnostics.selection.attempts};}
    await p.destroy();NativePlayer.prototype.wait=wait;
    return {variant,injected,deadline,code,playback,reopened,gain:diagnostics.audioGain,plan:diagnostics.plan?.id,records:diagnostics.runtimeCapabilities,attempts:diagnostics.selection.attempts,surfaces:document.querySelectorAll('.demuxe-player video').length};
   },variant);
   results.push(result);assert.equal(result.injected,1);assert.equal(result.surfaces,0);
   assert.equal(result.deadline,['matroska','matroska-gain'].includes(variant)?1500:25000);
   if(['local','matroska','matroska-gain','metadata'].includes(variant)){
    const suffix=variant.includes('gain')?'-gain':'';
    assert.equal(result.code,undefined);assert.equal(result.plan,'native-remux'+suffix);assert.ok(result.playback.time>0);assert.ok(result.playback.frames>0);assert.equal(result.gain,suffix?.5:1);
    const direct=result.records.find(r=>r.planId==='native-direct'+suffix);assert.equal(direct.state,'untested');assert.equal(direct.failureKind,undefined);
    if(variant==='local'){assert.equal(result.reopened.plan,'native-direct');assert.ok(!result.reopened.attempts.some(a=>/cached compatibility/.test(a.reason)));}
   }else{
    assert.equal(result.code,variant==='abort'?'ABORTED':'NETWORK_TIMEOUT');assert.ok(!result.attempts.some(a=>a.mode!=='probe'&&a.outcome==='selected'));
    assert.ok(!result.records.some(r=>r.planId==='native-remux'&&r.state!=='untested'));
   }
   for(const deadline=Date.now()+2000;page.workers().length&&Date.now()<deadline;)await page.waitForTimeout(25);
   assert.equal(page.workers().length,0);console.log('PASS',variant);
  }finally{await page.close();await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');}
 }
}finally{await browser.close();await server.close();console.log(out);}
