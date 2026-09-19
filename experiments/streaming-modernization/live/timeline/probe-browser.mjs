// SPDX-License-Identifier: Apache-2.0
// Exercise the experimental integrated mpv session. Only measurement hooks
// are overridden; source manifests and switching implementation are unchanged.
import {chromium,firefox} from 'playwright';import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const archive=path.resolve(process.env.BETA_ARCHIVE),fixture=path.resolve(process.env.STREAM_FIXTURES),out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';await mkdir(out);await writeFile(path.join(out,'harness.mjs'),await readFile(import.meta.filename));await mkdir(path.join(out,'extracted'));execFileSync('tar',['-xzf',archive,'-C',path.join(out,'extracted')]);
const assets=path.join(out,'extracted/package'),sha=b=>createHash('sha256').update(b).digest('hex');
const overrides={};
if(process.env.TRACE_PACKETS==='1'){
 const name='web/retained-decoder-worker.js';const old=await readFile(path.join(assets,name),'utf8');
 const next=old.replace('     decoder.decode(new EncodedVideoChunk(',`     stats.packetTrace??=[];if(stats.packetTrace.length<128){let hash=2166136261;for(const value of bytes)hash=Math.imul(hash^value,16777619);stats.packetTrace.push({timestamp,duration,size:bytes.length,key:header[7],hash:hash>>>0});}
     decoder.decode(new EncodedVideoChunk(`);
 assert.notEqual(next,old);overrides[name]=next;
}


for(const name of ['web/filter-retained-engine-worker.js','web/software-full-engine-worker.js']){
 let s=await readFile(path.join(assets,name),'utf8');s='const probeLifetime={id:crypto.randomUUID(),creates:0,destroys:0};globalThis.probeDraws=[];\n'+s;
 s=s.replace('const result = engine._web_create(data.sampleRate);','probeLifetime.creates++;const result = engine._web_create(data.sampleRate);');
 s=s.replace('engine?._web_destroy();','probeLifetime.destroys++;engine?._web_destroy();');
 s=s.replaceAll("post({type:'log',message})","(console.log('native:',message),post({type:'log',message}))");
 if(process.env.TRACE_EVENTS==='1')s=s.replace('const event = JSON.parse(engine.UTF8ToString(ptr));',"const event = JSON.parse(engine.UTF8ToString(ptr));console.log('mpv-event',JSON.stringify(event));");
 s=s.replace('context.putImageData(frameImage, 0, 0);', 'context.putImageData(frameImage, 0, 0);if(probeDraws.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),position,kind:\"software-clock-estimate\"});');
 s=s.replace("type:'diagnostics', data:{","type:'diagnostics', data:{probeLifetime:{...probeLifetime},probeThreads:{running:engine.PThread.runningWorkers.length,unused:engine.PThread.unusedWorkers.length},probeFrame:globalThis.probeFrame,probeDraws:globalThis.probeDraws,");overrides[name]=s;
}
const draw='web/retained-video.js';overrides[draw]=(await readFile(path.join(assets,draw),'utf8')).replace('  context.drawImage(frame,','  globalThis.probeFrame={width:frame.displayWidth,height:frame.displayHeight,pts:frame.timestamp/1e6};if(globalThis.probeDraws?.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),pts:frame.timestamp/1e6,kind:"retained-frame"});\n  context.drawImage(frame,');
for(const[name,s]of Object.entries(overrides)){await mkdir(path.dirname(path.join(out,'overrides',name)),{recursive:true});await writeFile(path.join(out,'overrides',name),s);}
const result={scope:'Public source-scoped API manual quality switching with explicit lifetime/frame instrumentation; no adapter or switching implementation overrides; rolling HLS or DASH finalization, live-hint override, final DVR window, end seek and actual playback EOF; not ABR qualification',family,archiveSHA256:sha(await readFile(archive)),harnessSHA256:sha(await readFile(import.meta.filename)),overrides:Object.fromEntries(Object.entries(overrides).map(([n,s])=>[n,sha(s)])),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};let active;
const server=http.createServer(async(req,res)=>{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/arm-delay'){assert.equal(req.method,'POST');active.delay={armed:performance.now(),milliseconds:Number(process.env.CANDIDATE_DELAY_MS)||0};res.end();return;}if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
 if(u.pathname.startsWith('/media/')){
  const upstream=http.request(process.env.LIVE_ORIGIN+u.pathname.slice(6),{headers:req.headers},response=>{
   const record={file:u.pathname.slice(7),status:response.statusCode,bytes:0,at:performance.now()};active.requests.push(record);
   res.writeHead(response.statusCode,response.headers);response.on('data',chunk=>record.bytes+=chunk.length);response.pipe(res);
  });upstream.on('error',()=>res.destroy());req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());upstream.end();return;
 }
 const media=u.pathname.startsWith('/media/'),base=media?fixture:assets,name=u.pathname.slice(media?7:8),f=path.resolve(base,name);if(!f.startsWith(base+path.sep))throw Error('Path');const data=Buffer.from(!media&&name in overrides?overrides[name]:await readFile(f));
 const record=media?{file:name,bytes:0,at:performance.now(),range:req.headers.range}:null;if(record)active.requests.push(record);
 if(record&&active.delay?.milliseconds&&!active.delay.started&&/^(high\/|dash\/(init|chunk)-stream2)/.test(name)){active.delay.started=performance.now();active.delay.file=name;await new Promise(r=>setTimeout(r,active.delay.milliseconds));active.delay.finished=performance.now();}
 res.setHeader('Content-Type',f.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(f)?'text/javascript':'application/octet-stream');res.setHeader('ETag','"'+sha(data)+'"');res.setHeader('Accept-Ranges','bytes');const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range??'');const a=m?Number(m[1]):0,b=m?Number(m[2])+1:data.length;res.writeHead(m?206:200,{'Content-Length':b-a,...(m?{'Content-Range':`bytes ${a}-${b-1}/${data.length}`}:{})});res.end(data.subarray(a,b));if(record)record.bytes=b-a;
 }catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browserType=({chrome:chromium,firefox})[family];const browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browserPid=browserServer.process().pid;browserServer.process().once('exit',(code,signal)=>{result.browserProcessExit={code,signal,at:Date.now()};});const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();
