// SPDX-License-Identifier: Apache-2.0
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const family=process.env.BROWSER??'chrome',out=`results/mpv-external-subtitles/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
const base=out+'/base.mp4',embedded=out+'/embedded.mkv',sub=out+'/embedded.srt';
await writeFile(sub,'1\n00:00:00,000 --> 00:00:08,000\nEMBEDDED CUE\n');
const ff=args=>execFileSync('ffmpeg',['-v','error','-y',...args]);
ff(['-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','8','-c:v','libx264','-g','24','-bf','2','-c:a','aac',base]);
ff(['-i',base,'-i',sub,'-map','0','-map','1','-c','copy',embedded]);
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report={browser:browser.version(),runtimeRoot:process.env.DEMUXE_RUNTIME_ROOT??'.',fixtures:{},cases:[]};
for(const file of [base,embedded,'fixtures/qualification.ass'])report.fixtures[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const scenarios=family==='firefox'?[['off',true],['asyncify',false]]:[['off',true],['jspi',true],['jspi',false],['asyncify',true],['asyncify',false]];
try{for(const [runtime,isolated] of scenarios.filter(([runtime])=>!process.env.RUNTIME||runtime===process.env.RUNTIME))for(const source of ['plain','embedded']){
 const item={runtime,isolated,source,requests:[],errors:[]};report.cases.push(item);
 const server=await serve({pagePath:'tests/mpv-external-subtitles.html',isolated,assetRoot:process.env.DEMUXE_RUNTIME_ROOT??'.',mediaPaths:{subtitle:'fixtures/qualification.ass',movie:source==='plain'?base:embedded}}),page=await browser.newPage();page.setDefaultTimeout(30000);
 page.on('request',r=>{if(/engine-|subtitle-worker/.test(r.url()))item.requests.push(new URL(r.url()).pathname);});
 page.on('pageerror',e=>item.errors.push(String(e)));
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async({runtime,source})=>{
   const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{remuxRuntime:runtime});
   await player.open(new File([await(await fetch('/media/movie')).arrayBuffer()],source==='plain'?'movie.mp4':'movie.mkv'));
   if(source==='embedded')window.embeddedId=player.state.subtitleTracks.find(t=>!t.external)?.id;
   await player.addSubtitle(new File([await(await fetch('/media/subtitle')).arrayBuffer()],'external.ass'),{select:false});
   const external=player.state.subtitleTracks.find(t=>t.external);
   if(external.selected)throw Error('Unselected attachment changed the selected track');
   await player.selectSubtitleTrack(external.id);
   await player.seek(2.25);
  },{runtime,source});
  await page.waitForFunction(()=>{const s=player.current.backend.mpvSubs,c=s?.canvas;return c&&s.stats.position>=2.2&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});
  item.initial=await page.evaluate(()=>({diagnostics:player.diagnostics,tracks:player.state.subtitleTracks,canvases:document.querySelectorAll('.demuxe-native-ass').length}));
  assert.equal(item.initial.canvases,1);assert.equal(item.initial.diagnostics.backend.mpvSubtitles.avChains,0);
  assert.equal(item.initial.diagnostics.plan.owners.subtitle,'mpv-subtitle-service');
  if(runtime!=='off')assert.equal(item.initial.diagnostics.backend.mpvSubtitles.privateRuntime.memory,'ArrayBuffer');
  item.selection=await page.evaluate(async source=>{
   const first=player.state.subtitleTracks.find(t=>t.external).id;
   await player.addSubtitle(new File(['1\n00:00:00,000 --> 00:00:08,000\nSECOND CUE\n'],'second.srt'),{select:false});
   const preserved=player.state.subtitleTracks.find(t=>t.selected)?.id;
   const second=player.state.subtitleTracks.find(t=>t.label==='second.srt').id;
   await player.selectSubtitleTrack(second);
   const text=await player.current.backend.mpvSubs.currentText();
   let embeddedText;
   if(source==='embedded'){await player.selectSubtitleTrack(embeddedId);embeddedText=await player.current.backend.mpvSubs.currentText();await player.selectSubtitleTrack(second);}
   const before=player.current.backend;let error;
   try{await player.addSubtitle(new File(['invalid subtitle data'],'bad.ass'));}catch(e){error=String(e);}
   return {first,preserved,text,embeddedText,error,same:before===player.current.backend,selected:player.state.subtitleTracks.find(t=>t.selected)?.id,second};
  },source);
  assert.equal(item.selection.first,item.selection.preserved);assert.match(item.selection.text,/SECOND CUE/);
  if(source==='embedded')assert.match(item.selection.embeddedText,/EMBEDDED CUE/);
  assert.match(item.selection.error,/Invalid external subtitle/);assert.equal(item.selection.same,true);assert.equal(item.selection.selected,item.selection.second);
  await page.evaluate(async()=>{
   await player.addSubtitle(new File(['WEBVTT\n\n00:00:00.000 --> 00:00:08.000\n<b>RICH VTT</b>\n'],'rich.vtt'));
   await player.seek(3);
  });
  assert.match(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),/RICH VTT/);
  await page.evaluate(async()=>{await player.subtitleVisible(false);});assert.equal(await page.locator('.demuxe-native-ass').isVisible(),false);
  await page.evaluate(async()=>{await player.subtitleVisible(true);await player.addFont(new File([await(await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer()],'custom.ttf'));await player.play();});
  await page.waitForFunction(()=>player.state.currentTime>3.25&&player.surface.getVideoPlaybackQuality().totalVideoFrames>3);
  assert.match(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),/RICH VTT/);
  assert.equal(await page.locator('.demuxe-native-ass').count(),1);
  await page.evaluate(()=>player.destroy());
  for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);
  assert.equal(page.workers().length,0);assert.equal(await page.locator('.demuxe-native-ass').count(),0);
  assert.ok(!item.requests.some(p=>p.includes('engine-ass')||p.includes('native-ass-worker')));assert.deepEqual(item.errors,[]);item.passed=true;
 }catch(error){item.error=String(error.stack??error);item.diagnostics=await page.evaluate(()=>player?.diagnostics).catch(()=>null);process.exitCode=1;}
 finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(runtime,isolated,source,item.passed?'PASS':item.error);}
}}finally{report.browserCleanup=await closeTestBrowser(browser,family);await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(out);}
