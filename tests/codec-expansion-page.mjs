// SPDX-License-Identifier: Apache-2.0
const status=document.querySelector('#status');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
function unhex(s=''){return Uint8Array.from((s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join('').match(/../g)??[]),h=>parseInt(h,16));}
const integerCodecs=new Set(['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le']);
async function precisionMustReject(f,encoding){
 if(encoding!=='flac')return false;
 if(integerCodecs.has(f.codec)){
  const bytes=await(await fetch('/fixtures/'+f.id+'.s32')).arrayBuffer(),view=new DataView(bytes);
  for(let i=0;i<bytes.byteLength;i+=4)if((view.getInt32(i,true)&255)!==0)return true;
 }else if(f.codec.startsWith('pcm-f')){
  const doubles=f.codec==='pcm-f64le',bytes=await(await fetch('/fixtures/'+f.id+(doubles?'.f64':'.f32'))).arrayBuffer(),view=new DataView(bytes),width=doubles?8:4;
  for(let i=0;i<bytes.byteLength;i+=width){const value=doubles?view.getFloat64(i,true):view.getFloat32(i,true);if(!Number.isInteger(value*8388608))return true;}
 }
 return false;
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function packet(api,base,f){
 const data=await(await fetch('/fixtures/'+f.id+'.json')).json(),stream=data.streams[0];
 const module=await api.loadTestModule(base,f.profile),abort=new AbortController();
 const decoder=new api.PacketAudioDecoder(module,f.codec,abort.signal,{sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(stream.extradata)});
 try{
  const frames=[];for(const p of data.packets)frames.push(...decoder.decode(unhex(p.data),Math.round(Number(p.pts_time)*f.sampleRate)));frames.push(...decoder.flush());
  const sides=data.packets.flatMap(p=>p.side_data_list??[]).filter(s=>s.side_data_type==='Skip Samples');
  const decoderSkip=f.codec==='opus'?new DataView(unhex(stream.extradata).buffer).getUint16(10,true):f.codec==='vorbis'?sides.reduce((n,s)=>n+(s.skip_samples??0),0):0;
  const skip=Math.max(0,sides.reduce((n,s)=>n+(s.skip_samples??0),0)-decoderSkip),discard=sides.reduce((n,s)=>n+(s.discard_padding??0),0);
  const pcm=Float32Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*f.channels},(_,i)=>frame.pcm?frame.pcm[i]/2147483648:frame.planes[i%f.channels][Math.floor(i/f.channels)])));
  const actual=pcm.subarray(skip*f.channels,pcm.length-discard*f.channels),reference=new Float32Array(await(await fetch('/fixtures/'+f.id+'.f32')).arrayBuffer());
  assert(actual.length===reference.length,'packet sample count '+actual.length+'/'+reference.length);
  let error=0;for(let i=0;i<actual.length;i++)error=Math.max(error,Math.abs(actual[i]-reference[i]));assert(error<2e-5,'packet PCM error '+error);
  let integerExact=false,doubleExact=false;
  if(integerCodecs.has(f.codec)){
   assert(frames.every(frame=>frame.pcm instanceof Int32Array),'missing owned integer PCM');
   const integer=Int32Array.from(frames.flatMap(frame=>Array.from(frame.pcm)));
   const trimmedInteger=integer.slice(skip*f.channels,integer.length-discard*f.channels),integerReference=await(await fetch('/fixtures/'+f.id+'.s32')).arrayBuffer();
   assert(trimmedInteger.byteLength===integerReference.byteLength,'exact integer sample count');assert(await sha(trimmedInteger.buffer)===await sha(integerReference),'exact integer PCM mismatch');integerExact=true;
  }
  if(f.codec==='pcm-f64le'){
   assert(frames.every(frame=>frame.planes64?.length===f.channels),'missing original double PCM');
   const doubles=Float64Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*f.channels},(_,i)=>frame.planes64[i%f.channels][Math.floor(i/f.channels)])));
   const trimmedDouble=doubles.slice(skip*f.channels,doubles.length-discard*f.channels),doubleReference=await(await fetch('/fixtures/'+f.id+'.f64')).arrayBuffer();
   assert(trimmedDouble.byteLength===doubleReference.byteLength,'exact double sample count');assert(await sha(trimmedDouble.buffer)===await sha(doubleReference),'exact double PCM mismatch');doubleExact=true;
  }
  decoder.reset();let repeated=0;for(const p of data.packets)repeated+=decoder.decode(unhex(p.data),Math.round(Number(p.pts_time)*f.sampleRate)).reduce((n,f)=>n+f.samples,0);repeated+=decoder.flush().reduce((n,f)=>n+f.samples,0);
  assert(repeated*f.channels===pcm.length,'reset sample count');return {samples:actual.length/f.channels,maxError:error,integerExact,doubleExact,reset:true};
 }finally{decoder.dispose();abort.abort();}
}
async function composition(api,base,manifest,item){
 const f=item.fixture,source=await(await fetch('/fixtures/'+f.id+'.mkv')).blob();
 const parsed=api.parseProviderDeployment(manifest,new URL(base)),owners=api.createComponentOwners(parsed,new URL(base)),acquisition=new api.ProviderAcquisition(parsed,owners.owners),abort=new AbortController();
 const recipe=api.audioRepairRecipe(f.codec,2,item.encoding),scope='codec-expansion-'+f.id;
 const identities=Object.fromEntries(parsed.catalog.providers.map(p=>[p.id,p.implementationIdentity]));
 const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey:scope,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,identities[a.providerId]]))}));
 const expectedPrecisionRejection=await precisionMustReject(f,item.encoding);
 let video,url,context,node,analyser,gain;
 try{
  let result;
  try {result=await api.executeComponentBinding(acquisition,recipe,evidence,scope,'fine',b=>owners.execute(source,f.codec,b,abort.signal,2,item.encoding));}
  catch(error){if(expectedPrecisionRejection&&/precision exceeds/.test(error.message))return {precisionRejected:true};throw error;}
  assert(!expectedPrecisionRejection,'Expected precision rejection, but composition succeeded');
  const output=await result.value.arrayBuffer();
  const validated=await fetch('/validate?id='+encodeURIComponent(f.id)+'&encoding='+item.encoding,{method:'POST',body:output});const validationText=await validated.text();assert(validated.ok,validationText);const validation=JSON.parse(validationText);assert(validation.passed===true,'Host validation did not pass');
  video=document.createElement('video');video.width=160;video.height=90;document.querySelector('#players').append(video);
  context=new AudioContext({sampleRate:48000});analyser=context.createAnalyser();node=context.createMediaElementSource(video);gain=context.createGain();node.connect(gain);gain.connect(analyser);analyser.connect(context.destination);await context.resume();
  const media=new MediaSource();url=URL.createObjectURL(media);video.src=url;
  const event=(target,type,action)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(type+' timeout')),10000);target.addEventListener(type,()=>{clearTimeout(timer);resolve();},{once:true});action?.();});
  await event(media,'sourceopen');const buffer=media.addSourceBuffer('video/mp4; codecs="avc1.42c00b,'+(item.encoding==='opus'?'opus':'flac')+'"');await event(buffer,'updateend',()=>buffer.appendBuffer(output));media.endOfStream();await video.play();
  const values=new Float32Array(analyser.fftSize);let peak=0;
  const advance=async target=>{const until=performance.now()+10000;while(video.currentTime<target&&performance.now()<until){analyser.getFloatTimeDomainData(values);for(const n of values)peak=Math.max(peak,Math.abs(n));await pause(20);}assert(video.currentTime>=target,'playback stalled');};
  await advance(.05);video.pause();const before=video.currentTime;await pause(120);assert(Math.abs(video.currentTime-before)<.04,'pause advanced');await video.play();
  await event(video,'seeked',()=>{video.currentTime=.12;});assert(Math.abs(video.currentTime-.12)<.04,'seek target');
  // Let the analyser discard its pre-seek window, then require fresh audio.
  if(new URLSearchParams(location.search).has('postSeekSilence'))gain.gain.value=0;
  await pause(50);peak=0;const seekStart=video.currentTime;await advance(Math.min(.28,seekStart+.06));assert(video.currentTime-seekStart>=.04,'post-seek progression');assert(peak>.001,'silent post-seek playback');
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);assert(cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60),'black video');assert(peak>.001,'silent playback');
  const expected=new Set(recipe.bindings[0].assignments.map(a=>a.providerId));assert(owners.readiness().filter(r=>r.instance==='idle-reusable').every(r=>expected.has(r.providerId)),'unselected module loaded');
  return {validation,outputSHA256:await sha(output),outputBytes:output.byteLength,postSeekAudioPeak:peak,postSeekProgress:video.currentTime-seekStart,pause:true,seek:true,video:true,time:video.currentTime};
 }finally{abort.abort();await acquisition.dispose();video?.pause();video?.removeAttribute('src');video?.load();video?.remove();if(url)URL.revokeObjectURL(url);node?.disconnect();gain?.disconnect();analyser?.disconnect();await context?.close();}
}
document.querySelector('#run').onclick=async()=>{
 const results=[];document.querySelector('#run').disabled=true;
 try{
  let cases=await(await fetch('/cases.json')).json();
  if(new URLSearchParams(location.search).has('postSeekSilence'))cases=cases.filter(c=>c.type==='composition').slice(0,1);
  for(const item of cases){
   status.textContent=results.length+'/'+cases.length+' '+item.fixture.id+' '+item.delivery+' '+item.type+' '+(item.encoding??'');
   const module=await import('/bundles/'+item.bundle+'/demuxe.mjs'),runtime=item.delivery==='embedded'?await module.createDemuxeRuntime():undefined,api=runtime?.api??module,base=runtime?.assetBase??module.assetBase;
   try{const manifest=await(await fetch('/bundles/'+item.bundle+'/test-deployment.json')).json();const value=item.type==='packet'?await packet(api,base,item.fixture):await composition(api,base,manifest,item);results.push({...item,passed:true,...value});}
   finally{runtime?.dispose();}
  }
  globalThis.testResult={passed:true,browser:navigator.userAgent,results};
 }catch(error){globalThis.testResult={passed:false,browser:navigator.userAgent,results,error:String(error.stack)};}
 await fetch('/result',{method:'POST',body:JSON.stringify(globalThis.testResult)});status.textContent=JSON.stringify(globalThis.testResult,null,2);document.querySelector('#run').disabled=false;
};
