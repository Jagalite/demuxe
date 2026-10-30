// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium,firefox,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(root,'../..');
const candidate=resolve(process.env.DEMUXE_PUBLIC_RUNTIME_CANDIDATE??process.env.DEMUXE_STREAM_RUNTIME_CANDIDATE??'/private/tmp/demuxe-mediabunny-runtime-stream-remote-final');
const deployment=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
const providerId=deployment.providers[0].id;assert.ok(['mediabunny-file-preparation','mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].includes(providerId));
const hash=value=>createHash('sha256').update(value).digest('hex');
const consumer=process.env.DEMUXE_INSTALLED_CONSUMER?resolve(process.env.DEMUXE_INSTALLED_CONSUMER):undefined;
const app=await build({stdin:{contents:consumer?"export {Player,DemuxeRuntime,inspectMedia} from 'demuxe';":`export {Player,DemuxeRuntime,inspectMedia} from ${JSON.stringify(join(repo,'src/index.ts'))};`,resolveDir:consumer??repo},bundle:true,format:'esm',platform:'browser',write:false,metafile:true});
const library=await build({entryPoints:[join(root,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,format:'esm',platform:'browser',write:false});
const formatDirectory=process.env.DEMUXE_FORMAT_DELIVERY,formatAssets=new Map();
if(formatDirectory||consumer){for(const owner of ['inspect','preview']){const kind=providerId==='mediabunny-file-preparation'?'webm':'mp4',name=owner+'-'+kind;const bytes=consumer?Buffer.from((await build({stdin:{contents:`export * from '@demuxe/provider-mediabunny/${owner}/${kind}';`,resolveDir:consumer},bundle:true,format:'esm',platform:'browser',write:false})).outputFiles[0].contents):await readFile(join(formatDirectory,name+'.js'));formatAssets.set('/format-'+owner+'.js',bytes);}}
const identity='sha256:'+hash(app.outputFiles[0].contents);
deployment.providers.push({id:'browser-prepared',implementationIdentity:identity,applicationBuild:identity,technology:'browser-native',delivery:['browser','application-bundle'],offers:[{capability:'media.present.prepared',version:1,profile:'selected-streams'}],assetIds:[]});
const worker=await readFile(join(candidate,deployment.assets[0].path));assert.equal(hash(worker),deployment.assets[0].sha256);
const coreAssets=consumer?join(consumer,'node_modules/demuxe'):repo;
const identities={presenter:identity,provider:deployment.providers[0].implementationIdentity,harness:hash(await readFile(fileURLToPath(import.meta.url))),worker:hash(worker),remuxOwner:hash(await readFile(join(coreAssets,'web/native-remux-player.js'))),fastInspector:hash(await readFile(join(coreAssets,'web/fast-source-inspector.js'))),matroskaFixture:hash(await readFile(join(root,'test/matroska-fixture.js')))};
if(consumer){const inputs=Object.keys(app.metafile.inputs).filter(path=>!path.startsWith('<'));identities.installedCoreInputs=Object.fromEntries(await Promise.all(inputs.map(async path=>[path,hash(await readFile(resolve(process.cwd(),path)))])));}
if(formatDirectory||consumer)identities.formatDelivery=Object.fromEntries([...formatAssets].map(([path,bytes])=>[path,{bytes:bytes.length,sha256:hash(bytes)}]));
const browserName=process.env.DEMUXE_PUBLIC_BROWSER??'chrome';
assert.ok(['chrome','firefox','webkit'].includes(browserName));
const fixtureBytes=process.env.DEMUXE_PUBLIC_FIXTURE?Array.from(await readFile(process.env.DEMUXE_PUBLIC_FIXTURE)):undefined;
if(browserName!=='chrome'&&!fixtureBytes)throw Error('Cross-browser playback requires an exported fixture from the Chrome generation run');
const isolated=process.env.DEMUXE_PUBLIC_ISOLATED!=='0';
deployment.providers.push({id:'browser-original',implementationIdentity:identity,applicationBuild:identity,technology:'browser-native',delivery:['browser','application-bundle'],offers:[{capability:'media.present.original',version:1,profile:'selected-source'}],assetIds:[]});
const stableDirect=process.env.DEMUXE_PUBLIC_DIRECT_CONTROL==='no-escalation';
const compareDirectColor=process.env.DEMUXE_PUBLIC_COMPARE_DIRECT_COLOR==='1';
const compareFullFrame=process.env.DEMUXE_PUBLIC_COMPARE_FULL_FRAME==='1';
if(compareFullFrame&&(!compareDirectColor||process.env.DEMUXE_PUBLIC_PREVIEW!=='1'))throw Error('Full-frame comparison requires direct color and preview');
if(compareDirectColor&&(providerId!=='mediabunny-file-preparation'||process.env.DEMUXE_PUBLIC_MATROSKA==='1'||process.env.DEMUXE_TEST_REMOTE==='1'||!fixtureBytes))throw Error('Direct color comparison requires a local WebM fixture');
const requests={worker:0,forbidden:[]};let fixture,mediaRequests=0,mediaMode='valid',browser,timer,stage='bootstrap';
try{
  browser=await ({chrome:chromium,firefox,webkit}[browserName]).launch({...(browserName==='chrome'?{channel:'chrome'}:{}),headless:true});timer=setTimeout(()=>void browser.close(),60000);
  const page=await browser.newPage();page.on('console',message=>console.log('Browser:',message.text()));
  await page.exposeFunction('publicStage',value=>{stage=value;console.log('Stage:',value);});
  await page.exposeFunction('publicAssetRequests',()=>requests.worker);
  await page.exposeFunction('setPublicMediaMode',mode=>{mediaMode=mode;});
  await page.exposeFunction('publishFixture',bytes=>{fixture=Buffer.from(bytes);return {url:'https://public-media.test/fixture.mp4',format:'file',headers:{Authorization:'fixture-secret'},credentials:'omit',allowedOrigins:['https://public-media.test']};});
  await page.route('https://public-media.test/**',async route=>{
    const request=route.request(),cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Range,If-Range','Access-Control-Expose-Headers':'Content-Length,Content-Range,ETag'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    mediaRequests++;if(mediaMode==='denied')return route.fulfill({status:401,headers:cors});const range=/bytes=(\d+)-(\d*)/.exec(request.headers().range??'');
    const start=range?Number(range[1]):0,end=range?Math.min(range[2]?Number(range[2]):fixture.length-1,fixture.length-1):fixture.length-1;
    const body=fixture.subarray(start,end+1),headers={...cors,'Content-Type':providerId==='mediabunny-file-preparation'?'video/webm':'video/mp4',ETag:mediaMode==='weak'?'W/"public-v1"':'"public-v1"','Content-Length':String(body.length)};
    if(range)headers['Content-Range']=`bytes ${start}-${end}/${fixture.length}`;
    return route.fulfill({status:range?206:200,headers,body});
  });
  await page.route('https://public.test/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',headers:isolated?{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}:{},body:'<script type="importmap">{"imports":{"mediabunny":"/library.js"}}</script>'});
    if(formatAssets.has(path))return route.fulfill({contentType:'text/javascript',body:formatAssets.get(path)});
    if(path==='/app.js')return route.fulfill({contentType:'text/javascript',body:Buffer.from(app.outputFiles[0].contents)});
    if(path==='/library.js')return route.fulfill({contentType:'text/javascript',body:Buffer.from(library.outputFiles[0].contents)});
    if(path==='/demuxe-providers.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(deployment)});
    if(path==='/'+deployment.assets[0].path){requests.worker++;return route.fulfill({contentType:'text/javascript',body:worker});}
    if(path.startsWith('/web/engine')||path.startsWith('/web/providers/')){requests.forbidden.push(path);return route.abort();}
    const base=consumer&&path.startsWith('/web/')?join(consumer,'node_modules/demuxe'):repo;
    const file=resolve(base,path.replace(/^\//,''));if(!file.startsWith(base+sep))return route.abort();
    try{return route.fulfill({contentType:'text/javascript',body:await readFile(file)});}catch{return route.abort();}
  });
  await page.goto('https://public.test/');await page.mouse.click(1,1);
  const result=await page.evaluate(async({deployment,remote,av,mov,providerId,isolated,automatic,matroska,fixtureBytes,lifecycle,preview,fixtureSize,formatDelivery,stableDirect,compareDirectColor,compareFullFrame})=>{
    if(crossOriginIsolated!==isolated)throw Error('Unexpected browser isolation state');
    const r=await import('mediabunny'),{Player,DemuxeRuntime}=await import('/app.js');
    const webm=providerId==='mediabunny-file-preparation',streaming=providerId==='mediabunny-mp4-stream-preparation',bias=streaming?1:0;
    if(webm&&av)throw Error('The VP8 profile is video-only');
    const generate=async()=>{
    const target=new r.BufferTarget(),output=new r.Output({format:webm?new r.WebMOutputFormat():mov?new r.MovOutputFormat({fastStart:false}):new r.Mp4OutputFormat({fastStart:false}),target});
    const videoSource=new r.VideoSampleSource(webm?{codec:'vp8',bitrate:100000}:{codec:'avc',fullCodecString:'avc1.42001f',bitrate:100000,latencyMode:'realtime'});output.addVideoTrack(videoSource,{frameRate:10});
    let audioPackets=[],audioConfig,failure;
    if(av){
      const encoder=new AudioEncoder({output:(packet,metadata)=>{const bytes=new Uint8Array(packet.byteLength);packet.copyTo(bytes);audioPackets.push(bytes);audioConfig=metadata.decoderConfig??audioConfig;},error:error=>{failure=error;}});
      try{encoder.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:128000});
        for(let i=0;i<155;i++){
          const pcm=new Float32Array(2048);for(let c=0;c<2;c++)for(let n=0;n<1024;n++)pcm[c*1024+n]=.25*Math.sin(2*Math.PI*(c?660:440)*(i*1024+n)/48000);
          const sample=new AudioData({format:'f32-planar',sampleRate:48000,numberOfChannels:2,numberOfFrames:1024,timestamp:Math.round(i*1024/48000*1e6),data:pcm});try{encoder.encode(sample);}finally{sample.close();}
        }await encoder.flush();if(failure)throw failure;
      }finally{encoder.close();}audioPackets=audioPackets.slice(0,150);
    }
    const sound=av?new r.EncodedAudioPacketSource('aac'):undefined;if(sound)output.addAudioTrack(sound);
    await output.start();const audioPump=(async()=>{if(sound){for(let i=0;i<audioPackets.length;i++)await sound.add(new r.EncodedPacket(audioPackets[i],'key',i*1024/48000,1024/48000),i===0?{decoderConfig:audioConfig}:undefined);sound.close();}})();void audioPump.catch(()=>{});
    const canvas=new OffscreenCanvas(fixtureSize==='sd'?320:64,fixtureSize==='sd'?240:48),context=canvas.getContext('2d');context.fillStyle='#e02040';context.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<30;i++){const sample=new r.VideoSample(canvas,{timestamp:i/10,duration:.1});try{await videoSource.add(sample,{keyFrame:i%5===0});}finally{sample.close();}}
    videoSource.close();await audioPump;await output.finalize();
    let file=new File([target.buffer],webm?'public.webm':mov?'public.mov':'public.mp4');
    if(matroska){
      if(!webm)throw Error('Independent Matroska fixture requires the VP8 binding');
      const {matroskaFixture}=await import('/packages/provider-mediabunny/test/matroska-fixture.js');
      const input=new r.Input({formats:[r.WEBM],source:new r.BlobSource(file)}),packets=[];let colorSpace;
      try{const track=(await input.getTracks())[0];colorSpace=(await track.getDecoderConfig()).colorSpace;for await(const packet of new r.EncodedPacketSink(track).packets())packets.push(packet);}finally{input.dispose();}
      file=new File([matroskaFixture(packets,{width:canvas.width,height:canvas.height,colorSpace})],'independent.mkv');
    }
    return file;
    };
    const file=fixtureBytes?new File([new Uint8Array(fixtureBytes)],webm?'public.webm':mov?'public.mov':'public.mp4'):await generate();
    const published=await globalThis.publishFixture(Array.from(new Uint8Array(await file.arrayBuffer())));
    const source=remote?published:file;
    let formatInspection;
    await globalThis.publicStage('format-inspection');
    if(formatDelivery){const {inspectMedia}=await import('/app.js'),{createMediaBunnyInspector}=await import('/format-inspect.js');formatInspection=await inspectMedia(file,{inspector:createMediaBunnyInspector()});if(formatInspection.status!=='partial'||formatInspection.completeFor.join(',')!=='container'||formatInspection.chapters!==null)throw Error('Format inspector invented complete evidence');}
    const canvas=new OffscreenCanvas(64,48),context=canvas.getContext('2d');
    for(const qualifiedProviders of [{},{'browser-prepared':deployment.providers.find(provider=>provider.id==='browser-prepared').implementationIdentity}]){
      const unavailable=new DemuxeRuntime({assetBase:'https://public.test/',qualifiedProviders});let error;
      try{await unavailable.providers.load('demuxe-providers.json');}catch(failure){error=failure;}finally{await unavailable.destroy();}
      if(error?.code!=='DEPLOYMENT_UNAVAILABLE')throw Error('Public catalog accepted unqualified optional providers');
    }
   const reviewedCompositions=providers=>{const identities=Object.fromEntries(providers.map(provider=>[provider.id,provider.implementationIdentity]));return [['mediabunny-file-preparation','mediabunny'],['mediabunny-mp4-file-preparation','mediabunny-mp4'],['mediabunny-mp4-stream-preparation','mediabunny-mp4-stream']].filter(([id])=>identities[id]&&identities['browser-prepared']).map(([id,bindingId])=>({recipeId:'native-remux',bindingId,sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],implementationIdentities:{[id]:identities[id],'browser-prepared':identities['browser-prepared']}}));};
    const runtime=new DemuxeRuntime({assetBase:'https://public.test/',qualifiedProviders:Object.fromEntries(deployment.providers.map(provider=>[provider.id,provider.implementationIdentity])),qualifiedCompositions:reviewedCompositions(deployment.providers)});
    await runtime.providers.load('demuxe-providers.json');
    const host=document.createElement('div');document.body.append(host);
    const player=new Player(host,{runtime,...(automatic?{}:{mode:'native'}),nativeRemux:automatic?'auto':'always',remuxRuntime:automatic?'auto':'off',preview:preview?{enabled:false,bucketSeconds:0}:false,buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
    const errors=[],events=[];player.addEventListener('error',event=>errors.push(event.detail));player.addEventListener('inspectionchange',event=>events.push(event.detail.phase));
    const OriginalWorker=globalThis.Worker,createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL,workers=new Set(),urls=new Set();let started=0,cancelOnPreparation;
    globalThis.Worker=class extends OriginalWorker{constructor(url,options){super(url,options);workers.add(this);started++;const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};const post=this.postMessage.bind(this);this.postMessage=(data,transfer)=>{post(data,transfer??[]);if(cancelOnPreparation&&(data.type==='configure'||data.file||data.source)){const cancel=cancelOnPreparation;cancelOnPreparation=undefined;queueMicrotask(cancel);}};}};
    URL.createObjectURL=value=>{const url=createURL.call(URL,value);urls.add(url);return url;};URL.revokeObjectURL=url=>{urls.delete(url);return revokeURL.call(URL,url);};
    let result,audioContext;
    try{
      await player.setMuted(true);
      if(!isolated){
        let rejection;await globalThis.publicStage('prepared-open');
      try{await player.open(source);}catch(error){rejection=error;}
        if(rejection?.code!=='ISOLATION_REQUIRED'||started)throw Error('Public remux isolation policy was bypassed');
        result={publicEntryPoint:true,isolationRejected:true,workerCount:0};
      }else{
      let directColor,directFrame,directPreviewFrame,directFrameTime,directPreviewFrameTime;
      if(!matroska){
      const directHost=document.createElement('div');document.body.append(directHost);
      const direct=new Player(directHost,{runtime,preview:false,remuxRuntime:'off',...(stableDirect?{startupEscalation:false}:{})});
      const directEvents=[],observed=new WeakSet(),directStart=performance.now();
      const observeDirect=()=>{for(const video of directHost.querySelectorAll('video'))if(!observed.has(video)){observed.add(video);for(const event of ['loadstart','loadedmetadata','loadeddata','canplay','suspend','stalled','error','emptied'])video.addEventListener(event,()=>{if(directEvents.length<100)directEvents.push({event,ms:Math.round(performance.now()-directStart),readyState:video.readyState,networkState:video.networkState,preload:video.preload,error:video.error?.message});});}};
      const directObserver=new MutationObserver(observeDirect);directObserver.observe(directHost,{childList:true,subtree:true});observeDirect();
      try{
        await globalThis.publicStage('direct-control');await direct.setMuted(true);if(remote)await globalThis.setPublicMediaMode('weak');await direct.open(remote?{url:source.url}:file);await direct.play();await direct.pause();
        if(direct.diagnostics.plan?.id!=='native-direct'||started||await globalThis.publicAssetRequests()!==0)throw Error('Ordinary direct playback acquired an optional preparation asset: '+JSON.stringify({plan:direct.diagnostics.plan?.id,workers:started,assets:await globalThis.publicAssetRequests(),selection:direct.diagnostics.selection,mediaEvents:directEvents}));
        if(compareDirectColor){
          await direct.seek(1.25);const directVideo=direct.surface;
          const frame=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Direct color frame timed out')),5000);const observe=(_now,info)=>{if(info.mediaTime>1.25){clearTimeout(timeout);resolve(info.mediaTime);}else directVideo.requestVideoFrameCallback(observe);};directVideo.requestVideoFrameCallback(observe);});
          await direct.play();directFrameTime=await frame;await direct.pause();context.drawImage(directVideo,0,0);directColor=Array.from(context.getImageData(32,24,1,1).data);
          if(directColor[3]!==255||directColor[0]<100)throw Error('Direct color reference unavailable: '+JSON.stringify(directColor));
          if(compareFullFrame){
            directFrame=context.getImageData(0,0,64,48).data;
            await direct.seek(.2);const previewFrame=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Direct preview reference timed out')),5000);directVideo.requestVideoFrameCallback((_now,info)=>{clearTimeout(timeout);resolve(info.mediaTime);});});await direct.play();directPreviewFrameTime=await previewFrame;await direct.pause();if(Math.abs(directPreviewFrameTime-.2)>.001)throw Error('Direct preview reference time changed: '+directPreviewFrameTime);
            const reference=new OffscreenCanvas(32,24),referenceContext=reference.getContext('2d');referenceContext.drawImage(directVideo,0,0,32,24);directPreviewFrame=referenceContext.getImageData(0,0,32,24).data;
          }
        }
      }finally{directObserver.disconnect();await direct.destroy();directHost.remove();if(remote)await globalThis.setPublicMediaMode('valid');}
      }
      try{await player.open(source);}catch(error){throw Error('Public open failed: '+JSON.stringify({code:error.code,message:error.message,diagnostics:player.diagnostics}));}
      if(player.state.activeMode!=='native'||player.diagnostics.plan?.id!=='native-remux')throw Error('Unexpected public plan: '+JSON.stringify(player.diagnostics));
      const video=player.surface;if(!(video instanceof HTMLVideoElement))throw Error('Public surface is not video');
      await player.seek(1.25);const confirmedSeek=player.state.currentTime;if(Math.abs(confirmedSeek-1.25)>.05)throw Error('Public seek did not confirm its target');
      let analysers;
      if(av){
        audioContext=new AudioContext({sampleRate:48000});await audioContext.resume();
        if(audioContext.state!=='running')throw Error('Audio observation context did not start');
        const tap=audioContext.createMediaElementSource(video),split=audioContext.createChannelSplitter(2),silent=audioContext.createGain();silent.gain.value=0;
        tap.connect(split);analysers=[0,1].map(channel=>{const analyser=audioContext.createAnalyser();analyser.fftSize=2048;split.connect(analyser,channel);analyser.connect(silent);return analyser;});silent.connect(audioContext.destination);
        await player.setVolume(1);await player.setMuted(false);
      }
      const fresh=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Public playback made no fresh frame')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>1.25+bias){clearTimeout(timeout);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});
      await globalThis.publicStage('prepared-play');
      try{await player.play();}catch(error){throw Error('Prepared play failed: '+JSON.stringify({code:error.code,diagnostics:player.diagnostics}));}const freshFrame=await fresh;
      let observedAudio;
      if(av){
        const deadline=performance.now()+3000;
        const measure=(analyser,channel)=>{
          const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
          const energy=frequency=>{let re=0,im=0;for(let n=0;n<samples.length;n++){const phase=2*Math.PI*frequency*n/audioContext.sampleRate;re+=samples[n]*Math.cos(phase);im+=samples[n]*Math.sin(phase);}return Math.hypot(re,im)/samples.length;};
          return {channel,rms:Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length),expectedTone:energy(channel?660:440),otherTone:energy(channel?440:660)};
        };
        do{observedAudio=analysers.map(measure);if(observedAudio.every(channel=>channel.rms>.01&&channel.expectedTone>channel.otherTone*2))break;await new Promise(resolve=>setTimeout(resolve,20));}while(performance.now()<deadline);
        if(!observedAudio.every(channel=>channel.rms>.01&&channel.expectedTone>channel.otherTone*2))throw Error('Fresh stereo audio missing or channels changed: '+JSON.stringify({observedAudio,context:audioContext.state,media:{muted:video.muted,volume:video.volume,time:video.currentTime,paused:video.paused,readyState:video.readyState,audioTracks:video.audioTracks?Array.from(video.audioTracks,track=>({id:track.id,enabled:track.enabled,kind:track.kind})):undefined,decodedBytes:video.webkitAudioDecodedByteCount}}));
      }
      await player.pause();
      context.drawImage(video,0,0);const color=Array.from(context.getImageData(32,24,1,1).data);if(compareDirectColor?color.some((value,index)=>Math.abs(value-directColor[index])>3):Math.abs(color[0]-224)>20||Math.abs(color[1]-32)>20||Math.abs(color[2]-64)>20)throw Error('Public decoded color changed: '+JSON.stringify({color,directColor}));
      let playbackFrameComparison;
      if(compareFullFrame){const pixels=context.getImageData(0,0,64,48).data;let max=0,different=0;for(let i=0;i<pixels.length;i++){const delta=Math.abs(pixels[i]-directFrame[i]);max=Math.max(max,delta);if(delta>3)different++;}playbackFrameComparison={width:64,height:48,directFrameTime,preparedFrameTime:freshFrame,maxChannelDifference:max,channelsOverTolerance:different,tolerance:3};if(different||Math.abs(directFrameTime-freshFrame)>.001)throw Error('Public playback frame differs from direct source: '+JSON.stringify(playbackFrameComparison));}
      if(av&&(!player.state.audioTracks[0]?.id.endsWith(':audio:stream:1')||!player.state.mediaInfo.audio||player.state.mediaInfo.audio.sampleRate!==48000||player.state.mediaInfo.audio.channelLayout!=='stereo'))throw Error('Public A/V readiness lost audio');
      if(errors.length)throw Error('Public session errors: '+JSON.stringify(errors));
      result={directControlPolicy:stableDirect?'startupEscalation:false':'default',...(compareDirectColor?{directColor}:{}),...(compareFullFrame?{playbackFrameComparison}:{}),formatInspection,remote,av,container:matroska?'matroska':webm?'webm':mov?'mov':'mp4',publicEntryPoint:true,automatic:player.state.automaticSelection,directAcquired:matroska?null:false,plan:player.diagnostics.plan.id,status:player.state.status,seekTime:confirmedSeek,currentTime:player.state.currentTime,freshFrame,color,inspectionEvents:events,audio:av?{sampleRate:player.state.mediaInfo.audio.sampleRate,channelLayout:player.state.mediaInfo.audio.channelLayout,publicTrackId:player.state.audioTracks[0].id,decodedBytes:video.webkitAudioDecodedByteCount,observedAudio}:undefined,workerCount:started,capability:player.diagnostics.backend.capability};
      if(preview){
        await globalThis.publicStage('preview');
        if(remote)throw Error('This public preview fixture test requires local input; remote transport is qualified separately');
        const {createMediaBunnyPreviewProvider}=await import(formatDelivery?'/format-preview.js':'/packages/provider-mediabunny/index.js');
        const previewInput=new r.Input({formats:[matroska?r.MATROSKA:webm?r.WEBM:mov?r.QTFF:r.MP4],source:new r.BlobSource(file)});let previewConfig,previewSupport;
        try{const track=await previewInput.getPrimaryVideoTrack();previewConfig=await track.getDecoderConfig();previewSupport=await VideoDecoder.isConfigSupported(previewConfig);}finally{previewInput.dispose();}
        if(!previewSupport.supported)throw Error('Browser cannot decode the exact preview fixture configuration: '+JSON.stringify({...previewConfig,description:previewConfig.description?Array.from(new Uint8Array(previewConfig.description)):undefined}));
        const NativeDecoder=globalThis.VideoDecoder,decoders=new Set();let decoderCount=0,reads=0,blockNext=false,readStarted,lateRead;
        globalThis.VideoDecoder=class extends NativeDecoder{constructor(...args){super(...args);decoders.add(this);decoderCount++;}close(){decoders.delete(this);return super.close();}};
        const bytes=new Uint8Array(await file.arrayBuffer());
        const provider=createMediaBunnyPreviewProvider({formats:[matroska?r.MATROSKA:webm?r.WEBM:mov?r.QTFF:r.MP4],load:async()=>r,priority:-100,getSource:id=>id===player.preview.diagnostics.sourceId?{id,size:bytes.length,read:async(at,n)=>{reads++;if(blockNext){blockNext=false;readStarted();return new Promise(resolve=>{lateRead=()=>resolve(bytes.slice(at,at+n));});}return bytes.slice(at,at+n);}}:null});
        player.preview.setProviders([provider]);player.preview.enabled=true;
        try{
          const exact=await player.preview.getFrame({time:.25,width:32,height:24,exact:true});if(exact!==null)throw Error('Public exact request accepted an approximate represented frame');
          const first=await player.preview.getFrame({time:.25,width:32,height:24,exact:false});
          if(!first||first.path!=='mediabunny'||Math.abs(first.actualTime-.2)>.001||first.temporalAccuracy!=='approximate'||first.fidelity!=='reduced')throw Error('Public preview lost represented timestamp/fidelity: '+JSON.stringify({first,reads,decoderCount,diagnostics:player.preview.diagnostics,status:player.state.status,paused:player.surface.paused,hidden:document.hidden}));
          const bitmap=await createImageBitmap(first.image.blob),canvas=new OffscreenCanvas(32,24),context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();const previewColor=Array.from(context.getImageData(16,12,1,1).data);
          let previewFrameComparison;
          if(compareFullFrame){const pixels=context.getImageData(0,0,32,24).data;let max=0,different=0;for(let i=0;i<pixels.length;i++){const delta=Math.abs(pixels[i]-directPreviewFrame[i]);max=Math.max(max,delta);if(delta>3)different++;}previewFrameComparison={width:32,height:24,directFrameTime:directPreviewFrameTime,previewFrameTime:first.actualTime,maxChannelDifference:max,channelsOverTolerance:different,tolerance:3};if(different||Math.abs(directPreviewFrameTime-first.actualTime)>.001)throw Error('Public preview frame differs from direct source: '+JSON.stringify(previewFrameComparison));}
          else if(Math.abs(previewColor[0]-224)>20||Math.abs(previewColor[1]-32)>20||Math.abs(previewColor[2]-64)>20)throw Error('Public preview decoded color changed: '+JSON.stringify(previewColor));
          player.preview.clear();await player.play();const before=reads,deferred=await player.preview.getFrame({time:.75,width:32,height:24,exact:false});
          if(deferred!==null||reads!==before)throw Error('Public preview did not yield its decoder to playback');
          await player.pause();const resumed=await player.preview.getFrame({time:.75,width:32,height:24,exact:false});if(!resumed||Math.abs(resumed.actualTime-.7)>.001)throw Error('Paused public preview did not resume');
          player.preview.clear();blockNext=true;const began=new Promise(resolve=>{readStarted=resolve;});
          const oldId=player.preview.diagnostics.sourceId,pending=player.preview.getFrame({time:.25,width:32,height:24,exact:false}).then(()=>({accepted:true}),error=>({error:error.name}));
          await began;await player.open(new File([file],'preview-replacement.'+(webm?'webm':mov?'mov':'mp4')));
          const retired=await pending;if(retired.accepted||retired.error!=='AbortError'||player.preview.diagnostics.sourceId===oldId)throw Error('Public replacement accepted a stale preview');
          lateRead();const fresh=await player.preview.getFrame({time:.25,width:32,height:24,exact:false});
          if(!fresh||fresh.sourceId!==player.preview.diagnostics.sourceId)throw Error('Public replacement preview did not progress');
          result.preview={decoderConfig:{codec:previewConfig.codec,codedWidth:previewConfig.codedWidth,codedHeight:previewConfig.codedHeight},exactRequestDeclined:true,representedTime:first.actualTime,temporalAccuracy:first.temporalAccuracy,fidelity:first.fidelity,color:previewColor,...(compareFullFrame?{frameComparison:previewFrameComparison}:{}),deferredDuringPlayback:true,resumedAfterPause:true,sourceReplacement:true,lateReadDiscarded:true,decodersCreated:decoderCount};
        }finally{lateRead?.();player.preview.clear();await provider.release();globalThis.VideoDecoder=NativeDecoder;}
        if(decoders.size)throw Error('Public preview retained native decoders');result.preview.remainingDecoders=decoders.size;
      }
      await player.close();if(player.state.sourceId!==null)throw Error('Public close retained source');
      if(remote){
        for(const [mode,code] of [['denied','SOURCE_PERMISSION'],['weak','UNSUPPORTED_FEATURE']]){
          await globalThis.setPublicMediaMode(mode);let rejected;
          try{await player.open({...source,identity:undefined});}catch(error){rejected=error;}
          if(rejected?.code!==code||started!==result.workerCount)throw Error('Public source failure was downgraded: '+JSON.stringify({mode,code:rejected?.code}));
        }
        await globalThis.setPublicMediaMode('valid');result.terminalRemoteFailures=true;
      }
      const cancellationStart=started,controller=new AbortController();cancelOnPreparation=()=>controller.abort();let cancelled;
      try{await player.open(source,{signal:controller.signal});}catch(error){cancelled=error;}
      if(cancelled?.code!=='ABORTED'||cancelOnPreparation||player.state.sourceId!==null)throw Error('Public cancellation did not retire the pending source');
      result.cancelledDuringPreparation=true;result.cancelledWorkers=started-cancellationStart;result.unqualifiedCatalogRejected=true;
      if(lifecycle){
        await globalThis.publicStage('lifecycle');
        await audioContext?.close();audioContext=undefined;await player.setMuted(true);
        const replacementSource=remote?{...source,url:source.url+'?replacement'}:new File([file],'replacement.'+(mov?'mov':webm?'webm':'mp4'));
        const retiring=new AbortController();let replacement;cancelOnPreparation=()=>{retiring.abort();replacement=player.open(replacementSource);void replacement.catch(()=>{});};
        let superseded;try{await player.open(source,{signal:retiring.signal});}catch(error){superseded=error;}
        if(superseded?.code!=='ABORTED'||!replacement||cancelOnPreparation)throw Error('Public replacement did not supersede preparation: '+JSON.stringify({code:superseded?.code,message:superseded?.message,replacement:!!replacement,pendingHook:!!cancelOnPreparation,state:player.state.status}));
        await replacement;const replacementId=player.state.sourceId;
        if(!replacementId||player.diagnostics.plan?.id!=='native-remux')throw Error('Replacement did not become active');
        const peerHost=document.createElement('div');document.body.append(peerHost);
        const peer=new Player(peerHost,{runtime,mode:'native',nativeRemux:'always',remuxRuntime:'off',preview:false,buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
        const fresh=async(owner,target)=>{const surface=owner.surface;const frame=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Concurrent public player stalled')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>target+bias){clearTimeout(timeout);resolve(frame.mediaTime-bias);}else surface.requestVideoFrameCallback(observe);};surface.requestVideoFrameCallback(observe);});await owner.play();return frame;};
        try{
          await peer.setMuted(true);await peer.open(source);
          await Promise.all([player.seek(.75),peer.seek(1.25)]);
          const concurrentFrames=await Promise.all([fresh(player,.75),fresh(peer,1.25)]);
          if(player.state.sourceId!==replacementId)throw Error('Superseded source published late state');
          await player.close();const peerAfterClose=await fresh(peer,concurrentFrames[1]);await peer.pause();
          result.lifecycle={replacementAfterCancelledPreparation:true,concurrentFrames,peerProgressAfterOtherClose:peerAfterClose,originalSourceRetired:true};
        }finally{await peer.destroy();peerHost.remove();}
      }
      }
    }finally{
      await audioContext?.close();await player.destroy();await runtime.destroy();host.remove();globalThis.Worker=OriginalWorker;URL.createObjectURL=createURL;URL.revokeObjectURL=revokeURL;
      if(workers.size||urls.size)throw Error('Public lifecycle leaked workers or object URLs');
    }
    return {...result,createdWorkers:started,remainingWorkers:workers.size,remainingURLs:urls.size};
  },{deployment,remote:process.env.DEMUXE_TEST_REMOTE==='1',av:process.env.DEMUXE_TEST_AV==='1',mov:process.env.DEMUXE_STREAM_MOV==='1',providerId,isolated,automatic:process.env.DEMUXE_PUBLIC_AUTOMATIC==='1',matroska:process.env.DEMUXE_PUBLIC_MATROSKA==='1',fixtureBytes,lifecycle:process.env.DEMUXE_PUBLIC_LIFECYCLE==='1',preview:process.env.DEMUXE_PUBLIC_PREVIEW==='1',fixtureSize:process.env.DEMUXE_PUBLIC_FIXTURE_SIZE,formatDelivery:!!formatDirectory||!!consumer,stableDirect,compareDirectColor,compareFullFrame});
  if(isolated){assert.equal(result.workerCount,providerId==='mediabunny-mp4-stream-preparation'?2:1);assert.equal(result.cancelledWorkers,1);assert.equal(requests.worker,1);assert.ok(result.freshFrame>1.25);}else{assert.equal(result.workerCount,0);assert.equal(requests.worker,0);}assert.deepEqual(requests.forbidden,[]);
  if(process.env.DEMUXE_PUBLIC_EXPORT_FIXTURE)await writeFile(process.env.DEMUXE_PUBLIC_EXPORT_FIXTURE,fixture);
  const receipt={browserEngine:browserName,fixture:{sha256:hash(fixture),bytes:fixture.length,origin:fixtureBytes?'external-encoded-bytes':'generated-in-chrome'},status:compareFullFrame?'public-player-direct-frame-comparison-passed-not-release':compareDirectColor?'public-player-direct-color-comparison-passed-not-release':isolated?'public-player-composition-passed-not-release':'public-isolation-rejection-passed',recordedAt:new Date().toISOString(),browser:browser.version(),identities,checks:result,requests:{...requests,media:mediaRequests},limitations:['Finite fixture coverage; broader independent media and browser matrix remain open','No full process-memory/performance or release-assembly qualification',...(compareDirectColor?[compareFullFrame?'Direct comparisons cover only this fixture and sampled frames; authored-color assertions remain separate':'Direct comparison samples one pixel; it does not replace the authored-color assertion or qualify full-frame preservation']:[])]};
  if(process.env.DEMUXE_BROWSER_EVIDENCE)await writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}catch(error){
  if(process.env.DEMUXE_BROWSER_EVIDENCE)await writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify({status:'failed-not-qualified',stage,recordedAt:new Date().toISOString(),browserEngine:browserName,browser:browser?.version(),identities,fixture:fixture?{sha256:hash(fixture),bytes:fixture.length}:undefined,error:{message:error.message,stack:error.stack},requests:{...requests,media:mediaRequests}},null,2)+'\n');
  throw error;
}finally{clearTimeout(timer);await browser?.close();}
