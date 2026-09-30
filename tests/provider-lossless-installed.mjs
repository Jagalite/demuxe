// SPDX-License-Identifier: Apache-2.0
// Public installed package APIs -> verified lazy acquisition -> complete output.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome';
const setup=JSON.parse(await readFile('build/provider-lossless-audio/installed.json','utf8'));
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json','utf8'));
assert.equal(host.passed,true);
const deployment=JSON.parse(await readFile(setup.work+'/deployed/demuxe-providers.json','utf8'));
const identities=Object.fromEntries(deployment.providers.map(p=>[p.id,p.implementationIdentity]));
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;requests.push({case:active,path:name});
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><video width="320" height="180"></video><div id="player"></div>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):path.resolve(setup.work);
 const file=path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const b=await readFile(file);res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const result={passed:false,family,setup,cases:[],scope:'exact installed public component packages; complete bounded recipe, MSE presentation, decoded channel identity and lifecycle; no physical device qualification'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}
 else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const f of host.results){
  active=f.id;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  const sample=await page.evaluate(async({f,identities})=>{
   const base=new URL('/deployed/',location.href);
   const api=await import('/node_modules/demuxe/web/generated/components.js');
   const {createComponentOwners}=await import('/node_modules/@demuxe/provider-container/dist/index.js');
   const parsed=api.parseProviderDeployment(await(await fetch(new URL('demuxe-providers.json',base))).json(),base);
   const owners=createComponentOwners(parsed,base),acquisition=new api.ProviderAcquisition(parsed,owners.owners),controller=new AbortController();
   const input=await(await fetch('/fixtures/'+f.id+'.mkv')).arrayBuffer();
   const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
   if(await hash(input)!==f.sourceSHA256)throw Error('Source differs from host qualification');
   const recipe=api.audioRepairRecipe(f.codec,f.channels),scopeKey=JSON.stringify([recipe.id,f.sourceSHA256,navigator.userAgent]);
   const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,identities[a.providerId]]))}));
   let url,context,source,analyser;
   try{
    let denied=false;try{await api.executeComponentBinding(acquisition,recipe,[],scopeKey,'fine',()=>{throw Error('Unqualified execution reached');});}catch(e){denied=e.code==='QUALIFICATION_REQUIRED';}
    if(!denied)throw Error('Missing evidence must reject');
    const start=performance.now();
    const execution=await api.executeComponentBinding(acquisition,recipe,evidence,scopeKey,'fine',binding=>owners.execute(new Blob([input]),f.codec,binding,controller.signal,f.channels));
    const preparationMs=performance.now()-start,output=await execution.value.arrayBuffer();
    const streamed=[];for await(const part of owners.executeFragments(new Blob([input]),f.codec,'fine',controller.signal,f.channels))streamed.push(part);
    const streamedOutput=await new Blob(streamed).arrayBuffer();
    if(await hash(streamedOutput)!==f.outputSHA256)throw Error('Installed stream differs from complete output');
    if(await hash(output)!==f.outputSHA256)throw Error('Browser output differs from host');
    const wasmResidentBytes=owners.allocatedWasmBytes(),readiness=owners.readiness();
    // Decode the actual completed container and compare every channel to the
    // host reference. Sample matching detects permutation, duplication or mixdown.
    context=new AudioContext({sampleRate:48000});
    const decoded=await Promise.race([context.decodeAudioData(output.slice(0)),new Promise((_,reject)=>setTimeout(()=>reject(Error('Browser channel decode deadline')),15000))]);
    const reference=new Float32Array(await(await fetch('/fixtures/'+f.id+'.reference.f32')).arrayBuffer());
    if(decoded.numberOfChannels!==f.channels||decoded.length!==f.audioSamples)throw Error('Browser decoded channel/sample count differs');
    let maxChannelError=0;
    for(let c=0;c<f.channels;c++){
     const plane=decoded.getChannelData(c);
     for(let i=0;i<plane.length;i++)maxChannelError=Math.max(maxChannelError,Math.abs(plane[i]-reference[i*f.channels+c]));
    }
    if(maxChannelError>1e-6)throw Error('Browser channel identity differs: '+maxChannelError);
    const video=document.querySelector('video');analyser=context.createAnalyser();source=context.createMediaElementSource(video);source.connect(analyser);analyser.connect(context.destination);await context.resume();
    const media=new MediaSource();url=URL.createObjectURL(media);video.src=url;
    function event(target,name,action){return new Promise((r,j)=>{const t=setTimeout(()=>finish(Error(name+' timeout')),15000);const done=()=>finish(),error=()=>finish(Error('Media error'));function finish(e){clearTimeout(t);target.removeEventListener(name,done);target.removeEventListener('error',error);e?j(e):r();}target.addEventListener(name,done,{once:true});target.addEventListener('error',error,{once:true});action?.();});}
    await event(media,'sourceopen');
    const mime='video/mp4; codecs="avc1.42c00b,flac"';if(!MediaSource.isTypeSupported(mime))throw Error('Output MSE codec unavailable');
    const buffer=media.addSourceBuffer(mime);await event(buffer,'updateend',()=>buffer.appendBuffer(output));media.endOfStream();
    if(f.channels===8)await event(video,'seeked',()=>{video.currentTime=4;});
    await video.play();const until=performance.now()+12000,target=f.channels===8?4.6:.4;let audioPeak=0;const wave=new Float32Array(analyser.fftSize);
    while(video.currentTime<target&&performance.now()<until){analyser.getFloatTimeDomainData(wave);for(const value of wave)audioPeak=Math.max(audioPeak,Math.abs(value));await new Promise(r=>setTimeout(r,20));}
    if(video.currentTime<target)throw Error('Playback stalled');
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);const nonblack=cx.getImageData(0,0,160,90).data.some((v,i)=>i%4!==3&&v>60);
    const seek=f.channels===8?6:.7;await event(video,'seeked',()=>{video.currentTime=seek;});
    video.pause();video.removeAttribute('src');video.load();
    let playerIntegration;
    if(f.id==='truehd-stereo'){
     const {Player}=await import('/node_modules/demuxe/dist/index.js');
     const player=new Player(document.querySelector('#player'),{mode:'native',automaticSelection:false,assetBase:base.href,preview:false});
     try{
      await player.open(new File([output],'prepared.mp4',{type:'video/mp4'}));
      await player.play();
      const deadline=performance.now()+10000;
      while(player.state.currentTime<.2&&performance.now()<deadline)await new Promise(r=>setTimeout(r,20));
      if(player.state.currentTime<.2)throw Error('Public Player playback stalled');
      await player.seek(.6);
      playerIntegration={played:true,seekTime:player.state.currentTime,plan:player.getPlaybackExplanation().planId};
     }finally{await player.destroy();}
    }
    controller.abort();await acquisition.dispose();
    if(owners.allocatedWasmBytes()!==0)throw Error('Disposed owner retained module');
    return {codec:f.codec,channels:f.channels,preparationMs,throughputRatio:(f.audioSamples/48000)/(preparationMs/1000),wasmResidentBytes,outputBytes:output.byteLength,audioPeak,nonblack,seekTime:seek,hostOutputExact:true,streamExact:true,browserChannelsExact:true,maxChannelError,playerIntegration,qualificationRequired:true,disposed:true,readiness};
   }finally{controller.abort();await acquisition.dispose();const video=document.querySelector('video');video.pause();video.removeAttribute('src');video.load();if(url)URL.revokeObjectURL(url);source?.disconnect();analyser?.disconnect();await context?.close();}
  },{f,identities});
  assert.equal(sample.nonblack,true);assert.ok(sample.audioPeak>.001);assert.deepEqual(errors,[]);
  const wasm=requests.filter(r=>r.case===f.id&&r.path.endsWith('.wasm')).map(r=>r.path);
  const profile=f.codec==='dts-hd'?'dts-hd':'truehd-mlp';assert.deepEqual(wasm.sort(),['/deployed/web/providers/audio/'+profile+'/module.wasm','/deployed/web/providers/audio/flac/module.wasm'].sort());
  result.cases.push({id:f.id,sourceSHA256:f.sourceSHA256,outputSHA256:f.outputSHA256,...sample,wasmRequests:wasm});console.log(f.id,'passed');await page.close();
 }
 result.passed=true;
} catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{if(browser)try{result.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid]):await closeTestBrowser(browser,family);}catch(error){result.cleanupError=String(error);result.passed=false;process.exitCode=1;}server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-audio',{recursive:true});await writeFile('results/media-components/production-audio/installed-'+family+'.json',JSON.stringify(result,null,2)+'\n');console.log(result.passed,result.error??'');}
