// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'..');
const out=path.resolve(process.env.OUT??`results/shaka/lifecycle-${new Date().toISOString().replaceAll(':','-')}`);
await fs.mkdir(out,{recursive:true});
const fixture=await fs.mkdtemp(path.join(repo,'build/shaka-lifecycle-'));
const commands=[];
function ff(...args){commands.push(args);execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error',...args],{stdio:'pipe'});}
for(const [name,frequency] of [['english',440],['alternate',880]]){
  await fs.mkdir(path.join(fixture,name));
  ff('-f','lavfi','-i',`sine=frequency=${frequency}:sample_rate=48000`,'-t','12','-c:a','aac','-ac','2','-hls_time','2','-hls_playlist_type','vod',path.join(fixture,name,'index.m3u8'));
}
for(const [name,size] of [['low','160x90'],['high','320x180']]){
  await fs.mkdir(path.join(fixture,name));
  ff('-f','lavfi','-i',`testsrc2=size=${size}:rate=30`,'-t','12','-c:v','libx264','-preset','ultrafast','-g','60','-sc_threshold','0','-pix_fmt','yuv420p','-hls_time','2','-hls_playlist_type','vod',path.join(fixture,name,'index.m3u8'));
}
await fs.writeFile(path.join(fixture,'captions.vtt'),'WEBVTT\n\n00:00.000 --> 00:12.000\nDEMUxe selected caption\n');
await fs.writeFile(path.join(fixture,'text.m3u8'),'#EXTM3U\n#EXT-X-TARGETDURATION:12\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:12,\ncaptions.vtt\n#EXT-X-ENDLIST\n');
await fs.writeFile(path.join(fixture,'master.m3u8'),'#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="english/index.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Alternate",LANGUAGE="fr",DEFAULT=NO,AUTOSELECT=YES,URI="alternate/index.m3u8"\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Captions",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="text.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=160x90,CODECS="avc1.42c00b,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"\nlow/index.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=320x180,CODECS="avc1.42c00c,mp4a.40.2",AUDIO="audio",SUBTITLES="subs"\nhigh/index.m3u8\n');
// EVENT remains finite while its playlists are still being updated. This
// exercises Shaka's isInProgress contract, separately from an infinite LIVE feed.
for(const name of ['english','alternate','low','high']){
  const vod=await fs.readFile(path.join(fixture,name,'index.m3u8'),'utf8');
  await fs.writeFile(path.join(fixture,name,'event.m3u8'),vod.replace('#EXT-X-PLAYLIST-TYPE:VOD','#EXT-X-PLAYLIST-TYPE:EVENT').replace('#EXT-X-ENDLIST',''));
}
const eventMaster=(await fs.readFile(path.join(fixture,'master.m3u8'),'utf8')).split('\n').filter(line=>!line.startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES')).join('\n').replaceAll(',SUBTITLES="subs"','').replaceAll('index.m3u8','event.m3u8');
await fs.writeFile(path.join(fixture,'event-master.m3u8'),eventMaster);
// A longer, small synthetic source exercises real buffer eviction. Generating it
// is cheap; playback is accelerated, not skipped or positioned near the end.
await fs.mkdir(path.join(fixture,'long'));
ff('-f','lavfi','-i','testsrc2=size=160x90:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','48','-c:v','libx264','-preset','ultrafast','-g','30','-sc_threshold','0','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-hls_time','2','-hls_playlist_type','vod',path.join(fixture,'long/index.m3u8'));
const server=await serve(repo,path.join(repo,'tests/head-to-head'),path.join(out,'requests.jsonl'),{runtimeRoot:process.env.DEMUXE_RUNTIME_ROOT});
const url=server.origin+'/'+path.relative(repo,fixture)+'/master.m3u8';
const dash=server.origin+'/build/head-to-head/assets-component-isolation-01/fixtures/dash-h264/index.mpd';
const longURL=server.origin+'/'+path.relative(repo,fixture)+'/long/index.m3u8';
const replacementURL=server.origin+'/'+path.relative(repo,fixture)+'/alternate/index.m3u8';
const eventURL=server.origin+'/'+path.relative(repo,fixture)+'/event-master.m3u8';
const liveURL=server.origin+'/build/head-to-head/assets-component-isolation-01/fixtures/hls-live/index.m3u8?lifecycle-window-race';
const family=process.env.BROWSER??'chrome';
const browser=await(family==='firefox'?firefox:chromium).launch({headless:process.env.HEADLESS==='1',...(family!=='firefox'?{...(family==='chrome'?{channel:'chrome'}:{}),args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}})});
const result={scope:'Maintained Shaka public API, policy, explicit failure injection and lifecycle; synthetic media; no performance claim',browser:browser.version(),commands,fixture,cases:[]};
const hashes={};for(const file of ['src/unified-player.ts','src/internal/shaka-backend.ts','src/internal/shaka-network.ts','src/internal/playback-plans.ts','web/resource-loader.js','web/fallback-stream-policy.js','tests/shaka-lifecycle.mjs'])hashes[file]=createHash('sha256').update(await fs.readFile(path.join(repo,file))).digest('hex');result.hashes=hashes;
async function check(name,run){if(process.env.ONLY&&!name.includes(process.env.ONLY))return;const page=await browser.newPage();page.setDefaultTimeout(30000);await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);window.livePlayerBlobURLs=new Set();URL.createObjectURL=value=>{const url=create(value);livePlayerBlobURLs.add(url);return url;};URL.revokeObjectURL=url=>{livePlayerBlobURLs.delete(url);revoke(url);};});const console=[];page.on('console',m=>console.push(m.text()));
  try{await page.goto(server.origin+'/harness/harness.html');await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#stage'));});let deadline;const evidence=await Promise.race([run(page),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Lifecycle case exceeded 45 seconds')),45000);})]).finally(()=>clearTimeout(deadline));await page.evaluate(()=>p.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);assert.equal(await page.evaluate(()=>livePlayerBlobURLs.size),0,'owned Blob URLs revoked');assert.equal(await page.locator('#stage video,#stage canvas').count(),0);result.cases.push({name,passed:true,evidence,console});process.stdout.write(`PASS ${name}\n`);}
  catch(error){result.cases.push({name,passed:false,error:String(error.stack),console,diagnostics:await page.evaluate(()=>({player:p.diagnostics,state:p.state,cancelStage:window.cancelStage,cancelCandidate:window.cancelCandidate?{stopped:cancelCandidate.stopped,opening:cancelCandidate.opening,network:cancelCandidate.policy?.diagnostics,loadMode:cancelCandidate.player?.getLoadMode()}:undefined})).catch(()=>null)});process.exitCode=1;process.stdout.write(`FAIL ${name}: ${error}\n`);}
  finally{await Promise.race([page.evaluate(()=>p.destroy()).catch(()=>{}),new Promise(r=>setTimeout(r,5000))]);await page.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}}
