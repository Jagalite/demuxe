// SPDX-License-Identifier: Apache-2.0
const status=document.querySelector('#status');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
function unhex(s=''){return Uint8Array.from((s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join('').match(/../g)??[]),h=>parseInt(h,16));}
const integerCodecs=new Set(['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le','ape','wavpack','tta','truehd','mlp','dts-hd','wmalossless','tak','shorten','adpcm-ms','adpcm-ima-wav','pcm-alaw','pcm-mulaw','gsm','gsm-ms','pcm-u8','pcm-s8','adpcm-g726','adpcm-g726le','adpcm-ima-qt']);
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
const advancedWmaCodecs=new Set(['wmapro','wmalossless','wmavoice']);
const speechCodecs=new Set(['speex','amrnb','amrwb']);
function packetQualification(f){
 const qt=f.codec==='adpcm-ima-qt';if(qt||f.profile==='adpcm-qt')assert(qt&&f.profile==='adpcm-qt'&&f.bitsPerSample===4&&[44100,48000].includes(f.sampleRate)&&[1,2].includes(f.channels)&&f.sourceContainer==='isobmff'&&f.samplesPerBlock===64&&f.packetFraming==='one-original-complete-MOV-IMA-QT-block'&&f.seekContract==='restart-from-start-and-discard'&&f.framing?.blockAlign===34*f.channels&&f.framing?.bitRate===0&&Number.isSafeInteger(f.referenceSamples)&&f.referenceSamples>0&&f.referenceSamples%64===0,'Invalid finite MOV IMA-QT packet profile');
 const g726=['adpcm-g726','adpcm-g726le'].includes(f.codec);if(g726||f.profile==='g726')assert(g726&&f.profile==='g726'&&f.sampleRate===8000&&f.channels===1&&[2,3,4,5].includes(f.bitsPerSample)&&f.bitRate===8000*f.bitsPerSample&&f.bitOrder===(f.codec==='adpcm-g726'?'most-significant-first':'least-significant-first')&&f.packetFraming==='complete-byte-and-code-groups'&&f.seekContract==='restart-from-start-and-discard'&&f.timestampOrigin==='source-sample-clock'&&f.originPackingQualified===true&&Number.isSafeInteger(f.referenceSamples)&&f.referenceSamples>0&&['raw-g726','wave-g726'].includes(f.container)&&(f.container!=='wave-g726'||f.codec==='adpcm-g726'),'Invalid explicit G726 source profile');

 const speechModes=f.modeProfile==='ordinary-modes-float';if(speechModes){assert(['amrnb','amrwb'].includes(f.codec)&&Array.isArray(f.amrModes)&&f.amrModes.length>0&&f.amrModes.length<=(f.codec==='amrnb'?8:9)&&new Set(f.amrModes).size===f.amrModes.length&&f.amrModes.every(mode=>Number.isInteger(mode)&&mode>=0&&mode<=(f.codec==='amrnb'?7:8)),'Invalid ordinary AMR whitelist');}else assert(f.modeProfile===undefined&&f.amrModes===undefined,'Unexpected AMR modes configuration');
 const speexOgg=f.speexProfile==='ogg-mono-cbr';if(speexOgg)assert(f.codec==='speex'&&f.sourceContainer==='ogg'&&[8000,32000].includes(f.sampleRate)&&f.frameSamples===(f.sampleRate===8000?160:640)&&f.packetClockPolicy==='original-ogg-signed-pts'&&f.codedClockOffset===undefined&&Number.isSafeInteger(f.originalFirstPTS)&&f.originalFirstPTS<=0&&f.originalFirstPTS>-f.frameSamples&&f.referenceSamples%f.frameSamples===0&&f.timestampGaps?.length===0,'Invalid finite Ogg Speex source clock');else assert(f.speexProfile===undefined&&f.codedClockOffset===undefined&&f.packetClockPolicy===undefined,'Unexpected codec clock transform');
 const speech=speechCodecs.has(f.codec);if(speech||f.profile==='speech'){assert(speech&&f.profile==='speech'&&f.channels===1&&f.bitsPerSample===0&&(speexOgg||f.sampleRate===(f.codec==='amrnb'?8000:16000))&&Number.isSafeInteger(f.referenceSamples)&&f.referenceSamples>0&&f.seekContract==='restart-from-start-and-discard'&&Array.isArray(f.timestampGaps),'Invalid speech profile');const q=f.speechFloatQualification;assert(q&&Object.keys(q).length===4&&q.maxAbsoluteError===(speechModes?1e-4:7e-5)&&q.minimumSNR===80&&q.mandatorySilentControl===true&&q.mandatoryCorruptControl===true,'Require exact speech float qualification');}else assert(f.speechFloatQualification===undefined,'Custom speech tolerances are forbidden');
 const advanced=advancedWmaCodecs.has(f.codec);assert(!advanced||f.profile==='wma-advanced','Invalid advanced WMA profile');assert(f.profile!=='wma-advanced'||advanced,'Invalid advanced WMA codec');
 if(advanced&&!f.expectedDecodeRejection&&!f.expectedRejection)assert(Number.isSafeInteger(f.referenceSamples)&&f.referenceSamples>0,'Missing exact advanced WMA sample extent');
 assert(f.expectedDecodeRejection==null||['packet-budget','unsupported-feature'].includes(f.expectedDecodeRejection),'Invalid decoder rejection reason');
 if(f.expectedDecodeRejection==='unsupported-feature')assert(f.codec==='wmavoice'&&f.profile==='wma-advanced'&&f.expectedMessage==='Audio codec failed (-1163346256)'&&!f.expectedRejection,'Invalid unsupported-feature qualification');
 const voice=f.codec==='wmavoice'&&!f.expectedDecodeRejection&&!f.expectedRejection;
 if(voice){const q=f.floatQualification;assert(q&&Object.keys(q).length===4&&q.maxAbsoluteError===.01&&q.minimumSNR===65&&q.mandatorySilentControl===true&&q.mandatoryCorruptControl===true,'Require exact Voice float qualification');}
 else assert(f.floatQualification===undefined,'Custom float tolerances are forbidden');return {advanced,voice,speech,speechModes,g726,qt,speexOgg};
}
function packetPCM(frames,channels){return Float32Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*channels},(_,i)=>frame.pcm?frame.pcm[i]/2147483648:frame.planes[i%channels][Math.floor(i/channels)])));}
function packetMetrics(actual,reference,voice,speech=false,speechModes=false){
 assert(actual.length===reference.length&&actual.length>0,'packet sample count '+actual.length+'/'+reference.length);let maxError=0,energy=0,squareError=0;
 for(let i=0;i<actual.length;i++){assert(Number.isFinite(actual[i])&&Number.isFinite(reference[i]),'Non-finite packet PCM');maxError=Math.max(maxError,Math.abs(actual[i]-reference[i]));energy+=reference[i]**2;squareError+=(actual[i]-reference[i])**2;}
 const snr=10*Math.log10(energy/Math.max(squareError,1e-30));assert(speech?energy>0&&maxError<(speechModes?1e-4:7e-5)&&snr>80:voice?energy>0&&maxError<.01&&snr>=65:maxError<2e-5,'packet PCM quality '+maxError+' SNR '+snr);return {maxError,snr};
}
const telephonyCodecs=new Set(['pcm-u8','pcm-s8','pcm-alaw','pcm-mulaw','gsm','gsm-ms']);
const adpcmCodecs=new Set(['adpcm-ms','adpcm-ima-wav']);
function packetPts(f,p){if(f.codec==='shorten'){assert(p.pts===undefined&&p.pts_time===undefined,'Shorten source chunks must not invent packet PTS');return 0;}const original=Math.round(Number(p.pts_time)*f.sampleRate);if(f.speexProfile==='ogg-mono-cbr'){assert(Number.isSafeInteger(p.pts)&&p.pts===original&&original>-f.frameSamples,'Speex original native clock required');return original;}return original;}
// Extended finite profiles retain their dedicated framing, clock and rejection gates.
function usesSharedPacketChecks(f){
 return ['aac','opus-vorbis','lossless','mp3','pcm'].includes(f.profile)&&f.sampleRate===48000&&f.channels===2&&!f.aacProfile&&!f.expectedRejection&&!f.expectedDecodeRejection&&['aac','opus','vorbis','flac','alac','mp3','pcm-s16le','pcm-s24le','pcm-s32le','pcm-f32le','pcm-f64le'].includes(f.codec);
}
async function packet(api,base,f){
 const qualification=packetQualification(f);
 const data=await(await fetch('/fixtures/'+f.id+'.json')).json(),stream=data.streams[0];
 if(usesSharedPacketChecks(f)){
  const {runAudioDecoderChecks,packetTrimMetadata}=await import('./provider-conformance/audio-decoder.mjs');
  const module=await api.loadTestModule(base,f.profile),extradata=unhex(stream.extradata);
  const reference=new Float32Array(await(await fetch('/fixtures/'+f.id+'.f32')).arrayBuffer());
  const integerReference=integerCodecs.has(f.codec)?new Int32Array(await(await fetch('/fixtures/'+f.id+'.s32')).arrayBuffer()):undefined;
  const doubleReference=f.codec==='pcm-f64le'?new Float64Array(await(await fetch('/fixtures/'+f.id+'.f64')).arrayBuffer()):undefined;
  const response=await fetch('/timing/'+encodeURIComponent(f.id));assert(response.ok,'native timing reference unavailable');
  return runAudioDecoderChecks({createDecoder:(_,signal)=>new api.PacketAudioDecoder(module,f.codec,signal,{sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata}),fixture:{...f,extradata},packets:data.packets.map(p=>({data:unhex(p.data),pts:packetPts(f,p)})),reference,timingReference:await response.json(),integerReference,doubleReference,...packetTrimMetadata(f.codec,extradata,data.packets)});
 }

 const module=await api.loadTestModule(base,f.profile),abort=new AbortController();
 let decoder;
 try{
  decoder=new api.PacketAudioDecoder(module,f.codec,abort.signal,{sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(stream.extradata),...(qualification.g726?{bitRate:f.bitRate}:{}),...(f.aacProfile?{aacProfile:f.aacProfile}:{}),...(qualification.speechModes?{amrModes:f.amrModes}:{}),...(f.framing?.blockAlign?{blockAlign:f.framing.blockAlign,bitRate:f.framing.bitRate}:{})});
  const frames=[];for(const p of data.packets)frames.push(...decoder.decode(unhex(p.data),packetPts(f,p)));frames.push(...decoder.flush());
  assert(!f.expectedDecodeRejection,'Expected packet budget rejection, but decoding succeeded');
  assert(!f.expectedRejection,'Expected packet profile rejection, but decoding succeeded');
  const sides=data.packets.flatMap(p=>p.side_data_list??[]).filter(s=>s.side_data_type==='Skip Samples');
  const decoderSkip=f.codec==='opus'?new DataView(unhex(stream.extradata).buffer).getUint16(10,true):f.codec==='vorbis'?sides.reduce((n,s)=>n+(s.skip_samples??0),0):0;
  const skip=Math.max(0,sides.reduce((n,s)=>n+(s.skip_samples??0),0)-decoderSkip),discard=sides.reduce((n,s)=>n+(s.discard_padding??0),0);
  const pcm=packetPCM(frames,f.channels);
  const actual=pcm.subarray(skip*f.channels,pcm.length-discard*f.channels),reference=new Float32Array(await(await fetch('/fixtures/'+f.id+'.f32')).arrayBuffer());
  const metrics=packetMetrics(actual,reference,qualification.voice,qualification.speech,qualification.speechModes);let timestampOrigins,voiceControls,speechControls,timestampGaps;
  if(qualification.speech){assert(actual.length===f.referenceSamples&&frames.length===data.packets.length,'Speech original extent mismatch');timestampGaps=[];let end=0;for(const [i,frame]of frames.entries()){assert(frame.pts===packetPts(f,data.packets[i])&&frame.channels===1&&frame.rate===f.sampleRate&&frame.layout===4,'Speech original frame clock mismatch');if(i&&frame.pts!==end)timestampGaps.push({packet:i,previousEnd:end,nextPTS:frame.pts});end=frame.pts+frame.samples;}assert(JSON.stringify(timestampGaps)===JSON.stringify(f.timestampGaps),'Speech original timestamp gaps changed');}
  if(qualification.speexOgg){assert(data.packets[0].pts===f.originalFirstPTS&&frames.every((frame,i)=>frame.samples===f.frameSamples&&frame.duration===0&&data.packets[i].pts===f.originalFirstPTS+i*f.frameSamples),'Speex complete coded frame clock changed');assert(skip===0&&discard===0&&frames.length*f.frameSamples===f.referenceSamples,'Speex coded padding must remain intact');}
  if(qualification.advanced){assert(actual.length===f.referenceSamples*f.channels,'Advanced WMA original sample count');assert(frames.every(frame=>Number.isSafeInteger(frame.pts)&&['native','packet-clock'].includes(frame.timestampOrigin)),'Missing advanced WMA timestamp provenance');timestampOrigins=[...new Set(frames.map(frame=>frame.timestampOrigin))];}

  if(qualification.g726)assert(actual.length===f.referenceSamples&&frames.length===data.packets.length&&frames.every((frame,i)=>unhex(data.packets[i].data).length*8%f.bitsPerSample===0&&frame.samples===unhex(data.packets[i].data).length*8/f.bitsPerSample&&frame.pts===packetPts(f,data.packets[i])&&(frame.duration===0||frame.duration===frame.samples)),'G726 original complete bit-group sample clock mismatch');
  if(telephonyCodecs.has(f.codec)){assert(actual.length===f.referenceSamples*f.channels,'Telephony source sample extent mismatch');assert(frames.length===data.packets.length&&frames.every((frame,i)=>frame.pts===packetPts(f,data.packets[i])&&(frame.duration===0||frame.duration===frame.samples)),'Telephony original sample clock mismatch');}
  if(qualification.qt){assert(actual.length===f.referenceSamples*f.channels&&frames.length===data.packets.length,'MOV IMA-QT original decoded extent');assert(frames.every((frame,i)=>frame.samples===64&&frame.pts===packetPts(f,data.packets[i])&&(frame.duration===0||frame.duration===64)),'MOV IMA-QT original block clock');}
  if(adpcmCodecs.has(f.codec)){assert(f.packetFraming==='one-original-complete-WAV-block'&&actual.length===f.referenceSamples*f.channels,'ADPCM padded sample extent mismatch');assert(frames.length===data.packets.length&&frames.every((frame,i)=>frame.samples===f.samplesPerBlock&&frame.pts===packetPts(f,data.packets[i])&&(frame.duration===0||frame.duration===frame.samples)),'ADPCM original block sample clock mismatch');}
  if(f.codec==='shorten'){assert(f.timestampOrigin==='stream-clock'&&f.seekContract==='restart-from-start-and-discard','Unqualified Shorten metadata');assert(actual.length===f.referenceSamples*f.channels&&frames.every(frame=>frame.timestampOrigin==='stream-clock'),'Shorten extent/origin mismatch');let end=0;for(const frame of frames){assert(frame.pts===end,'Shorten stream sample clock mismatch');end+=frame.samples;}timestampOrigins=['stream-clock'];}
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
  decoder.reset();const repeatedFrames=[];for(const p of data.packets)repeatedFrames.push(...decoder.decode(unhex(p.data),packetPts(f,p)));repeatedFrames.push(...decoder.flush());
  const repeatedPCM=packetPCM(repeatedFrames,f.channels);assert(repeatedPCM.length===pcm.length,'reset sample count');
  if(qualification.qt||qualification.g726||qualification.speech||qualification.advanced||f.codec==='shorten'||adpcmCodecs.has(f.codec)||telephonyCodecs.has(f.codec)){assert(await sha(repeatedPCM.buffer)===await sha(pcm.buffer),'Advanced WMA reset PCM changed');assert(JSON.stringify(repeatedFrames.map(frame=>[frame.pts,frame.timestampOrigin]))===JSON.stringify(frames.map(frame=>[frame.pts,frame.timestampOrigin])),'Advanced WMA reset timestamps changed');}
  if(qualification.voice||qualification.speech){
   let silentRejected=false;try{packetMetrics(new Float32Array(actual.length),reference,qualification.voice,qualification.speech,qualification.speechModes);}catch{silentRejected=true;}assert(silentRejected,'Silent Voice output passed');
   decoder.reset();const corruptedFrames=[];let corruptNativeError=false;
   try{for(const p of data.packets)corruptedFrames.push(...decoder.decode(new Uint8Array(unhex(p.data).length),packetPts(f,p)));corruptedFrames.push(...decoder.flush());}
   catch(error){assert(/^Audio codec failed /.test(error.message)||(qualification.speech&&(error.message==='Invalid audio packet'||(error.code==='PROVIDER_PROFILE_MISMATCH'&&(error.message==='Unqualified initial speech packet/header/clock'||qualification.speexOgg&&error.message==='Unqualified initial speech decoded profile/clock')))),'Unexpected Voice corruption control failure');corruptNativeError=true;}
   let corruptRejected=corruptNativeError;if(!corruptRejected){try{packetMetrics(packetPCM(corruptedFrames,f.channels),reference,qualification.voice,qualification.speech,qualification.speechModes);}catch{corruptRejected=true;}}
   assert(corruptRejected,'Corrupted Voice blocks passed');const controls={silentRejected,corruptRejected,corruptNativeError,corruptMutation:'zero-every-byte-of-each-original-codec-block'};if(qualification.speech)speechControls=controls;else voiceControls=controls;
  }
  return {samples:actual.length/f.channels,...metrics,integerExact,doubleExact,reset:true,...(qualification.advanced||f.codec==='shorten'?{resetExact:true,timestampOriginChecked:true,timestampOrigins}:{}),...(qualification.qt||qualification.g726||adpcmCodecs.has(f.codec)||telephonyCodecs.has(f.codec)?{resetExact:true,frameClockChecked:true}:{}),...(voiceControls?{voiceControls}: {}),...(qualification.speech?{resetExact:true,frameClockChecked:true,timestampGaps,speechControls}:{}),...(qualification.speexOgg?{originalFirstPTS:f.originalFirstPTS,packetClockPolicy:f.packetClockPolicy,nativeFrameDuration:0,codedPaddingRetained:true}:{})};
 }catch(error){if(f.expectedDecodeRejection==='unsupported-feature'&&error.message===f.expectedMessage)return {unsupportedFeatureRejected:true,rejectionMessage:error.message};if(f.expectedDecodeRejection==='packet-budget'&&error.message==='Invalid audio packet'){assert(data.packets.some(p=>unhex(p.data).byteLength>1048576),'Independent packet metadata does not exceed budget');return {packetBudgetRejected:true,rejectionMessage:error.message};}if(f.expectedRejection&&error.code===f.expectedRejection&&(!f.expectedMessage||error.message===f.expectedMessage))return {profileRejected:true,rejectionCode:error.code,rejectionMessage:error.message};throw error;}finally{decoder?.dispose();abort.abort();}
}
async function composition(api,base,manifest,item){
 const f=item.fixture;assert(!speechCodecs.has(f.codec)&&!advancedWmaCodecs.has(f.codec)&&f.floatQualification===undefined,'Advanced WMA is packet-only');const audioOnly=['wave-aiff','ogg','wavpack','ape','tta','tak','shorten','adpcm-wave','telephony','wave-g726','raw-g726'].includes(f.container),source=await(await fetch('/fixtures/'+f.id+new URL(f.input,location.href).pathname.slice(new URL(f.input,location.href).pathname.lastIndexOf('.')))).blob();
 const parsed=api.parseProviderDeployment(manifest,new URL(base)),owners=api.createComponentOwners(parsed,new URL(base)),acquisition=new api.ProviderAcquisition(parsed,owners.owners),abort=new AbortController();
 const recipe=f.container==='raw-g726'?api.g726RawRepairRecipe(f.codec,f.bitsPerSample):api.audioRepairRecipe(f.codec,f.channels??2,item.encoding,f.container??'matroska',f.sampleRate??48000,f.aacProfile??'lc'),scope='codec-expansion-'+f.id;
 const identities=Object.fromEntries(parsed.catalog.providers.map(p=>[p.id,p.implementationIdentity]));
 const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey:scope,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,identities[a.providerId]]))}));
 const expectedPrecisionRejection=!f.expectedRejection&&await precisionMustReject(f,item.encoding);
 let video,url,context,node,analyser,gain;
 try{
  let result;
  try {result=await api.executeComponentBinding(acquisition,recipe,evidence,scope,'fine',b=>f.container==='raw-g726'?owners.executeRawG726(source,f.codec,f.bitsPerSample,abort.signal,f.referenceSamples):owners.execute(source,f.codec,b,abort.signal,f.channels??2,item.encoding,f.container??'matroska',f.sampleRate??48000,f.aacProfile??'lc'));}
  catch(error){if(f.expectedRejection&&error.code===f.expectedRejection&&(!f.expectedMessage||error.message===f.expectedMessage))return {profileRejected:true,rejectionCode:error.code,rejectionMessage:error.message};if(expectedPrecisionRejection&&/precision exceeds/.test(error.message))return {precisionRejected:true};throw error;}
  assert(!f.expectedRejection,'Expected composition profile rejection, but composition succeeded');
  assert(!expectedPrecisionRejection,'Expected precision rejection, but composition succeeded');
  const output=await result.value.arrayBuffer();
  const validated=await fetch('/validate?id='+encodeURIComponent(f.id)+'&encoding='+item.encoding,{method:'POST',body:output});const validationText=await validated.text();assert(validated.ok,validationText);const validation=JSON.parse(validationText);assert(validation.passed===true,'Host validation did not pass');
  video=document.createElement(audioOnly?'audio':'video');video.width=160;video.height=90;document.querySelector('#players').append(video);
  context=new AudioContext({sampleRate:48000});analyser=context.createAnalyser();node=context.createMediaElementSource(video);gain=context.createGain();node.connect(gain);gain.connect(analyser);analyser.connect(context.destination);await context.resume();
  const media=new MediaSource();url=URL.createObjectURL(media);video.src=url;
  const event=(target,type,action)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(type+' timeout')),10000);target.addEventListener(type,()=>{clearTimeout(timer);resolve();},{once:true});action?.();});
  await event(media,'sourceopen');const buffer=media.addSourceBuffer((audioOnly?'audio/mp4; codecs="':'video/mp4; codecs="avc1.42c00b,')+(item.encoding==='opus'?'opus':'flac')+'"');await event(buffer,'updateend',()=>buffer.appendBuffer(output));media.endOfStream();await video.play();
  const values=new Float32Array(analyser.fftSize);let peak=0;
  const advance=async target=>{const until=performance.now()+10000;while(video.currentTime<target&&performance.now()<until){analyser.getFloatTimeDomainData(values);for(const n of values)peak=Math.max(peak,Math.abs(n));await pause(20);}assert(video.currentTime>=target,'playback stalled');};
  await advance(.05);video.pause();const before=video.currentTime;await pause(120);assert(Math.abs(video.currentTime-before)<.04,'pause advanced');await video.play();
  const playbackSeekSeconds=f.playbackSeekSeconds??.12;assert(Number.isFinite(playbackSeekSeconds)&&playbackSeekSeconds>=.12,'Invalid explicit playback seek');if(f.playbackSeekSeconds!==undefined)assert(Number.isSafeInteger(f.referenceSamples)&&f.referenceSamples>0&&Number.isSafeInteger(f.sampleRate)&&f.sampleRate>0&&playbackSeekSeconds+.2<f.referenceSamples/f.sampleRate,'Playback seek exceeds independently declared duration');
  await event(video,'seeked',()=>{video.currentTime=playbackSeekSeconds;});assert(Math.abs(video.currentTime-playbackSeekSeconds)<.04,'seek target');
  // Let the analyser discard its pre-seek window, then require fresh audio.
  if(new URLSearchParams(location.search).has('postSeekSilence'))gain.gain.value=0;
  await pause(50);peak=0;const seekStart=video.currentTime;await advance(seekStart+.06);assert(video.currentTime-seekStart>=.04,'post-seek progression');assert(peak>.001,'silent post-seek playback');
  if(!audioOnly){const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);assert(cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60),'black video');}assert(peak>.001,'silent playback');
  const expected=new Set(recipe.bindings[0].assignments.map(a=>a.providerId));assert(owners.readiness().filter(r=>r.instance==='idle-reusable').every(r=>expected.has(r.providerId)),'unselected module loaded');
  return {validation,outputSHA256:await sha(output),outputBytes:output.byteLength,playbackSeekSeconds,postSeekAudioPeak:peak,postSeekProgress:video.currentTime-seekStart,pause:true,seek:true,video:!audioOnly,audioOnly,time:video.currentTime};
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
