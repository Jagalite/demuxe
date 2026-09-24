// SPDX-License-Identifier: Apache-2.0
// Focused browser contract for the maintained mpv timing adaptation.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const dir='build/subtitle-raw-timing-tests';
await mkdir(dir,{recursive:true});
const sources={
 overlap:`1\n00:00:01,000 --> 00:00:06,000\nLong\n\n2\n00:00:02,000 --> 00:00:03,000\nShort\n`,
 late:`1\n00:00:01,000 --> 00:00:04,000\nFirst\n\n2\n00:03:20,000 --> 00:03:30,000\nSecond\n\n3\n00:06:20,000 --> 00:06:30,000\nThird\n`,
 styled:`[Script Info]\nScriptType: v4.00+\nPlayResX: 640\nPlayResY: 360\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Long,DejaVu Sans,40,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\nStyle: Short,DejaVu Sans,40,&H000000FF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,8,10,10,10,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:03.00,0:00:11.00,Long,,0,0,0,,Same\nDialogue: 0,0:00:04.00,0:00:05.00,Short,,0,0,0,,Same\n`
};
for(const [name,data] of Object.entries(sources)){
 const ext=name==='styled'?'ass':'srt';await writeFile(`${dir}/${name}.${ext}`,data);
 const cmd=['-y','-loglevel','error','-f','lavfi','-i','color=c=black:s=64x64:r=1','-i',`${dir}/${name}.${ext}`,'-map','0:v','-map','1:s','-t',name==='late'?'400':'14','-c:v','libx264','-preset','ultrafast','-crf','40','-c:s',name==='styled'?'ass':'srt',`${dir}/${name}.mkv`];
 const built=spawnSync('ffmpeg',cmd,{encoding:'utf8'});if(built.status!==0)throw Error(`ffmpeg fixture ${name}: ${built.stderr}`);
}
// Public sub-lines remains on the original dedup path. This source assertion
// catches accidental removal even when same-text events look identical visually.
const mpvPatch=await readFile('patches/0014-subtitle-raw-timing.patch','utf8');
assert.doesNotMatch(mpvPatch,/^[+-].*dedup_sub_lines/m);
const archived=spawnSync('tar',['-xOzf','build/downloads/mpv.tar.gz','mpv-2a4eb8067ca68ec19adf23daf8ccbb1a05afd6ed/sub/dec_sub.c'],{encoding:'utf8'});
assert.equal(archived.status,0);
const publicLines=source=>source.match(/static void dedup_sub_lines\(.*?struct sub_lines \*sub_get_lines\(.*?\n}\n/s)?.[0];
assert.equal(publicLines(await readFile('build/sources/mpv/sub/dec_sub.c','utf8')),publicLines(archived.stdout),'public sub-lines dedup implementation changed');
const archivedAss=spawnSync('tar',['-xOzf','build/downloads/mpv.tar.gz','mpv-2a4eb8067ca68ec19adf23daf8ccbb1a05afd6ed/sub/sd_ass.c'],{encoding:'utf8'});
assert.equal(archivedAss.status,0);
const publicAssLines=source=>source.match(/static struct sub_lines \*get_lines\(.*?(?=static int control\()/s)?.[0];
assert.equal(publicAssLines(await readFile('build/sources/mpv/sub/sd_ass.c','utf8')),publicAssLines(archivedAss.stdout),'public ASS sub-lines extraction changed');
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(()=>{
  const input=document.createElement('input');input.id='subtitle-timing-file';input.type='file';document.body.append(input);
  window.timingEvents=[];window.pendingTiming=new Map();window.timingId=0;window.timingRenders=0;
  window.subtitleTimingWorker=new Worker('/web/mpv-subtitle-worker.js',{type:'module'});
  subtitleTimingWorker.onmessage=({data})=>{
   if(data.type==='subtitleTimingChanged'){timingEvents.push(data.epoch);return;}
   const pending=pendingTiming.get(data.id);if(!pending)return;
   pendingTiming.delete(data.id);if(data.bitmap)data.bitmap.close();
   data.error?pending.reject(Error(data.error)):pending.resolve(data);
  };
  window.timingRpc=(type,details={})=>new Promise((resolve,reject)=>{
   if(type==='render')timingRenders++;
   const id=++timingId;pendingTiming.set(id,{resolve,reject});subtitleTimingWorker.postMessage({id,type,...details});
   setTimeout(()=>{if(pendingTiming.delete(id))reject(Error('timing RPC timeout: '+type));},20000);
  });
 });
 const font=await page.evaluate(async()=>Array.from(new Uint8Array(await (await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer())));
 let selectedId;
 async function open(name){
  await page.locator('#subtitle-timing-file').setInputFiles(`${dir}/${name}.mkv`);
  const result=await page.evaluate(font=>timingRpc('init',{file:document.querySelector('#subtitle-timing-file').files[0],fonts:[{name:'DejaVuSans.ttf',bytes:new Uint8Array(font)}]}),font);
  assert.ok(result.tracks.length,`${name} subtitle track`);
  selectedId=result.tracks[0].mpvId;
  await page.evaluate(id=>timingRpc('select',{trackId:id}),selectedId);
 }
 async function query(pts){return page.evaluate(async pts=>{
  const result=await timingRpc('timing',{seconds:pts});return {...result,notifications:timingEvents.slice()};
 },pts);}
 async function render(pts){await page.evaluate(pts=>timingRpc('render',{seconds:pts,width:640,height:360}),pts);}
 async function close(){await page.evaluate(()=>subtitleTimingWorker.postMessage({type:'close'}));await page.waitForTimeout(150);}
 async function fresh(){await page.evaluate(()=>{
  window.timingEvents=[];window.pendingTiming=new Map();window.timingId=0;
  window.subtitleTimingWorker=new Worker('/web/mpv-subtitle-worker.js',{type:'module'});
  subtitleTimingWorker.onmessage=({data})=>{
   if(data.type==='subtitleTimingChanged'){timingEvents.push(data.epoch);return;}
   const pending=pendingTiming.get(data.id);if(!pending)return;
   pendingTiming.delete(data.id);data.bitmap?.close();data.error?pending.reject(Error(data.error)):pending.resolve(data);
  };
 });}
 await open('overlap');await render(2.2);
 let t=await query(2.2);assert.equal(t.supported,true);assert.ok(Math.abs(t.next-3)<.03,JSON.stringify(t));assert.equal(t.avChains,0);
 console.log('PASS overlapping SRT raw next boundary',t.next);
 await close();await fresh();await open('styled');await render(4.2);
 t=await query(4.2);assert.ok(Math.abs(t.next-5)<.03,JSON.stringify(t));assert.equal(t.avChains,0);
 console.log('PASS same-text/different-style ASS hidden 5s boundary',t.next);
 const before=t.epoch;
 await page.evaluate(()=>timingRpc('seek',{seconds:6}));t=await query(6);assert.ok(t.epoch>before,'seek invalidates native epoch');
 await render(6);t=await query(6);assert.ok(Math.abs(t.next-11)<.03,'seek must rebuild authoritative timing');
 const afterSeek=t.epoch;
 await page.evaluate(()=>timingRpc('select',{trackId:-2}));t=await query(6);assert.ok(t.epoch>afterSeek&&!t.supported,'track reset invalidates timing');
 await page.evaluate(id=>timingRpc('select',{trackId:id}),selectedId);
 await render(4.2);t=await query(4.2);assert.ok(Math.abs(t.next-5)<.03,'track reselect rebuilds raw timing');
 await close();await fresh();await open('late');await render(5);
 const initial=await query(5);assert.equal(initial.avChains,0);
 const notifications=initial.notifications.length;
 await render(6.1);
 const renders=await page.evaluate(()=>timingRenders);
 const later=await query(210);assert.ok(later.epoch>=initial.epoch);
 assert.ok(later.notifications.length>notifications,'newly decoded event notifies without a notification-triggered render');
 assert.equal(await page.evaluate(()=>timingRenders),renders,'timing notification must not request a render');
 console.log('PASS late decode notification',initial,later);
 await close();
 console.log('PASS maintained timing bridge; production frame scheduler remains unchanged');
}finally{await browser.close();await server.close();}
