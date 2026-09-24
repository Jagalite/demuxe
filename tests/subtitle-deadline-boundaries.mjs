// SPDX-License-Identifier: Apache-2.0
// Production player and worker against the same-text, different-style ASS counterexample.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const overlapFixture=process.env.ASS_FIXTURE;
const lane=process.env.SUBTITLE_LANE??'direct';
assert.ok(['direct','remux'].includes(lane));
if(overlapFixture==='build/subtitle-static-overlap.mkv'){
 const ass=await readFile('results/subtitle-stack-upgrade/same-text-style.ass','utf8');
 const lines=ass.split('\n');lines[lines.findIndex(line=>line.startsWith('Dialogue: 1'))]=lines.find(line=>line.startsWith('Dialogue: 1')).replace(',,Same',',,Other');
 await writeFile('build/subtitle-static-overlap.ass',lines.join('\n'));
 execFileSync('ffmpeg',['-v','error','-y','-i','results/subtitle-stack-upgrade/same-text-style.mkv','-i','build/subtitle-static-overlap.ass','-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','ass',overlapFixture]);
}
const report={browser:browser.version(),lane,fixture:overlapFixture??'results/subtitle-stack-upgrade/same-text-style.mkv',runs:[]};
const hostSource=await readFile('web/generated/internal/native-mpv-subtitles.js','utf8');
const baselineSource=hostSource.replace('this.staticQualified = !!profile.qualified;','this.staticQualified = false;');
assert.notEqual(hostSource,baselineSource);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 for(const [mode,rate] of (overlapFixture?[['new',1]]:[['old',1],['new',1],['new',1.75]])){
  const page=await browser.newPage({viewport:{width:960,height:540}});
  try{
   if(mode==='old')await page.route('**/web/generated/internal/native-mpv-subtitles.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:baselineSource}));
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
   await page.locator('#media').setInputFiles(report.fixture);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   const state=await page.evaluate(()=>({route:player.diagnostics.plan.id,scheduler:player.current.backend.mpvSubs.stats.scheduler}));
   assert.equal(state.route,lane==='remux'?'native-remux-mpv':'native-direct-mpv');assert.equal(state.scheduler,mode==='new'?'deadline':'frame');
   await page.evaluate(()=>player.seek(2.5));await page.evaluate(rate=>player.setPlaybackRate(rate),rate);
   const timing=await page.evaluate(()=>player.current.backend.mpvSubs.timingSnapshot(4.2));
   assert.ok(Math.abs(timing.next-5)<.01,JSON.stringify(timing));
   await page.evaluate(()=>{const sub=player.current.backend.mpvSubs,s=sub.stats;let count=s.bitmapUpdates;window.subtitleBitmapTimes=[];Object.defineProperty(s,'bitmapUpdates',{get(){return count;},set(value){count=value;window.subtitleBitmapTimes.push({mediaTime:sub.video.currentTime,renderPts:s.position,count:value});}});});
   await page.evaluate(()=>player.play());
   const points=[];
   for(const target of [3.4,4.4,5.4,11.3]){
    await page.waitForFunction(target=>player.state.currentTime>=target,target,{timeout:15000});
    const point=await page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,red=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>0)pixels++;if(d[i]>130&&d[i+1]<100&&d[i+2]<100&&d[i+3]>0)red++;}return {time:player.state.currentTime,pixels,red,renders:player.current.backend.mpvSubs.stats.renders,updates:player.current.backend.mpvSubs.stats.stateUpdates,avChains:player.current.backend.mpvSubs.service.avChains};});
    assert.equal(point.avChains,0);points.push(point);
   }
   assert.ok(points[0].pixels>0&&points[0].red<100,JSON.stringify(points));
   assert.ok(points[1].red>100,JSON.stringify(points));
   assert.ok(points[2].pixels>0&&points[2].red<100,JSON.stringify(points));
   assert.equal(points[3].pixels,0,JSON.stringify(points));
   assert.ok(points[2].renders>points[1].renders,'missing intermediate 5 s render');
   await page.evaluate(()=>player.pause());await page.evaluate(()=>player.seek(4.5));await sleep(250);
   const pausedInside=await page.evaluate(async()=>({text:await player.current.backend.mpvSubs.currentText(),time:player.state.currentTime,scheduler:player.current.backend.mpvSubs.stats.scheduler}));
   assert.ok(pausedInside.text.includes('Same'));
   if(mode==='new'&&rate===1){
    const before=await page.evaluate(()=>player.current.backend.mpvSubs.stats.renders);
    await page.evaluate(()=>{const v=player.current.backend.mpvSubs.video;v.style.width='480px';v.style.height='270px';});
    await sleep(250);
    assert.ok(await page.evaluate(before=>player.current.backend.mpvSubs.stats.renders>before,before),'paused resize did not render');
   }
   await page.evaluate(()=>player.seek(11.5));await sleep(250);
   const pausedOutside=await page.evaluate(async()=>({text:await player.current.backend.mpvSubs.currentText(),scheduler:player.current.backend.mpvSubs.stats.scheduler}));assert.equal(pausedOutside.text,'');
   assert.equal(pausedInside.scheduler,mode==='new'?'deadline':'frame');
   assert.equal(pausedOutside.scheduler,mode==='new'?'deadline':'frame');
   if(mode==='new'&&rate===1){
    await page.locator('#media').setInputFiles('build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv');
    await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
    await page.evaluate(()=>player.seek(1));await sleep(250);
    assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'DE MUXE TEST 123');
    assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.stats.scheduler),'deadline');
   }
   const bitmapTimes=await page.evaluate(()=>window.subtitleBitmapTimes);
   report.runs.push({mode,rate,route:state.route,scheduler:state.scheduler,timing,points,bitmapTimes,pausedInside,pausedOutside});
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await sleep(100);assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
 report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await mkdir('results/subtitle-deadline-production',{recursive:true});await writeFile(`results/subtitle-deadline-production/${overlapFixture?'boundaries-overlap':lane==='remux'?'boundaries-remux':'boundaries'}.json`,JSON.stringify(report,null,2)+'\n');}