try{
await check('recovery qualification public retries clear after real network recovery',async page=>{
 let fail=false,failures=0;
 await page.route('**/long/index*.ts',route=>fail&&failures++===0?route.fulfill({status:503,body:'temporary outage'}):route.continue());
 await page.evaluate(async url=>{
  p.preview.enabled=false;await p.setBuffering({aheadSeconds:4,behindSeconds:2});await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});
  p.current.backend.player.configure({streaming:{retryParameters:{maxAttempts:4,baseDelay:250,backoffFactor:1,fuzzFactor:0}}});
  window.recoveryEvents=[];window.recoveryErrors=[];p.subscribe(state=>recoveryEvents.push({sourceId:state.sourceId,status:state.status,recovery:state.streaming?.recovery}));p.addEventListener('error',event=>recoveryErrors.push(event.detail));await p.play();
 },longURL);
 await page.waitForFunction(()=>p.state.currentTime>.3);fail=true;
 await page.waitForFunction(()=>recoveryEvents.some(e=>e.recovery?.status==='retrying'));
 await page.waitForFunction(()=>p.state.streaming?.recovery.status==='idle'&&p.state.currentTime>1);
 const evidence=await page.evaluate(()=>({events:recoveryEvents,errors:recoveryErrors,state:p.state,streaming:p.getStreamingState(),frames:p.surface.getVideoPlaybackQuality().totalVideoFrames}));
 assert.ok(failures>0);assert.equal(evidence.errors.length,0);assert.ok(evidence.frames>3);assert.deepEqual(evidence.streaming.recovery,{status:'idle',retryingRequests:0});
 assert.ok(evidence.events.some(e=>e.recovery?.status==='retrying'&&e.sourceId===evidence.state.sourceId));return {failures,...evidence};
});
await check('recovery qualification natural end replays genuinely evicted content',async page=>{
 let firstSegmentRequests=0;page.on('request',request=>{if(request.url()===longURL.replace('index.m3u8','index0.ts'))firstSegmentRequests++;});
 await page.evaluate(async url=>{
  p.preview.enabled=false;await p.setBuffering({aheadSeconds:6,behindSeconds:2});await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});await p.setPlaybackRate(2);await p.play();
 },longURL);
 await page.waitForFunction(()=>p.state.currentTime>10&&p.surface.buffered.length>0&&p.surface.buffered.start(0)>2);
 const evicted=await page.evaluate(()=>({time:p.state.currentTime,buffered:p.state.buffered,firstBuffered:p.surface.buffered.start(0)}));
 await page.waitForFunction(()=>p.state.status==='ended'&&p.surface.ended);
 const ended=await page.evaluate(()=>({sourceId:p.state.sourceId,time:p.state.currentTime,duration:p.state.duration,firstBuffered:p.surface.buffered.start(0),frames:p.surface.getVideoPlaybackQuality().totalVideoFrames}));
 assert.ok(ended.firstBuffered>2);assert.ok(ended.time>45);const before=firstSegmentRequests;
 await page.evaluate(async()=>{await p.setPlaybackRate(1);window.replayAudio=new AudioContext();window.replayAnalyser=replayAudio.createAnalyser();replayAnalyser.fftSize=8192;replayAudio.createMediaElementSource(p.surface).connect(replayAnalyser);replayAnalyser.connect(replayAudio.destination);await replayAudio.resume();await p.play();});
 await page.waitForFunction(()=>p.state.currentTime>.3&&p.state.currentTime<5&&!p.surface.ended&&p.surface.getVideoPlaybackQuality().totalVideoFrames>0);
 await page.waitForFunction(()=>{const x=new Float32Array(replayAnalyser.frequencyBinCount);replayAnalyser.getFloatFrequencyData(x);let best=0;for(let i=1;i<x.length;i++)if(x[i]>x[best])best=i;return x[best]>-70&&Math.abs(best*replayAudio.sampleRate/replayAnalyser.fftSize-440)<30;});
 const replayed=await page.evaluate(()=>({state:p.state,frames:p.surface.getVideoPlaybackQuality().totalVideoFrames}));await page.evaluate(()=>replayAudio.close());
 assert.equal(replayed.state.sourceId,ended.sourceId);assert.ok(firstSegmentRequests>before,'The evicted first segment must be fetched again, not replayed from a retained buffer');return {evicted,ended,replayed,firstSegmentRequestsBeforeReplay:before,firstSegmentRequests};
});
await check('recovery qualification close during backoff isolates replacement audio requests and errors',async page=>{
 let fail=false,oldRequests=0;
 page.on('request',request=>{if(request.url().includes('/long/'))oldRequests++;});
 await page.route('**/long/index*.ts',route=>fail?route.fulfill({status:503,body:'source A outage'}):route.continue());
 await page.evaluate(async url=>{
  p.preview.enabled=false;await p.setBuffering({aheadSeconds:4,behindSeconds:2});await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});
  window.oldBackend=p.current.backend;window.oldPolicy=oldBackend.policy;window.oldSurface=p.surface;window.oldSourceId=p.state.sourceId;
  oldBackend.player.configure({streaming:{retryParameters:{maxAttempts:8,baseDelay:1500,backoffFactor:1,fuzzFactor:0}}});
  window.audioCheck=new AudioContext();window.oldAnalyser=audioCheck.createAnalyser();oldAnalyser.fftSize=8192;audioCheck.createMediaElementSource(oldSurface).connect(oldAnalyser);oldAnalyser.connect(audioCheck.destination);await audioCheck.resume();await p.play();
 },longURL);
 await page.waitForFunction(()=>p.state.currentTime>.3);fail=true;
 await page.waitForFunction(()=>p.state.streaming?.recovery.status==='retrying');
 const retrying=await page.evaluate(()=>p.state);
 await page.evaluate(async()=>{window.postCloseErrors=[];window.postCloseSources=[];p.addEventListener('error',e=>postCloseErrors.push(e.detail));await p.close();p.subscribe(s=>postCloseSources.push(s.sourceId));});
 const requestsAtClose=oldRequests;
 assert.equal(await page.evaluate(()=>p.state.streaming),null);
 await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});window.newAnalyser=audioCheck.createAnalyser();newAnalyser.fftSize=8192;audioCheck.createMediaElementSource(p.surface).connect(newAnalyser);newAnalyser.connect(audioCheck.destination);await p.play();},replacementURL);
 await page.waitForFunction(()=>{
  const x=new Float32Array(newAnalyser.frequencyBinCount);newAnalyser.getFloatFrequencyData(x);let best=0;for(let i=1;i<x.length;i++)if(x[i]>x[best])best=i;
  const old=new Float32Array(oldAnalyser.fftSize);oldAnalyser.getFloatTimeDomainData(old);return x[best]>-70&&Math.abs(best*audioCheck.sampleRate/newAnalyser.fftSize-880)<30&&old.every(value=>Math.abs(value)<.001);
 });
 // Longer than two explicitly configured backoff intervals: no old attempt is
 // permitted to restart merely because its timer would otherwise have fired.
 await page.waitForTimeout(3500);
 const evidence=await page.evaluate(()=>({state:p.state,errors:postCloseErrors,sources:postCloseSources,oldSourceId,oldPaused:oldSurface.paused,oldConnected:oldSurface.isConnected,oldNetwork:oldPolicy.diagnostics,oldRecovery:oldBackend.recovery.snapshot}));
 await page.evaluate(()=>audioCheck.close());assert.equal(oldRequests,requestsAtClose);assert.equal(evidence.errors.length,0);assert.ok(evidence.sources.every(id=>id!==evidence.oldSourceId));assert.notEqual(evidence.state.sourceId,evidence.oldSourceId);assert.equal(evidence.oldPaused,true);assert.equal(evidence.oldConnected,false);assert.equal(evidence.oldNetwork.active,false);assert.equal(evidence.oldNetwork.pendingRequests,0);assert.deepEqual(evidence.oldRecovery,{status:'idle',retryingRequests:0});assert.deepEqual(evidence.state.streaming.recovery,{status:'idle',retryingRequests:0});return {retrying,requestsAtClose,oldRequests,...evidence};
});
await check('roadmap runtime quality retains audio, position, intent and attachment identity',async page=>{
 await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});await p.seek(2);},url);
 const selected=await page.evaluate(async()=>{
  const before=p.state,audio=before.mediaInfo.audio.id,qualities=p.getStreamingState().qualities;
  const low=qualities.find(q=>q.height===90);if(!low)throw Error('No low quality');await p.setQuality({mode:'manual',id:low.id});
  const manual=p.getStreamingState(),state=p.state;
  const french=state.audioTracks.find(t=>t.language==='fr');const rejected=await p.selectAudioTrack(french.id).catch(e=>e.code);
  await p.setQuality({mode:'auto',maxHeight:90,maxBandwidth:1000000});await p.selectAudioTrack(french.id);
  const automatic=p.getStreamingState(),after=p.state;
  const blob=new File(['WEBVTT\n\n00:00.000 --> 00:10.000\nExternal\n'],'external.vtt');const handle=await p.attachSubtitle(blob);
  const attached=p.state.subtitleTracks.find(t=>t.id.endsWith(handle.id));await p.removeAttachment(handle);
  return {audio,qualities,manual,state,rejected,automatic,after,attached,removed:!p.state.subtitleTracks.some(t=>t.id.endsWith(handle.id))};
 });
 assert.equal(selected.manual.requested.mode,'manual');assert.equal(selected.manual.presentedId,null);assert.equal(selected.state.mediaInfo.audio.id,selected.audio);assert.ok(Math.abs(selected.state.currentTime-2)<.15);assert.equal(selected.state.playbackIntent,'pause');assert.equal(selected.rejected,'UNSUPPORTED_FEATURE');assert.equal(selected.after.mediaInfo.audio.language,'fr');assert.equal(selected.automatic.requested.maxHeight,90);assert.ok(selected.attached);assert.equal(selected.removed,true);return selected;
});
await check('roadmap live navigation uses the backend target and retains source ownership',async page=>{
 await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{live:true,maxBandwidth:1000000}});},eventURL);
 return await page.evaluate(async()=>{const before=p.state.sourceId,range=p.getStreamingState().live.seekable;await p.seekToLive();const live=p.getStreamingState().live;if(p.state.sourceId!==before||!live.isLive||!live.nearLive)throw Error('Live navigation failed ownership or target verification');return {range,live,time:p.state.currentTime};});
});
await check('adaptive variants, audio/text selection, pause, seek and visibility',async page=>{
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:1000000}});await p.play();},url);
  await page.waitForFunction(()=>p.state.currentTime>.3);
  assert.equal(await page.evaluate(()=>p.diagnostics.plan.id),'shaka-mse');
  assert.equal(await page.evaluate(()=>p.surface.videoWidth),160);
  const buffering=await page.evaluate(()=>p.diagnostics.buffering);assert.equal(buffering.requestedProfile,'balanced');assert.equal(buffering.preload,'auto');assert.deepEqual(buffering.settings,{bufferingGoal:10,rebufferingGoal:0,bufferBehind:30});
  const tracks=await page.evaluate(()=>({audio:p.state.audioTracks,text:p.state.subtitleTracks,stream:p.diagnostics.backend.streaming}));
  assert.equal(tracks.audio.length,2);assert.ok(tracks.text.length>=1);
  await page.evaluate(async()=>{const a=p.state.audioTracks.find(t=>t.language==='fr');window.selectedFrenchId=a.id;await p.selectAudioTrack(a.id);await p.seek(3);await p.play();window.ac=new AudioContext();window.an=ac.createAnalyser();an.fftSize=8192;ac.createMediaElementSource(p.surface).connect(an);an.connect(ac.destination);await ac.resume();});
  await page.waitForFunction(()=>{const x=new Float32Array(an.frequencyBinCount);an.getFloatFrequencyData(x);let best=0;for(let i=1;i<x.length;i++)if(x[i]>x[best])best=i;return Math.abs(best*ac.sampleRate/an.fftSize-880)<30;});
  assert.equal(await page.evaluate(()=>p.state.audioTracks.find(t=>t.language==='fr').id),await page.evaluate(()=>selectedFrenchId),'Audio identity remains stable after format discovery and switching');
  await page.evaluate(async()=>{const raw=p.properties.get('track-list').find(t=>t.type==='audio'&&t.lang==='en');await p.selectTrack('audio',String(raw.id));});
  await page.waitForFunction(()=>p.state.audioTracks.some(t=>t.language==='en'&&t.selected));
  await page.evaluate(async()=>{const raw=p.properties.get('track-list').find(t=>t.type==='audio'&&t.lang==='fr');await p.selectTrack('audio',String(raw.id));});
  await page.waitForFunction(()=>p.state.audioTracks.some(t=>t.language==='fr'&&t.selected));

  await page.evaluate(async()=>{await p.pause();await p.seek(4);await p.selectSubtitleTrack(p.state.subtitleTracks[0].id);await p.subtitleVisible(true);const raw=p.properties.get('track-list').find(t=>t.type==='sub'&&t.selected);await p.selectTrack('sub',String(raw.id));});
  await page.waitForFunction(()=>Array.from(p.surface.textTracks).some(t=>t.mode==='showing'&&Array.from(t.activeCues??[]).some(c=>c.text.includes('selected caption'))));
  const on=await page.locator('#stage').screenshot({path:path.join(out,'caption-on.png')});
  await page.evaluate(()=>p.subtitleVisible(false));await page.waitForTimeout(120);
  const off=await page.locator('#stage').screenshot({path:path.join(out,'caption-off.png')});assert.notDeepEqual(on,off,'Subtitle visibility changes rendered pixels on paused frame');
  await page.evaluate(async()=>{await p.subtitleVisible(true);await p.setPlaybackRate(1.25);await p.play();});
  const start=await page.evaluate(()=>p.state.currentTime);await page.waitForTimeout(800);assert.ok(await page.evaluate(t=>p.state.currentTime-t>.7,start));
  await page.evaluate(()=>ac.close());return tracks;
});
await check('Shaka without isolation and explicit HLS source representation',async page=>{
  await page.evaluate(()=>p.destroy());
  await page.route('**/harness/harness.html',async route=>{const response=await route.fetch();const headers={...response.headers()};delete headers['cross-origin-opener-policy'];delete headers['cross-origin-embedder-policy'];await route.fulfill({response,headers});});
  await page.goto(server.origin+'/harness/harness.html');
  assert.equal(await page.evaluate(()=>crossOriginIsolated),false);
  await page.evaluate(async dash=>{const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#stage'));await p.open({url:dash,format:'dash',streaming:{live:true}});await p.play();},dash);
  await page.waitForFunction(()=>p.state.currentTime>.3&&p.surface.getVideoPlaybackQuality().totalVideoFrames>3);
  assert.equal(await page.evaluate(()=>p.diagnostics.plan.id),'shaka-mse');
  const dashEvidence=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}));
  assert.equal(dashEvidence.state.streamType,'vod');assert.ok(dashEvidence.state.duration>0,'Live permission does not hide finite VOD duration');
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{representation:'high/index.m3u8'}});await p.play();},url);
  await page.waitForFunction(()=>p.state.currentTime>.3&&p.surface.videoWidth===320);
  const hlsEvidence=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}));
  assert.equal(hlsEvidence.diagnostics.plan.id,'shaka-mse');assert.equal(hlsEvidence.diagnostics.backend.streaming.abr,false);
  assert.equal(hlsEvidence.diagnostics.backend.streaming.variants.find(v=>v.active).representation,'high/index.m3u8');
  await page.evaluate(async()=>{const french=p.state.audioTracks.find(t=>t.language==='fr');await p.selectAudioTrack(french.id);});
  await page.waitForFunction(()=>p.state.audioTracks.some(t=>t.language==='fr'&&t.selected)&&p.surface.videoWidth===320);
  const frenchEvidence=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,width:p.surface.videoWidth}));
  assert.equal(frenchEvidence.diagnostics.backend.streaming.variants.find(v=>v.active).representation,'high/index.m3u8');
  assert.equal(frenchEvidence.diagnostics.backend.streaming.abr,false);assert.equal(frenchEvidence.width,320);
  assert.equal(page.workers().length,0);return {isolated:false,dash:dashEvidence,hls:hlsEvidence,french:frenchEvidence};
});
await check('ongoing finite HLS EVENT requires live permission and publishes live state',async page=>{
  const denied=await page.evaluate(async url=>{try{await p.open({url,format:'hls',streaming:{maxBandwidth:1000000}});return {accepted:true};}catch(error){return {code:error.code,attempts:p.diagnostics.selection.attempts,state:p.state};}},eventURL);
  assert.equal(denied.code,'SOURCE_PERMISSION','Ongoing EVENT is dynamic even though Shaka isLive is false');
  assert.equal(denied.state.sourceId,null);assert.ok(!denied.attempts.some(a=>a.mode==='hybrid'||a.mode==='software'),'Live policy denial must be terminal');
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:1000000,live:true}});await p.play();},eventURL);
  await page.waitForFunction(()=>p.state.currentTime>.3&&p.surface.getVideoPlaybackQuality().totalVideoFrames>3);
  const permitted=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,shaka:{live:p.current.backend.player.isLive(),inProgress:p.current.backend.player.isInProgress(),dynamic:p.current.backend.player.isDynamic()}}));
  assert.deepEqual(permitted.shaka,{live:false,inProgress:true,dynamic:true},'Fixture must exercise finite in-progress media, not ordinary infinite live');
  assert.equal(permitted.state.streamType,'live');assert.equal(permitted.state.duration,null);assert.ok(permitted.state.seekable.length>0);assert.equal(permitted.diagnostics.plan.id,'shaka-mse');assert.equal(permitted.diagnostics.backend.streaming.live,true);
  return {denied,permitted};
});
await check('expired live seek rejects without retiring Shaka or invoking fallback',async page=>{
  // The catalogue's three-segment LIVE feed intentionally has no DVR range
  // under Shaka's default three-segment presentation delay. Expose eight of
  // the same authored segments here to give this seek regression a real window.
  const original=await fs.readFile(path.join(repo,'build/head-to-head/assets-component-isolation-01/fixtures/hls-live/index.m3u8'),'utf8');
  const segments=[...original.matchAll(/#EXTINF:([^\n]+)\n([^#\n]+)\n/g)];let started;
  await page.route(liveURL,route=>{started??=Date.now();const first=Math.min(Math.floor((Date.now()-started)/2000),Math.max(0,segments.length-8));const body='#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:'+first+'\n'+segments.slice(first,first+8).map(segment=>'#EXTINF:'+segment[1]+'\n'+segment[2]+'\n').join('');return route.fulfill({status:200,contentType:'application/vnd.apple.mpegurl',body});});
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{live:true}});await p.play();},liveURL);
  await page.waitForFunction(()=>p.state.seekable?.some(range=>range.end-range.start>1)&&p.surface.getVideoPlaybackQuality().totalVideoFrames>3);
  await page.evaluate(()=>p.pause());
  const evidence=await page.evaluate(async()=>{
    const backend=p.current.backend,media=p.surface,sourceId=p.state.sourceId,before=p.diagnostics.selection.attempts;
    const staleWindow=p.state.seekable[0],target=staleWindow.start+.1;
    const original=backend.player.seekRange.bind(backend.player);
    // Deterministically reproduce a playlist update between publication of the
    // public window and the backend's fresh validation of a queued user seek.
    backend.player.seekRange=()=>({start:target+.25,end:Math.max(staleWindow.end,target+1)});
    let error;
    try{await p.seek(target);}catch(value){error={code:value.code,message:value.message};}
    finally{backend.player.seekRange=original;}
    return {error,target,staleWindow,before,after:p.diagnostics.selection.attempts,sourceId,currentSourceId:p.state.sourceId,sameBackend:p.current.backend===backend,sameSurface:p.surface===media,failedPlans:[...(p.failedStreamingPlans.get(p.source)??[])],diagnostics:p.diagnostics};
  });
  assert.equal(evidence.error?.code,'INVALID_ARGUMENT');assert.equal(evidence.sameBackend,true);assert.equal(evidence.sameSurface,true);assert.equal(evidence.currentSourceId,evidence.sourceId);
  assert.deepEqual(evidence.failedPlans,[]);assert.deepEqual(evidence.after,evidence.before);assert.equal(evidence.diagnostics.plan.id,'shaka-mse');
  await page.evaluate(async()=>{const range=p.current.backend.player.seekRange();await p.seek((range.start+range.end)/2);await p.play();window.resumedAt=p.state.currentTime;});
  await page.waitForFunction(()=>p.state.currentTime>resumedAt+.2);
  return {...evidence,resumed:await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}))};
});
await check('source replacement retires old Shaka source and resets source-scoped track IDs',async page=>{
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:1000000}});await p.play();window.oldId=p.state.audioTracks[0].id;},url);
  const previous=await page.evaluate(()=>p.state.sourceId);
  await page.evaluate(async dash=>{await p.open({url:dash,format:'dash'});await p.play();},dash);
  assert.ok(await page.evaluate(id=>p.state.sourceId>id,previous));
  assert.equal(await page.evaluate(async()=>{try{await p.selectAudioTrack(oldId);return false;}catch(e){return e.code==='INVALID_ARGUMENT';}}),true);
  return page.evaluate(()=>p.diagnostics);
});
await check('Shaka incompatibility falls through to actual FFmpeg Hybrid with cookie authorization',async page=>{
  await page.context().addCookies([{name:'demuxe_stream',value:'approved',url:server.origin}]);
  const authorized=[];await page.route('**/index.mpd',async route=>{const cookie=route.request().headers().cookie??'';authorized.push(cookie.includes('demuxe_stream=approved'));if(authorized.at(-1))await route.continue();else await route.fulfill({status:403,body:'Cookie required'});});
  await page.evaluate(async dash=>{await p.open({url:dash,format:'dash'});await p.destroy();const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#stage'));const original=shaka.Player.prototype.load;shaka.Player.prototype.load=function(){shaka.Player.prototype.load=original;return Promise.reject({category:4,code:4000});};await p.open({url:dash,format:'dash'});await p.play();},dash);
  assert.equal(await page.evaluate(()=>p.mode),'hybrid');await page.waitForFunction(()=>p.state.currentTime>.3);
  assert.ok(authorized.length>=2,'Both Shaka and fallback must request authorized manifest');assert.ok(authorized.every(Boolean),'Cookie authorization survives fallback');
  return {authorizedManifestRequests:authorized.length,diagnostics:await page.evaluate(()=>p.diagnostics)};
});
await check('runtime Shaka error recovers through Hybrid with paused position and controls',async page=>{
  await page.evaluate(async dash=>{
    await p.open({url:dash,format:'dash'});await p.seek(3);await p.pause();await p.volume(37);await p.setPlaybackRate(1.25);await p.subtitleVisible(false);
    window.beforeRecovery=p.state;window.retiredBackend=p.current.backend;
    const error=new shaka.util.Error(shaka.util.Error.Severity.CRITICAL,shaka.util.Error.Category.MANIFEST,4000);
    retiredBackend.player.dispatchEvent({type:'error',detail:error});
  },dash);
  await page.waitForFunction(()=>p.mode==='hybrid'&&!p.state.pendingOperation&&!p.diagnostics.switching);
  const recovered=await page.evaluate(()=>({before:beforeRecovery,after:p.state,diagnostics:p.diagnostics,oldPolicy:retiredBackend.policy.diagnostics}));
  assert.equal(recovered.after.status,'paused');assert.ok(Math.abs(recovered.after.currentTime-recovered.before.currentTime)<.3);
  assert.equal(recovered.after.playbackRate,1.25);assert.ok(Math.abs(recovered.after.volume-.37)<.001);assert.equal(recovered.after.subtitlesVisible,false);
  assert.equal(recovered.oldPolicy.active,false);assert.equal(recovered.oldPolicy.pendingRequests,0);
  await page.evaluate(()=>p.play());await page.waitForFunction(()=>p.state.currentTime>3.5);return recovered;
});
await check('authorization refresh preserves controlled streaming and renewed headers',async page=>{
  const observed=[];await page.route('**/index.mpd',async route=>{const auth=route.request().headers().authorization;observed.push(auth);if(auth==='Bearer renewed')await route.continue();else await route.fulfill({status:401,body:'expired'});});
  await page.evaluate(async dash=>{window.renewals=[];await p.open({url:dash,format:'dash',headers:{Authorization:'Bearer expired'},refreshAuthorization:async resource=>{renewals.push(resource.url);return {headers:{Authorization:'Bearer renewed'}};}});await p.play();},dash);
  await page.waitForFunction(()=>p.state.currentTime>.3);assert.deepEqual(observed,['Bearer expired','Bearer renewed']);
  const evidence=await page.evaluate(()=>({renewals,diagnostics:p.diagnostics}));assert.deepEqual(evidence.renewals,[dash]);assert.equal(evidence.diagnostics.plan.id,'shaka-mse');return evidence;
});
await check('persistent authorization denial is terminal and does not try codec fallback',async page=>{
  await page.route('**/index.mpd',route=>route.fulfill({status:403,body:'denied'}));
  const state=await page.evaluate(async dash=>{try{await p.open({url:dash,format:'dash'});return {accepted:true};}catch(e){return {code:e.code,attempts:p.diagnostics.selection.attempts};}},dash);
  assert.equal(state.code,'SOURCE_PERMISSION');assert.ok(!state.attempts.some(a=>a.mode==='hybrid'||a.mode==='software'));return state;
});
await check('initial Shaka runtime download cancellation aborts fetch and permits a fresh retry',async page=>{
  const pattern='**/web/vendor/shaka-player.js';let intercepted,requested;
  const entered=new Promise(resolve=>requested=resolve);
  await page.route(pattern,route=>{intercepted=route;requested();});
  await page.evaluate(()=>{const fetch=window.fetch;window.fetch=function(resource,options){if(String(resource instanceof Request?resource.url:resource).includes('/web/vendor/shaka-player.js'))window.runtimeDownloadSignal=options?.signal??resource?.signal;return fetch.call(this,resource,options);};});
  const open=page.evaluate(async dash=>{window.runtimeAbort=new AbortController();try{await p.open({url:dash,format:'dash'},{signal:runtimeAbort.signal});return 'accepted';}catch(error){return error.code;}},dash);
  await Promise.race([entered,open.then(code=>{throw Error('Open ended before runtime interception: '+code);})]);
  await page.evaluate(()=>{if(!runtimeDownloadSignal)throw Error('Runtime download did not expose a cancellable fetch signal');runtimeAbort.abort();});
  assert.equal(await open,'ABORTED');
  const canceled=await page.evaluate(()=>({aborted:runtimeDownloadSignal.aborted,sourceId:p.state.sourceId,surfaces:document.querySelectorAll('#stage video,#stage canvas').length,scripts:Array.from(document.scripts).filter(script=>script.src.includes('shaka-player.js')).length,runtimePresent:!!window.shaka}));
  assert.equal(canceled.aborted,true);assert.equal(canceled.sourceId,null);assert.equal(canceled.surfaces,0);assert.equal(canceled.scripts,0);assert.equal(canceled.runtimePresent,false);
  await intercepted.abort().catch(()=>{});await page.unroute(pattern);
  await page.evaluate(async dash=>{await p.open({url:dash,format:'dash'});await p.play();},dash);
  await page.waitForFunction(()=>p.state.currentTime>.3&&p.surface.getVideoPlaybackQuality().totalVideoFrames>3);
  assert.equal(await page.evaluate(()=>p.diagnostics.plan.id),'shaka-mse');
  return {canceled,retry:await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}))};
});
await check('in-flight manifest cancellation leaves no published session',async page=>{
  let requested;const entered=new Promise(r=>requested=r);await page.route('**/index.mpd',async route=>{requested();await new Promise(r=>setTimeout(r,500));await route.abort().catch(()=>{});});
  const open=page.evaluate(async dash=>{window.abortController=new AbortController();window.cancelStage='opening';try{await p.open({url:dash,format:'dash'},{signal:abortController.signal});window.cancelStage='accepted';return 'accepted';}catch(e){window.cancelStage='rejected:'+e.code;return e.code;}},dash);
  await Promise.race([entered,open.then(code=>{throw Error('Open ended before request interception: '+code);})]);await page.evaluate(()=>{window.cancelCandidate=p.candidate?.backend;window.cancelStage='aborting';abortController.abort();});assert.equal(await open,'ABORTED');assert.equal(await page.evaluate(()=>p.state.sourceId),null);
});
for(const [preload,profile,goal,behind] of [['none','low-latency',3,3],['metadata','balanced',10,30],['auto','resilient',30,30]])await check(`buffering intent ${preload} ${profile}`,async page=>{
 const before=await page.evaluate(async ({url,preload,profile})=>{
  await p.destroy();const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#stage'),{buffering:{preload,profile}});
  await p.open({url,format:'hls',streaming:{maxBandwidth:2000000}});return {state:p.state,diagnostics:p.diagnostics};
 },{url,preload,profile});
 assert.equal(before.diagnostics.buffering.backend,'shaka');assert.equal(before.diagnostics.buffering.settings.bufferingGoal,preload==='auto'?goal:1);assert.equal(before.state.capabilities.buffering.memoryBudget,false);
 await page.evaluate(()=>p.play());await page.waitForFunction(()=>p.state.currentTime>.3);
 const after=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}));assert.equal(after.diagnostics.buffering.settings.bufferingGoal,goal);assert.equal(after.diagnostics.buffering.settings.bufferBehind,behind);assert.equal(after.diagnostics.backend.streaming.abr,true);assert.ok(after.state.buffered.length);
 await page.evaluate(()=>p.close());assert.equal(page.workers().length,0);return {before,after};
});
}finally{result.passed=result.cases.every(c=>c.passed);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();console.log(out);}
