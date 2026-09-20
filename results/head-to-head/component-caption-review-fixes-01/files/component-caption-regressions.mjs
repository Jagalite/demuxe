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
for(const name of ['component-caption-regressions.mjs','server.mjs','harness.html','adapters.mjs','checks.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
await fs.writeFile(path.join(out,'assets-manifest.json'),bytes);
const server=await serve(assets,path.join(out,'files'),path.join(out,'requests.jsonl'));
const result={command:process.argv,startedAt:new Date().toISOString(),assetsSHA256:sha(bytes)};
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/harness.html');
 result.checks=[];
 for(const remux of [false,true]){
  const checks=await page.evaluate(async remux=>{
   const {Player}=await import('/demuxe/web/generated/index.js');
   const p=new Player(document.querySelector('#stage'),{assetBase:'/demuxe/',...(remux?{nativeRemux:'always'}:{})});
   const checks=[],urls=[];
   const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push((remux?'remux: ':'direct: ')+label);};
   const caption=text=>'WEBVTT\n\n00:00.000 --> 00:35.000\n'+text+'\n';
   const source=new URL('/fixtures/h264-vtt/index.mp4',location.href).href;
   const selected=()=>p.state.subtitleTracks.find(t=>t.selected);
   try{
    await p.ready;await p.open(source);
    await p.addSubtitle(new File([caption('Trailing \t  ')],'space.vtt'));
    await p.seek(1);
    ok(p.mode==='native'&&Array.from(p.surface.textTracks[0].cues)[0].text==='Trailing \t  ','trailing cue whitespace survives browser verification');
    await p.open(source);
    for(const text of ['FIRST','SECOND']){
     const src=URL.createObjectURL(new Blob([caption(text)],{type:'text/vtt'}));urls.push(src);
     await p.addTextTrack({src,label:text,default:text==='FIRST'});
    }
    const ids=p.state.subtitleTracks.map(t=>t.id);
    await p.selectSubtitleTrack(ids[1]);
    await p.addSubtitle(new File([caption('FILE')],'file.vtt'),{select:false});
    ok(selected()?.id===ids[1]&&selected()?.label==='SECOND','unselected file preserves second browser track identity');
    ok(p.state.subtitleTracks.find(t=>t.label==='FIRST').id===ids[0],'first browser track ID also remains stable');
    await p.selectSubtitleTrack(ids[0]);
    await p.addSubtitle(new File([caption('OTHER FILE')],'other.vtt'),{select:false});
    ok(selected()?.id===ids[0]&&selected()?.label==='FIRST','multiple file attachments preserve first browser track');
    const file=p.state.subtitleTracks.find(t=>t.label==='file.vtt');await p.selectSubtitleTrack(file.id);
    const src=URL.createObjectURL(new Blob([caption('THIRD')],{type:'text/vtt'}));urls.push(src);await p.addTextTrack({src,label:'THIRD'});
    await p.addSubtitle(new File([caption('LAST FILE')],'last.vtt'),{select:false});
    ok(selected()?.id===file.id&&selected()?.label==='file.vtt','file selection survives additional URL and file tracks');
    await p.seek(1);const shown=Array.from(p.surface.textTracks).filter(t=>t.mode==='showing');
    ok(shown.length===1&&shown[0].activeCues[0].text==='FILE','selected identity matches actual displayed cue');
   }finally{await p.destroy();for(const url of urls)URL.revokeObjectURL(url);}
   return checks;
  },remux);result.checks.push(...checks);
 }
 await page.close();
 result.fallbacks=[];
 for(const fault of ['csp','cue-mismatch','aborted','permission']){
  const tab=await browser.newPage({viewport:{width:960,height:540}});await tab.goto(server.origin+'/harness/harness.html');await tab.waitForFunction(()=>window.api);
  await tab.evaluate(async fault=>{
   const {NativePlayer}=await import('/demuxe/web/generated/internal/native-player.js');
   const {PlayerError}=await import('/demuxe/web/generated/internal/errors.js');
   if(fault==='csp'){const meta=document.createElement('meta');meta.httpEquiv='Content-Security-Policy';meta.content="media-src 'self'";document.head.append(meta);return;}
   const original=NativePlayer.prototype.loadTextTrack;
   NativePlayer.prototype.loadTextTrack=async function(...args){
    if(args[1]&&fault!=='cue-mismatch')throw new PlayerError(fault==='aborted'?'ABORTED':'SOURCE_PERMISSION','Injected terminal caption operation');
    const track=await original.apply(this,args);
    if(args[1]){track.track.mode='hidden';track.track.cues[0].text='Wrong cue';}
    return track;
   };
  },fault);
  const config=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')))['h264-vtt'];
  const entry={fault};result.fallbacks.push(entry);
  try{await tab.evaluate(c=>api.start(c),{...config,id:'demuxe.auto.h264-vtt',player:'demuxe',lane:'auto',correctness:true});entry.accepted=true;}catch(error){entry.accepted=false;entry.error=String(error);}
  entry.state=await tab.evaluate(()=>api.snapshot());
  if(['csp','cue-mismatch'].includes(fault)){
   assert.equal(entry.accepted,true,entry.error);assert.equal(entry.state.route,'hybrid');
   await tab.waitForTimeout(800);entry.state=await tab.evaluate(()=>api.snapshot());
   const {markedAudio,markedImage}=await import('./checks.mjs');
   assert.ok(markedAudio(entry.state),'Fallback retains selected stereo audio');
   const png=await tab.locator('#stage').screenshot({path:path.join(out,fault+'.png')});assert.ok(markedImage(png,entry.state.position).markerCorrect);
   assert.ok(entry.state.diagnostics.backend.subtitles.parts>0,'Fallback renders subtitle bitmap');
   assert.ok(entry.state.selectionTrace.some(a=>a.mode==='native'&&a.outcome==='failed'),'Native incompatibility recorded');
  }else{
   assert.equal(entry.accepted,false);assert.equal(entry.state.diagnostics.mode,'native');
   assert.ok(!entry.state.selectionTrace.some(a=>a.mode==='hybrid'),'Terminal errors do not select Hybrid');
  }
  entry.cleanup=await tab.evaluate(()=>api.stop());assert.equal(entry.cleanup.remainingSurfaces,0);await tab.waitForTimeout(300);assert.equal(tab.workers().length,0);await tab.close();
 }
 result.passed=true;
}catch(e){result.passed=false;result.error=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await server.close();result.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');}
console.log(JSON.stringify({passed:result.passed,error:result.error,checks:result.checks,faults:result.fallbacks?.map(f=>({fault:f.fault,accepted:f.accepted,route:f.state?.route})),output:out},null,2));
