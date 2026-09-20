// SPDX-License-Identifier: Apache-2.0
// Public API lifecycle qualification for the narrowly admitted plain WebVTT route.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
const [assetArg,outArg,remux]=process.argv.slice(2),assets=path.resolve(assetArg),out=path.resolve(outArg);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes);
for(const [name,value] of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
await fs.mkdir(out,{recursive:false});await fs.mkdir(path.join(out,'files'),{recursive:true});
for(const name of ['component-captions.mjs','server.mjs','harness.html','adapters.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
await fs.writeFile(path.join(out,'assets-manifest.json'),bytes);
const server=await serve(assets,path.join(out,'files'),path.join(out,'requests.jsonl'));
const result={command:process.argv,startedAt:new Date().toISOString(),assetsSHA256:sha(bytes)};
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/harness.html');
 result.checks=await page.evaluate(async remux=>{
  const {Player}=await import('/demuxe/web/generated/index.js');
  const live=new Set(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=b=>{const u=create(b);live.add(u);return u;};URL.revokeObjectURL=u=>{live.delete(u);revoke(u);};
  const p=new Player(document.querySelector('#stage'),{assetBase:'/demuxe/',...(remux?{nativeRemux:'always'}:{})}),checks=[];
  const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  const source=new URL('/fixtures/h264-vtt/index.mp4',location.href).href;
  const caption=(name,text)=>new File([text],name);
  const vtt='WEBVTT\n\n00:00.500 --> 00:02.000\nOne\nTwo\n\n00:01.000 --> 00:03.000\nOverlap\n';
  const video=()=>document.querySelector('#stage video');
  const active=()=>Array.from(video().textTracks).filter(t=>t.mode==='showing').flatMap(t=>Array.from(t.activeCues??[]).map(c=>c.text));
  await p.ready;await p.open(source);await p.addSubtitle(caption('a.vtt',vtt));
  ok(p.state.activeMode==='native','plain captions retain Native');
  ok(p.state.subtitleTracks[0].external,'external track identity exposed');
  for(const [time,expected] of [[.25,[]],[.75,['One\nTwo']],[1.5,['One\nTwo','Overlap']],[2.5,['Overlap']],[3.5,[]],[1.5,['One\nTwo','Overlap']]]){
    await p.seek(time);await new Promise(r=>setTimeout(r,60));ok(JSON.stringify(active())===JSON.stringify(expected),'cue text/timing at '+time);
  }
  await p.subtitleVisible(false);ok(active().length===0,'hide');await p.subtitleVisible(true);ok(active().length===2,'show');
  const old=p.state.subtitleTracks[0].id;
  await p.addSubtitle(caption('b.vtt','WEBVTT\n\n00:00.000 --> 00:35.000\nOther\n'),{select:false});
  ok(p.state.subtitleTracks[0].selected&&!p.state.subtitleTracks[1].selected,'select:false retains old caption');
  await p.selectSubtitleTrack(p.state.subtitleTracks[1].id);ok(active()[0]==='Other','public track change');
  await p.selectSubtitleTrack(old);ok(active().includes('Overlap'),'public track rewind');
  await p.play();const position=p.state.currentTime;
  await p.addSubtitle(caption('c.vtt','WEBVTT\n\n00:00.000 --> 00:35.000\nNewest\n'));ok(active()[0]==='Newest','selected addition supersedes previous public selection');
  ok(!p.state.paused&&p.state.currentTime>=position-.15,'adding while playing preserves play intent and position');await p.pause();
  const before=live.size;
  for(const f of [caption('bad.vtt','WEBVTT\n\n00:05.000 --> 00:01.000\nInvalid'),new File([new Uint8Array([255])],'bad.vtt')]){
    let rejected=false;try{await p.addSubtitle(f);}catch{rejected=true;}ok(rejected,'malformed captions rejected');
  }
  ok(live.size===before&&p.state.activeMode==='native'&&p.state.subtitleTracks.length===3,'failed caption leaves working source intact');
  await p.selectSubtitleTrack(p.state.subtitleTracks[1].id);
  const selected=p.state.subtitleTracks.find(t=>t.selected).id;
  await p.setMode('hybrid');ok(p.state.subtitleTracks.find(t=>t.selected)?.id===selected,'external identity preserved into Hybrid');
  await p.setMode('native');ok(p.state.subtitleTracks.find(t=>t.selected)?.id===selected&&active()[0]==='Other','external identity preserved back to Native');
  await p.open(source);ok(p.state.subtitleTracks.length===0&&live.size===(remux?1:0),'source replacement clears tracks and blob URLs');
  await p.addSubtitle(caption('a.vtt',vtt),{select:false});ok(!p.state.subtitleTracks.some(t=>t.selected),'first unselected attachment stays unselected');
  await p.close();ok(live.size===0,'close releases caption URL');
  await p.open(source);await p.addSubtitle(caption('a.vtt',vtt));await p.destroy();ok(live.size===0&&!document.querySelector('#stage video'),'destroy releases captions and surface');
  return checks;
 },!!remux);
 await page.waitForTimeout(300);assert.equal(page.workers().length,0);result.passed=true;
}catch(e){result.passed=false;result.error=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await server.close();result.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
