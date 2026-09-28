// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';import http from 'node:http';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,mkdir,copyFile,stat,cp} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const family=process.env.BROWSER||'chrome',root=await mkdtemp(path.join(os.tmpdir(),'demuxe-consumer-')),out=`results/beta/consumer-${family}-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});console.log(out);
const archive=path.resolve(process.env.BETA_ARCHIVE||'build/beta/demuxe-0.3.0-beta.4.tgz');await writeFile(path.join(root,'package.json'),'{"type":"module","private":true}\n');execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund',archive],{cwd:root,env:{...process.env,npm_config_cache:path.join(root,'npm-cache')},stdio:'pipe'});
await writeFile(path.join(root,'consumer.ts'),"import {Player, PLAYBACK_MODES} from 'demuxe'; const p = new Player(document.createElement('div'), {mode: PLAYBACK_MODES[0]}); void p.destroy();\n");
execFileSync(process.execPath,[path.resolve('node_modules/typescript/lib/tsc.js'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.ts'],{cwd:root,stdio:'pipe'});
await mkdir(path.join(root,'media'));await copyFile('fixtures/example.mp4',path.join(root,'media/simple.mp4'));await copyFile('build/fixtures/tracks.mkv',path.join(root,'media/ass.mkv'));if(!process.env.CASES||process.env.CASES.split(',').includes('native-remux'))await copyFile('build/routing-completion/fixtures/vp9-opus.mkv',path.join(root,'media/remux.mkv'));
await copyFile('fixtures/qualification.ass',path.join(root,'media/native.ass'));
if(!process.env.CASES||process.env.CASES.split(',').some(name=>['av1-software','hdr-software','external-subtitles','hls-expanded','dash-periods'].includes(name)))await cp('build/fixtures/compatibility',path.join(root,'media/compat'),{recursive:true});
const assetRoot=path.join(root,'node_modules/demuxe');const manifest=JSON.parse(await readFile(path.join(assetRoot,'release-manifest.json')));
for(const [name,expected]of Object.entries(manifest.files)){const b=await readFile(path.join(assetRoot,name));assert.equal(createHash('sha256').update(b).digest('hex'),expected.sha256,name);}
const result={testHarnessSHA256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex'),typecheck:true,family,consumerRoot:root,archiveSHA256:createHash('sha256').update(await readFile(archive)).digest('hex'),manifest,cases:[]};
const mpvCases=['private-mpv-subtitles-auto','private-mpv-subtitles-asyncify','private-mpv-audio-auto','private-mpv-audio-asyncify','private-mpv-composed','private-mpv-cancellation','private-mpv-asset-mismatch'];
const hasPrivateMpv=Object.keys(manifest.files).some(n=>n.startsWith('web/engine-mpv-'));
if(hasPrivateMpv){
 await copyFile('fixtures/m0.mkv',path.join(root,'media/private-subs.mkv'));
 const pcm=path.join(root,'media/private-pcm.mkv'),composed=path.join(root,'media/private-composed.mkv');
 const recipe=['-v','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-i',path.join(root,'media/private-subs.mkv'),'-map','1:v:0','-map','0:a:0','-c:v','copy','-c:a','pcm_s16le','-ac','2','-t','12'];
 result.privateFixtureCommands=[];
 for(const [dest,subs] of [[pcm,false],[composed,true]]){const args=[...recipe,...(subs?['-map','1:s:0','-map','1:t?','-c:s','copy']:[]),dest];execFileSync('ffmpeg',args,{stdio:'pipe'});result.privateFixtureCommands.push(args);}
 result.privateFixtures={};for(const name of ['private-subs.mkv','private-pcm.mkv','private-composed.mkv'])result.privateFixtures[name]=createHash('sha256').update(await readFile(path.join(root,'media',name))).digest('hex');
}
let missingEngine=false,mpvMismatch=null;
const heldReads={started:0,active:0,aborted:0};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');if(u.searchParams.has('held')){heldReads.started++;heldReads.active++;await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);heldReads.active--;resolve();};const timer=setTimeout(finish,10000);res.once('close',()=>{heldReads.aborted++;finish();});});if(res.destroyed)return;}if(mpvMismatch&&u.pathname.endsWith(`/engine-mpv-${mpvMismatch}-asyncify/service.wasm`)){res.setHeader('Content-Type','application/wasm');res.end(await readFile(path.join(assetRoot,`web/engine-mpv-${mpvMismatch}-jspi/service.wasm`)));return;}if(missingEngine&&u.pathname.endsWith('/engine-hybrid/player.wasm')){res.writeHead(404).end('missing engine');return;}if(!u.searchParams.has('noisolation')){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><input id="file" type="file"><script type="module">import{Player,PLAYBACK_MODES}from"/vendor/demuxe/index.js";window.API={Player,PLAYBACK_MODES};window.errors=[];</script>');return;}
const prefix=u.pathname.startsWith('/vendor/demuxe/')?assetRoot:root;const rel=u.pathname.startsWith('/vendor/demuxe/')?u.pathname.slice('/vendor/demuxe/'.length):u.pathname.slice(1);const f=path.resolve(prefix,rel);if(!f.startsWith(prefix+path.sep)){res.writeHead(403).end();return;}const b=await readFile(f);res.setHeader('Content-Type',f.endsWith('.wasm')?'application/wasm':/\.(m?js)$/.test(f)?'text/javascript':f.endsWith('.mp4')?'video/mp4':'application/octet-stream');
const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"fixture-v1"');if(range){const a=Number(range[1]),z=Math.min(b.length-1,range[2]?Number(range[2]):b.length-1);if(a>z){res.writeHead(416).end();return;}res.writeHead(206,{'Content-Range':`bytes ${a}-${z}/${b.length}`,'Content-Length':z-a+1});res.end(b.subarray(a,z+1));}else res.end(b);
}catch(e){res.writeHead(404).end(String(e));}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browser=browser.version();
const cases=['automatic-local','native-no-isolation','hybrid-pin','software-pin','automatic-ass','native-remux','native-external-ass','transitions','rollback','missing-engine','isolation-error','rgb-override','av1-software','hdr-software','external-subtitles','surround-output','hls-expanded','dash-periods'];
const privateCases=['remux-auto-isolated','remux-auto-no-isolation','remux-asyncify-no-isolation','remux-on-isolated','remux-off-no-isolation'];
if(manifest.files['web/engine-remux-jspi/remux.wasm'])cases.push(...privateCases);
if(hasPrivateMpv)cases.push(...mpvCases);
if(!manifest.files['web/engine-ass/subtitles.wasm'])cases.splice(cases.indexOf('native-external-ass'),1);
if(process.env.ADAPTATION_FIXTURE){cases.push('native-adaptation','native-opus');if(manifest.files['web/engine-ass/subtitles.wasm'])cases.push('native-adaptation-ass-gain');await copyFile(process.env.ADAPTATION_FIXTURE,path.join(root,'media/adaptation.mkv'));}
if(process.env.AUTOMATIC_ADAPTATION_FIXTURE){cases.push('automatic-lossless');await copyFile(process.env.AUTOMATIC_ADAPTATION_FIXTURE,path.join(root,'media/automatic.mkv'));}
try{for(const name of cases.filter(n=>!process.env.CASES||process.env.CASES.split(",").includes(n))){missingEngine=name==='missing-engine';const page=await browser.newPage();const r={name,requests:[]};let expectedErrors=[];result.cases.push(r);page.on('request',q=>r.requests.push(q.url()));page.setDefaultTimeout(30000);
try{if(mpvCases.includes(name)){await runPrivateMpvCase(page,name,r);r.passed=true;console.log('PASS',name);continue;}await page.goto(origin+((name.includes('isolation')&&!name.endsWith('-isolated'))?'/?noisolation':'/'));await page.waitForFunction(()=>window.API);assert.deepEqual(await page.evaluate(()=>API.PLAYBACK_MODES),['native','hybrid','software']);

const mode=name==='native-no-isolation'||name==='native-remux'||name.startsWith('native-adaptation')||name==='native-opus'||name==='native-external-ass'?'native':['software-pin','rgb-override','av1-software','hdr-software','external-subtitles','surround-output','hls-expanded','dash-periods'].includes(name)?'software':['hybrid-pin','missing-engine','isolation-error'].includes(name)?'hybrid':undefined;
await page.evaluate(options=>{window.player=new API.Player(document.querySelector('#host'),options);player.addEventListener('error',e=>errors.push(e.detail));},{mode,width:640,height:360,...(privateCases.includes(name)?{nativeRemux:'always',remuxRuntime:name.includes('-asyncify-')?'asyncify':name.includes('-off-')?'off':name.includes('-on-')?'on':'auto'}:{}),...(name==='automatic-lossless'?{automaticAudioAdaptation:'lossless'}:{}),...(name==='hdr-software'?{toneMapping:'hdr-to-sdr'}:{}),...(name==='surround-output'?{audioOutput:'7.1'}:{}),...(name==='rgb-override'?{softwarePresenter:'rgb'}:{}),...(name==='native-remux'?{nativeRemux:'always'}:{}),...(name==='native-adaptation'?{nativeRemux:'always',experimentalAudioAdaptation:'flac'}:{}),...(name==='native-opus'?{nativeRemux:'always',experimentalAudioAdaptation:'opus',allowLossyAudio:true,experimentalNativeASS:true}:{}),...(name==='native-adaptation-ass-gain'?{nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalNativeASS:true,audioGain:.5}:{}),...(name==='native-external-ass'?{experimentalNativeASS:true}:{})});
await page.locator('#file').setInputFiles(path.join(root,'media',name==='automatic-lossless'?'automatic.mkv':(name.startsWith('native-adaptation')||name==='native-opus')?'adaptation.mkv':name==='av1-software'?'compat/av1-10.mkv':name==='hdr-software'?'compat/hdr.mkv':name==='external-subtitles'?'compat/black.mp4':name==='automatic-ass'?'ass.mkv':name==='native-remux'?'remux.mkv':'simple.mp4'));
if(name==='hls-expanded'||name==='dash-periods'){
 const rejected=await page.evaluate(async name=>{try{await player.openRemote({url:location.origin+'/media/compat/'+(name==='hls-expanded'?'master.m3u8':'periods.mpd'),format:name==='hls-expanded'?'hls':'dash',streaming:{maxBandwidth:200000}});return null;}catch(e){return String(e);}},name);
 assert.match(rejected,/FFmpeg fallback cannot preserve an explicit adaptive quality constraint/);
 r.qualityConstraint={error:rejected,events:await page.evaluate(()=>errors.splice(0))};
 assert.deepEqual(r.qualityConstraint.events.map(e=>e.code),['UNSUPPORTED_FEATURE']);
 const unsupported=await page.evaluate(async name=>{try{await player.openRemote({url:location.origin+'/media/compat/'+(name==='hls-expanded'?'master.m3u8':'periods.mpd'),format:name==='hls-expanded'?'hls':'dash'});return null;}catch(e){return String(e);}},name);
 assert.match(unsupported,name==='hls-expanded'?/HLS subtitle renditions require Shaka/:/Multiple DASH periods require Shaka/);
 r.semanticConstraint={error:unsupported,events:await page.evaluate(()=>errors.splice(0))};
 assert.deepEqual(r.semanticConstraint.events.map(e=>e.code),['DECODE_FAILED']);
}
const at=Date.now();r.openError=await page.evaluate(async name=>{try{if(name==='hls-expanded'||name==='dash-periods')await player.openRemote({url:location.origin+'/media/compat/'+(name==='hls-expanded'?'low/index.m3u8':'period0/manifest.mpd'),format:name==='hls-expanded'?'hls':'dash'});else await player.open(document.querySelector('#file').files[0]);return null;}catch(e){return String(e);}},name);r.openMs=Date.now()-at;
if(['missing-engine','isolation-error','remux-off-no-isolation'].includes(name)){assert.ok(r.openError);if(name==='remux-off-no-isolation')assert.match(r.openError,/isolation/);}
else{assert.equal(r.openError,null);await page.evaluate(()=>player.play());await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.3);r.mode=await page.evaluate(()=>player.mode);
if(name==='automatic-ass')assert.equal(r.mode,'hybrid');else if(mode)assert.equal(r.mode,mode);else assert.equal(r.mode,'native');
if(name==='transitions'){r.transitions=[];for(const m of ['hybrid','software','native']){await page.evaluate(m=>player.setMode(m),m);assert.equal(await page.evaluate(()=>player.mode),m);r.transitions.push(m);}await page.evaluate(()=>player.setAutomaticSelection());}
if(name==='rollback'){const q=await page.evaluate(async()=>{const old=player.surface,id=player.state.sourceId;try{await player.open(new File(['bad'],'bad.mp4'));}catch(e){return {error:e.toJSON(),same:old===player.surface,sourcePreserved:player.state.sourceId===id,sessionError:player.state.error};}});assert.equal(q.error.scope,'operation');assert.equal(q.error.operation,'opening');assert.ok(Number.isInteger(q.error.operationId));assert.equal(q.same,true);assert.equal(q.sourcePreserved,true);assert.equal(q.sessionError,null);expectedErrors=[q.error];r.rollback=q;}
if(name==='external-subtitles'||name==='native-external-ass'||name==='native-adaptation-ass-gain'){
 await page.evaluate(async name=>{const font=await(await fetch(name!=='external-subtitles'?'/vendor/demuxe/fixtures/DejaVuSans.ttf':'/media/compat/custom.ttf')).blob();await player.addFont(new File([font],'custom.ttf'));const sub=await(await fetch(name!=='external-subtitles'?'/media/native.ass':'/media/compat/subtitle.ass')).blob();await player.addSubtitle(new File([sub],'captions.ass'),{label:'Packaged subtitle',language:'eng'});},name);
 assert.ok(await page.evaluate(()=>player.properties.get('track-list').some(t=>t.external&&t.title==='Packaged subtitle')));
 if(name!=='external-subtitles'){await page.waitForFunction(()=>player.current.backend.ass.stats.renders>0);assert.equal(await page.evaluate(()=>player.mode),'native');}
}
if(name==='surround-output'){const a=await page.evaluate(()=>player.audioDiagnostics());assert.equal(a.outputChannels,a.deviceChannels>=8?8:2);r.audio=a;}
await page.evaluate(async()=>{await player.pause();await player.seek(1);await player.play();});await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>1.15);
r.diagnostics=await page.evaluate(()=>player.diagnostics);if(privateCases.includes(name)){const selection=r.diagnostics.remuxRuntime;const expected=name==='remux-auto-isolated'?'pthread':name==='remux-asyncify-no-isolation'?'asyncify':selection.jspi?'jspi':'asyncify';assert.equal(selection.runtime,expected);assert.equal(r.diagnostics.plan.id,'native-remux');assert.equal(r.diagnostics.backend.remux.remux.transport,expected);}if(name==='software-pin')assert.ok(r.requests.some(u=>u.endsWith('/engine-software-yuv/player.wasm')));if(name==='rgb-override'){assert.ok(r.requests.some(u=>u.endsWith('/engine-software-full/player.wasm')));assert.equal(r.diagnostics.backend.softwarePresenter,'rgb');}if(name==='native-adaptation'||name==='automatic-lossless')assert.equal(r.diagnostics.plan.id,'native-flac');if(name==='native-opus'){assert.equal(r.diagnostics.plan.id,'native-opus');assert.equal(await page.evaluate(()=>player.capabilities.features.externalSubtitles.availability),manifest.files['web/engine-ass/subtitles.wasm']?'available':'unavailable');}if(name==='native-adaptation-ass-gain')assert.equal(r.diagnostics.plan.id,'native-flac-ass-gain');assert.deepEqual(await page.evaluate(()=>errors),expectedErrors);
if(['automatic-local','native-no-isolation'].includes(name))assert.ok(!r.requests.some(u=>/\.wasm|engine-worker|source-probe\.js/.test(u)),'Direct path fetched an engine/inspector');
}
await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);assert.equal(page.workers().length,0);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);r.passed=true;console.log('PASS',name);
}catch(e){r.state=await page.evaluate(()=>({diagnostics:window.player?.diagnostics,errors,probes:['video/mp4; codecs="avc1"','video/mp4; codecs="avc1,mp4a.40.2"','video/mp4; codecs="avc1.4d401e"','audio/mp4; codecs="mp4a.40.2"'].map(m=>[m,document.createElement('video').canPlayType(m)])})).catch(()=>null);r.error=String(e.stack);console.log('FAIL',name,r.error);process.exitCode=1;}finally{await page.evaluate(()=>window.player?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}}
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.cases.every(r=>r.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}

