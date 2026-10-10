// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';import http from 'node:http';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,mkdir,copyFile,stat,cp} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const family=process.env.BROWSER||'chrome',root=await mkdtemp(path.join(os.tmpdir(),'demuxe-consumer-')),out=`results/beta/consumer-${family}-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});console.log(out);
const archive=path.resolve(process.env.BETA_ARCHIVE||'build/beta/demuxe-0.3.0-beta.4.tgz');await writeFile(path.join(root,'package.json'),'{"type":"module","private":true}\n');execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund',archive],{cwd:root,env:{...process.env,npm_config_cache:path.join(root,'npm-cache')},stdio:'pipe'});
await writeFile(path.join(root,'consumer.ts'),"import {Player, PLAYBACK_MODES} from 'demuxe'; const p = new Player(document.createElement('div'), {mode: PLAYBACK_MODES[0]}); void p.destroy();\n");
execFileSync(process.execPath,[path.resolve('node_modules/typescript/lib/tsc.js'),'--noEmit','--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.ts'],{cwd:root,stdio:'pipe'});
await mkdir(path.join(root,'media'));await copyFile('fixtures/example.mp4',path.join(root,'media/simple.mp4'));await copyFile('build/fixtures/tracks.mkv',path.join(root,'media/ass.mkv'));if(!process.env.CASES||process.env.CASES==='all'||process.env.CASES.split(',').map(name=>name.trim()).includes('native-remux'))await copyFile('build/routing-completion/fixtures/vp9-opus.mkv',path.join(root,'media/remux.mkv'));
await copyFile('fixtures/qualification.ass',path.join(root,'media/native.ass'));
if(!process.env.CASES||process.env.CASES==='all'||process.env.CASES.split(',').map(name=>name.trim()).some(name=>['av1-software','hdr-software','external-subtitles','hls-expanded','dash-periods'].includes(name)))await cp('build/fixtures/compatibility',path.join(root,'media/compat'),{recursive:true});
const assetRoot=path.join(root,'node_modules/demuxe');const manifest=JSON.parse(await readFile(path.join(assetRoot,'release-manifest.json')));
for(const [name,expected]of Object.entries(manifest.files)){const b=await readFile(path.join(assetRoot,name));assert.equal(createHash('sha256').update(b).digest('hex'),expected.sha256,name);}
const result={testHarnessSHA256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex'),typecheck:true,family,consumerRoot:root,archiveSHA256:createHash('sha256').update(await readFile(archive)).digest('hex'),manifest,cases:[]};
const mpvCases=['private-mpv-subtitles-auto','private-mpv-subtitles-asyncify','private-mpv-audio-auto','private-mpv-audio-asyncify','private-mpv-composed','private-mpv-cancellation','private-mpv-asset-mismatch'];
const hasPrivateMpv=Object.keys(manifest.files).some(n=>/^web\/engine-mpv-(subtitles|audio)-/.test(n));
const hasPrivatePlayback=Object.keys(manifest.files).some(n=>n.startsWith('web/engine-mpv-playback-'));
const playbackCases=['private-software-jspi','private-software-asyncify','private-software-controls','private-software-cancellation','private-software-asset-mismatch','private-hybrid-jspi','private-hybrid-asyncify','private-hybrid-controls'];
if(hasPrivateMpv||hasPrivatePlayback){
 await copyFile('fixtures/m0.mkv',path.join(root,'media/private-subs.mkv'));
 const pcm=path.join(root,'media/private-pcm.mkv'),composed=path.join(root,'media/private-composed.mkv');
 const recipe=['-v','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-i',path.join(root,'media/private-subs.mkv'),'-map','1:v:0','-map','0:a:0','-c:v','copy','-c:a','pcm_s16le','-ac','2','-t','12'];
 result.privateFixtureCommands=[];
 for(const [dest,subs] of [[pcm,false],[composed,true]]){const args=[...recipe,...(subs?['-map','1:s:0','-map','1:t?','-c:s','copy']:[]),dest];execFileSync('ffmpeg',args,{stdio:'pipe'});result.privateFixtureCommands.push(args);}
 result.privateFixtures={};for(const name of ['private-subs.mkv','private-pcm.mkv','private-composed.mkv'])result.privateFixtures[name]=createHash('sha256').update(await readFile(path.join(root,'media',name))).digest('hex');
}
// Automatic presentation can use RGB when WebGL2 is unavailable.
// Verify the selected engine against this consumer's HTTP delivery evidence.
let missingEngine=false,mpvMismatch=null,armPlaybackRead=false,holdPlaybackReads=false,activeAssRequests=null;
const heldReads={started:0,active:0,aborted:0};
const server=http.createServer(async(req,res)=>{if(activeAssRequests){const event={url:origin+req.url,method:req.method,at:Date.now(),status:null};activeAssRequests.push(event);res.once('finish',()=>{event.status=res.statusCode;});}try{const u=new URL(req.url,'http://local');if(armPlaybackRead&&req.method==='GET'&&/engine-mpv-playback-.*\/player\.wasm$/.test(u.pathname))holdPlaybackReads=true;if(u.searchParams.has('held')||holdPlaybackReads&&u.pathname==='/media/private-pcm.mkv'){heldReads.started++;heldReads.active++;await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);heldReads.active--;resolve();};const timer=setTimeout(finish,10000);res.once('close',()=>{heldReads.aborted++;finish();});});if(res.destroyed)return;}if(mpvMismatch&&u.pathname.endsWith(`/engine-mpv-${mpvMismatch}-asyncify/${mpvMismatch==='playback'?'player':'service'}.wasm`)){res.setHeader('Content-Type','application/wasm');res.end(await readFile(path.join(assetRoot,`web/engine-mpv-${mpvMismatch}-jspi/${mpvMismatch==='playback'?'player':'service'}.wasm`)));return;}if(missingEngine&&u.pathname.endsWith('/engine-hybrid/player.wasm')){res.writeHead(404).end('missing engine');return;}if(!u.searchParams.has('noisolation')){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><input id="file" type="file"><script type="module">import{Player,PLAYBACK_MODES}from"/vendor/demuxe/index.js";window.API={Player,PLAYBACK_MODES};window.errors=[];</script>');return;}
const prefix=u.pathname.startsWith('/vendor/demuxe/')?assetRoot:root;const rel=u.pathname.startsWith('/vendor/demuxe/')?u.pathname.slice('/vendor/demuxe/'.length):u.pathname.slice(1);const f=path.resolve(prefix,rel);if(!f.startsWith(prefix+path.sep)){res.writeHead(403).end();return;}const b=await readFile(f);res.setHeader('Content-Type',f.endsWith('.wasm')?'application/wasm':/\.(m?js)$/.test(f)?'text/javascript':f.endsWith('.mp4')?'video/mp4':'application/octet-stream');
const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"fixture-v1"');if(range){const a=Number(range[1]),z=Math.min(b.length-1,range[2]?Number(range[2]):b.length-1);if(a>z){res.writeHead(416).end();return;}res.writeHead(206,{'Content-Range':`bytes ${a}-${z}/${b.length}`,'Content-Length':z-a+1});res.end(b.subarray(a,z+1));}else res.end(b);
}catch(e){res.writeHead(404).end(String(e));}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const launchBrowser=()=>({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
let browser=await launchBrowser();result.browser=browser.version();
const directCases=['automatic-local','native-no-isolation'];
const cases=['automatic-local','native-no-isolation','hybrid-pin','software-pin','automatic-ass','native-remux','native-external-ass','transitions','rollback','missing-engine','isolation-error','rgb-override','av1-software','hdr-software','external-subtitles','surround-output','hls-expanded','dash-periods'];
const privateCases=['remux-auto-isolated','remux-auto-no-isolation','remux-asyncify-no-isolation','remux-on-isolated','remux-off-no-isolation'];
if(manifest.files['web/engine-remux-jspi/remux.wasm'])cases.push(...privateCases);
if(hasPrivateMpv)cases.push(...mpvCases);
if(hasPrivatePlayback)cases.push(...playbackCases);
if(!manifest.files['web/engine-subtitles/service.wasm'])cases.splice(cases.indexOf('native-external-ass'),1);
const standardCases=[...cases];
if(process.env.ADAPTATION_FIXTURE){cases.push('native-adaptation','native-opus');if(manifest.files['web/engine-subtitles/service.wasm'])cases.push('native-adaptation-ass-gain');await copyFile(process.env.ADAPTATION_FIXTURE,path.join(root,'media/adaptation.mkv'));}
if(process.env.AUTOMATIC_ADAPTATION_FIXTURE){cases.push('automatic-lossless');await copyFile(process.env.AUTOMATIC_ADAPTATION_FIXTURE,path.join(root,'media/automatic.mkv'));}
try{let caseIndex=0;const selectedCases=selectConsumerCases(standardCases,cases,process.env.CASES),workerRetries=new Map();result.caseSelection=[...selectedCases];for(let caseNumber=0;caseNumber<selectedCases.length;caseNumber++){const name=selectedCases[caseNumber];if(caseIndex++) {await browser.close();browser=await launchBrowser();}missingEngine=name==='missing-engine';const page=await browser.newPage();const r={name,requests:[],requestDetails:[],workerURLs:[],workerEvents:[],failedResponses:[],pageErrors:[],attempts:workerRetries.has(name)?[workerRetries.get(name)]:[]};let expectedErrors=[];activeAssRequests=r.serverRequests=[];result.cases.push(r);page.on('worker',worker=>{r.workerURLs.push(worker.url());r.workerEvents.push({url:worker.url(),at:Date.now()});});page.on('request',q=>{r.requests.push(q.url());r.requestDetails.push({url:q.url(),method:q.method(),at:Date.now()});});page.on('response',response=>{if(response.status()>=400)r.failedResponses.push({url:response.url(),status:response.status()});});page.on('pageerror',error=>r.pageErrors.push(String(error)));page.setDefaultTimeout(30000);
if(directCases.includes(name)||name==='automatic-ass')await page.addInitScript(observeDirectStartup);
try{if(playbackCases.includes(name)){await runPrivatePlaybackCase(page,name,r);r.passed=true;console.log('PASS',name);continue;}if(mpvCases.includes(name)){await runPrivateMpvCase(page,name,r);r.passed=true;console.log('PASS',name);continue;}await page.goto(origin+((name.includes('isolation')&&!name.endsWith('-isolated'))?'/?noisolation':'/'));await page.waitForFunction(()=>window.API);assert.deepEqual(await page.evaluate(()=>API.PLAYBACK_MODES),['native','hybrid','software']);

const mode=name==='native-no-isolation'||name==='native-remux'||name.startsWith('native-adaptation')||name==='native-opus'||name==='native-external-ass'?'native':['software-pin','rgb-override','av1-software','hdr-software','external-subtitles','surround-output','hls-expanded','dash-periods'].includes(name)?'software':['hybrid-pin','missing-engine','isolation-error'].includes(name)?'hybrid':undefined;
await page.evaluate(options=>{window.player=new API.Player(document.querySelector('#host'),options);player.addEventListener('error',e=>errors.push(e.detail));},{mode,width:640,height:360,...(name==='isolation-error'?{remuxRuntime:'off'}:{}),...(privateCases.includes(name)?{nativeRemux:'always',remuxRuntime:name.includes('-asyncify-')?'asyncify':name.includes('-off-')?'off':name.includes('-on-')?'on':'auto'}:{}),...(name==='automatic-lossless'?{automaticAudioAdaptation:'lossless',nativeRemux:'always'}:{}),...(name==='hdr-software'?{toneMapping:'hdr-to-sdr'}:{}),...(name==='surround-output'?{audioOutput:'7.1'}:{}),...(name==='rgb-override'?{softwarePresenter:'rgb'}:{}),...(name==='native-remux'?{nativeRemux:'always'}:{}),...(name==='native-adaptation'?{nativeRemux:'always',experimentalAudioAdaptation:'flac'}:{}),...(name==='native-opus'?{nativeRemux:'always',experimentalAudioAdaptation:'opus',allowLossyAudio:true,experimentalNativeASS:true}:{}),...(name==='native-adaptation-ass-gain'?{nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalNativeASS:true,audioGain:.5}:{}),...(name==='native-external-ass'?{experimentalNativeASS:true}:{})});
if(directCases.includes(name)||name==='automatic-ass')await page.evaluate(observeStartupVerification);
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
const at=Date.now();r.openStartedAt=at;r.openError=await page.evaluate(async name=>{if(window.directStartup)directStartup.openStarted=performance.now();try{if(name==='hls-expanded'||name==='dash-periods')await player.openRemote({url:location.origin+'/media/compat/'+(name==='hls-expanded'?'low/index.m3u8':'period0/manifest.mpd'),format:name==='hls-expanded'?'hls':'dash'});else await player.open(document.querySelector('#file').files[0]);return null;}catch(e){return String(e);}},name);r.openMs=Date.now()-at;if(directCases.includes(name)||name==='automatic-ass'){r.openPhase=await captureStartupPhase(page,r,'open');r.openPlan=r.openPhase.diagnostics.plan?.id;}
if(['missing-engine','isolation-error','remux-off-no-isolation'].includes(name)){assert.ok(r.openError);if(name==='remux-off-no-isolation')assert.match(r.openError,/isolation/);}
else{assert.equal(r.openError,null);if(directCases.includes(name)||name==='automatic-ass')await page.evaluate(()=>{startupPhase='first-play';});await page.evaluate(()=>player.play());await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.3);r.mode=await page.evaluate(()=>player.mode);
if(name==='automatic-ass'){
 assert.equal(r.mode,'native');assert.ok(['native-direct-mpv','native-remux-mpv'].includes(await page.evaluate(()=>player.diagnostics.plan.id)));
 await page.waitForFunction(()=>{const canvas=document.querySelector('.demuxe-native-ass');if(!canvas)return false;const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return data.some((value,index)=>index%4===3&&value>0);});
 r.embeddedSubtitle=await page.evaluate(()=>player.diagnostics.backend.mpvSubtitles);assert.ok(r.embeddedSubtitle.bitmapUpdates>0);
}else if(mode)assert.equal(r.mode,mode);else assert.equal(r.mode,'native');
if(name==='transitions'){r.transitions=[];for(const m of ['hybrid','software','native']){await page.evaluate(m=>player.setMode(m),m);assert.equal(await page.evaluate(()=>player.mode),m);r.transitions.push(m);}await page.evaluate(()=>player.setAutomaticSelection());}
if(name==='rollback'){const q=await page.evaluate(async()=>{const old=player.surface,id=player.state.sourceId;try{await player.open(new File(['bad'],'bad.mp4'));}catch(e){return {error:e.toJSON(),same:old===player.surface,sourcePreserved:player.state.sourceId===id,sessionError:player.state.error};}});assert.equal(q.error.scope,'operation');assert.equal(q.error.operation,'opening');assert.ok(Number.isInteger(q.error.operationId));assert.equal(q.same,true);assert.equal(q.sourcePreserved,true);assert.equal(q.sessionError,null);expectedErrors=[q.error];r.rollback=q;}
if(name==='external-subtitles'||name==='native-external-ass'||name==='native-adaptation-ass-gain'){
 await page.evaluate(async name=>{const font=await(await fetch(name!=='external-subtitles'?'/vendor/demuxe/fixtures/DejaVuSans.ttf':'/media/compat/custom.ttf')).blob();await player.addFont(new File([font],'custom.ttf'));const sub=await(await fetch(name!=='external-subtitles'?'/media/native.ass':'/media/compat/subtitle.ass')).blob();await player.addSubtitle(new File([sub],'captions.ass'),{label:'Packaged subtitle',language:'eng'});},name);
 assert.ok(await page.evaluate(()=>player.properties.get('track-list').some(t=>t.external&&t.title==='Packaged subtitle')));
 if(name!=='external-subtitles'){await page.waitForFunction(()=>player.current.backend.mpvSubs.stats.renders>0);assert.equal(await page.evaluate(()=>player.mode),'native');}
}
if(name==='surround-output'){const a=await page.evaluate(()=>player.audioDiagnostics());assert.equal(a.outputChannels,a.deviceChannels>=8?8:2);r.audio=a;}
if(directCases.includes(name)||name==='automatic-ass'){r.firstPlayPhase=await captureStartupPhase(page,r,'first-play');await page.evaluate(()=>{startupPhase='controls';});}
await page.evaluate(async()=>{await player.pause();await player.seek(1);await player.play();});await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>1.15);
if(directCases.includes(name)||name==='automatic-ass')r.controlsPhase=await captureStartupPhase(page,r,'controls');
r.diagnostics=await page.evaluate(()=>player.diagnostics);if(privateCases.includes(name)){const selection=r.diagnostics.remuxRuntime;const expected=name==='remux-auto-isolated'?'pthread':name==='remux-asyncify-no-isolation'?'asyncify':selection.jspi?'jspi':'asyncify';assert.equal(selection.runtime,expected);assert.equal(r.diagnostics.plan.id,'native-remux');assert.equal(r.diagnostics.backend.remux.remux.transport,expected);}if(name==='software-pin'){
 const backend=r.diagnostics.backend;assert.equal(backend.softwarePresenterPolicy,'auto');assert.ok(['yuv','rgb'].includes(backend.softwarePresenter));
 if(backend.softwarePresenter==='rgb')assert.ok(backend.yuvRejectionReason&&backend.yuvRejectionReason!=='forced-rgb'&&backend.yuvRejectionReason!=='unknown','Automatic RGB presentation must explain why YUV was rejected');
 const engine=backend.yuvRejectionReason==='webgl2-unavailable'?'full':'yuv';
 assert.ok(r.serverRequests.some(q=>q.method==='GET'&&q.status===200&&q.url.endsWith(`/engine-software-${engine}/player.wasm`)),'The server must deliver the selected software engine');
}if(name==='rgb-override'){assert.ok(r.serverRequests.some(q=>q.method==='GET'&&q.status===200&&q.url.endsWith('/engine-software-full/player.wasm')));assert.equal(r.diagnostics.backend.softwarePresenter,'rgb');}if(name==='native-adaptation'||name==='automatic-lossless')assert.equal(r.diagnostics.plan.id,'native-flac');if(name==='native-opus'){assert.equal(r.diagnostics.plan.id,'native-opus');assert.equal(await page.evaluate(()=>player.capabilities.features.externalSubtitles.availability),manifest.files['web/engine-subtitles/service.wasm']?'available':'unavailable');}if(name==='native-adaptation-ass-gain')assert.equal(r.diagnostics.plan.id,'native-flac-ass-gain');assert.deepEqual(await page.evaluate(()=>errors),expectedErrors);
if(directCases.includes(name)||name==='automatic-ass'){
 const phase=r.openPhase,observation=phase.observation;
 const facts={name,observation,requests:phase.requests,browserRequests:phase.browserRequests,workers:phase.workers,workerEvents:phase.workerEvents,openStartedAt:r.openStartedAt,openPlan:r.openPlan,attempts:phase.diagnostics.selection.attempts,backend:phase.diagnostics.backend,mode:phase.mode,plan:phase.diagnostics.plan.id,runtime:phase.diagnostics.remuxRuntime.runtime,assetBase:origin+'/vendor/demuxe/',manifestFiles:manifest.files};
 if(name==='automatic-ass')r.assStartup=classifyAssStartupTraffic({...facts,requireBitmap:false});else r.directStartup=classifyDirectStartupTraffic(facts);
 (r.assStartup??r.directStartup).observation=observation;
 r.firstPlayClassification=classifyPlaybackPhase({name,previous:r.openPhase,current:r.firstPlayPhase,phase:'first-play',assetBase:origin+'/vendor/demuxe/',manifestFiles:manifest.files});
 r.controlsClassification=classifyPlaybackPhase({name,previous:r.firstPlayPhase,current:r.controlsPhase,phase:'controls',assetBase:origin+'/vendor/demuxe/',manifestFiles:manifest.files});
 assert.deepEqual(r.firstPlayClassification.violations,[],'First play exceeded its observed native output recovery policy');
 assert.deepEqual(r.controlsClassification.violations,[],'Pause/seek/replay exceeded the selected native recipe');
}
}
await page.evaluate(()=>player.destroy());const cleanupStart=Date.now(),cleanupLimitMs=name==='native-remux'?5000:2000;for(const deadline=cleanupStart+cleanupLimitMs;page.workers().length&&Date.now()<deadline;)await page.waitForTimeout(50);r.cleanupMs=Date.now()-cleanupStart;r.cleanupLimitMs=cleanupLimitMs;r.workersAfter=page.workers().map(worker=>worker.url());assert.deepEqual(r.workersAfter,[]);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);if(name==='automatic-local'){r.disabledStartup={};await runDisabledStartupCheck(browser,origin,path.join(root,'media/simple.mp4'),manifest,r.disabledStartup);}if(directCases.includes(name)){assert.deepEqual(r.directStartup.violations,[],'Startup exceeded the selected direct or timed remux policy');assert.deepEqual(r.pageErrors,[]);}if(name==='automatic-ass'){assert.deepEqual(r.assStartup.violations,[],'ASS startup exceeded the inspected native subtitle recipe');assert.deepEqual(r.pageErrors,[]);assert.deepEqual(r.failedResponses,[]);}r.passed=true;console.log('PASS',name);
}catch(e){r.state=await page.evaluate(()=>({diagnostics:window.player?.diagnostics,errors,probes:['video/mp4; codecs="avc1"','video/mp4; codecs="avc1,mp4a.40.2"','video/mp4; codecs="avc1.4d401e"','audio/mp4; codecs="mp4a.40.2"'].map(m=>[m,document.createElement('video').canPlayType(m)])})).catch(()=>null);r.error=String(e.stack);const retryableWorkerError=r.error.includes('Playback engine worker failed: error')&&r.state?.errors?.some(error=>error.code==='ASSET_LOAD_FAILED'&&error.retryable);if(retryableWorkerError&&!workerRetries.has(name)){workerRetries.set(name,{error:r.error,failedResponses:r.failedResponses,pageErrors:r.pageErrors,workers:page.workers().map(worker=>worker.url())});result.cases.pop();caseNumber--;console.log('RETRY',name,'after retryable worker startup failure');}else{console.log('FAIL',name,r.error);process.exitCode=1;}}finally{await page.evaluate(()=>window.player?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}}
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.cases.length>0&&result.cases.length===result.caseSelection?.length&&result.cases.every(r=>r.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}

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

async function runPrivatePlaybackCase(page,name,row){
 const negative=name.endsWith('-cancellation')||name.endsWith('-asset-mismatch');row.executions=[];
 for(const mode of negative?['software','hybrid']:[name.includes('-hybrid-')?'hybrid':'software']){
  const runtime=name.endsWith('-jspi')?'jspi':'asyncify',entry={mode,runtime};row.executions.push(entry);
  const heldBefore=heldReads.started;
  try{
   await page.goto(origin+'/?noisolation');await page.waitForFunction(()=>window.API);
   entry.capabilities=await page.evaluate(()=>({isolated:crossOriginIsolated,jspi:typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function'}));assert.equal(entry.capabilities.isolated,false);
   if(runtime==='jspi'&&!entry.capabilities.jspi){
    entry.runtimeUnavailable=await page.evaluate(({mode,runtime})=>{try{new API.Player(document.querySelector('#host'),{mode,remuxRuntime:runtime});return false;}catch(e){return e.code==='UNSUPPORTED_FEATURE';}},{mode,runtime});assert.equal(entry.runtimeUnavailable,true);entry.passed=true;continue;
   }
   mpvMismatch=name.endsWith('-asset-mismatch')?'playback':null;armPlaybackRead=name.endsWith('-cancellation');holdPlaybackReads=false;
   await page.evaluate(({mode,runtime})=>{
    window.player=new API.Player(document.querySelector('#host'),{mode,remuxRuntime:runtime,width:640,height:360});player.addEventListener('error',e=>errors.push(e.detail));
    window.opening=player.openRemote({url:location.origin+'/media/private-pcm.mkv'}).then(()=>({opened:true}),e=>({error:{code:e.code,message:e.message}}));
   },{mode,runtime});
   if(name.endsWith('-cancellation')){
    for(let i=0;i<800&&heldReads.started===heldBefore;i++)await page.waitForTimeout(25);
    assert.ok(heldReads.started>heldBefore&&heldReads.active>0,'No real pending playback source read observed');
    entry.closeMs=await page.evaluate(async()=>{const start=performance.now();await player.destroy();return performance.now()-start;});assert.ok(entry.closeMs<1500);entry.open=await page.evaluate(()=>opening);assert.ok(entry.open.error);
    for(let i=0;i<60&&heldReads.active;i++)await page.waitForTimeout(25);assert.equal(heldReads.active,0);entry.heldReads={...heldReads};
   }else if(name.endsWith('-asset-mismatch')){
    entry.open=await page.evaluate(()=>opening);assert.equal(entry.open.error?.code,'ASSET_LOAD_FAILED');
   }else{
    entry.open=await page.evaluate(()=>opening);assert.equal(entry.open.error,undefined,JSON.stringify(entry.open));
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.5);
    entry.diagnostics=await page.evaluate(()=>player.diagnostics);assert.equal(entry.diagnostics.plan.id,mode+'-private');assert.equal(entry.diagnostics.backend.runtime,runtime);
    entry.audio=await page.evaluate(()=>player.audioDiagnostics());assert.ok(entry.audio.mediaFrames>0);assert.ok(entry.audio.rms>.001);
    if(mode==='hybrid'){assert.equal(entry.diagnostics.backend.decoderBackend,'webcodecs');assert.ok(entry.diagnostics.backend.retained.presented>0);}
    if(name.endsWith('-controls')){
     await page.evaluate(async()=>{await player.pause();await player.seek(1);await player.setPlaybackRate(.75);await player.setVolume(.5);});
     assert.ok(await page.evaluate(()=>Math.abs(player.state.currentTime-1)<.15));
     await page.evaluate(async()=>{await player.setPlaybackRate(1);await player.seek(player.state.duration-.5);await player.play();});await page.waitForFunction(()=>player.current.backend.properties.get('eof-reached'));
     await page.evaluate(async()=>{await player.seek(0);await player.play();});await page.waitForFunction(()=>player.state.currentTime>.3&&!player.current.backend.properties.get('eof-reached'));
     await page.evaluate(async()=>{await player.openRemote({url:location.origin+'/media/private-pcm.mkv'});await player.seek(1);});entry.replacement=true;
    }
    assert.deepEqual(await page.evaluate(()=>errors),[]);
   }
   entry.cleanup=await page.evaluate(async()=>{const backend=player.current?.backend;await player.destroy();return backend?.diagnostics?.cleanup;});
   for(let i=0;i<40&&page.workers().length;i++)await page.waitForTimeout(50);assert.equal(page.workers().length,0);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);
   if(entry.cleanup){assert.equal(entry.cleanup.scheduler.liveTasks,0);assert.equal(entry.cleanup.scheduler.freeSlots,24);}entry.passed=true;
  }finally{mpvMismatch=null;armPlaybackRead=false;holdPlaybackReads=false;await page.evaluate(()=>window.player?.destroy()).catch(()=>{});}
 }
}

// Kept in this source-bound consumer harness so release verification binds this
// assertion as well as the browser flow. Compilation of immutable fallback Wasm
// is permitted after400ms; native remux work requires the observed500ms startup
// timeout, selected native recipe, exact assets, and actual worker timing.
function classifyDirectStartupTraffic({name,observation,requests,workers,workerEvents=[],openStartedAt,openPlan,attempts=[],backend,mode,plan,runtime,assetBase,manifestFiles}){
 const violations=[],disabled=name==='automatic-local-escalation-disabled',fallback=!disabled&&plan==='native-remux';
 if(mode!=='native'||!['native-direct',...disabled?[]:['native-remux']].includes(plan)||openPlan!==plan)violations.push('Startup route changed or left the native tier');
 if(disabled?observation.policy!==null:observation.policy?.prefetchAfterMs!==400||observation.policy?.switchAfterMs!==500)violations.push('Unexpected startup policy');
 if(observation.instantiations!==0)violations.push('Unexpected main-thread Wasm instantiation');
 const path=['pthread','jspi','asyncify'].includes(runtime)?`web/engine-remux${runtime==='pthread'?'':'-'+runtime}/remux.wasm`:null;
 const allowedURL=path?new URL(path,assetBase).href:null;
 const workerPaths=['web/native-remux-source-worker.js','web/native-remux-worker.js',...runtime==='pthread'?['web/native-mse-worker.js']:[]];
 const workerURLs=new Set(workerPaths.map(path=>new URL(path,assetBase).href));
 const executableRoots=new Set(['filter-retained-engine-worker.js','software-full-engine-worker.js','retained-decoder-worker.js','native-mse-worker.js','native-remux-worker.js','native-remux-source-worker.js','io-worker.js','mpv-subtitle-worker.js','browser-decoder-worker.js','audio-worker.js','playback-worker.js','source-probe.js']);
 for(const request of requests){
  if(request.method==='HEAD')continue;
  const url=new URL(request.url);if(!/\.(?:m?js|wasm)$/i.test(url.pathname))continue;
  const path=url.href.startsWith(assetBase)?url.href.slice(assetBase.length):null;
  if(request.method!=='GET'||!path||!manifestFiles[path])violations.push('Foreign or unmanifested direct startup executable: '+request.url);
 }
 const bodies=requests.filter(request=>{if(request.method==='HEAD')return false;const pathname=new URL(request.url).pathname;return /\.wasm$/i.test(pathname)||/\/engine-[^/]+\/[^/]+\.(?:m?js)$/i.test(pathname)||!pathname.includes('/web/generated/')&&executableRoots.has(pathname.split('/').at(-1));});
 const actualOpenStartedAt=Number.isFinite(observation.timeOrigin)&&Number.isFinite(observation.openStarted)?observation.timeOrigin+observation.openStarted:NaN;
 const afterSwitch=event=>Number.isFinite(actualOpenStartedAt)&&Number.isFinite(event?.at)&&event.at-actualOpenStartedAt>=500;
 if(fallback){
  const failed=attempts.findIndex(attempt=>attempt.mode==='native'&&attempt.outcome==='failed'&&/^native-direct: NativeLoadTimeout: Native loaded(?:data|metadata) timed out$/.test(attempt.reason));
  const selected=attempts.findIndex(attempt=>attempt.mode==='native'&&attempt.outcome==='selected'&&attempt.reason.startsWith('native-remux:'));
  if(failed<0||selected<=failed||attempts.some((attempt,index)=>attempt.outcome==='failed'&&index!==failed))violations.push('Remux lacks the original native startup timeout and selected fallback');
  if(backend?.path!=='native'||backend?.plan!=='remux'||backend?.remux?.remux?.transport!==runtime)violations.push('Remux recipe or transport mismatch');
  if(!workers.some(url=>url===new URL('web/native-remux-worker.js',assetBase).href)||workers.length!==workerEvents.length||workers.some((url,index)=>workerEvents[index]?.url!==url))violations.push('Missing fallback worker evidence');
  for(const event of workerEvents)if(!workerURLs.has(event.url)||!afterSwitch(event))violations.push('Unexpected or premature fallback worker: '+event.url);
 }else if(workers.length)violations.push('Direct route created a worker');
 let prefetched=0;
 for(const request of bodies){
  const fetch=observation.fetches.find(fetch=>fetch.url===request.url&&fetch.method!=='HEAD');
  const warm=request.url===allowedURL&&fetch&&Number.isFinite(observation.openStarted)&&fetch.at-observation.openStarted>=400&&fetch.priority==='low';
  if(request.method==='GET'&&!disabled&&request.url===allowedURL&&manifestFiles[path]&&warm){prefetched++;continue;}
  const fallbackPaths=[...workerPaths,...path?[path,path.slice(0,-5)+'.mjs']:[]],selected=fallbackPaths.find(path=>new URL(path,assetBase).href===request.url);
  if(fallback&&request.method==='GET'&&selected&&manifestFiles[selected]&&afterSwitch(request))continue;
  violations.push('Unexpected, premature or unmanifested engine/inspector body: '+request.url);
 }
 if(prefetched>1||!fallback&&bodies.length>1)violations.push('More than one speculative engine body');
 return{violations,outcome:fallback?'native-remux-after-startup-timeout':'native-direct',allowedPrefetchPath:disabled?null:path,allowedPrefetchIdentity:!disabled&&path?manifestFiles[path]:null,prefetched:prefetched>0,fallbackEvidence:fallback?{openPlan,hostDispatchStartedAt:openStartedAt,actualOpenStartedAt,attempts,workerEvents}:undefined};
}

function observeDirectStartup(){
 window.directStartup={fetches:[],instantiations:0,timeOrigin:performance.timeOrigin,openStarted:null};
 const fetchOriginal=globalThis.fetch;globalThis.fetch=function(input,options){const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(url.pathname.endsWith('.wasm'))directStartup.fetches.push({url:url.href,method:options?.method??(input instanceof Request?input.method:'GET'),at:performance.now(),priority:options?.priority});return Reflect.apply(fetchOriginal,this,[input,options]);};
 for(const name of ['instantiate','instantiateStreaming']){const original=WebAssembly[name];if(original)WebAssembly[name]=function(...args){directStartup.instantiations++;return Reflect.apply(original,this,args);};}
 const Instance=WebAssembly.Instance;WebAssembly.Instance=new Proxy(Instance,{construct(target,args,newTarget){directStartup.instantiations++;return Reflect.construct(target,args,newTarget);}});
}

async function runDisabledStartupCheck(browser,origin,fixture,manifest,row){
 const page=await browser.newPage(),previousRequests=activeAssRequests;
 Object.assign(row,{requestDetails:[],workerURLs:[],workerEvents:[],serverRequests:[],pageErrors:[]});activeAssRequests=row.serverRequests;
 page.on('request',request=>row.requestDetails.push({url:request.url(),method:request.method(),at:Date.now()}));
 page.on('worker',worker=>{row.workerURLs.push(worker.url());row.workerEvents.push({url:worker.url(),at:Date.now()});});page.on('pageerror',error=>row.pageErrors.push(String(error)));
 const name='automatic-local-escalation-disabled',common={name,assetBase:origin+'/vendor/demuxe/',manifestFiles:manifest.files};
 try{
  await page.addInitScript(observeDirectStartup);await page.goto(origin+'/');await page.waitForFunction(()=>window.API);
  await page.evaluate(()=>{window.player=new API.Player(document.querySelector('#host'),{startupEscalation:false,width:640,height:360});player.addEventListener('error',event=>errors.push(event.detail));});
  await page.evaluate(observeStartupVerification);await page.locator('#file').setInputFiles(fixture);
  await page.evaluate(async()=>{directStartup.openStarted=performance.now();await player.open(document.querySelector('#file').files[0]);});
  const phase=row.openPhase=await captureStartupPhase(page,row,'open');
  row.classification=classifyDirectStartupTraffic({...common,observation:phase.observation,mode:phase.mode,openPlan:phase.diagnostics.plan.id,plan:phase.diagnostics.plan.id,runtime:phase.diagnostics.remuxRuntime.runtime,requests:[...phase.requests,...phase.browserRequests],workers:phase.workers,workerEvents:phase.workerEvents});
  assert.deepEqual(row.classification.violations,[],'Disabled startup escalation fetched or executed an engine during open');
  await page.evaluate(async()=>{startupPhase='first-play';await player.play();});await page.waitForFunction(()=>player.state.currentTime>.3);
  row.firstPlayPhase=await captureStartupPhase(page,row,'first-play');
  row.firstPlayClassification=classifyPlaybackPhase({...common,previous:row.openPhase,current:row.firstPlayPhase,phase:'first-play'});
  assert.deepEqual(row.firstPlayClassification.violations,[],'Disabled startup first play exceeded its observed output recovery policy');
  await page.evaluate(async()=>{startupPhase='controls';await player.pause();await player.seek(1);await player.play();});await page.waitForFunction(()=>player.state.currentTime>1.15);
  row.controlsPhase=await captureStartupPhase(page,row,'controls');
  row.controlsClassification=classifyPlaybackPhase({...common,previous:row.firstPlayPhase,current:row.controlsPhase,phase:'controls'});
  assert.deepEqual(row.controlsClassification.violations,[],'Disabled startup controls exceeded the selected native recipe');
  assert.deepEqual(await page.evaluate(()=>errors),[]);assert.deepEqual(row.pageErrors,[]);
  await page.evaluate(()=>player.destroy());const deadline=Date.now()+2000;while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(50);assert.deepEqual(page.workers(),[]);assert.equal(await page.locator('#host video,#host canvas,iframe').count(),0);row.passed=true;return row;
 }finally{try{await page.evaluate(()=>window.player?.destroy()).catch(()=>{});await page.close();}finally{activeAssRequests=previousRequests;}}
}

// Matroska ASS requires a real FFmpeg inspection worker before native loading.
// Its optional startup fallback is a second, separately observed remux session;
// subtitle execution remains mandatory on both accepted native recipes.
function classifyAssStartupTraffic({observation,requests,browserRequests=[],workers,workerEvents,openPlan,attempts,backend,mode,plan,runtime,assetBase,manifestFiles,requireBitmap=true}){
 const violations=[],fallback=plan==='native-remux-mpv';
 const direct='native-direct-mpv',remux='native-remux-mpv';
 if(mode!=='native'||![direct,remux].includes(plan)||openPlan!==plan)violations.push('Unexpected ASS route');
 if(observation.policy?.prefetchAfterMs!==400||observation.policy?.switchAfterMs!==500||observation.instantiations!==0)violations.push('Unexpected ASS startup policy or main-thread execution');
 const started=Number.isFinite(observation.timeOrigin)&&Number.isFinite(observation.openStarted)?observation.timeOrigin+observation.openStarted:NaN;
 if(!Number.isFinite(started))violations.push('Missing actual ASS open clock');
 const failed=attempts.filter(a=>a.outcome==='failed');
 const selected=attempts.findIndex(a=>a.mode==='native'&&a.outcome==='selected'&&a.reason===plan+': Playback requirements and actual startup accepted');
 const failedIndex=attempts.findIndex(a=>a.mode==='native'&&a.outcome==='failed'&&/^native-direct-mpv: NativeLoadTimeout: Native loaded(?:data|metadata) timed out$/.test(a.reason));
 if(selected<0||(fallback?(failed.length!==1||failedIndex<0||selected<=failedIndex):failed.length!==0))violations.push('ASS route lacks exact direct selection or timed fallback evidence');
 if(!attempts.some(a=>a.mode==='probe'&&a.outcome==='skipped'&&a.reason.endsWith('Matroska alternate tracks need FFmpeg selection')))violations.push('Missing required Matroska inspection evidence');
 if(backend?.path!=='native'||backend?.plan!==(fallback?'remux-mpv':'direct-mpv')||requireBitmap&&!(backend?.mpvSubtitles?.bitmapUpdates>0)||backend?.mpvSubtitles?.route!==(fallback?'native-remux + mpv-subtitles':'native-direct + mpv-subtitles'))violations.push('ASS backend or presented subtitle mismatch');
 if(!['pthread','jspi','asyncify'].includes(runtime)||fallback&&backend?.remux?.remux?.transport!==runtime)violations.push('ASS transport mismatch');
 const stem=`web/engine-remux${runtime==='pthread'?'':'-'+runtime}/remux`,subtitle='web/engine-subtitles/service';
 const workerPaths=['web/native-remux-source-worker.js','web/native-remux-worker.js','web/mpv-subtitle-worker.js','web/io-worker.js',subtitle+'.mjs'];
 const allowed=new Set([...workerPaths,'web/source-probe.js',stem+'.mjs',stem+'.wasm',subtitle+'.wasm'].map(path=>new URL(path,assetBase).href));
 const manifestPath=url=>{try{const parsed=new URL(url);return parsed.href.startsWith(assetBase)?parsed.href.slice(assetBase.length):null;}catch{return null;}};
 if(workers.length!==workerEvents.length||workers.some((url,index)=>workerEvents[index]?.url!==url))violations.push('ASS worker evidence mismatch');
 for(const event of workerEvents){const path=manifestPath(event.url);if(!workerPaths.includes(path)||!manifestFiles[path]||!Number.isFinite(event.at)||event.at<started)violations.push('Unexpected or untimed ASS worker: '+event.url);}
 for(const path of ['web/native-remux-source-worker.js','web/native-remux-worker.js']){
  const events=workerEvents.filter(e=>e.url===new URL(path,assetBase).href);
  if(events.length!==(fallback?2:1)||fallback&&events[1].at-started<500)violations.push('Missing distinct inspection and timed fallback workers: '+path);
 }
 for(const path of ['web/mpv-subtitle-worker.js','web/io-worker.js',subtitle+'.mjs'])if(!workers.includes(new URL(path,assetBase).href))violations.push('Missing required ASS worker: '+path);
 for(const path of [stem+'.mjs',stem+'.wasm',subtitle+'.mjs',subtitle+'.wasm'])if(!requests.some(r=>r.method==='GET'&&r.url===new URL(path,assetBase).href))violations.push('Missing required ASS executable body: '+path);
 const executableRoots=new Set(['filter-retained-engine-worker.js','software-full-engine-worker.js','retained-decoder-worker.js','native-mse-worker.js','native-remux-worker.js','native-remux-source-worker.js','io-worker.js','mpv-subtitle-worker.js','browser-decoder-worker.js','audio-worker.js','playback-worker.js','source-probe.js']);
 for(const request of requests){
  if(request.method==='HEAD')continue;
  const pathname=new URL(request.url).pathname;
  if(/\.(?:m?js|wasm)$/i.test(pathname)&&(!manifestFiles[manifestPath(request.url)]||request.method!=='GET'||![200,206].includes(request.status)))violations.push('Unmanifested or unsuccessful ASS script response: '+request.url);
  if(!(pathname.endsWith('.wasm')||/\/engine-[^/]+\/[^/]+\.(?:m?js)$/.test(pathname)||!pathname.includes('/web/generated/')&&executableRoots.has(pathname.split('/').at(-1))))continue;
  const path=manifestPath(request.url);
  if(request.method!=='GET'||![200,206].includes(request.status)||!allowed.has(request.url)||!manifestFiles[path]||!Number.isFinite(request.at)||request.at<started)violations.push('Unexpected, untimed or unmanifested ASS executable: '+request.url);
 }
 // Server proof fills Firefox's worker-import visibility gap; browser events
 // still reject foreign executable requests which never reach this server.
 for(const request of browserRequests){
  if(request.method==='HEAD')continue;
  const pathname=new URL(request.url).pathname;
  if(!/\.(?:m?js|wasm)$/i.test(pathname))continue;
  if(!manifestFiles[manifestPath(request.url)]||!requests.some(served=>served.url===request.url&&served.method===request.method&&[200,206].includes(served.status)))violations.push('Browser-observed ASS executable lacks successful local server proof: '+request.url);
 }
 return{violations,requestEvidence:'case-scoped HTTP server completions; browser requests and worker events cross-checked',outcome:fallback?'native-remux-mpv-after-startup-timeout':direct,actualOpenStartedAt:started,attempts,workerEvents};
}

// Observe the real verifier without changing its arguments, result, or rejection.
function observeStartupVerification(){
 window.startupPhase='open';window.startupVerifications=[];
 const original=player.playNativeVerified;
 if(typeof original!=='function')throw Error('Missing native verification observation point');
 player.playNativeVerified=function(...args){
  const record={phase:startupPhase,started:performance.timeOrigin+performance.now(),budget:args[2]??null,plan:this.diagnostics.plan?.id,automatic:this.automatic,sourceKind:this.source?.kind,nativeRemux:this.nativeRemux};startupVerifications.push(record);
  const finish=error=>{record.finished=performance.timeOrigin+performance.now();record.error=error?{name:error.name,message:error.message,stage:error.stage,evidenceTimeout:error.evidenceTimeout}:null;};
  let work;try{work=Reflect.apply(original,this,args);}catch(error){finish(error);throw error;}
  return Promise.resolve(work).then(value=>{finish();return value;},error=>{finish(error);throw error;});
 };
}
async function captureStartupPhase(page,row,name){
 const snapshot=await page.evaluate(()=>({at:performance.timeOrigin+performance.now(),firefox:/Firefox\/\d/.test(navigator.userAgent),observation:{...directStartup,policy:player.startupEscalation??null},diagnostics:player.diagnostics,mode:player.mode,state:player.state,audioCounterAvailable:typeof player.surface?.webkitAudioDecodedByteCount==='number',verifications:startupVerifications}));
 // Deep copies are essential: later workers and completed HTTP responses must
 // never rewrite the evidence for an earlier operation.
 return structuredClone({...snapshot,name,requests:row.serverRequests??row.requestDetails,browserRequests:row.requestDetails,workers:row.workerURLs,workerEvents:row.workerEvents});
}
function classifyPlaybackPhase({name,previous,current,phase,assetBase,manifestFiles}){
 const violations=[],ass=name==='automatic-ass',direct=ass?'native-direct-mpv':'native-direct',remux=ass?'native-remux-mpv':'native-remux';
 const before=previous.diagnostics.plan?.id,plan=current.diagnostics.plan?.id,runtime=current.diagnostics.remuxRuntime.runtime,backend=current.diagnostics.backend;
 if(name==='automatic-local-escalation-disabled'&&(previous.observation.policy!==null||current.observation.policy!==null))violations.push('Disabled startup policy changed between phases');
 const changed=before!==plan,records=current.verifications.filter(r=>r.phase===phase),failures=records.filter(r=>r.error);
 if(previous.state.sourceId===null||previous.state.sourceId===undefined||current.state.sourceId!==previous.state.sourceId||current.state.pendingOperation!==null)violations.push('Phase changed source identity or has an unfinished operation');
 if(!Number.isFinite(previous.at)||!Number.isFinite(current.at)||current.at<previous.at||records.some(r=>!Number.isFinite(r.started)||!Number.isFinite(r.finished)||r.finished<r.started||r.finished>current.at||r.started<previous.at))violations.push('Incomplete or out-of-window verification observation');
 const failure=failures[0],recovery=phase==='first-play'&&changed&&before===direct&&plan===remux;
 // First-play transport recovery is distinct from the configurable open timeout.
 // pthread remux can use window MSE; only the selected worker owner needs an MSE worker.
 const outputBudget=previous.firefox===true?500:1500,mseOwner=backend?.remux?.mseOwner??'window',workerMSE=plan===remux&&mseOwner==='worker';
 if(typeof previous.firefox!=='boolean'||current.firefox!==previous.firefox)violations.push('Missing or changed browser recovery policy observation');
 if(plan===remux&&(!['window','worker'].includes(mseOwner)||workerMSE&&runtime!=='pthread'))violations.push('Invalid selected MSE owner');
 if(current.mode!=='native'||![direct,remux].includes(plan)||current.state.status!=='playing'||!(current.state.currentTime>(phase==='controls'?1.15:.3)))violations.push('Native phase lacks selected route and observed playback progress');
 if(!['pthread','jspi','asyncify'].includes(runtime)||runtime!==previous.diagnostics.remuxRuntime.runtime)violations.push('Native phase runtime changed or is unsupported');
 if(current.observation.instantiations!==previous.observation.instantiations)violations.push('Unexpected main-thread phase instantiation');
 if(changed&&!recovery)violations.push('Unexpected post-open route change');
 if(recovery){
  if(!['automatic-local','automatic-local-escalation-disabled'].includes(name)&&!ass||failures.length!==1||failure?.plan!==direct||failure?.budget!==outputBudget||failure?.automatic!==true||failure?.sourceKind!=='local'||failure?.nativeRemux!=='auto'||failure?.error?.name!=='StartupEvidenceTimeout'||failure?.error?.stage!=='output'||failure?.error?.message!=='Native output evidence timed out'||failure?.error?.evidenceTimeout!==true||!Number.isFinite(failure?.started)||!Number.isFinite(failure?.finished)||failure.finished-failure.started<outputBudget||failure.started<previous.at)violations.push('Missing exact bounded original native output-timeout evidence');
  const attempts=current.diagnostics.selection.attempts,skip=attempts.findIndex(a=>a.mode==='native'&&a.outcome==='skipped'&&a.reason===direct+': '+(ass?'Source policy requires controlled remux transport':'This source policy requires controlled remux transport')),selected=attempts.findIndex(a=>a.mode==='native'&&a.outcome==='selected'&&a.reason===remux+': Playback requirements and actual startup accepted');
  if(skip<0||selected<=skip||attempts.some(a=>a.outcome==='failed'))violations.push('Missing exact controlled-remux recovery selection');
 }else if(failures.length)violations.push('Unaccounted native verification failure');
 if(backend?.path!=='native'||backend?.plan!==(plan===remux?(ass?'remux-mpv':'remux'):(ass?'direct-mpv':'direct')))violations.push('Native phase backend recipe mismatch');
 if(plan===remux&&backend?.remux?.remux?.transport!==runtime)violations.push('Native phase remux transport mismatch');
 const capability=current.diagnostics.runtimeCapabilities?.find(c=>c.planId===plan),evidence=capability?.evidence;
 if(!evidence?.outputVerified||!evidence?.videoPresented||!evidence?.audioProgress||current.audioCounterAvailable&&!evidence?.audioDecoded)violations.push('Native phase lacks observed audio progress and presented video evidence');
 if(ass&&!(backend?.mpvSubtitles?.bitmapUpdates>0))violations.push('ASS phase lacks rendered subtitle output');
 const stem=`web/engine-remux${runtime==='pthread'?'':'-'+runtime}/remux`,subtitle='web/engine-subtitles/service';
 const workerPaths=plan===remux?['web/native-remux-source-worker.js','web/native-remux-worker.js',...workerMSE?['web/native-mse-worker.js']:[],...ass?['web/mpv-subtitle-worker.js','web/io-worker.js',subtitle+'.mjs']:[]]:ass?['web/mpv-subtitle-worker.js','web/io-worker.js',subtitle+'.mjs']:[];
 const roots=new Set(['filter-retained-engine-worker.js','software-full-engine-worker.js','retained-decoder-worker.js','native-mse-worker.js','native-remux-worker.js','native-remux-source-worker.js','io-worker.js','mpv-subtitle-worker.js','browser-decoder-worker.js','audio-worker.js','playback-worker.js','source-probe.js']);
 const allowed=new Set([...workerPaths,...plan===remux?['web/source-probe.js',stem+'.mjs',stem+'.wasm']:[],...ass?[subtitle+'.wasm']:[]]);
 const pathOf=url=>{try{const u=new URL(url);return u.href.startsWith(assetBase)?u.href.slice(assetBase.length):null;}catch{return null;}};
 const minimum=recovery?failure?.finished:previous.at;
 const workers=current.workerEvents.slice(previous.workerEvents.length);
 if(current.workers.length!==current.workerEvents.length||current.workers.some((u,i)=>u!==current.workerEvents[i]?.url))violations.push('Phase worker evidence mismatch');
 for(const event of workers)if(!workerPaths.includes(pathOf(event.url))||!manifestFiles[pathOf(event.url)]||!Number.isFinite(event.at)||!Number.isFinite(minimum)||event.at<minimum)violations.push('Unselected or premature phase worker: '+event.url);
 if(recovery)for(const path of ['web/native-remux-source-worker.js','web/native-remux-worker.js',...workerMSE?['web/native-mse-worker.js']:[]])if(!workers.some(e=>e.url===new URL(path,assetBase).href))violations.push('Missing actual recovery worker: '+path);
 const requests=current.requests.slice(previous.requests.length),browserRequests=current.browserRequests.slice(previous.browserRequests.length);
 for(const request of [...requests,...browserRequests]){
  if(request.method==='HEAD')continue;
  const pathname=new URL(request.url).pathname;if(!/\.(?:m?js|wasm)$/i.test(pathname))continue;
  const path=pathOf(request.url);
  if(request.method!=='GET'||!manifestFiles[path])violations.push('Foreign or unmanifested phase executable: '+request.url);
  if(!current.requests.some(r=>r.url===request.url&&r.method===request.method&&[200,206].includes(r.status)))violations.push('Phase executable lacks local successful HTTP proof: '+request.url);
  if(pathname.endsWith('.wasm')||/\/engine-[^/]+\/[^/]+\.(?:m?js)$/.test(pathname)||!pathname.includes('/web/generated/')&&roots.has(pathname.split('/').at(-1))){
   if(!allowed.has(path)||!Number.isFinite(request.at)||!Number.isFinite(minimum)||request.at<minimum)violations.push('Unselected or premature phase executable: '+request.url);
  }
 }
 if(recovery)for(const path of [stem+'.mjs',stem+'.wasm'])if(!current.requests.some(r=>r.url===new URL(path,assetBase).href&&r.method==='GET'&&[200,206].includes(r.status)))violations.push('Missing selected recovery module body: '+path);
 return{violations,outcome:recovery?'native-remux-after-observed-output-timeout':plan,verification:failure??null,phase};
}

function selectConsumerCases(standard,available,requested){
 if(requested===undefined)return [...standard];
 if(requested==='all')return [...available];
 const selected=requested.split(',').map(name=>name.trim());
 if(!selected.length||selected.some(name=>!name)||new Set(selected).size!==selected.length)throw Error('Consumer CASES must be a nonempty unique selection');
 for(const name of selected)if(!available.includes(name))throw Error('Unknown or unavailable consumer case: '+name);
 return selected;
}