try{for(const mode of [process.env.MODE??'hybrid'])for(const [format,file]of [process.env.FORMAT==='dash'?['dash','dash/manifest.mpd']:['hls','master.m3u8']]){
 if(process.env.ONE&&process.env.ONE!==mode+':'+format)continue;
 const c={name:mode+':'+format,requests:[],switches:[]};active=c;result.cases.push(c);const page=await browser.newPage();page.setDefaultTimeout(20000);page.on('console',m=>{(c.console??=[]).push(m.text());});
 try{await page.goto(origin);await page.waitForFunction(()=>window.Player);await page.evaluate(async({mode,format,file})=>{window.errors=[];window.logs=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));p.addEventListener('log',e=>{logs.push(e.detail);if(logs.length>256)logs.shift();});window.snap=()=>({time:p.properties.get('time-pos'),tracks:p.properties.get('track-list'),diagnostics:p.diagnostics,audio:p.audioDiagnostics(),intent:p.state.playbackIntent,paused:p.properties.get('pause'),muted:p.state.muted,volume:p.properties.get('volume'),speed:p.properties.get('speed'),video:p.properties.get('video-params'),avsync:p.properties.get('avsync'),cache:p.properties.get('demuxer-cache-state'),state:p.state,seekableProperty:p.properties.get('seekable'),errors,logs});window.startup=[];window.startupTimer=setInterval(()=>{if(startup.length<500)startup.push({diagnostics:p.candidate?.backend.diagnostics??p.current?.backend.diagnostics,tracks:p.candidate?.backend.properties.get('track-list'),time:p.candidate?.backend.properties.get('time-pos')});},50);await p.openRemote({url:location.origin+'/media/'+file,format,immutable:false,streaming:{live:true,qualityPolicy:{mode:'manual'}}});const alternate=p.properties.get('track-list').find(t=>t.type==='audio'&&!t.selected);if(alternate)await p.selectTrack('audio',String(alternate.id));await p.subtitleVisible(true);await p.volume(37);await p.rate(1);await p.play();;},{mode,format,file});
 await page.waitForFunction(()=>p.properties.get('time-pos')>.5&&p.audioDiagnostics().rms>.001);
 c.afterAudioSelection=await page.evaluate(()=>snap());
 // Track changes have their own preroll. Preserve their samples, and start the
 // quality-switch interval only after the newly selected audio is established.
 await page.waitForFunction(()=>p.audioDiagnostics().mediaFrames>96000&&Number.isFinite(p.properties.get('avsync'))&&Math.abs(p.properties.get('avsync'))<.1);
 c.initial=await page.evaluate(()=>snap());c.discoveryRequests=structuredClone(c.requests);console.log(mode,format,'startup',c.initial.time);
 const tracks=c.initial.tracks.filter(t=>t.type==='video');assert.equal(tracks.length,1,'One logical video track');
 await page.waitForFunction(()=>p.diagnostics.backend.quality?.available);
 const qualities=await page.evaluate(()=>p.diagnostics.backend.quality.qualities);assert.equal(qualities.length,3);
 const lifetime=c.initial.diagnostics.backend.probeLifetime;assert.equal(lifetime.creates,1);
 await page.evaluate(()=>{window.samples=[];window.sampleTimer=setInterval(()=>samples.push(snap()),40);window.qualityEvents=[];p.addEventListener('qualitychange',e=>qualityEvents.push(e.detail.quality));window.choose=index=>p.setQuality({mode:'manual',qualityId:p.state.quality.qualities[index].id});});
 for(const index of [2,1,0]){
  const chosen=qualities[index],began=performance.now(),before=await page.evaluate(()=>snap());
  if(index===2&&Number(process.env.CANDIDATE_DELAY_MS)>0)await page.evaluate(()=>fetch('/arm-delay',{method:'POST'}));
  await page.evaluate(index=>choose(index),index);
  await page.waitForFunction(({index,width,mode})=>{const b=p.diagnostics.backend;return b.quality.demuxed===index&&b.quality.presented===index&&(mode==='hybrid'?b.probeFrame?.width===width:p.properties.get('video-params')?.w===width);},{index,width:chosen.width,mode},{timeout:18000});
  await page.waitForFunction(t=>p.properties.get('time-pos')>t+.25,before.time);
  const after=await page.evaluate(()=>snap());assert.deepEqual(after.diagnostics.backend.probeLifetime,lifetime);assert.deepEqual(after.errors,[]);
  assert.equal(after.tracks.find(t=>t.type==='audio'&&t.selected)?.id,before.tracks.find(t=>t.type==='audio'&&t.selected)?.id);
  assert.equal(after.diagnostics.backend.quality.presented,index);
  assert.ok(after.audio.mediaFrames>=before.audio.mediaFrames);assert.ok(after.time>=before.time);assert.equal(after.volume,37);assert.equal(after.speed,1);
  assert.equal(after.tracks.find(t=>t.type==='sub'&&t.selected)?.id,before.tracks.find(t=>t.type==='sub'&&t.selected)?.id);
  console.log(mode,format,'switched',index,after.time);
  c.switches.push({chosen,milliseconds:performance.now()-began,before,after});
 }
 await page.evaluate(()=>p.pause());await page.waitForFunction(()=>p.properties.get('pause')===true);await page.waitForTimeout(500);
 c.playingSamples=await page.evaluate(()=>{clearInterval(sampleTimer);return samples;});
 await page.screenshot({path:path.join(out,mode+'-'+format+'-paused.png')});
 const last=c.switches.at(-1).after,draws=last.diagnostics.backend.probeDraws??[];
 const times=draws.filter(d=>(d.pts??d.position)>=c.initial.time&&(d.pts??d.position)<=last.time);
 let maxDrawGap=0;for(let i=1;i<times.length;i++)maxDrawGap=Math.max(maxDrawGap,(times[i].wall-times[i-1].wall)/1000);
 assert.ok(c.playingSamples.length>0&&c.playingSamples.every(x=>typeof x.avsync==='number'&&Number.isFinite(x.avsync)),'mpv A/V timing must be observable');
 c.continuity={scope:'Actual output callbacks and audio worklet counters; mpv reported A/V estimate, not physical-device timing',maxDrawGap,draws:times.length,maxReportedAVSync:Math.max(...c.playingSamples.map(x=>Math.abs(x.avsync))),underruns:last.audio.underruns-c.initial.audio.underruns};
 assert.ok(times.length>24,'Rendered output must progress through switching');
 assert.ok(maxDrawGap<.5,'Rendered output gap exceeds 500 ms');
 assert.ok(c.continuity.maxReportedAVSync<.2,'Reported A/V sync exceeds 200 ms');
 assert.equal(c.continuity.underruns,0,'Audio underrun during playing switches');
 if(Number(process.env.CANDIDATE_DELAY_MS)>0){assert.ok(c.delay?.finished-c.delay?.started>=Number(process.env.CANDIDATE_DELAY_MS)-10,'Candidate delay was not exercised');const during=times.filter(d=>{const wall=d.wall-(performance.timeOrigin);return wall>=c.delay.started&&wall<=c.delay.finished;});assert.ok(during.length>24,'Active output did not continue during candidate preparation');c.delay.outputCallbacks=during.length;}
 const paused=await page.evaluate(()=>snap());await page.waitForTimeout(300);const stable=await page.evaluate(()=>snap());
 c.pausedControl={before:paused,after:stable};assert.ok(Math.abs(stable.time-paused.time)<.05,'Pause must settle before measuring a switch');
 await page.evaluate(async()=>{await p.setMuted(true);await p.rate(1.25);await choose(2);});
 await page.waitForTimeout(300);const changed=await page.evaluate(()=>snap());c.pausedSwitch={before:stable,after:changed};
 assert.ok(Math.abs(changed.time-stable.time)<.09,'Paused request moved presentation time');assert.equal(changed.paused,true);assert.equal(changed.muted,true);assert.equal(changed.speed,1.25);
 await page.waitForTimeout(20000);
 const beforeFinish=await page.evaluate(()=>snap());c.expiredBeforeFinish=beforeFinish;
 assert.equal(beforeFinish.state.streamType,'live');
 assert.ok(beforeFinish.state.seekable[0].start>beforeFinish.time,'Paused position must expire before finalization');
 await page.evaluate(()=>fetch('/media/finish'));
 await page.waitForFunction(()=>p.state.streamType==='vod'&&p.state.duration>0);
 c.finished=await page.evaluate(()=>snap());
 assert.ok(c.finished.state.seekable[0].start>0,'Final DVR window must not invent earlier availability');
 assert.equal(c.finished.state.duration,c.finished.state.seekable[0].end);
 assert.equal(c.finished.diagnostics.backend.quality.window.live,false);
 assert.deepEqual(c.finished.diagnostics.backend.probeLifetime,lifetime);
 const recoveryTarget=Math.max(c.finished.state.seekable[0].start,c.finished.state.seekable[0].end-6);
 await page.evaluate(async()=>{await p.setMuted(false);await p.rate(1);await p.play();});
 await page.waitForFunction(target=>p.state.currentTime>target+.25&&p.audioDiagnostics().rms>.001,recoveryTarget);
 c.finalWindowRecovery=await page.evaluate(()=>snap());
 assert.equal(c.finalWindowRecovery.diagnostics.backend.streamingRecovery.reason,'expired-pause');
 assert.ok(Math.abs(c.finalWindowRecovery.diagnostics.backend.streamingRecovery.to-recoveryTarget)<.1);
 assert.deepEqual(c.finalWindowRecovery.diagnostics.backend.probeLifetime,lifetime);assert.deepEqual(c.finalWindowRecovery.errors,[]);
 for(const type of ['audio','sub'])assert.equal(c.finalWindowRecovery.tracks.find(t=>t.type===type&&t.selected)?.id,beforeFinish.tracks.find(t=>t.type===type&&t.selected)?.id);
 const target=c.finished.state.seekable[0].end-2;
 await page.evaluate(async target=>{await p.seek(target);await p.setMuted(false);await p.rate(1);await p.play();},target);
 await page.waitForFunction(()=>p.state.status==='ended',null,{timeout:15000});
 c.ended=await page.evaluate(()=>snap());
 assert.deepEqual(c.ended.errors,[]);assert.deepEqual(c.ended.diagnostics.backend.probeLifetime,lifetime);
 assert.ok(c.ended.time>=target);
 c.passed=true;console.log('PASS',c.name);
 }catch(error){c.error=String(error.stack);c.state=await page.evaluate(()=>window.snap?.()).catch(()=>null);c.startup=await page.evaluate(()=>window.startup).catch(()=>null);c.passed=false;process.exitCode=1;console.log('FAIL',c.name,c.error);}
 finally{await page.evaluate(()=>{clearInterval(window.startupTimer);return window.p?.destroy();}).catch(()=>{});await page.waitForTimeout(150);c.remainingWorkers=page.workers().length;if(c.remainingWorkers){c.passed=false;process.exitCode=1;}await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
}}finally{
 let deadline;let phase='server';
 try{await Promise.race([(async()=>{await browserServer.close();phase='client';await browser.close();phase='done';})(),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}
 catch(error){result.cleanupError=String(error);result.cleanupPhase=phase;result.processExitAtDeadline={code:browserServer.process().exitCode,signal:browserServer.process().signalCode};result.browserClosed=false;process.exitCode=1;await browserServer.kill();result.browserTerminated=true;}
 finally{clearTimeout(deadline);await new Promise(r=>{server.close(r);server.closeAllConnections();});}
 result.passed=result.browserClosed&&result.cases.length===1&&result.cases.every(c=>c.passed);await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
}
