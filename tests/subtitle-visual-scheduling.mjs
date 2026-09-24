// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const source=await readFile('results/subtitle-stack-upgrade/same-text-style.ass','utf8');
const header=source.slice(0,source.indexOf('Dialogue:'));
const line=(a,b,text)=>`Dialogue: 0,0:00:${String(a).padStart(2,'0')}.00,0:00:${String(b).padStart(2,'0')}.00,Default,,0,0,0,,${text}`;
const events=[line(1,3,'Static'),line(4,6,'{\\fad(600,600)}Fade'),line(7,9,'Static'),line(10,12,'{\\move(20,80,260,80)}Move'),line(13,15,'Static'),line(16,18,'{\\t(0,1500,\\fs42)}Transform'),line(19,21,'Static'),line(22,24,'{\\k50}Ka{\\k50}ra{\\k50}o{\\k50}ke'),line(25,27,'Static')];
await writeFile('build/subtitle-mixed-animated.ass',header+events.join('\n')+'\n');
execFileSync('ffmpeg',['-v','error','-y','-i','results/subtitle-stack-upgrade/same-text-style.mkv','-i','build/subtitle-mixed-animated.ass','-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','ass','build/subtitle-mixed-animated.mkv']);
if(!process.env.SUBTITLE_CASE||process.env.SUBTITLE_CASE==='large-ass'){
 await writeFile('build/subtitle-large-attachment.bin',Buffer.alloc(9*1024*1024));
 await writeFile('build/subtitle-large-ass.ass',source+line(30,32,'Late')+'\n');
 execFileSync('ffmpeg',['-v','error','-y','-i','results/subtitle-stack-upgrade/same-text-style.mkv','-i','build/subtitle-large-ass.ass','-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','ass','-attach','build/subtitle-large-attachment.bin','-metadata:s:t','mimetype=application/octet-stream','build/subtitle-large-ass.mkv']);
}
if(process.env.SUBTITLE_CASE==='dense-ass'){
 const stamp=centiseconds=>`0:${String(Math.floor(centiseconds/6000)).padStart(2,'0')}:${String(Math.floor(centiseconds/100)%60).padStart(2,'0')}.${String(centiseconds%100).padStart(2,'0')}`;
 const dense=Array.from({length:30000},(_,i)=>`Dialogue: 0,${stamp(100+i)},${stamp(101+i)},Default,,0,0,0,,Dense`);
 await writeFile('build/subtitle-dense-ass.ass',header+dense.join('\n')+'\n');
 execFileSync('ffmpeg',['-v','error','-y','-i','results/subtitle-stack-upgrade/same-text-style.mkv','-i','build/subtitle-dense-ass.ass','-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','ass','build/subtitle-dense-ass.mkv']);
}
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const cases=[['srt','build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',[[1,'deadline']]],['mov_text','build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4',[[1,'deadline']]],['static-ass','results/subtitle-stack-upgrade/same-text-style.mkv',[[3.5,'deadline'],[4.5,'deadline'],[5.5,'deadline']]],['mixed-ass','build/subtitle-mixed-animated.mkv',[[2,'deadline'],[4.5,'animated'],[7.5,'deadline'],[10.5,'animated'],[13.5,'deadline'],[16.5,'animated'],[19.5,'deadline'],[22.5,'animated'],[25.5,'deadline']]],['large-ass','build/subtitle-large-ass.mkv',[[3.5,'deadline'],[11.5,'deadline'],[30.5,'deadline'],[32.5,'deadline']]],['dense-ass','build/subtitle-dense-ass.mkv',[[4.5,'fallback']]],['pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv',[[1,'deadline'],[2,'deadline'],[3,'deadline'],[4,'deadline'],[5,'deadline'],[6,'deadline']]],['vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv',[[1,'deadline'],[33,'deadline'],[35.5,'deadline']]]];
try{
 for(const [name,file,points] of cases.filter(([name])=>process.env.SUBTITLE_CASE?process.env.SUBTITLE_CASE===name:name!=='dense-ass'))for(const lane of ['direct','remux'].filter(lane=>!process.env.SUBTITLE_LANE||process.env.SUBTITLE_LANE===lane)){
  const page=await browser.newPage();
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
   await page.locator('#media').setInputFiles(file);await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),lane==='direct'?'native-direct-mpv':'native-remux-mpv');
   for(const [pts,expected] of points){
    await page.evaluate(pts=>player.seek(pts),pts);await page.waitForTimeout(180);
    const got=await page.evaluate(async()=>{const sub=player.current.backend.mpvSubs,snapshot=await sub.timingSnapshot();const c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return {mode:snapshot.visual.mode,scheduler:sub.stats.scheduler,pixels,avChains:sub.service.avChains,time:player.state.currentTime};});
    assert.equal(got.mode,expected,`${name}/${lane}/${pts}: ${JSON.stringify(got)}`);assert.equal(got.scheduler,expected==='fallback'?'frame':expected,`${name}/${lane}/${pts}: ${JSON.stringify(got)}`);assert.equal(got.avChains,0);
    if(name==='large-ass')assert.equal(got.pixels>0,pts<11||pts>30&&pts<32);
    console.log(name,lane,pts,JSON.stringify(got));
   }
   if(name==='mixed-ass'){
    const sample=async pts=>{
     await page.evaluate(pts=>player.seek(pts),pts);await page.waitForTimeout(180);
     return page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,alpha=0,red=0,green=0,x=0;for(let i=0;i<d.length;i+=4)if(d[i+3]){pixels++;alpha+=d[i+3];red+=d[i];green+=d[i+1];x+=(i/4)%c.width;}return {pixels,alpha,red,green,centroidX:pixels?x/pixels:0};});
    };
    const progression={fade:[await sample(4.2),await sample(4.8)],move:[await sample(10.2),await sample(10.8)],transform:[await sample(16.2),await sample(17.3)],karaoke:[await sample(22.2),await sample(23.3)]};
    console.log('animation-progression',lane,JSON.stringify(progression));
    assert.ok(progression.fade[1].alpha>progression.fade[0].alpha,JSON.stringify(progression.fade));
    assert.ok(progression.move[1].centroidX>progression.move[0].centroidX+30,JSON.stringify(progression.move));
    assert.notEqual(progression.transform[0].pixels,progression.transform[1].pixels);
    assert.notEqual(progression.karaoke[0].green,progression.karaoke[1].green);
    await page.evaluate(()=>player.seek(4.5));await page.waitForTimeout(180);
    const beforeResize=await page.evaluate(()=>player.current.backend.mpvSubs.stats.renders);
    await page.evaluate(()=>{const v=player.current.backend.mpvSubs.video;v.style.width='480px';v.style.height='270px';});
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(before=>player.current.backend.mpvSubs.stats.renders>before,beforeResize),'paused animated resize did not render');
    await page.evaluate(()=>{const v=player.current.backend.mpvSubs.video;v.style.width='';v.style.height='';});
   }
   if(name==='mixed-ass'){
    await page.evaluate(()=>player.seek(3.4));await page.evaluate(rate=>player.setPlaybackRate(rate),Number(process.env.TEST_RATE??1));await page.evaluate(()=>player.play());
    const modes=[];
    for(const target of [3.7,4.4,4.9,6.3]){
     await page.waitForFunction(target=>player.state.currentTime>=target,target,{timeout:10000});
     modes.push(await page.evaluate(()=>({time:player.state.currentTime,mode:player.current.backend.mpvSubs.stats.scheduler,renders:player.current.backend.mpvSubs.stats.renders})));
    }
    assert.deepEqual(modes.map(x=>x.mode),['deadline','animated','animated','deadline'],JSON.stringify(modes));
    assert.ok(modes[2].renders-modes[1].renders>=8,JSON.stringify(modes));
    console.log('mixed-transition',lane,JSON.stringify(modes));
    await page.evaluate(()=>player.pause());
   }
   if((name==='pgs'||name==='vobsub')&&!process.env.SKIP_NATURAL){
    await page.evaluate(pts=>player.seek(pts),name==='pgs'?.3:33);await page.evaluate(()=>player.play());
    await page.waitForFunction(()=>player.state.currentTime>=34.5,null,{timeout:45000});
    const before=await page.evaluate(async()=>{const sub=player.current.backend.mpvSubs,s=sub.stats,c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return {renders:s.renders,mode:s.scheduler,pixels,time:player.state.currentTime,visual:(await sub.timingSnapshot()).visual,service:sub.service.scheduler};});
    await page.waitForFunction(()=>player.state.currentTime>=35.55,null,{timeout:10000});
    const after=await page.evaluate(async()=>{const sub=player.current.backend.mpvSubs,s=sub.stats,c=document.querySelector('.demuxe-native-ass'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;for(let i=3;i<d.length;i+=4)if(d[i])pixels++;return {renders:s.renders,mode:s.scheduler,pixels,time:player.state.currentTime,visual:(await sub.timingSnapshot()).visual,service:sub.service.scheduler};});
    console.log('bitmap-clear',name,lane,JSON.stringify({before,after}));
    assert.equal(before.mode,'deadline');assert.ok(before.pixels>0,JSON.stringify({before,after}));assert.equal(after.mode,'deadline');assert.equal(after.pixels,0);assert.ok(after.renders-before.renders>=1&&after.renders-before.renders<=4,JSON.stringify({before,after}));
    await page.evaluate(()=>player.pause());
   }
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