async function runPrivateMpvCase(page,name,row){
 const negative=name==='private-mpv-cancellation'||name==='private-mpv-asset-mismatch';
 row.services=[];
 for(const service of negative?['subtitles','audio']:[name.includes('audio')?'audio':name==='private-mpv-composed'?'composed':'subtitles']){
  const audio=service!=='subtitles',subs=service!=='audio',policy=negative||name.endsWith('-asyncify')?'asyncify':'auto';
  const entry={service,policy};row.services.push(entry);
  mpvMismatch=name==='private-mpv-asset-mismatch'?service:null;
  const heldBefore=heldReads.started;
  const workerListener=worker=>{if(name==='private-mpv-cancellation'&&worker.url().includes(service==='audio'?'/private-mpv/audio-worker.js':'/mpv-subtitle-worker.js'))void worker.evaluate(()=>{
   const original=fetch;globalThis.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(url.pathname.startsWith('/media/private-')){url.searchParams.set('held','1');return original(url,options);}return original(input,options);};
  }).catch(()=>{});};
  page.on('worker',workerListener);
  try{
   await page.goto(origin+'/?noisolation');await page.waitForFunction(()=>window.API);
   entry.capabilities=await page.evaluate(()=>({isolated:crossOriginIsolated,jspi:typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function'}));
   assert.equal(entry.capabilities.isolated,false);
   await page.evaluate(({policy,audio,file})=>{
    window.player=new API.Player(document.querySelector('#host'),{remuxRuntime:policy,nativeRemux:'always',width:640,height:360,...(audio?{audioPlayback:'worklet'}:{})});
    player.addEventListener('error',e=>errors.push(e.detail));
    window.opening=player.openRemote({url:location.origin+'/media/'+file}).then(()=>({opened:true}),e=>({error:{code:e.code,message:e.message}}));
   },{policy,audio,file:service==='subtitles'?'private-subs.mkv':service==='audio'?'private-pcm.mkv':'private-composed.mkv'});
   if(name==='private-mpv-cancellation'){
    for(let i=0;i<400&&heldReads.started===heldBefore;i++)await page.waitForTimeout(25);
    assert.ok(heldReads.started>heldBefore&&heldReads.active>0,'No real pending service read observed');
    entry.closeMs=await page.evaluate(async()=>{const at=performance.now();await player.destroy();return performance.now()-at;});
    assert.ok(entry.closeMs<1500,'Cancellation waited for source deadline');entry.open=await page.evaluate(()=>opening);assert.ok(entry.open.error);
    for(let i=0;i<60&&heldReads.active;i++)await page.waitForTimeout(25);assert.equal(heldReads.active,0);entry.heldReads={...heldReads};
   }else if(name==='private-mpv-asset-mismatch'){
    entry.open=await page.evaluate(()=>opening);assert.equal(entry.open.error?.code,'ASSET_LOAD_FAILED');
   }else{
    entry.open=await page.evaluate(()=>opening);assert.equal(entry.open.error,undefined,JSON.stringify(entry.open));
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.5);
    entry.diagnostics=await page.evaluate(()=>player.diagnostics);
    const expected=policy==='asyncify'?'asyncify':entry.capabilities.jspi?'jspi':'asyncify';
    assert.equal(entry.diagnostics.remuxRuntime.runtime,expected);
    assert.equal(entry.diagnostics.plan.id,audio?(subs?'native-video-mpv-audio-subtitles':'native-video-mpv-audio'):'native-remux-mpv');
    for(const key of [...(audio?['mpvAudio']:[]),...(subs?['mpvSubtitles']:[])]){
     const facts=entry.diagnostics.backend[key].privateRuntime;assert.equal(facts.runtime,expected);assert.equal(facts.memory,'ArrayBuffer');assert.equal(facts.crossOriginIsolated,false);
    }
    await page.evaluate(async()=>{await player.pause();await player.seek(1);});
    if(subs){await page.evaluate(()=>player.current.backend.mpvSubs.currentText());await page.waitForFunction(()=>{const c=document.querySelector('.demuxe-native-ass');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});entry.subtitlePixels=true;}
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>1.3);
    if(audio){entry.audio=await page.evaluate(()=>player.diagnostics.backend.mpvAudio);assert.equal(entry.audio.mpvVideoTracks,0);assert.ok(entry.audio.queuedFrames<=8192);assert.ok(entry.audio.absErrorP95Ms<150);}
    await page.evaluate(async()=>{await player.seek(player.state.duration-.5);await player.play();});await page.waitForFunction(()=>player.surface.ended);
    await page.evaluate(async()=>{await player.seek(0);await player.play();});await page.waitForFunction(()=>player.state.currentTime>.5&&!player.surface.ended);
    assert.deepEqual(await page.evaluate(()=>errors),[]);
   }
   await page.evaluate(()=>player.destroy());for(let i=0;i<40&&page.workers().length;i++)await page.waitForTimeout(50);assert.equal(page.workers().length,0);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);entry.passed=true;
  }finally{mpvMismatch=null;page.off('worker',workerListener);await page.evaluate(()=>window.player?.destroy()).catch(()=>{});}
 }
}
