// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'chrome',out=`results/api-roadmap/${family}-${Date.now()}`;await mkdir(out,{recursive:true});
let server,browser;
const checks=[];
const metadata=out+'/chapters.txt',chapterFile=out+'/chapters.mkv';
await writeFile(metadata,';FFMETADATA1\ntitle=Roadmap fixture\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=2000\ntitle=Opening\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=2000\nEND=4000\ntitle=Second\n');
execFileSync('ffmpeg',['-nostdin','-v','error','-i','fixtures/example.mp4','-i',metadata,'-map','0','-map_metadata','1','-map_chapters','1','-c','copy',chapterFile]);
try{
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise(resolve=>server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);}));
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
 const page=await browser.newPage();page.setDefaultTimeout(35000);
 await installPackageEntrypoint(page, origin);await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);
 await page.evaluate(async()=>{await player.destroy();window.api=await import('/web/generated/index.js');window.movie=new Blob([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],{type:'video/mp4'});});
 const check=async(name,run)=>{if(process.env.ONLY&&!name.includes(process.env.ONLY))return;try{const evidence=await run();checks.push({name,passed:true,...(evidence?{evidence}:{})});console.log('PASS',name);}catch(error){checks.push({name,passed:false,error:String(error.stack)});console.log('FAIL',name,String(error));process.exitCode=1;}await writeFile(out+'/result.json',JSON.stringify({family,browser:browser.version(),checks},null,2));};
 const make=mode=>page.evaluate(async mode=>{await window.p?.destroy();window.p=new api.Player(document.querySelector('#surface'),{mode});},mode);
 for(const mode of ['native','hybrid','software'])await check(mode+' transactional initial position and source statistics',async()=>{
  await make(mode);const result=await page.evaluate(async()=>{
   await p.open(movie,{startTime:2});const id=p.state.sourceId,position=p.state.currentTime,stats=p.getStats();
   const invalid=await p.open(movie,{startTime:9999}).catch(e=>e.code);
   return {position,id,after:p.state.sourceId,invalid,stats,videoTracks:p.state.mediaInfo.videoTracks.length};
  });assert.ok(Math.abs(result.position-2)<.15,JSON.stringify(result));assert.equal(result.id,result.after);assert.equal(result.invalid,'INVALID_ARGUMENT');assert.ok(result.stats.openToAcceptanceMs>=0);assert.equal(result.stats.presentedFrames,null);assert.ok(result.videoTracks>0);
 });
 await check('inspection is bounded, independent and explicit about incomplete metadata',async()=>{
  await make('native');let workers=0;const created=()=>workers++;page.on('worker',created);
  const result=await page.evaluate(async()=>{
   const inspected=await api.inspectMedia(movie);
   const limited=await api.inspectMedia(movie,{maxBytes:64,maxReads:1});
   return {status:inspected.status,tracks:inspected.tracks?.length,duration:inspected.duration,bytes:inspected.bytesRead,limited:limited.status,id:p.state.sourceId};
  });assert.equal(result.status,'complete');assert.ok(result.tracks>=1);assert.ok(result.duration>0);assert.ok(result.bytes<=512*1024);assert.notEqual(result.limited,'complete');assert.equal(result.id,null);page.off('worker',created);assert.equal(workers,0);
 });
 await check('remote inspection preserves cancellation and source-policy boundaries',async()=>{
  await make('native');let requests=0;const requested=request=>{if(request.url().includes('preaborted-inspection'))requests++;};page.on('request',requested);
  const result=await page.evaluate(async()=>{
   const remote=await api.inspectMedia({url:'/fixtures/example.mp4',format:'file'});const controller=new AbortController();controller.abort();const aborted=await api.inspectMedia({url:'/fixtures/example.mp4?preaborted-inspection'},{signal:controller.signal}).catch(e=>e.code);
   const manifest=await api.inspectMedia({url:'/fixtures/example.mp4',format:'hls'}).catch(e=>e.code);return {remote,aborted,manifest,source:p.state.sourceId};
  });page.off('request',requested);assert.equal(result.remote.status,'complete');assert.ok(result.remote.tracks.length);assert.equal(result.aborted,'ABORTED');assert.equal(requests,0);assert.equal(result.manifest,'UNSUPPORTED_FEATURE');assert.equal(result.source,null);
 });
 await check('custom sources stage bounded bytes and cancellation preserves the accepted source',async()=>{
  await make('native');const result=await page.evaluate(async()=>{
   const bytes=new Uint8Array(await movie.arrayBuffer());let closed=0,reads=0;
   await p.open({kind:'bytes',transport:'application-managed',id:'fixture',size:bytes.length,ownership:'owned',close:()=>{closed++;},read:async(at,n)=>{reads++;return bytes.slice(at,at+n);}},{startTime:1});
   const id=p.state.sourceId,c=new AbortController();let release,start;const started=new Promise(resolve=>{start=resolve;});
   const pending=p.open({kind:'bytes',transport:'application-managed',id:'hung',size:100,read:()=>{start();return new Promise(resolve=>{release=resolve;});}},{signal:c.signal}).catch(e=>e.code);
   await started;c.abort();const code=await pending;release(new Uint8Array(100));return {id,after:p.state.sourceId,code,closed,reads};
  });assert.equal(result.id,result.after);assert.equal(result.code,'ABORTED');assert.equal(result.closed,1);assert.ok(result.reads>0);
 });
 await check('timing settings persist across mpv routes and unsupported Native change rolls back',async()=>{
  await make('hybrid');const result=await page.evaluate(async()=>{
   await p.open(movie);await p.setSubtitleDelay(.25);await p.setAudioDelay(.1);await p.setSubtitleStyle({fontSize:30,color:'#ffffff'});
   const read=()=>p.current.backend.command('expand-text','${=sub-delay}|${=audio-delay}|${=sub-font-size}');
   const before=await read();await p.setMode('software');const after=await read();
   const rejected=await p.setMode('native').catch(e=>e.code);await p.close();await p.open(movie);return {before,after,rejected,mode:p.mode,timing:p.state.timing};
  });assert.equal(result.before,result.after);assert.match(result.before,/0.25.*0.1.*30/);assert.equal(result.rejected,'UNSUPPORTED_FEATURE');assert.equal(result.timing.subtitleDelay,.25);
 });
 await check('removing attachments preserves other identities and invalidates old handles',async()=>{
  await make('software');const result=await page.evaluate(async()=>{
   await p.open(movie);const make=name=>new File(['1\n00:00:00,000 --> 00:00:05,000\n'+name+'\n'],name+'.srt');
   const first=await p.attachSubtitle(make('one')),second=await p.attachSubtitle(make('two'));
   const selected=p.state.mediaInfo.subtitle.id;await p.removeAttachment(first);const retained=p.state.mediaInfo.subtitle.id;
   await p.removeAttachment(second);const off=p.state.subtitlesVisible;const repeated=await p.removeAttachment(second).catch(e=>e.code);
   await p.open(movie);const expired=await p.removeAttachment(first).catch(e=>e.code);return {selected,retained,off,repeated,expired};
  });assert.equal(result.selected,result.retained);assert.equal(result.off,false);assert.equal(result.repeated,'INVALID_ARGUMENT');assert.equal(result.expired,'INVALID_ARGUMENT');
 });
 await check('URL subtitle attachment handles survive removal and reject forged handles',async()=>{
  await make('native');const result=await page.evaluate(async()=>{
   await p.open(movie);const urls=['one','two'].map(text=>URL.createObjectURL(new Blob(['WEBVTT\n\n00:00.000 --> 00:05.000\n'+text+'\n'],{type:'text/vtt'})));
   try{const a=await p.attachTextTrack({src:urls[0],label:'one'}),b=await p.attachTextTrack({src:urls[1],label:'two'});
    const id=p.state.subtitleTracks.find(t=>t.id.endsWith(b.id)).id;await p.selectSubtitleTrack(id);await p.removeAttachment(a);
    const retained=p.state.mediaInfo.subtitle.id,forged=await p.removeAttachment({...b}).catch(e=>e.code);await p.removeAttachment(b);return {id,retained,forged,off:!p.state.subtitlesVisible};
   }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
  });assert.equal(result.id,result.retained);assert.equal(result.forged,'INVALID_ARGUMENT');assert.equal(result.off,true);
 });
 await check('chapters and tags are reported by mpv and chapter navigation uses source identity',async()=>{
  await make('software');const result=await page.evaluate(async bytes=>{
   await p.open(new File([new Uint8Array(bytes)],'chapters.mkv'));const info=p.state.mediaInfo;
   if(info.chapters?.length!==2)throw Error('Chapter metadata '+JSON.stringify(info)+' raw '+await p.current.backend.command('expand-text','${chapter-list}'));await p.seekChapter(info.chapters[1].id);const position=p.state.currentTime;await p.open(movie);const expired=await p.seekChapter(info.chapters[1].id).catch(e=>e.code);return {info,position,expired};
  },[...await readFile(chapterFile)]);assert.equal(result.info.chapters.length,2);assert.ok(Math.abs(result.info.chapters[1].start-2)<.05);assert.ok(Object.values(result.info.tags).includes('Roadmap fixture'));assert.ok(Math.abs(result.position-2)<.2);assert.equal(result.expired,'INVALID_ARGUMENT');
 });
 await check('latest seeks settle superseded promises and snapshots describe observation',async()=>{
  await make('native');const result=await page.evaluate(async()=>{
   await p.open(movie);const first=p.seek(1,{policy:'latest'}).catch(e=>e.code);await p.seek(2,{policy:'latest'});const superseded=await first;
   const image=await p.snapshot({width:320,height:180});return {superseded,time:p.state.currentTime,width:image.width,height:image.height,size:image.blob.size,actualTime:image.actualTime};
  });assert.equal(result.superseded,'ABORTED');assert.ok(Math.abs(result.time-2)<.15);assert.equal(result.width,320);assert.equal(result.height,180);assert.ok(result.size>0);assert.equal(result.actualTime,null);
 });
 await check('software frame stepping and snapshot retain paused intent',async()=>{
  await make('software');const result=await page.evaluate(async()=>{await p.open(movie,{startTime:1});const before=p.state.currentTime;await p.stepFrame();const after=p.state.currentTime;await p.stepFrame(-1);const back=p.state.currentTime;const image=await p.snapshot();return {before,after,back,intent:p.state.playbackIntent,size:image.blob.size};});assert.ok(result.after>result.before);assert.ok(result.back<result.after);assert.equal(result.intent,'pause');assert.ok(result.size>0);
 });
 await check('bounded loop repeats without ending the source and range policy rejects outside seeks',async()=>{
  await make('native');await page.evaluate(async()=>{await p.open(movie);await p.setPlaybackRange({start:1,end:2});await p.setLoop(true);window.loopEnded=0;p.addEventListener('ended',()=>loopEnded++);await p.play();});
  await page.waitForFunction(()=>p.getStats().seekCount>=2,null,{timeout:10000});
  const result=await page.evaluate(async()=>{await p.pause();const invalid=await p.seek(4).catch(e=>e.code);await p.setLoop(false);return {invalid,ended:loopEnded,id:p.state.sourceId};});assert.equal(result.invalid,'INVALID_ARGUMENT');assert.equal(result.ended,0);assert.ok(result.id);
 });
 await check('fullscreen ownership and default audio output survive route changes',async()=>{
  await make('native');await page.evaluate(async()=>{await p.open(movie);const button=document.createElement('button');button.id='enter-fullscreen';button.textContent='Fullscreen';button.onclick=()=>{window.fullscreenResult=p.presentation.requestFullscreen().then(()=>true,e=>({error:e.code??e.name}));};document.body.prepend(button);});
  await page.click('#enter-fullscreen');const result=await page.evaluate(async()=>{const entered=await fullscreenResult,active=p.presentation.state.fullscreen;await p.presentation.exitFullscreen();const exited=!p.presentation.state.fullscreen;const sink=await p.setAudioOutputDevice('default').then(()=>true,e=>e.code);const id=p.state.sourceId;let route=true;if(sink===true)route=await p.setMode('hybrid').then(()=>true,e=>e.code);return {entered,active,exited,sink,route,id,after:p.state.sourceId,mode:p.mode,device:p.state.audioOutputDevice};});
  assert.equal(result.entered,true);assert.equal(result.active,true);assert.equal(result.exited,true);if(result.sink===true)assert.equal(result.device,'default');else assert.equal(result.sink,'UNSUPPORTED_FEATURE');if(result.route!==true){assert.equal(result.route,'UNSUPPORTED_FEATURE');assert.equal(result.id,result.after);assert.equal(result.mode,'native');}return result;
 });
 await check('video Picture-in-Picture retains its surface and teardown exits',async()=>{
  await make('native');await page.evaluate(async()=>{await p.open(movie);window.reviewCaptionURL=URL.createObjectURL(new Blob(['WEBVTT\n\n00:00.000 --> 00:05.000\nCaption\n'],{type:'text/vtt'}));const handle=await p.attachTextTrack({src:reviewCaptionURL,label:'PiP caption'});await p.selectSubtitleTrack(p.state.subtitleTracks.find(t=>t.id.endsWith(handle.id)).id);await p.subtitleVisible(false);const button=document.createElement('button');button.id='enter-pip';button.textContent='PiP';button.onclick=()=>{window.pipResult=p.presentation.requestPictureInPicture().then(()=>true,e=>({error:e.code??e.name}));};document.body.prepend(button);});
  await page.click('#enter-pip');const result=await page.evaluate(async()=>{const entered=await pipResult;if(entered!==true)return {entered};const active=p.presentation.state.pictureInPicture,rejected=await p.setMode('software').catch(e=>e.code),subtitles=await p.subtitleVisible(true).then(()=>null,e=>e.code),attached=await p.attachTextTrack({src:reviewCaptionURL,label:'extra'}).then(()=>null,e=>e.code);await p.destroy();URL.revokeObjectURL(reviewCaptionURL);return {entered,active,rejected,subtitles,attached,closed:document.pictureInPictureElement===null};});
  if(result.entered!==true){assert.ok(['UNSUPPORTED_FEATURE','NotSupportedError'].includes(result.entered.error),JSON.stringify(result));console.log('UNAVAILABLE browser video PiP');return {availability:'unavailable',reason:result.entered.error};}
  assert.equal(result.active,'video');assert.equal(result.rejected,'UNSUPPORTED_FEATURE');assert.equal(result.subtitles,'UNSUPPORTED_FEATURE');assert.equal(result.attached,'UNSUPPORTED_FEATURE');assert.equal(result.closed,true);
 });
 await check('document Picture-in-Picture retains overlays and restores the host',async()=>{
  await make('software');await page.evaluate(async()=>{await p.open(movie);await p.attachSubtitle(new File(['1\n00:00:00,000 --> 00:00:05,000\nPiP subtitle\n'],'pip.srt'));window.pipSubtitle=p.state.mediaInfo.subtitle.id;const button=document.createElement('button');button.id='document-pip';button.textContent='Document PiP';button.onclick=()=>{window.documentPiPResult=p.presentation.requestPictureInPicture('document').then(()=>true,e=>({error:e.code??e.name}));};document.body.prepend(button);});
  await page.click('#document-pip');const result=await page.evaluate(async()=>{const entered=await documentPiPResult;if(entered!==true)return {entered};const active=p.presentation.state.pictureInPicture,moved=p.surface.ownerDocument!==document;await p.setMode('hybrid');const retained=p.surface.ownerDocument!==document&&p.state.mediaInfo.subtitle.id===pipSubtitle;await p.presentation.exitPictureInPicture();const restored=p.surface.ownerDocument===document;await p.seek(2);await p.destroy();return {entered,active,moved,retained,restored};});
  if(result.entered!==true){assert.equal(result.entered.error,'UNSUPPORTED_FEATURE');console.log('UNAVAILABLE browser document PiP');return {availability:'unavailable',reason:result.entered.error};}
  assert.equal(result.active,'document');assert.equal(result.moved,true);assert.equal(result.retained,true);assert.equal(result.restored,true);
 });
 await check('review inspection propagates provider faults and identity changes',async()=>{
  const result=await page.evaluate(async()=>{
   const bytes=new Uint8Array(await movie.arrayBuffer());let closed=0;
   const source={kind:'bytes',transport:'application-managed',id:'before',size:bytes.length,ownership:'owned',close:()=>closed++,read:async(at,n)=>{source.id='after';return bytes.slice(at,at+n);}};
   const changed=await api.inspectMedia(source).then(()=>null,e=>e.code);
   const denied=await api.inspectMedia({...source,id:'denied',ownership:'borrowed',read:async()=>{throw new api.PlayerError('SOURCE_PERMISSION','Denied');}}).then(()=>null,e=>e.code);
   return {changed,denied,closed};
  });assert.equal(result.changed,'SOURCE_CHANGED');assert.equal(result.denied,'SOURCE_PERMISSION');assert.equal(result.closed,1);
 });
 await check('review queued chapters cannot seek a replacement source',async()=>{
  await make('software');const result=await page.evaluate(async bytes=>{
   await p.open(new File([new Uint8Array(bytes)],'chapters.mkv'));const chapter=p.state.mediaInfo.chapters[1].id;
   const replacement=p.open(movie),stale=p.seekChapter(chapter).catch(e=>e.code);await replacement;const rejected=await stale;
   return {rejected,time:p.state.currentTime};
  },[...await readFile(chapterFile)]);assert.equal(result.rejected,'INVALID_ARGUMENT');assert.ok(result.time<.15);
 });
 await check('review A-B looping enters the interval before resolving',async()=>{
  await make('native');const result=await page.evaluate(async()=>{await p.open(movie);await p.setLoop({start:2,end:3});return {time:p.state.currentTime,intent:p.state.playbackIntent};});assert.ok(Math.abs(result.time-2)<.15);assert.equal(result.intent,'pause');
 });
 await check('review hidden selected attachments remain removable',async()=>{
  await make('native');const result=await page.evaluate(async()=>{
   await p.open(movie);const url=URL.createObjectURL(new Blob(['WEBVTT\n\n00:00.000 --> 00:05.000\nCaption\n'],{type:'text/vtt'}));
   try{const handle=await p.attachTextTrack({src:url,label:'hidden'}),id=p.state.subtitleTracks.find(t=>t.id.endsWith(handle.id)).id;await p.selectSubtitleTrack(id);await p.subtitleVisible(false);await p.removeAttachment(handle);return {remaining:p.state.subtitleTracks.length,visible:p.state.subtitlesVisible};}finally{URL.revokeObjectURL(url);}
  });assert.equal(result.remaining,0);assert.equal(result.visible,false);
 });
 await check('media-session ownership is explicit and teardown releases it',async()=>{
  await make('native');const result=await page.evaluate(async()=>{
   const other=new api.Player(document.createElement('div'));p.presentation.setMediaSessionEnabled(true);let error;try{other.presentation.setMediaSessionEnabled(true);}catch(e){error=e.code;}
   await p.destroy();other.presentation.setMediaSessionEnabled(true);const owned=other.presentation.state.mediaSession;await other.destroy();return {error,owned};
  });assert.equal(result.error,'UNSUPPORTED_FEATURE');assert.equal(result.owned,true);
 });
 await page.evaluate(()=>window.p?.destroy());console.log(out);
}finally{await browser?.close();server?.kill();}

// BEGIN installed-package entrypoint adapter (keep identical across standalone harnesses).
async function installPackageEntrypoint(page, origin) {
 const runtime = process.env.DEMUXE_RUNTIME_ROOT;
 if (!runtime) return;
 const {readFile} = await import('node:fs/promises');
 const {join} = await import('node:path');
 const {createHash} = await import('node:crypto');
 let manifest;
 try { manifest = JSON.parse(await readFile(join(runtime, 'release-manifest.json'), 'utf8')); }
 catch (error) { if (error.code === 'ENOENT') return; throw error; }
 const entry = manifest.files?.['index.js'];
 if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Installed package manifest lacks index.js digest');
 const body = await readFile(join(runtime, 'index.js'));
 if (body.length !== entry.bytes || createHash('sha256').update(body).digest('hex') !== entry.sha256) throw Error('Installed package index.js differs from manifest');
 // Exact URL only: all dependencies and other routes retain the real HTTP server.
 await page.route(url => url.href === new URL('/index.js', origin).href, route => route.fulfill({status:200, contentType:'text/javascript', body}));
}
// END installed-package entrypoint adapter.
