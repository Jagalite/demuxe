// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),core=resolve(root,'../../src');
const candidate=resolve(process.env.DEMUXE_RUNTIME_CANDIDATE??'runtime-candidate-mp4');
const deployment=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
assert.equal(deployment.providers[0].id,'mediabunny-mp4-file-preparation');
const library=await build({entryPoints:[join(root,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false});
const owner=await build({stdin:{contents:`export {DemuxeRuntime} from ${JSON.stringify(join(core,'runtime.ts'))};export {ProviderRuntime} from ${JSON.stringify(join(core,'internal/provider-runtime.ts'))}; export {NativePlayer} from ${JSON.stringify(join(core,'internal/native-player.ts'))}; export {playerError} from ${JSON.stringify(join(core,'internal/errors.ts'))};`,resolveDir:core},bundle:true,platform:'browser',format:'esm',write:false});
const identity='sha256:'+createHash('sha256').update(owner.outputFiles[0].contents).digest('hex');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtureRecords=[];
deployment.providers.push({id:'browser-prepared',implementationIdentity:identity,technology:'browser-native',delivery:['browser','application-bundle'],applicationBuild:identity,offers:[{capability:'media.present.prepared',version:1,profile:'selected-streams'}],assetIds:[]});
const requests={mp4:0,other:0,media:0};const fixtures=new Map();let mediaMode='valid';let browser,timer;
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  timer=setTimeout(()=>{void browser.close();},60000);
  const page=await browser.newPage();
  await page.exposeFunction('retainMp4Fixture',async(name,bytes)=>{
    const data=Buffer.from(bytes);fixtureRecords.push({name,bytes:data.length,sha256:hash(data)});
    if(process.env.DEMUXE_FIXTURE_EXPORT_DIR)await writeFile(join(process.env.DEMUXE_FIXTURE_EXPORT_DIR,name),data,{flag:'wx'});
  });
  page.on('console',message=>console.log('Browser:',message.text()));
  await page.exposeFunction('runtimeRequests',()=>({...requests}));
  await page.exposeFunction('setRemoteMode',mode=>{mediaMode=mode;});
  await page.exposeFunction('registerRemoteFixture',(name,bytes)=>{fixtures.set('/'+name,Buffer.from(bytes));return {url:'https://media.test/'+name,identity:{size:String(bytes.length),etag:'"fixture-v1"'}};});
  await page.route('https://media.test/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,body=fixtures.get(path.replace('/direct-','/'));
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Range,If-Range','Access-Control-Expose-Headers':'Content-Range,Content-Length,ETag'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    requests.media++;
    if(!body)return route.fulfill({status:404,headers:cors});
    if(!path.startsWith('/direct-')&&mediaMode==='denied')return route.fulfill({status:401,headers:cors});
    const range=/^bytes=(\d+)-(\d*)$/.exec(request.headers()['range']??'');
    if(!range)return route.fulfill({status:200,headers:{...cors,'Content-Type':'video/mp4','Content-Length':String(body.length),ETag:'"fixture-v1"'},body});
    const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):body.length-1,body.length-1);
    return route.fulfill({status:206,headers:{...cors,'Content-Type':'video/mp4','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${body.length}`,ETag:mediaMode==='changed'?'"fixture-v2"':'"fixture-v1"'},body:body.subarray(start,end+1)});
  });
  await page.route('https://mp4.test/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"mediabunny":"/library.js"}}</script>'});
    if(path==='/library.js')return route.fulfill({contentType:'text/javascript',body:Buffer.from(library.outputFiles[0].contents)});
    if(path==='/owners.js')return route.fulfill({contentType:'text/javascript',body:Buffer.from(owner.outputFiles[0].contents)});
    if(path==='/demuxe-providers.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(deployment)});
    if(path==='/web/providers/mediabunny/mp4.js'){requests.mp4++;return route.fulfill({contentType:'text/javascript',body:await readFile(join(candidate,path))});}
    if(path.startsWith('/web/providers/')){requests.other++;return route.abort();}
    const sourceRoot=path.startsWith('/web/')?resolve(root,'../..'):root;
    const file=resolve(sourceRoot,path.replace(/^\//,''));
    if(!file.startsWith(sourceRoot+sep))return route.abort();
    try{return await route.fulfill({contentType:'text/javascript',body:await readFile(file)});}catch{return route.abort();}
  });
  await page.goto('https://mp4.test/');
  const result=await page.evaluate(async ({deployment,av,channels,remote})=>{
    const r=await import('mediabunny');
    const {ProviderRuntime,NativePlayer,playerError,DemuxeRuntime}=await import('/owners.js');
    const {createMP4VideoPreparer}=await import('/mp4-preparation.js');
    const qualification=Object.fromEntries(deployment.providers.map(provider=>[provider.id,provider.implementationIdentity]));
    const createReviewed=async(base,qualified,preferences)=>{const shared=new DemuxeRuntime({assetBase:base,qualifiedProviders:qualified,qualifiedCompositions:[{recipeId:'native-remux',sourceProfiles:["local:pthread:webm-matroska-vp8-video","local:pthread:mp4-mov-avc-video","local:pthread:mp4-mov-avc-aac-1ch","local:pthread:mp4-mov-avc-aac-2ch","local:pthread:mp4-mov-aac-1ch","local:pthread:mp4-mov-aac-2ch","remote:pthread:webm-matroska-vp8-video","remote:pthread:mp4-mov-avc-video","remote:pthread:mp4-mov-avc-aac-1ch","remote:pthread:mp4-mov-avc-aac-2ch","remote:pthread:mp4-mov-aac-1ch","remote:pthread:mp4-mov-aac-2ch"],bindingId:'mediabunny-mp4',implementationIdentities:{'mediabunny-mp4-file-preparation':qualified['mediabunny-mp4-file-preparation'],'browser-prepared':qualified['browser-prepared']}}]});await shared.providers.load('demuxe-providers.json');const runtime=new ProviderRuntime(new URL(base),qualified,preferences,shared);const destroy=runtime.destroy.bind(runtime);runtime.destroy=async()=>{await destroy();await shared.destroy();};return runtime;};
    const facts={format:'mov,mp4,m4a,3gp,3g2,mj2',duration:av?1.6:1,tracks:[{id:'source-h264',index:0,type:'video',codec:'h264'},...(av?[{id:'source-aac',index:1,type:'audio',codec:'aac',sampleRate:48000,channels}]:[])]};
    let audioPackets=[],audioConfig;
    if(av){
      let failure;
      const encoder=new AudioEncoder({output:(chunk,metadata)=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);audioPackets.push(data);if(metadata.decoderConfig)audioConfig=metadata.decoderConfig;},error:error=>{failure=error;}});
      try{
        encoder.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:channels,bitrate:128000});
        for(let block=0;block<80;block++){
          const pcm=new Float32Array(1024*channels);
          for(let i=0;i<1024;i++){pcm[i]=.25*Math.sin(2*Math.PI*440*(block*1024+i)/48000);if(channels>1)pcm[1024+i]=.25*Math.sin(2*Math.PI*660*(block*1024+i)/48000);}
          const sample=new AudioData({format:'f32-planar',numberOfFrames:1024,numberOfChannels:channels,sampleRate:48000,timestamp:Math.round(block*1024/48000*1e6),data:pcm});
          try{encoder.encode(sample);}finally{sample.close();}
        }
        await encoder.flush();if(failure)throw failure;
      }finally{encoder.close();}
      if(audioPackets.length<75)throw new Error('Insufficient AAC fixture packets');
      audioPackets=audioPackets.slice(0,75);
    }
    const signatures=async file=>{
      const input=new r.Input({formats:[r.MP4,r.QTFF],source:new r.BlobSource(file)});
      try{
        const result=[];
        for(const track of await input.getTracks()){
          const packets=[];
          for await(const packet of new r.EncodedPacketSink(track).packets())packets.push({timestamp:packet.timestamp,duration:packet.duration,type:packet.type,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',packet.data)))});
          let audio;
          if(track.type==='audio'){
            let frames=0;const pcm=[];
            for await(const sample of new r.AudioSampleSink(track).samples()){
              try{
                if(sample.sampleRate!==48000||sample.numberOfChannels!==channels)throw new Error('Unexpected decoded audio layout');
                frames+=sample.numberOfFrames;
                for(let channel=0;channel<channels;channel++){const plane=new Float32Array(sample.numberOfFrames);sample.copyTo(plane,{planeIndex:channel,format:'f32-planar'});pcm.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',plane))));}
              }finally{sample.close();}
            }
            audio={frames,channels,sampleRate:48000,pcm};
          }
          result.push({type:track.type,packets,config:await track.getDecoderConfig(),audio});
        }
        return result;
      }finally{input.dispose();}
    };
    const results=[];
    const OriginalWorker=globalThis.Worker,createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL;
    const activeWorkers=new Set(),activeURLs=new Set();let workerCount=0,abortOnRead;
    globalThis.Worker=class extends OriginalWorker{
      constructor(...args){super(...args);activeWorkers.add(this);workerCount++;this.addEventListener('message',event=>{if(event.data?.type==='read'&&abortOnRead){const abort=abortOnRead;abortOnRead=undefined;abort();}});}
      postMessage(message,...rest){if(message.source&&(JSON.stringify(message).includes('fixture-token')||JSON.stringify(message).includes('media.test')))throw new Error('Transport credentials leaked into preparation worker');return super.postMessage(message,...rest);}
      terminate(){activeWorkers.delete(this);return super.terminate();}
    };
    URL.createObjectURL=value=>{const url=createURL.call(URL,value);activeURLs.add(url);return url;};
    URL.revokeObjectURL=url=>{activeURLs.delete(url);return revokeURL.call(URL,url);};
    try{
    for(const mov of [false,true]){
      const target=new r.BufferTarget(),output=new r.Output({format:mov?new r.MovOutputFormat({fastStart:false}):new r.Mp4OutputFormat({fastStart:false}),target});
      const video=new r.VideoSampleSource({codec:'avc',fullCodecString:'avc1.42001f',bitrate:100000,latencyMode:'realtime'});
      output.addVideoTrack(video,{frameRate:10,name:'Authored AVC',languageCode:'eng'});
      const audio=av?new r.EncodedAudioPacketSource('aac'):undefined;
      if(audio)output.addAudioTrack(audio,{name:'Authored stereo AAC',languageCode:'eng'});
      await output.start();
      const audioPump=(async()=>{if(audio){for(let i=0;i<audioPackets.length;i++)await audio.add(new r.EncodedPacket(audioPackets[i],'key',i*1024/48000,1024/48000),i===0?{decoderConfig:audioConfig}:undefined);audio.close();}})();
      void audioPump.catch(()=>{});
      const canvas=new OffscreenCanvas(64,48),context=canvas.getContext('2d');context.fillStyle='#e02040';context.fillRect(0,0,64,48);
      for(let i=0;i<(av?16:10);i++){const sample=new r.VideoSample(canvas,{timestamp:i/10,duration:.1});try{await video.add(sample);}finally{sample.close();}}
      video.close();
      await audioPump;
      await output.finalize();
      const file=new File([target.buffer],mov?'fixture.mov':'fixture.mp4');
      await globalThis.retainMp4Fixture(mov?'fixture.mov':'fixture.mp4',Array.from(new Uint8Array(target.buffer)));
      const remoteSource=remote?{...await globalThis.registerRemoteFixture(mov?'fixture.mov':'fixture.mp4',Array.from(new Uint8Array(target.buffer))),format:'file',headers:{Authorization:'fixture-token'},credentials:'omit',allowedOrigins:['https://media.test']}:undefined;
      const candidateSource=remote?{kind:'remote',options:remoteSource}:{kind:'local',file};
      const beforeAdmission=await globalThis.runtimeRequests();
      for(const qualified of [{},{'mediabunny-mp4-file-preparation':qualification['mediabunny-mp4-file-preparation']},{...qualification,'mediabunny-mp4-file-preparation':'wrong-build'}]){
        const unavailable=new ProviderRuntime(new URL('https://mp4.test/'),qualified);
        try{
          await unavailable.load();
          if(!unavailable.rejection('native-remux',candidateSource,'unqualified-avc','pthread',facts)||(remote?unavailable.canPrepareRemote(remoteSource):unavailable.canPrepareFile(file))||await (remote?unavailable.prepareRemote(remoteSource,new AbortController().signal):unavailable.prepareFile(file,new AbortController().signal))!==undefined)throw new Error('Unqualified MP4 binding was selectable');
        }finally{await unavailable.destroy();}
      }
      if(JSON.stringify(beforeAdmission)!==JSON.stringify(await globalThis.runtimeRequests()))throw new Error('Unqualified MP4 admission acquired bytes');
      const prepared=await createMP4VideoPreparer({load:async()=>r})(file,{sourceTracks:facts.tracks});
      if(prepared&&(prepared.tracks.length!==facts.tracks.length||facts.tracks.some(source=>!prepared.tracks.some(track=>track.id===source.id&&track.type===source.type&&track.codec===source.codec&&track.selected))))throw new Error('Source track identity lost');
      if(!prepared)throw new Error('MP4/MOV preparation declined '+(mov?'MOV':'MP4'));
      const before=await signatures(file),after=await signatures(prepared.file);
      // Compare typed configuration bytes explicitly rather than object identity.
      const normalized=value=>JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?Array.from(new Uint8Array(item.buffer,item.byteOffset,item.byteLength)):item);
      if(normalized(before)!==normalized(after)||before.find(track=>track.type==='video').packets.length!==(av?16:10))throw new Error('AVC packet/configuration preservation failed');
      if(av&&before.find(track=>track.type==='audio').audio.frames!==76800)throw new Error('Authored AAC sample extent changed');
      const runtime=await createReviewed('https://mp4.test/',qualification);
      const element=document.createElement('video');element.muted=true;document.body.append(element);
      const player=new NativePlayer(element,'always',new URL('https://mp4.test/'),false,undefined,undefined,false,[],'native-remux',undefined,10000,undefined,'pthread',runtime);
      try{
        await runtime.load();
        if(runtime.rejection('native-remux',candidateSource,'avc-fixture','pthread',facts))throw new Error('MP4 owner admission rejected source');
        if(remote)await player.openRemote(remoteSource);else await player.open(file);
        if(player.diagnostics.projection?.profile!==(mov?'mov':'mp4')+(av?'-h264-aac-av-v1':'-h264-video-only-v1'))throw new Error('Wrong MP4 owner profile');
        const audioBefore=element.webkitAudioDecodedByteCount??0;
        await player.seek(.5);
        const progress=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('AVC made no fresh-frame progress')),5000);const observe=(_now,metadata)=>{if(metadata.mediaTime>.5){clearTimeout(timeout);resolve(metadata.mediaTime);}else element.requestVideoFrameCallback(observe);};element.requestVideoFrameCallback(observe);});
        await player.play();const freshFrameTime=await progress;
        if(av&&(element.webkitAudioDecodedByteCount??0)<=audioBefore)throw new Error('No fresh decoded audio after seek');
        context.drawImage(element,0,0);const color=Array.from(context.getImageData(32,24,1,1).data);
        if(Math.abs(color[0]-224)>20||Math.abs(color[1]-32)>20||Math.abs(color[2]-64)>20)throw new Error('AVC color changed: '+color);
        if(remote){
          if(player.diagnostics.projection?.transport!=='validated-remote-range')throw new Error('Remote source bypassed validated preparation transport');
          const controller=new AbortController();abortOnRead=()=>controller.abort();
          let cancelled;try{await runtime.prepareRemote(remoteSource,controller.signal);}catch(error){cancelled=error;}
          if(cancelled?.name!=='AbortError'||activeWorkers.size)throw new Error('Remote worker read cancellation leaked');
          for(const [mode,code] of [['changed','SOURCE_CHANGED'],['denied','SOURCE_PERMISSION']]){
            await globalThis.setRemoteMode(mode);
            let error;try{await runtime.prepareRemote(remoteSource,new AbortController().signal);}catch(failure){error=failure;}
            if(!error||playerError(error).code!==code)throw new Error('Remote failure was reclassified: '+mode+' '+error);
          }
          await globalThis.setRemoteMode('valid');
          const changed={...remoteSource,headers:{...remoteSource.headers}};
          if(runtime.rejection('native-remux',{kind:'remote',options:changed},'changed-policy','pthread',facts))throw new Error('Policy mutation fixture not admitted');
          changed.headers.Authorization='changed-token';
          const beforeMutation=await globalThis.runtimeRequests();let mutation;
          try{await runtime.prepareRemote(changed,new AbortController().signal);}catch(error){mutation=error;}
          if(mutation?.code!=='SOURCE_CHANGED'||(await globalThis.runtimeRequests()).media!==beforeMutation.media)throw new Error('Changed admission policy was reused');
        }
        results.push({remote:!!remote,profile:player.diagnostics.projection.profile,packets:before.reduce((n,track)=>n+track.packets.length,0),audio:av?{frames:before.find(track=>track.type==='audio').audio.frames,channels,sampleRate:48000,pcmHashesPreserved:true,authoredPrimingRetained:true,decodedByteProgress:(element.webkitAudioDecodedByteCount??0)-audioBefore}:undefined,packetHashesPreserved:true,trackIdsPreserved:true,seekTime:.5,freshFrameTime,color});
      }finally{await player.destroy();await runtime.destroy();element.remove();}
      const directRuntime=await createReviewed('https://mp4.test/',qualification);
      const directVideo=document.createElement('video');directVideo.muted=true;document.body.append(directVideo);
      const direct=new NativePlayer(directVideo,'never',new URL('https://mp4.test/'),false,undefined,undefined,false,[],'native-direct',undefined,10000,undefined,'pthread',directRuntime);
      const beforeDirect=await globalThis.runtimeRequests();
      try{
        if(remote)await direct.openRemote({url:remoteSource.url.replace('/fixture.','/direct-fixture.'),format:'file'});else await direct.open(file);
        if(direct.diagnostics.projection||beforeDirect.mp4!==(await globalThis.runtimeRequests()).mp4)throw new Error('Direct AVC path acquired preparation');
      }finally{await direct.destroy();await directRuntime.destroy();directVideo.remove();}
    }
    }
    finally{globalThis.Worker=OriginalWorker;URL.createObjectURL=createURL;URL.revokeObjectURL=revokeURL;}
    if(activeWorkers.size||activeURLs.size||workerCount!==(remote?4:2))throw new Error('MP4 owner leaked preparation resources');
    return {profiles:results,remotePolicy:remote?{identityChange:'SOURCE_CHANGED',authorization:'SOURCE_PERMISSION',cancelledDuringWorkerRead:true,credentialsPosted:false,policyMutationRejected:true}:undefined,lifecycle:{workerCount,remainingWorkers:activeWorkers.size,remainingObjectURLs:activeURLs.size},unqualifiedAdmissionAcquired:false,directAcquired:false};
  },{deployment,av:process.env.DEMUXE_TEST_AV==='1',channels:Number(process.env.DEMUXE_AUDIO_CHANNELS??2),remote:process.env.DEMUXE_TEST_REMOTE==='1'});
  assert.equal(result.profiles.length,2);assert.equal(requests.other,0);assert.equal(requests.mp4,2);
  const receipt={remote:process.env.DEMUXE_TEST_REMOTE==='1',schema:1,status:'test-composition-passed-not-release',recordedAt:new Date().toISOString(),preparationIdentity:deployment.providers[0].implementationIdentity,presenterIdentity:identity,harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),workerSHA256:deployment.assets[0].sha256,librarySHA256:hash(library.outputFiles[0].contents),fixtureRecords,browser:browser.version(),fixtures:process.env.DEMUXE_TEST_AV==='1'?`WebCodecs AVC/AAC, 64x48 10fps 1.6s; 75 authored zero-based AAC-LC ${process.env.DEMUXE_AUDIO_CHANNELS??2}ch packets retaining priming`:'WebCodecs AVC + MediaBunny MP4/MOV writer, 64x48 10fps 1s',checks:result,requests,limitations:['Generated fixtures, not independent arbitrary-container qualification',process.env.DEMUXE_TEST_AV==='1'?'One browser; authored zero-based AAC-LC priming retained; no trimmed AAC, reordered frames, nonidentity edits or fragmented input qualification':'One browser; video-only evidence, no reordered frames, nonidentity edits or fragmented input qualification']};
  if(process.env.DEMUXE_BROWSER_EVIDENCE)await writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}finally{clearTimeout(timer);await browser?.close();}
