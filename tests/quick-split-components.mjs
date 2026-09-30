// SPDX-License-Identifier: Apache-2.0
export async function component({bundleName,delivery,item}) {
 const prefix='/'+bundleName+'/',sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const manifestBytes=await(await fetch(prefix+'bundle-manifest.json')).arrayBuffer(),manifest=JSON.parse(new TextDecoder().decode(manifestBytes));
 const binding={manifestSHA256:await sha(manifestBytes),outputs:{}};
 for(const [name,expected]of Object.entries(manifest.outputs)){const bytes=await(await fetch(prefix+name)).arrayBuffer();const actual={bytes:bytes.byteLength,sha256:await sha(bytes)};if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw Error('Bundle bytes changed');binding.outputs[name]=actual;}
 const bundle=await import(prefix+'demuxe.mjs'),runtime=delivery==='embedded'?await bundle.createDemuxeRuntime():undefined,api=runtime?.api??bundle,base=runtime?.assetBase??bundle.assetBase;
 const deploymentBytes=await(await fetch(prefix+'smoke-deployment.json')).arrayBuffer();if(await sha(deploymentBytes)!==manifest.inputs['demuxe-providers.json'].sha256)throw Error('Deployment fixture mismatch');
 const parsed=api.parseProviderDeployment(JSON.parse(new TextDecoder().decode(deploymentBytes)),new URL(base)),owners=api.createComponentOwners(parsed,base),acquisition=new api.ProviderAcquisition(parsed,owners.owners),abort=new AbortController();
 const source=await(await fetch('/fixtures/'+item.file)).blob();
 const recipe=item.copy?api.packetCopyRecipe():api.audioRepairRecipe(item.codec,item.channels??2),scope='quick-split-smoke',bindingId=item.copy?'typescript':item.binding??'fine';
 const identities=Object.fromEntries(parsed.catalog.providers.map(p=>[p.id,p.implementationIdentity]));
 // Explicit test evidence authorizes this known bounded fixture only.
 const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey:scope,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,identities[a.providerId]]))}));
 let video,mediaURL,context,mediaAudio,analyser;
 try{
  const execution=await api.executeComponentBinding(acquisition,recipe,evidence,scope,bindingId,b=>item.copy?owners.executeCopy(source,abort.signal):owners.execute(source,item.codec,b,abort.signal,item.channels??2));
  const output=execution.value;
  video=document.createElement('video');video.width=160;video.height=90;document.body.append(video);
  context=new AudioContext({sampleRate:48000});analyser=context.createAnalyser();mediaAudio=context.createMediaElementSource(video);mediaAudio.connect(analyser);analyser.connect(context.destination);await context.resume();
  const media=new MediaSource();mediaURL=URL.createObjectURL(media);video.src=mediaURL;
  const event=(target,name,action)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),10000);target.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});action?.();});
  await event(media,'sourceopen');const buffer=media.addSourceBuffer('video/mp4; codecs="'+(item.videoCodec??'avc1.42c00b')+','+(item.copy?'mp4a.40.2':'flac')+'"');await event(buffer,'updateend',async()=>buffer.appendBuffer(await output.arrayBuffer()));media.endOfStream();await video.play();
  const samples=new Float32Array(analyser.fftSize);let peak=0;
  const wait=async target=>{const until=performance.now()+10000;while(video.currentTime<target&&performance.now()<until){analyser.getFloatTimeDomainData(samples);for(const s of samples)peak=Math.max(peak,Math.abs(s));await new Promise(r=>setTimeout(r,20));}if(video.currentTime<target)throw Error('Playback stalled');};
  await wait(.25);await event(video,'seeked',()=>{video.currentTime=item.codec==='dts-hd'?3.25:.5;});await wait(item.codec==='dts-hd'?3.75:.75);
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);const nonblack=cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60);if(!nonblack||peak<.001)throw Error('Missing video or audio: '+JSON.stringify({nonblack,peak,time:video.currentTime}));
  return {binding,plan:bindingId,time:video.currentTime,outputBytes:output.size,audioPeak:peak,nonblack};
 }finally{
  abort.abort();await acquisition.dispose();video?.pause();video?.removeAttribute('src');video?.load();video?.remove();if(mediaURL)URL.revokeObjectURL(mediaURL);mediaAudio?.disconnect();analyser?.disconnect();await context?.close();runtime?.dispose();
 }
}
