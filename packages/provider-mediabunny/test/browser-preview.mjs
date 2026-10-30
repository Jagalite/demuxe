// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join, dirname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const {chromium} = await import(process.env.DEMUXE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEMUXE_PLAYWRIGHT_MODULE).href : 'playwright');
const {build} = await import(process.env.DEMUXE_ESBUILD_MODULE ? pathToFileURL(process.env.DEMUXE_ESBUILD_MODULE).href : 'esbuild');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const coreSourceRoot = process.env.DEMUXE_CORE_SOURCE_ROOT ?? resolve(root, '../../src');
const coreAssetRoot = process.env.DEMUXE_CORE_ASSET_ROOT ?? resolve(root, '../..');
const bundled = await build({entryPoints: [join(root, 'node_modules/mediabunny/dist/modules/src/index.js')], bundle: true, format: 'esm', platform: 'browser', write: false});
const core = await build({entryPoints: [join(coreSourceRoot, 'sources.ts')], bundle: true, format: 'esm', platform: 'browser', write: false});
const owners = await build({stdin: {contents: `export {DemuxeRuntime} from ${JSON.stringify(join(coreSourceRoot,'runtime.ts'))};export {ProviderRuntime} from ${JSON.stringify(join(coreSourceRoot,'internal/provider-runtime.ts'))}; export {NativePlayer} from ${JSON.stringify(join(coreSourceRoot,'internal/native-player.ts'))}; export {PreviewController} from ${JSON.stringify(join(coreSourceRoot,'preview/controller.ts'))};`, resolveDir: coreSourceRoot}, bundle: true, format: 'esm', platform: 'browser', write: false});
const candidateRoot = process.env.DEMUXE_RUNTIME_CANDIDATE ?? join(root,'runtime-candidate');
const deployment = JSON.parse(await readFile(join(candidateRoot,'demuxe-mediabunny-candidate.json'),'utf8'));
const candidate = await readFile(join(candidateRoot,'web/providers/mediabunny/webm.js'));
const ownerIdentity = 'sha256:'+createHash('sha256').update(owners.outputFiles[0].contents).digest('hex');
deployment.providers.push({id:'browser-prepared',implementationIdentity:ownerIdentity,technology:'browser-native',delivery:['browser','application-bundle'],applicationBuild:ownerIdentity,offers:[{capability:'media.present.prepared',version:1,profile:'selected-streams'}],assetIds:[]});
// An inert declaration tests preference selection, not FFmpeg execution.
const bothDeployment=structuredClone(deployment);
const inertDigest=createHash('sha256').update(new Uint8Array([0,97,115,109,1,0,0,0])).digest('hex');
const broadPath='web/engine-remux/remux.wasm';
const broadIdentity='sha256:'+createHash('sha256').update(JSON.stringify({['runtime/'+broadPath]:inertDigest},null,2)+'\n').digest('hex');
bothDeployment.assets.push({id:'baseline-remux-declaration',path:broadPath,sha256:inertDigest,bytes:8,dependencies:[]});
bothDeployment.providers.push({id:'ffmpeg-file-preparation',implementationIdentity:broadIdentity,technology:'wasm',delivery:['optional-assets'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}],assetIds:['baseline-remux-declaration']});
const remoteFixtures=new Map();
let preparationRequests = 0, corruptNextAsset = false;
let browser, timer;
try {
  browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true});
  timer = setTimeout(() => { console.error('Browser preview exceeded 60 seconds'); void browser.close(); }, 60000);
  const page = await browser.newPage();
  await page.exposeFunction('registerRemoteVP8',(name,bytes)=>{remoteFixtures.set('/media/'+name,Buffer.from(bytes));return {url:'https://demuxe.test/media/'+name,identity:{size:String(bytes.length),etag:'"vp8-fixture"'}};});
  await page.exposeFunction('preparationRequestCount',()=>preparationRequests);
  await page.exposeFunction('corruptNextPreparationAsset',()=>{corruptNextAsset=true;});
  page.on('pageerror', error => console.error('Browser error:', error.message));
  page.on('console', message => console.log('Browser:', message.text()));
  page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
  await page.route('https://demuxe.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({contentType: 'text/html', body: '<script type="importmap">{"imports":{"mediabunny":"/runtime.js"}}</script>'});
    if (path === '/runtime.js') return route.fulfill({contentType: 'text/javascript', body: Buffer.from(bundled.outputFiles[0].contents)});
    if (path === '/core.js') return route.fulfill({contentType: 'text/javascript', body: Buffer.from(core.outputFiles[0].contents)});
    if (path === '/owners.js') return route.fulfill({contentType: 'text/javascript', body: Buffer.from(owners.outputFiles[0].contents)});
    if (path === '/demuxe-providers.json') return route.fulfill({contentType: 'application/json', body: JSON.stringify(deployment)});
    if (path === '/both/demuxe-providers.json') return route.fulfill({contentType: 'application/json', body: JSON.stringify(bothDeployment)});
    if (path === '/web/providers/mediabunny/webm.js') {
      preparationRequests++; const bytes=Buffer.from(candidate);
      if(corruptNextAsset){corruptNextAsset=false;bytes[bytes.length-1]^=1;}
      return route.fulfill({contentType:'text/javascript',body:bytes});
    }
    if(remoteFixtures.has(path)){
      const bytes=remoteFixtures.get(path),range=/bytes=(\d+)-(\d+)/.exec(route.request().headers()['range']??'');
      if(!range)return route.fulfill({status:200,body:bytes});
      const at=Number(range[1]),end=Math.min(Number(range[2]),bytes.length-1);
      return route.fulfill({status:206,headers:{'Content-Range':`bytes ${at}-${end}/${bytes.length}`,'Content-Length':String(end-at+1),ETag:'"vp8-fixture"'},body:bytes.subarray(at,end+1)});
    }
    const base = path.startsWith('/web/') ? coreAssetRoot : root;
    const relative = path.replace(/^\/provider\//, '').replace(/^\//, '');
    const target = resolve(base, relative);
    if (!target.startsWith(base + sep)) return route.abort();
    try { await route.fulfill({contentType: 'text/javascript', body: await readFile(target)}); }
    catch (error) { console.error('Module read failed:', target, error.message); await route.abort(); }
  });
  await page.goto('https://demuxe.test/');
  const result = await page.evaluate(async deployment => {
    const runtime = await import('mediabunny');
    const {WEBM, Output, BufferTarget, WebMOutputFormat, VideoSampleSource, VideoSample, Input, BlobSource, EncodedPacketSink} = runtime;
    const {createMediaBunnyPreviewProvider, createMediaBunnyInspector} = await import('/provider/index.js');
    const {inspectMedia} = await import('/core.js');
    const {ProviderRuntime, NativePlayer, PreviewController, DemuxeRuntime} = await import('/owners.js');
    const {copySelectedPackets} = await import('/provider/packet-copy.js');
    const {createWebMVideoPreparer} = await import('/provider/file-preparation.js');
    const {matroskaFixture} = await import('/provider/test/matroska-fixture.js');
    console.log('Runtime and adapter loaded');
    const target = new BufferTarget();
    const output = new Output({format: new WebMOutputFormat(), target});
    const video = new VideoSampleSource({codec: 'vp8', bitrate: 100000});
    output.addVideoTrack(video, {frameRate: 10});
    await output.start();
    console.log('Fixture output started');
    const canvas = new OffscreenCanvas(64, 48), context = canvas.getContext('2d');
    context.fillStyle = '#e02040'; context.fillRect(0, 0, 64, 48);
    for (let i = 0; i < 10; i++) {
      const sample = new VideoSample(canvas, {timestamp: i / 10, duration: 0.1});
      try { await video.add(sample); } finally { sample.close(); }
    }
    video.close(); await output.finalize();
    console.log('VP8 fixture generated');
    const data = new Uint8Array(target.buffer);
    const file = new File([data],'fixture.webm',{type:'video/webm'});
    const fixtureInput = new Input({formats: [WEBM], source: new BlobSource(file)});
    const fixturePackets = []; let fixtureConfig;
    try {
      fixtureConfig=await (await fixtureInput.getTracks())[0].getDecoderConfig();
      for await (const packet of new EncodedPacketSink((await fixtureInput.getTracks())[0]).packets()) fixturePackets.push(packet);
    } finally { fixtureInput.dispose(); }
    const matroska = new File([matroskaFixture(fixturePackets, {width: 64, height: 48, colorSpace:fixtureConfig.colorSpace})], 'independent.mkv', {type: 'video/x-matroska'});
    const probe = {format:'matroska,webm',duration:1,tracks:[{id:'1',index:0,type:'video',codec:'vp8'}]};
    const qualification=Object.fromEntries(deployment.providers.map(provider=>[provider.id,provider.implementationIdentity]));

    const createReviewed=async(base,qualified,preferences)=>{const shared=new DemuxeRuntime({assetBase:base,qualifiedProviders:qualified,qualifiedCompositions:[{recipeId:'native-remux',sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],bindingId:'mediabunny',implementationIdentities:{'mediabunny-file-preparation':qualified['mediabunny-file-preparation'],'browser-prepared':qualified['browser-prepared']}}]});await shared.providers.load('demuxe-providers.json');const runtime=new ProviderRuntime(new URL(base),qualified,preferences,shared);const destroy=runtime.destroy.bind(runtime);runtime.destroy=async()=>{await destroy();await shared.destroy();};return runtime;};
    let rejectedProfiles=0;
    for(const [qualified,facts] of [
      [{},probe],
      [{'mediabunny-file-preparation':qualification['mediabunny-file-preparation']},probe],
      [{...qualification,'mediabunny-file-preparation':'wrong-build'},probe],
      [qualification,{...probe,tracks:[...probe.tracks,{id:'2',index:1,type:'subtitle',codec:'webvtt'}]}],
      [qualification,{...probe,tracks:[{...probe.tracks[0],attachedPicture:true}]}],
      [qualification,undefined],
    ]){
      const rejected=qualified===qualification?await createReviewed('https://demuxe.test/',qualified):new ProviderRuntime(new URL('https://demuxe.test/'),qualified);
      try{
        await rejected.load();
        if(!rejected.rejection('native-remux',{kind:'local',file},'rejected-fixture','pthread',facts)||rejected.canPrepareFile(file))throw new Error('Unqualified source or composition was admitted');
        if(await rejected.prepareFile(file,new AbortController().signal)!==undefined)throw new Error('Rejected profile produced output');
        rejectedProfiles++;
      }finally{await rejected.destroy();}
    }
    if(await globalThis.preparationRequestCount()!==0)throw new Error('Rejected profile acquired runtime bytes');
    const stale=await createReviewed('https://demuxe.test/',qualification);
    try{
      await stale.load();
      if(stale.rejection('native-remux',{kind:'local',file},'known','pthread',probe))throw new Error('Known source was not admitted');
      if(!stale.rejection('native-remux',{kind:'local',file},'unknown','pthread',undefined)||stale.canPrepareFile(file))throw new Error('Missing current source facts reused stale qualification');
    }finally{await stale.destroy();}
    const both=await (await fetch('https://demuxe.test/both/demuxe-providers.json')).json();
    const bothQualified=Object.fromEntries(both.providers.map(provider=>[provider.id,provider.implementationIdentity]));
    for(const preferred of [false,true]){
      const preferences=preferred?[{capability:'media.prepare.file',providers:['mediabunny-file-preparation','ffmpeg-file-preparation']}]:undefined;
      const choice=await createReviewed('https://demuxe.test/both/',bothQualified,preferences);
      try{
        await choice.load();
        if(choice.rejection('native-remux',{kind:'local',file},'both-fixture','pthread',probe)||choice.canPrepareFile(file)!==preferred)throw new Error('Provider preference changed baseline or ignored explicit selection');
      }finally{await choice.destroy();}
    }
    if(await globalThis.preparationRequestCount()!==0)throw new Error('Eligibility/preference checks acquired preparation bytes');
    const corruptRuntime=await createReviewed('https://demuxe.test/',qualification);
    const corruptVideo=document.createElement('video');corruptVideo.muted=true;document.body.append(corruptVideo);
    let corruptPlayer, integrityCode;
    try{
      await corruptRuntime.load();
      if(corruptRuntime.rejection('native-remux',{kind:'local',file},'corrupt-fixture','pthread',probe))throw new Error('Integrity fixture was not admitted');
      await globalThis.corruptNextPreparationAsset();
      corruptPlayer=new NativePlayer(corruptVideo,'always',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',corruptRuntime);
      let failure;try{await corruptPlayer.open(file);}catch(error){failure=error;}
      if(failure?.code!=='ASSET_LOAD_FAILED'||!failure.message.includes('integrity'))throw new Error('Integrity failure was swallowed or reclassified: '+failure);
      integrityCode=failure.code;
    }finally{await corruptPlayer?.destroy();await corruptRuntime.destroy();corruptVideo.remove();}
    const providerRuntime = await createReviewed('https://demuxe.test/',qualification);
    const activeWorkers = new Set(), activeURLs = new Set(); let workerCount = 0, urlCount = 0;
    const OriginalWorker = globalThis.Worker, createURL = URL.createObjectURL, revokeURL = URL.revokeObjectURL;
    let onWorkerPost;
    globalThis.Worker = class extends OriginalWorker {
      constructor(...args) { super(...args); activeWorkers.add(this); workerCount++; }
      terminate() { activeWorkers.delete(this); return super.terminate(); }
      postMessage(...args) { const hook=onWorkerPost;onWorkerPost=undefined;hook?.();return super.postMessage(...args); }
    };
    URL.createObjectURL = value => { const url = createURL.call(URL,value); activeURLs.add(url); urlCount++; return url; };
    URL.revokeObjectURL = url => { activeURLs.delete(url); return revokeURL.call(URL,url); };
    const ownerVideo = document.createElement('video'); ownerVideo.muted = true; document.body.append(ownerVideo);
    let ownerPlayer, ownerResult;
    try {
      await providerRuntime.load();
      const rejection = providerRuntime.rejection('native-remux',{kind:'local',file},'fixture-native','pthread',probe);
      if (rejection) throw new Error('Owner admission rejected fixture: '+rejection);
      ownerPlayer = new NativePlayer(ownerVideo,'always',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',providerRuntime);
      await ownerPlayer.open(file);
      if (ownerPlayer.diagnostics.projection?.kind !== 'mediabunny-packet-copy') throw new Error('Native owner did not use MediaBunny preparation');
      await ownerPlayer.seek(0.5);
      const afterSeek = new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Native owner made no fresh-frame progress')),5000);
        function observe(now,metadata){if(metadata.mediaTime>0.5){clearTimeout(timeout);resolve(metadata.mediaTime);}else ownerVideo.requestVideoFrameCallback(observe);}
        ownerVideo.requestVideoFrameCallback(observe);
      });
      await ownerPlayer.play();
      ownerResult={plan:ownerPlayer.planId,seekTime:0.5,freshFrameTime:await afterSeek,profile:ownerPlayer.diagnostics.projection.profile};
      const controller=new AbortController();onWorkerPost=()=>controller.abort();
      let cancelled;try{await providerRuntime.prepareFile(file,controller.signal);}catch(error){cancelled=error;}
      if(cancelled?.name!=='AbortError'||activeWorkers.size)throw new Error('Worker cancellation did not settle and retire');
      const nextFile=new File([data],'replacement.webm',{type:'video/webm'});
      if(providerRuntime.rejection('native-remux',{kind:'local',file:nextFile},'replacement','pthread',probe))throw new Error('Replacement source not admitted');
      let replacement;
      onWorkerPost=()=>{replacement=ownerPlayer.open(nextFile);};
      let retired;try{await ownerPlayer.open(file);}catch(error){retired=error;}
      if(!retired||!replacement)throw new Error('Superseded preparation was accepted');
      await replacement;
      if(ownerPlayer.diagnostics.projection?.kind!=='mediabunny-packet-copy'||activeWorkers.size)throw new Error('Replacement did not finish independently');
      const parallelVideos=[document.createElement('video'),document.createElement('video')];
      for(const video of parallelVideos){video.muted=true;document.body.append(video);}
      const parallelPlayers=parallelVideos.map(video=>new NativePlayer(video,'always',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',providerRuntime));
      try{
        await Promise.all(parallelPlayers.map(player=>player.open(file)));
        await parallelPlayers[0].destroy();
        await parallelPlayers[1].seek(0.5);
        if(parallelPlayers[1].diagnostics.projection?.kind!=='mediabunny-packet-copy')throw new Error('Retiring another player invalidated preparation');
      }finally{await Promise.all(parallelPlayers.map(player=>player.destroy()));for(const video of parallelVideos)video.remove();}
      const matroskaProbe={...probe,format:'matroska'};
      if(providerRuntime.rejection('native-remux',{kind:'local',file:matroska},'independent-matroska','pthread',matroskaProbe))throw new Error('Matroska profile was not admitted');
      const matroskaVideo=document.createElement('video');matroskaVideo.muted=true;document.body.append(matroskaVideo);
      const matroskaPlayer=new NativePlayer(matroskaVideo,'always',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',providerRuntime);
      try{
        await matroskaPlayer.open(matroska);
        if(matroskaPlayer.diagnostics.projection?.profile!=='matroska-vp8-video-only-v1')throw new Error('Matroska owner did not use its qualified preparation profile');
        await matroskaPlayer.seek(.5);
        const progress=new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Matroska owner made no fresh-frame progress')),5000);
          const observe=(_now,frame)=>{if(frame.mediaTime>.5){clearTimeout(timer);resolve(frame.mediaTime);}else matroskaVideo.requestVideoFrameCallback(observe);};
          matroskaVideo.requestVideoFrameCallback(observe);
        });
        await matroskaPlayer.play();
        const freshFrameTime=await progress;
        const surface=new OffscreenCanvas(64,48),ctx=surface.getContext('2d');ctx.drawImage(matroskaVideo,0,0);
        const color=[...ctx.getImageData(32,24,1,1).data];
        if(Math.abs(color[0]-224)>20||Math.abs(color[1]-32)>20||Math.abs(color[2]-64)>20)throw new Error('Matroska decoded content changed: '+JSON.stringify(color));
        ownerResult.matroska={profile:matroskaPlayer.diagnostics.projection.profile,containerWriter:'Demuxe independent fixture',seekTime:.5,freshFrameTime,color};
      }finally{await matroskaPlayer.destroy();matroskaVideo.remove();}
      const remoteResults=[];
      for(const [media,format] of [[file,'webm'],[matroska,'matroska']]){
        const remote={...await globalThis.registerRemoteVP8(media.name,Array.from(new Uint8Array(await media.arrayBuffer()))),format:'file'};
        if(providerRuntime.rejection('native-remux',{kind:'remote',options:remote},'remote-vp8','pthread',{...probe,format}))throw new Error('Remote VP8 admission failed');
        const video=document.createElement('video');video.muted=true;document.body.append(video);
        const player=new NativePlayer(video,'always',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',providerRuntime);
        let original,prepared;
        try{
          await player.openRemote(remote);
          if(player.diagnostics.projection?.transport!=='validated-remote-range')throw new Error('Remote VP8 did not use validated source transport');
          original=new Input({formats:[WEBM,runtime.MATROSKA],source:new BlobSource(media)});
          prepared=new Input({formats:[WEBM],source:new BlobSource(player.projection.file)});
          if(JSON.stringify(await signatures(original))!==JSON.stringify(await signatures(prepared)))throw new Error('Remote VP8 packet/configuration preservation failed');
          await player.seek(.5);
          const progress=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Remote VP8 made no fresh-frame progress')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>.5){clearTimeout(timer);resolve(frame.mediaTime);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});
          await player.play();
          remoteResults.push({profile:player.diagnostics.projection.profile,packetHashesPreserved:true,seekTime:.5,freshFrameTime:await progress});
        }finally{original?.dispose();prepared?.dispose();await player.destroy();video.remove();}
      }
      ownerResult.remote=remoteResults;
      const directRuntime=await createReviewed('https://demuxe.test/',qualification);
      const directVideo=document.createElement('video');directVideo.muted=true;document.body.append(directVideo);
      const directPlayer=new NativePlayer(directVideo,'never',new URL('https://demuxe.test/'),false,undefined,undefined,false,[],'native-direct',undefined,10000,undefined,'pthread',directRuntime);
      const beforeDirect=await globalThis.preparationRequestCount(),beforeWorkers=workerCount;
      try{await directPlayer.open(file);if(directPlayer.diagnostics.projection||await globalThis.preparationRequestCount()!==beforeDirect||workerCount!==beforeWorkers)throw new Error('Direct playback acquired preparation');}
      finally{await directPlayer.destroy();await directRuntime.destroy();directVideo.remove();}
    } finally {
      try { await ownerPlayer?.destroy(); await providerRuntime.destroy(); ownerVideo.remove(); }
      finally { globalThis.Worker = OriginalWorker; URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL; }
    }
    if (activeWorkers.size || activeURLs.size || workerCount !== 9) throw new Error('Preparation owner leaked a worker or object URL');
    ownerResult.workerCount = workerCount; ownerResult.objectURLsCreated = urlCount;
    ownerResult.policy={rejectedProfiles,integrityCode,cancelledWorker:true,directPreparationAcquired:false,staleSourceCleared:true,baselinePreference:'ffmpeg',explicitPreference:'mediabunny',sourceReplacement:true,parallelPlayers:true};
    console.log('Actual provider/native owner preparation, startup and seek passed');
    const alternate = await inspectMedia(data.buffer, {assetBase: 'https://demuxe.test/', inspector: createMediaBunnyInspector({formats: [WEBM]})});
    if (alternate.status !== 'partial' || alternate.tracks.length !== 1 || alternate.sourceIdentity !== null) throw new Error('Core inspector bridge returned invalid evidence');
    const baseline = await inspectMedia(data.buffer, {assetBase: 'https://demuxe.test/'});
    if (!['complete', 'partial', 'unknown'].includes(baseline.status) || baseline.bytesRead <= 0) throw new Error('Default inspector path failed');
    console.log('Core optional and default inspection paths completed');
    const original = new Input({formats: [WEBM], source: new BlobSource(new Blob([data]))});
    const originalTracks = await original.getTracks();
    const copied = await copySelectedPackets(runtime, original, {trackIds: originalTracks.map(track => track.id), format: new WebMOutputFormat(), signal: new AbortController().signal});
    const prepared = await createWebMVideoPreparer({load: async () => runtime})(new Blob([data]), {signal: new AbortController().signal, sourceTracks: [{id: 'source-video', type: 'video', codec: 'vp8'}]});
    if (!prepared || prepared.tracks[0].id !== 'source-video' || prepared.diagnostics.packetCount !== 10) throw new Error('Prepared-file adapter lost source track mapping');
    const remuxed = new Input({formats: [WEBM], source: new BlobSource(copied.file)});
    async function signatures(input) {
      const tracks = await input.getTracks(), result = [];
      for (const track of tracks) {
        const packets = [];
        for await (const packet of new EncodedPacketSink(track).packets()) {
          const hash = await crypto.subtle.digest('SHA-256', packet.data);
          packets.push({timestamp: packet.timestamp, duration: packet.duration, type: packet.type, hash: [...new Uint8Array(hash)].join(',')});
        }
        const config = await track.getDecoderConfig();
        const geometry = track.type==='video'?{codedWidth:await track.getCodedWidth(),codedHeight:await track.getCodedHeight(),squareWidth:await track.getSquarePixelWidth(),squareHeight:await track.getSquarePixelHeight(),matrix:await track.getTransformationMatrix(),colorSpace:config.colorSpace}:null;
        result.push({type: track.type, codec: track.codec, geometry, packets});
      }
      return result;
    }
    const before = await signatures(original), after = await signatures(remuxed);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Packet-copy changed selected encoded packets or timing');
    const mkvInput=new Input({formats:[runtime.MATROSKA],source:new BlobSource(matroska)});
    let mkvOutput;
    try{
      const prepared=await createWebMVideoPreparer({load:async()=>runtime})(matroska,{sourceTracks:[{id:'independent-source',type:'video',codec:'vp8'}]});
      if(!prepared||prepared.tracks[0].id!=='independent-source')throw new Error('Independent Matroska source identity lost');
      mkvOutput=new Input({formats:[WEBM],source:new BlobSource(prepared.file)});
      const inputSignature=await signatures(mkvInput),outputSignature=await signatures(mkvOutput);
      if(JSON.stringify(inputSignature)!==JSON.stringify(outputSignature)||JSON.stringify(inputSignature[0].packets)!==JSON.stringify(before[0].packets))throw new Error('Independent Matroska payload/configuration/timeline changed');
      ownerResult.matroska.packetHashesPreserved=true;
    }finally{mkvInput.dispose();mkvOutput?.dispose();}
    const preparedInput = new Input({formats: [WEBM], source: new BlobSource(prepared.file)});
    try { if (JSON.stringify(before) !== JSON.stringify(await signatures(preparedInput))) throw new Error('Prepared-file adapter changed encoded packets or timing'); }
    finally { preparedInput.dispose(); }
    if (copied.packetCount !== 10) throw new Error('Packet-copy lost frames');
    original.dispose(); remuxed.dispose();
    console.log('Packet-copy preserved all encoded packet hashes and timing');
    const videoElement = document.createElement('video'); videoElement.muted = true;
    document.body.append(videoElement);
    const url = URL.createObjectURL(prepared.file);
    const waitEvent = name => new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Timed out waiting for ${name}`)), 5000);
      const success = () => finish();
      const failed = () => finish(new Error(`Media error ${videoElement.error?.code}`));
      function finish(error) { clearTimeout(timer); videoElement.removeEventListener(name, success); videoElement.removeEventListener('error', failed); error ? reject(error) : resolve(); }
      videoElement.addEventListener(name, success, {once: true}); videoElement.addEventListener('error', failed, {once: true});
    });
    let playback;
    try {
      const loaded = waitEvent('loadeddata'); videoElement.src = url; await loaded;
      await videoElement.play(); const progress = waitEvent('timeupdate'); await progress; videoElement.pause();
      const seeked = waitEvent('seeked'); videoElement.currentTime = 0.5; await seeked;
      const seekTime = videoElement.currentTime;
      const freshFrame = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No fresh frame after seek')), 5000);
        function observe(now, metadata) { if (metadata.mediaTime > seekTime) { clearTimeout(timer); resolve(metadata.mediaTime); } else videoElement.requestVideoFrameCallback(observe); }
        videoElement.requestVideoFrameCallback(observe);
      });
      await videoElement.play();
      playback = {duration: videoElement.duration, seekTime, freshFrameTime: await freshFrame};
    } finally { videoElement.pause(); videoElement.removeAttribute('src'); videoElement.load(); videoElement.remove(); URL.revokeObjectURL(url); }
    const provider = createMediaBunnyPreviewProvider({formats: [WEBM], getSource: id => id === 'fixture' ? {id, size: data.length, read: async (at, n) => data.slice(at, at + n)} : null});
    const request = {sourceId: 'fixture', signal: new AbortController().signal, time: 0.25, width: 32, height: 24, exact: true, publish() {}};
    const frame = await provider.getFrame(request);
    if (!frame) throw new Error('No decoded preview');
    const bitmap = await createImageBitmap(frame.image.blob);
    const size = [bitmap.width, bitmap.height];
    const decoded = new OffscreenCanvas(...size), pixels = decoded.getContext('2d');
    pixels.drawImage(bitmap, 0, 0); bitmap.close();
    const color = [...pixels.getImageData(16, 12, 1, 1).data];
    await provider.release();
    const OriginalDecoder=globalThis.VideoDecoder,decoders=new Set();let decoderCount=0;
    globalThis.VideoDecoder=class extends OriginalDecoder{
      constructor(...args){super(...args);decoders.add(this);decoderCount++;}
      close(){decoders.delete(this);return super.close();}
    };
    let currentIdentity='fixture',reads=0,blockNextRead=false,readStarted,lateRead;
    const lifecycleProvider=createMediaBunnyPreviewProvider({formats:[WEBM],load:async()=>runtime,getSource:id=>id===currentIdentity?{id,size:data.length,read:async(at,n)=>{
      reads++;
      if(blockNextRead){blockNextRead=false;readStarted();return new Promise(resolve=>{lateRead=()=>resolve(data.slice(at,at+n));});}
      return data.slice(at,at+n);
    }}:null});
    const controller=new PreviewController([lifecycleProvider],{bucketSeconds:0,timeoutMs:5000});
    try{
      const frames=await Promise.all([lifecycleProvider.getFrame({...request,time:0.25}),lifecycleProvider.getFrame({...request,time:0.75})]);
      console.log('Preview lifecycle: concurrent requests decoded');
      if(Math.abs(frames[0].actualTime-0.2)>0.001||Math.abs(frames[1].actualTime-0.7)>0.001)throw new Error('Concurrent preview requests interfered');
      controller.setSourceIdentity('fixture');controller.setPlaybackActive(true);
      console.log('Preview lifecycle: playback deferral requested');
      const before=reads,deferred=await controller.getFrame({time:0.25,width:32,height:24});
      if(deferred!==null||reads!==before)throw new Error('Preview decoder did not yield to playback');
      controller.setPlaybackActive(false);
      console.log('Preview lifecycle: controller decode requested');
      const controlled=await controller.getFrame({time:0.25,width:32,height:24});
      console.log('Preview lifecycle: controller decode completed');
      if(controlled?.sourceId!=='fixture')throw new Error('Preview controller did not accept provider frame');
      controller.clear();blockNextRead=true;
      const started=new Promise(resolve=>{readStarted=resolve;});
      const pending=controller.getFrame({time:0.75,width:32,height:24}).then(()=>({accepted:true}),error=>({error:error.name}));
      await started;
      console.log('Preview lifecycle: old source read blocked');
      currentIdentity='replacement';controller.setSourceIdentity('replacement');
      const retired=await pending;
      if(retired.accepted||retired.error!=='AbortError')throw new Error('Retired preview source published a frame');
      const fresh=await controller.getFrame({time:0.25,width:32,height:24});
      console.log('Preview lifecycle: replacement decoded');
      if(fresh?.sourceId!=='replacement')throw new Error('Replacement preview source did not progress');
      lateRead();await controller.drain();
    }finally{
      lateRead?.();
      try{await controller.destroy();await lifecycleProvider.release();}
      finally{globalThis.VideoDecoder=OriginalDecoder;}
    }
    if(decoderCount===0||decoders.size)throw new Error('Preview native decoder lifecycle was not retired');
    const previewLifecycle={concurrentRequests:2,deferredDuringPlayback:true,sourceReplacement:true,lateReadDiscarded:true,nativeDecodersCreated:decoderCount,nativeDecodersRemaining:decoders.size};
    return {time: frame.actualTime, accuracy: frame.temporalAccuracy, fidelity: frame.fidelity, size, color, bytesRead: frame.metrics.bytesRead, blobBytes: frame.image.blob.size, copiedPackets: copied.packetCount, copiedBytes: copied.outputBytes, playback, ownerResult,previewLifecycle};
  }, deployment);
  assert.deepEqual(result.size, [32, 24]);
  assert.ok(Math.abs(result.time - 0.2) < 0.001);
  assert.equal(result.accuracy, 'approximate');
  assert.equal(result.fidelity, 'reduced');
  assert.ok(result.bytesRead > 0 && result.blobBytes > 0);
  assert.ok(Math.abs(result.color[0] - 224) < 20 && Math.abs(result.color[1] - 32) < 20 && Math.abs(result.color[2] - 64) < 20);
  assert.ok(Math.abs(result.playback.duration - 1) < 0.01);
  assert.equal(result.playback.seekTime, 0.5);
  assert.ok(result.playback.freshFrameTime > result.playback.seekTime);
  assert.equal(preparationRequests,2);
  assert.equal(result.ownerResult.plan,'remux');
  assert.ok(result.ownerResult.freshFrameTime>0.5);
  if(process.env.DEMUXE_BROWSER_EVIDENCE)await writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify({schema:1,status:'test-composition-passed-not-release',recordedAt:new Date().toISOString(),preparationIdentity:deployment.providers.find(provider=>provider.id==='mediabunny-file-preparation').implementationIdentity,presenterIdentity:ownerIdentity,browser:browser.version(),userAgent:await page.evaluate(()=>navigator.userAgent),sourceProfile:'webm-vp8-video-only-v1',sourceProfiles:['webm-vp8-video-only-v1','matroska-vp8-video-only-v1'],independentContainerFixture:{writer:'Demuxe test/matroska-fixture.js',format:'Matroska',bitstream:'WebCodecs VP8',layout:'one track, explicit BlockDuration, no lacing'},fixture:{generator:'WebCodecs + MediaBunny writer',width:64,height:48,frames:10,fps:10,audio:false},assetRequests:preparationRequests,checks:result,limitations:['Two VP8 container fixtures in one browser; limited independent Matroska layout, not arbitrary-container qualification','Inert FFmpeg declaration tests preference only; no FFmpeg playback claim','Not a production application release qualification']},null,2)+'\n');
  console.log(JSON.stringify({browser: browser.version(), fixture: 'WebCodecs VP8 WebM 64x48 10fps 1s', ...result}, null, 2));
} finally { clearTimeout(timer); await browser?.close(); }
