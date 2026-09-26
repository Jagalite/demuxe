// SPDX-License-Identifier: Apache-2.0
// Production Auto, opt-out and missing-engine fallback. Existing frozen fixtures.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,delay} from './head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
const out=process.env.OUT;assert.ok(out);await mkdir(out,{recursive:false});
const manifest=JSON.parse(await readFile(process.env.FIXTURES??'build/audio-transcode-formats-fixtures-04/combined-manifest.json'));
const files=Object.fromEntries(manifest.cases.filter(c=>!c.returnCode).map(c=>[c.id,c.file]));
const table='build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures';
files.layout='build/audio-transcode-integration-fixtures/layout-31.mkv';
files.clipping='build/audio-transcode-integration-fixtures/clipping.mkv';files.tracks='build/audio-transcode-integration-fixtures/tracks.mkv';
files.pgs=table+'/hevc-pgs/index.mkv';files.h264=table+'/h264-ac3/index.mkv';
const trials=[['ac3','auto'],['truehd','auto'],['eac3-51','auto'],['flac-71','auto'],['vorbis','auto'],['ac3','worklet'],['ac3','missing'],['aac','auto'],['pgs','auto'],['h264','auto'],['ac3','local'],['ac3','old'],['clipping','auto'],['tracks','auto'],['layout','auto']].filter(([id,policy])=>!process.env.CASES||process.env.CASES.split(',').includes(id+'/'+policy));
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:files});let browser;
const result={runtime:{},trials:[]};
for(const f of ['web/generated/unified-player.js','web/generated/internal/playback-plans.js','web/native-remux-worker.js','web/engine-adaptation/remux.wasm'])result.runtime[f]=createHash('sha256').update(await readFile(f)).digest('hex');
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
try{
 const launch=await launchBenchmarkChrome({headless:false,startupGate:false});browser=launch.browser;result.browser=launch.identity;
 for(const [id,policy] of trials){
  const trial={id,policy,fixture:files[id],fixtureSHA256:createHash('sha256').update(await readFile(files[id])).digest('hex'),errors:[],phases:[]};result.trials.push(trial);console.log('START',id,policy);
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>trial.errors.push(String(e)));
  try{
   if(policy==='old')await context.route('**/engine-adaptation/remux.*',async route=>{const ext=new URL(route.request().url()).pathname.endsWith('.wasm')?'wasm':'mjs';await route.fulfill({contentType:ext==='wasm'?'application/wasm':'text/javascript',body:await readFile('build/audio-transcode-production-01/previous-served-engine/remux.'+ext)});});
   if(policy==='missing')await context.route('**/engine-adaptation/*',r=>r.fulfill({status:404,body:'Unavailable'}));
   await page.addInitScript(installAudioProbe);
   const cdp=await context.newCDPSession(page);await cdp.send('Media.enable');trial.media=[];cdp.on('Media.playerPropertiesChanged',e=>trial.media.push(e));
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   await page.evaluate(async({id,policy})=>{
    window.failures=[];const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{audioPlayback:policy==='worklet'?'worklet':'auto',nativeRemux:id==='clipping'?'always':'auto'});
    player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    const source=policy==='local'?new File([await (await fetch('/media/'+id)).arrayBuffer()],'fixture.mkv'):{url:'/media/'+id,format:'file'};
    await player.open(source);Object.defineProperty(window,'video',{get:()=>player.current.backend.video});
    await player.play();
   },{id,policy});
   const expected=policy==='worklet'||policy==='missing'||policy==='old'||id==='clipping'||id==='layout'?'native-video-mpv-audio':id==='pgs'?'native-transcode-mpv':['aac','flac-71','vorbis'].includes(id)?undefined:'native-transcode';
   const phase=async label=>{const s=await page.evaluate(()=>({plan:player.diagnostics.plan.id,time:player.state.currentTime,status:player.state.status,duration:player.state.duration,backend:player.diagnostics.backend,failures,tracks:player.state.audioTracks,subtitles:player.state.subtitleTracks}));trial.phases.push({label,state:s});if(expected)assert.equal(s.plan,expected);else assert.ok(['native-remux','native-direct'].includes(s.plan));assert.deepEqual(s.failures,[]);return s;};
   await page.waitForFunction(()=>player.state.currentTime>1);await phase('start');
   trial.selection=await page.evaluate(()=>player.diagnostics.selection);if(id==='layout')assert.match(JSON.stringify(trial.selection),/canonical FLAC speaker layout/);if(id==='clipping')assert.match(JSON.stringify(trial.selection),/PCM exceeds FLAC range/);
   await page.evaluate(async()=>{if(player.diagnostics.plan.id.startsWith('native-transcode'))await urlAudioProbe.observeVideo(video);});await delay(250);
   trial.audio=await page.evaluate(()=>urlAudioProbe.sample());if(id==='ac3')assert.ok([440,880].every((hz,c)=>trial.audio.some(a=>a.channel===c&&a.rms>.01&&Math.abs(a.hz-hz)<30)));
   await page.evaluate(()=>player.pause());const paused=await phase('pause');await delay(250);assert.ok(Math.abs((await phase('paused')).time-paused.time)<.1);
   for(const t of [8,2]){await page.evaluate(async t=>{await player.seek(t);await player.play();},t);await page.waitForFunction(t=>player.state.currentTime>t+.25,t);await phase('seek-'+t);}
   await page.evaluate(async()=>{await player.pause();await player.seek(3);});const seek=await phase('paused-seek');assert.ok(Math.abs(seek.time-3)<.2);assert.equal(seek.status,'paused');
   if(id==='tracks'){
    const selected=await page.evaluate(async()=>{const t=player.state.audioTracks.find(t=>t.title==='PCM24');await player.selectAudioTrack(t.id);return player.state.audioTracks.find(t=>t.selected);});
    assert.equal(selected.title,'PCM24');assert.equal(selected.streamIndex,2);await phase('alternate-audio');
    await page.evaluate(async()=>{await urlAudioProbe.observeVideo(video);await player.play();});await delay(500);trial.alternateAudio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok([550,990].every((hz,c)=>trial.alternateAudio.some(a=>a.channel===c&&a.rms>.01&&Math.abs(a.hz-hz)<30)));await page.evaluate(()=>player.pause());
   }
   if(id==='pgs'){
    await page.waitForFunction(()=>{const c=document.querySelector('.demuxe-native-ass');return c&&Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((v,i)=>i%4===3&&v>0);});
    assert.equal(seek.backend.mpvSubtitles.avChains,0);
   }
   await page.evaluate(async()=>{await player.seek(player.state.duration-1.2);await player.play();});await page.waitForFunction(()=>player.state.status==='ended',undefined,{timeout:15000});await phase('EOF');
   await page.evaluate(async()=>{await player.seek(2);await player.play();});await page.waitForFunction(()=>player.state.currentTime>2.3);await phase('replay');
   const props=Object.fromEntries(trial.media.flatMap(e=>e.properties??[]).map(p=>[p.name,p.value]));trial.decoderProperties=props;assert.equal(props.kVideoDecoderName,'VideoToolboxVideoDecoder');
   if(expected?.startsWith('native-transcode')){assert.equal(JSON.parse(props.kAudioTracks)[0].codec,'flac');assert.ok(!page.workers().some(w=>w.url().includes('engine-selective')));}
   await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});await delay(250);assert.equal(page.workers().length,0);assert.deepEqual(trial.errors,[]);trial.accepted=true;console.log('PASS',id,policy);
  }catch(e){trial.error=String(e.stack);trial.failure=await page.evaluate(()=>({state:window.player?.state,diagnostics:window.player?.diagnostics})).catch(()=>null);console.log('FAIL',id,policy,trial.error);}
  finally{await save();await context.close();}
 }
}finally{await browser?.close();await server.close();await save();}
assert.ok(result.trials.length&&result.trials.every(t=>t.accepted),'Failed trials retained: '+out);
