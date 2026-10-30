// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium,firefox,webkit} from 'playwright';
import {createServer} from 'node:http';
import {audioOnlyFixture} from '../packages/provider-mediabunny/test/audio-only-fixture.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../packages/provider-mediabunny'),repo=resolve(root,'../..');
const deploymentRoot=process.env.DEMUXE_COMPOSED_DEPLOYMENT;
const candidate=process.env.DEMUXE_PUBLIC_RUNTIME_CANDIDATE,backup=process.env.DEMUXE_BACKUP_PROBE,evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!candidate||!backup||!evidence)throw Error('Set DEMUXE_PUBLIC_RUNTIME_CANDIDATE, DEMUXE_BACKUP_PROBE and DEMUXE_BROWSER_EVIDENCE');
const browserName=process.env.DEMUXE_PUBLIC_BROWSER??'chrome';
const audioOnly=process.env.DEMUXE_TEST_AUDIO_ONLY==='1';
const mov=process.env.DEMUXE_TEST_MOV==='1';
const audioChannels=Number(process.env.DEMUXE_AUDIO_CHANNELS??2);assert.ok([1,2].includes(audioChannels));
const remote=process.env.DEMUXE_TEST_REMOTE==='1';
const allCases=['direct','default-backup','preferred-mediabunny','declined-mediabunny','corrupt-mediabunny','missing-backup','source-denied'];
const cases=process.env.DEMUXE_BACKUP_CASES?.split(',')??allCases;
assert.ok(cases.length&&new Set(cases).size===cases.length&&cases.every(name=>allCases.includes(name)||name==='natural-decline'),'Invalid selected cases');
assert.ok(['chrome','firefox','webkit'].includes(browserName),'Unknown browser');
const hash=value=>createHash('sha256').update(value).digest('hex');
const originalFixture=await readFile(process.env.DEMUXE_BACKUP_FIXTURE??join(root,'qualification/fixtures/avc-aac-320x240.mp4'));
if(mov){assert.equal(originalFixture.subarray(4,8).toString(),'ftyp');assert.equal(originalFixture.subarray(8,12).toString(),'qt  ','MOV fixture must have a QuickTime major brand');}
const fixture=audioOnly&&!process.env.DEMUXE_BACKUP_FIXTURE?Buffer.from(audioOnlyFixture(originalFixture)):originalFixture,declined=Buffer.from(fixture);
if(cases.includes('declined-mediabunny')||cases.includes('missing-backup')){const group=declined.indexOf('sgpd');assert.ok(group>0);assert.equal(declined.readUInt32BE(group-4),26);assert.equal(declined.subarray(group+8,group+12).toString(),'roll');assert.equal(declined.readInt16BE(group+20),-1);declined.writeInt16BE(-2,group+20);}
const candidateManifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
const sdk=candidateManifest.providers[0].id;assert.ok(['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].includes(sdk));
const manifest=deploymentRoot?JSON.parse(await readFile(join(deploymentRoot,'demuxe-providers.json'),'utf8')):candidateManifest;
const sdkProvider=manifest.providers.find(provider=>provider.id===sdk);assert.equal(sdkProvider?.implementationIdentity,candidateManifest.providers[0].implementationIdentity);
const sdkPath=candidateManifest.assets[0].path,assets=new Map();
for(const asset of manifest.assets){const bytes=await readFile(join(deploymentRoot??candidate,asset.path));assert.equal(hash(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);assets.set('/'+asset.path,bytes);}
const backupAssets=[];
const existingBackup=manifest.providers.find(provider=>provider.id==='ffmpeg-file-preparation');
for(const name of ['remux.mjs','remux.wasm']){
 const bytes=await readFile(join(backup,name)),path='web/engine-remux/'+name,id='backup-'+name;
 if(existingBackup){assert.deepEqual(assets.get('/'+path),bytes,'Composed backup must match pinned probe');}
 else{manifest.assets.push({id,path,bytes:bytes.length,sha256:hash(bytes),dependencies:[]});assets.set('/'+path,bytes);}
 backupAssets.push({id,path,sha256:hash(bytes)});
}
const backupIdentity=existingBackup?.implementationIdentity??'sha256:'+hash(JSON.stringify(Object.fromEntries(backupAssets.sort((a,b)=>a.path.localeCompare(b.path)).map(asset=>['runtime/'+asset.path,asset.sha256])),null,2)+'\n');
if(!existingBackup)manifest.providers.push({id:'ffmpeg-file-preparation',implementationIdentity:backupIdentity,technology:'wasm',delivery:['optional-assets'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}],assetIds:backupAssets.map(asset=>asset.id)});
const app=deploymentRoot?undefined:await build({absWorkingDir:repo,stdin:{contents:`export {Player,DemuxeRuntime} from ${JSON.stringify(join(repo,'src/index.ts'))};`,resolveDir:repo},bundle:true,platform:'browser',format:'esm',write:false});
const application=deploymentRoot?Buffer.from("export {Player,DemuxeRuntime} from '/dist/index.js';"):Buffer.from(app.outputFiles[0].contents),presenter='sha256:'+hash(application);
if(!deploymentRoot)for(const [id,capability,profile] of [['browser-prepared','media.present.prepared','selected-streams'],['browser-original','media.present.original','selected-source']])manifest.providers.push({id,implementationIdentity:presenter,applicationBuild:presenter,technology:'browser-native',delivery:['browser','application-bundle'],offers:[{capability,version:1,profile}],assetIds:[]});
const receipt={deploymentRoot:deploymentRoot??null,status:'running-not-qualified',recordedAt:new Date().toISOString(),identities:{presenter,backup:backupIdentity,mediabunny:sdkProvider.implementationIdentity,harness:hash(await readFile(fileURLToPath(import.meta.url)))},provenance:JSON.parse(await readFile(join(backup,'provenance.json'),'utf8')),fixtures:{ordinary:{sha256:hash(fixture),bytes:fixture.length},declined:{sha256:hash(declined),bytes:declined.length,...cases.some(name=>name==='declined-mediabunny'||name==='missing-backup')?{aacRollDistance:-2}:{unmodified:true}}},cases:[],limits:['Archived FFmpeg artifacts are candidates for these exact tests, not production release qualification','Worker/URL checks cover handles created in the window, not an independent nested-worker census','No complete packet/PCM, large-source, native-memory or release claim']};
const save=()=>writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');await save();let browser,timer,server;let deliveries=[],currentCase,currentDeployment=manifest;const served=[],serverErrors=[],staticInputs={};
try{
 receipt.browserEngine=browserName;
 receipt.audioOnly=audioOnly;
 receipt.container=mov?'mov':'mp4';
 receipt.audioChannels=audioChannels;
 receipt.remote=remote;receipt.requestedCases=cases;receipt.completeMatrix=cases.length===allCases.length&&allCases.every(name=>cases.includes(name));
 browser=await ({chrome:chromium,firefox,webkit}[browserName]).launch({...(browserName==='chrome'?{channel:'chrome'}:{}),headless:true});receipt.browser=browser.version();timer=setTimeout(()=>void browser.close(),120000);
 const page=await browser.newPage();page.on('console',message=>console.log('Browser:',message.text()));page.on('requestfailed',request=>console.log('Request failed:',request.url(),request.failure()?.errorText));
 server=createServer(async(request,response)=>{
  const path=new URL(request.url,'http://127.0.0.1').pathname;served.push(path);
  const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'};
  try{
   if(path==='/denied.mp4'){response.writeHead(401,headers);response.end();return;}
   if(path==='/media.mp4'){
    const bytes=['declined-mediabunny','missing-backup'].includes(currentCase)?declined:fixture;
    assert.equal(request.headers.authorization,'fixture-only');
    const range=request.headers.range&&/^bytes=(\d+)-(\d+)$/.exec(request.headers.range);
    assert.ok(range,'Controlled fixture requires an explicit byte range');
    const start=Number(range[1]),end=Math.min(Number(range[2]),bytes.length-1);
    assert.ok(start>=0&&start<=end&&end<bytes.length);
    response.writeHead(206,{...headers,'Content-Type':mov?'video/quicktime':'audio/mp4',ETag:'"audio-v1"','Accept-Ranges':'bytes','Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${bytes.length}`});response.end(bytes.subarray(start,end+1));return;
   }
   if(path==='/favicon.ico'){response.writeHead(204,headers);response.end();return;}
   let bytes,type='text/javascript';
   if(path==='/'){bytes=Buffer.from('<body></body>');type='text/html';}
   else if(path==='/app.js')bytes=application;
   else if(path==='/demuxe-providers.json'){bytes=Buffer.from(JSON.stringify(currentDeployment));type='application/json';}
   else if(assets.has(path)){bytes=assets.get(path);if(currentCase==='corrupt-mediabunny'&&path==='/'+sdkPath){bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1;}type=path.endsWith('.wasm')?'application/wasm':'text/javascript';deliveries.push({path,bytes:bytes.length,sha256:hash(bytes)});}
   else{if(path.startsWith('/web/engine')||path.startsWith('/web/providers/'))throw Error('Unadmitted asset '+path);const baseRoot=deploymentRoot?resolve(deploymentRoot):repo;const file=resolve(baseRoot,path.replace(/^\//,''));assert.ok(file.startsWith(baseRoot+sep));bytes=await readFile(file);}
   if(type==='text/javascript'&&!assets.has(path)){const fact={bytes:bytes.length,sha256:hash(bytes)};if(staticInputs[path])assert.deepEqual(staticInputs[path],fact,'Application code changed during the run');staticInputs[path]=fact;}
   response.writeHead(200,{...headers,'Content-Type':type,'Content-Length':bytes.length});response.end(bytes);
  }catch(error){serverErrors.push({path,message:error.message});response.writeHead(404,headers);response.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+server.address().port+'/';receipt.transport='loopback HTTP, no route interception';
 await page.goto(base);await page.mouse.click(1,1);
 for(const name of cases){
  deliveries=[];currentCase=name;currentDeployment=name==='missing-backup'?{...manifest,assets:manifest.assets.filter(asset=>!manifest.providers.find(provider=>provider.id==='ffmpeg-file-preparation').assetIds.includes(asset.id)),providers:manifest.providers.filter(provider=>provider.id!=='ffmpeg-file-preparation')}:manifest;
  const result=await page.evaluate(async({manifest,bytes,name,sdk,base,audioOnly,remote,audioChannels,mov})=>{
   const {Player,DemuxeRuntime}=await import('/app.js');if(!crossOriginIsolated)throw Error('Isolation required');
   const reviewedCompositions=providers=>{const identities=Object.fromEntries(providers.map(provider=>[provider.id,provider.implementationIdentity]));return [['mediabunny-file-preparation','mediabunny'],['mediabunny-mp4-file-preparation','mediabunny-mp4'],['mediabunny-mp4-stream-preparation','mediabunny-mp4-stream']].filter(([id])=>identities[id]&&identities['browser-prepared']).map(([id,bindingId])=>({recipeId:'native-remux',bindingId,sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],implementationIdentities:{[id]:identities[id],'browser-prepared':identities['browser-prepared']}}));};
   const runtime=new DemuxeRuntime({assetBase:base,qualifiedProviders:Object.fromEntries(manifest.providers.map(provider=>[provider.id,provider.implementationIdentity])),qualifiedCompositions:reviewedCompositions(manifest.providers)});await runtime.providers.load('demuxe-providers.json');
   const host=document.createElement('div');document.body.append(host);const preferred=name.includes('mediabunny')||name==='natural-decline'||name==='missing-backup'||name==='source-denied';
   const player=new Player(host,{runtime,mode:'native',nativeRemux:name==='direct'?'never':'always',remuxRuntime:'off',preview:false,...(preferred?{providerPreferences:[{capability:'media.prepare.file',providers:[sdk,'ffmpeg-file-preparation']}]}:{}),buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
   const WorkerClass=globalThis.Worker,create=URL.createObjectURL,revoke=URL.revokeObjectURL,workers=new Set(),urls=new Set(),messages=[];let created=0,context;
   globalThis.Worker=class extends WorkerClass{constructor(url,options){super(url,options);created++;workers.add(this);const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};this.addEventListener('error',event=>messages.push({type:'worker-error',url:String(url),message:event.message,filename:event.filename,line:event.lineno}));this.addEventListener('message',({data})=>{if(options?.name==='demuxe-media-preparation'&&data?.ok===true)messages.push({name:options.name,type:'preparation-result',prepared:data.value!==undefined});if(data?.error||data?.type==='error')messages.push({name:options?.name,type:data.type,code:data.error?.code??data.code,message:typeof data.error==='string'?data.error:data.error?.message??data.message});});}};
   URL.createObjectURL=value=>{const url=create.call(URL,value);urls.add(url);return url;};URL.revokeObjectURL=url=>{urls.delete(url);return revoke.call(URL,url);};
   let result;
   try{
    await player.setMuted(true);
    const file=new File([new Uint8Array(bytes)],name+(mov?'.mov':'.mp4')),policy={format:'file',headers:{Authorization:'fixture-only'},credentials:'omit',allowedOrigins:[new URL(base).origin]},input=name==='source-denied'?{...policy,url:base+'denied.mp4'}:remote&&name!=='direct'?{...policy,url:base+'media.mp4',identity:{size:String(bytes.length),etag:'"audio-v1"'}}:file;
    if(name==='corrupt-mediabunny'||name==='missing-backup'||name==='source-denied'){
     let failure;try{await player.open(input);}catch(error){failure=error;}
     const expected=name==='source-denied'?'SOURCE_PERMISSION':name==='corrupt-mediabunny'?'ASSET_LOAD_FAILED':'DEPLOYMENT_UNAVAILABLE';
     if(failure?.code!==expected||(name==='corrupt-mediabunny'||name==='source-denied')&&created)throw Error('Optional failure lost classification: '+JSON.stringify({expected,code:failure?.code,created}));
     if(name==='missing-backup'&&!messages.some(message=>message.code==='PROVIDER_PROFILE_MISMATCH'||message.type==='preparation-result'&&message.prepared===false))throw Error('Missing-backup case did not reach profile decline');
     result={name,terminalCode:failure.code,createdWorkers:created,messages};
    }else{
    await player.open(input);
    if(player.diagnostics.plan?.id!==(name==='direct'?'native-direct':'native-remux'))throw Error('Unexpected selected plan');
    const video=player.surface;await player.seek(1.25);if(Math.abs(player.state.currentTime-1.25)>.05)throw Error('Seek target changed');
    context=new AudioContext({sampleRate:48000});await context.resume();if(context.state!=='running')throw Error('Audio observation unavailable');const tap=context.createMediaElementSource(video),split=context.createChannelSplitter(audioChannels),silent=context.createGain();silent.gain.value=0;tap.connect(split);const analysers=Array.from({length:audioChannels},(_,channel)=>{const analyser=context.createAnalyser();analyser.fftSize=2048;split.connect(analyser,channel);analyser.connect(silent);return analyser;});silent.connect(context.destination);await player.setMuted(false);await player.setVolume(1);
    const bias=player.diagnostics.backend?.remux?.timelineBias??0;
    const fresh=audioOnly?new Promise((resolve,reject)=>{const interval=setInterval(()=>{if(video.currentTime>1.35+bias){clearTimeout(timeout);clearInterval(interval);resolve(video.currentTime-bias);}},20),timeout=setTimeout(()=>{clearInterval(interval);reject(Error('No fresh audio clock progress'));},5000);}):new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No fresh backup frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25+bias){clearTimeout(timeout);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});
    await player.play();const freshFrame=await fresh;let audio;const deadline=performance.now()+3000;
    do{audio=analysers.map((analyser,channel)=>{const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);const tone=frequency=>{let re=0,im=0;for(let n=0;n<samples.length;n++){const phase=2*Math.PI*frequency*n/context.sampleRate;re+=samples[n]*Math.cos(phase);im+=samples[n]*Math.sin(phase);}return Math.hypot(re,im)/samples.length;};return {rms:Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length),expected:tone(channel?660:440),other:tone(channel?440:660)};});if(audio.every(channel=>channel.rms>.01&&channel.expected>channel.other*2))break;await new Promise(resolve=>setTimeout(resolve,20));}while(performance.now()<deadline);
    if(!audio.every(channel=>channel.rms>.01&&channel.expected>channel.other*2))throw Error('Fresh backup stereo missing: '+JSON.stringify({audio,context:context.state,media:{muted:video.muted,volume:video.volume,time:video.currentTime,paused:video.paused,readyState:video.readyState,audioTracks:video.audioTracks?Array.from(video.audioTracks,track=>({id:track.id,enabled:track.enabled,kind:track.kind})):undefined,decodedBytes:video.webkitAudioDecodedByteCount}}));await player.pause();
    let color;
    if(!audioOnly){const canvas=new OffscreenCanvas(64,48),pixels=canvas.getContext('2d');pixels.drawImage(video,0,0,64,48);color=Array.from(pixels.getImageData(32,24,1,1).data);if(Math.abs(color[0]-224)>20||Math.abs(color[1]-32)>20||Math.abs(color[2]-64)>20)throw Error('Backup decoded color changed');}
    if(audioOnly&&(player.state.mediaInfo.video||player.state.audioTracks.length!==1))throw Error('Audio-only source track set changed');
    const diagnostics=player.diagnostics,ffmpegCalls=diagnostics.backend?.remux?.remux?.calls??0;
    if((name==='default-backup'||name==='declined-mediabunny'||name==='natural-decline')&&ffmpegCalls<=0)throw Error('Real FFmpeg execution not observed: '+JSON.stringify(diagnostics.backend));
    if((name==='declined-mediabunny'||name==='natural-decline')&&!messages.some(message=>message.code==='PROVIDER_PROFILE_MISMATCH'||message.type==='preparation-result'&&message.prepared===false))throw Error('Optional profile was not actually declined');
    result={name,mseOwner:diagnostics.backend?.remux?.mseOwner??(diagnostics.backend?.remux?'window':null),plan:diagnostics.plan.id,...(audioOnly?{freshAudioTime:freshFrame}:{freshFrame,color}),audio,ffmpegCalls,createdWorkers:created,messages,audioTracks:player.state.audioTracks,profile:diagnostics.backend?.projection?.profile,capability:diagnostics.backend?.capability};
    await player.close();if(workers.size||urls.size)throw Error('Backup close retained handles');
    }
   }catch(error){throw Error(error.message+' '+JSON.stringify({messages,diagnostics:player.diagnostics}));}
   finally{await context?.close();await player.destroy();await runtime.destroy();host.remove();globalThis.Worker=WorkerClass;URL.createObjectURL=create;URL.revokeObjectURL=revoke;if(workers.size||urls.size)throw Error('Backup destroy retained handles');}
   return {...result,reviewedCompositions:runtime.qualifiedCompositions,remainingWorkers:workers.size,remainingURLs:urls.size};
  },{manifest:currentDeployment,bytes:Array.from(name==='declined-mediabunny'||name==='missing-backup'?declined:fixture),name,sdk,base,audioOnly,remote,audioChannels,mov});
  const sdkRequests=deliveries.filter(entry=>entry.path==='/'+sdkPath),ffRequests=deliveries.filter(entry=>entry.path.startsWith('/web/engine-remux/'));
  if(name==='direct')assert.equal(deliveries.length,0);
  if(name==='default-backup'){assert.equal(sdkRequests.length,0);assert.ok(ffRequests.some(entry=>entry.path.endsWith('.wasm')));}
  if(name==='preferred-mediabunny'){assert.equal(sdkRequests.length,1);assert.equal(ffRequests.length,0);}
  if(name==='declined-mediabunny'||name==='natural-decline'){assert.equal(sdkRequests.length,1);assert.ok(ffRequests.some(entry=>entry.path.endsWith('.wasm')));}
  if(name==='corrupt-mediabunny'||name==='missing-backup'){assert.equal(sdkRequests.length,1);assert.equal(ffRequests.length,0);}
  if(name==='source-denied')assert.equal(deliveries.length,0);
  receipt.staticInputs={...staticInputs};
  receipt.cases.push({...result,deliveries:[...deliveries]});await save();console.log(name,'passed');
 }
 assert.deepEqual(serverErrors,[]);receipt.served=served;receipt.serverErrors=serverErrors;receipt.status=receipt.completeMatrix?'finite-real-backup-composition-passed-not-release':'selected-backup-cases-passed-not-complete-matrix';await save();
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};receipt.failedDeliveries=deliveries;receipt.served=served;receipt.serverErrors=serverErrors;receipt.staticInputs={...staticInputs};await save();throw error;}
finally{clearTimeout(timer);await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
