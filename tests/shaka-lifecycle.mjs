// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
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
const server=await serve(repo,path.join(repo,'tests/head-to-head'),path.join(out,'requests.jsonl'));
const url=server.origin+'/'+path.relative(repo,fixture)+'/master.m3u8';
const dash=server.origin+'/build/head-to-head/assets-component-isolation-01/fixtures/dash-h264/index.mpd';
const eventURL=server.origin+'/'+path.relative(repo,fixture)+'/event-master.m3u8';
const liveURL=server.origin+'/build/head-to-head/assets-component-isolation-01/fixtures/hls-live/index.m3u8?lifecycle-window-race';
const browser=await chromium.launch({channel:'chrome',headless:process.env.HEADLESS==='1',args:['--autoplay-policy=no-user-gesture-required']});
const result={scope:'Maintained Shaka public API, policy, explicit failure injection and lifecycle; synthetic media; no performance claim',browser:browser.version(),commands,fixture,cases:[]};
const hashes={};for(const file of ['src/unified-player.ts','src/internal/shaka-backend.ts','src/internal/shaka-network.ts','src/internal/playback-plans.ts','web/resource-loader.js','web/fallback-stream-policy.js','tests/shaka-lifecycle.mjs'])hashes[file]=createHash('sha256').update(await fs.readFile(path.join(repo,file))).digest('hex');result.hashes=hashes;
async function check(name,run){if(process.env.ONLY&&!name.includes(process.env.ONLY))return;const page=await browser.newPage();page.setDefaultTimeout(30000);const console=[];page.on('console',m=>console.push(m.text()));
  try{await page.goto(server.origin+'/harness/harness.html');await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#stage'));});let deadline;const evidence=await Promise.race([run(page),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Lifecycle case exceeded 45 seconds')),45000);})]).finally(()=>clearTimeout(deadline));await page.evaluate(()=>p.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);assert.equal(await page.locator('#stage video,#stage canvas').count(),0);result.cases.push({name,passed:true,evidence,console});process.stdout.write(`PASS ${name}\n`);}
  catch(error){result.cases.push({name,passed:false,error:String(error.stack),console,diagnostics:await page.evaluate(()=>({player:p.diagnostics,state:p.state,cancelStage:window.cancelStage,cancelCandidate:window.cancelCandidate?{stopped:cancelCandidate.stopped,opening:cancelCandidate.opening,network:cancelCandidate.policy?.diagnostics,loadMode:cancelCandidate.player?.getLoadMode()}:undefined})).catch(()=>null)});process.exitCode=1;process.stdout.write(`FAIL ${name}: ${error}\n`);}
  finally{await Promise.race([page.evaluate(()=>p.destroy()).catch(()=>{}),new Promise(r=>setTimeout(r,5000))]);await page.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}}
try{
await check('adaptive variants, audio/text selection, pause, seek and visibility',async page=>{
  await page.evaluate(async url=>{await p.open({url,format:'hls',streaming:{maxBandwidth:1000000}});await p.play();},url);
  await page.waitForFunction(()=>p.state.currentTime>.3);
  assert.equal(await page.evaluate(()=>p.diagnostics.plan.id),'shaka-mse');
  assert.equal(await page.evaluate(()=>p.surface.videoWidth),160);
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
}finally{result.passed=result.cases.every(c=>c.passed);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();console.log(out);}
