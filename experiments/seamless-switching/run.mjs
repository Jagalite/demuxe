// SPDX-License-Identifier: Apache-2.0
import {defaultSwitchingPolicy,decide} from './policy.mjs';
const stage=document.querySelector('#stage'),status=document.querySelector('#status');
const candidates=[{id:'low',height:360,frameRate:30},{id:'high',height:720,frameRate:30},{id:'fast',height:720,frameRate:60}];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=10000){const start=performance.now();while(!fn()){if(performance.now()-start>timeout)throw Error('Condition timed out');await sleep(10);}}
async function save(name,value){const res=await fetch('/result/'+name,{method:'POST',body:value});if(!res.ok)throw Error('Saving result failed');}
window.lab={state:'ready',results:[]};
async function runCase(name){
 const result={name,userAgent:navigator.userAgent,shaka:shaka.Player.version,frames:[],events:[],switches:[],errors:[],started:new Date().toISOString()};
 const ac=new AudioContext({sampleRate:48000});await ac.resume();await ac.audioWorklet.addModule('/lab/capture.js');
 const capture=new AudioWorkletNode(ac,'capture',{outputChannelCount:[1]});capture.connect(ac.destination);
 const chunks=[],audioBlocks=[];result.captureDiscontinuities=[];capture.port.onmessage=e=>{if(e.data.discontinuity){result.captureDiscontinuities.push(e.data.discontinuity);return;}chunks.push(e.data.samples);audioBlocks.push({frame:e.data.frame,length:e.data.samples.length});};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 let active,demuxe,engine,running=true,currentId='low',requestedId='low';const videos=[],gains=new Map();
 const production=name.startsWith('demuxe-'),customSelection=name.includes('custom');result.decisions=[];
 const connect=v=>{const gain=ac.createGain();ac.createMediaElementSource(v).connect(gain);gain.connect(capture);gains.set(v,gain);};
 function observe(v){
  videos.push(v);for(const type of ['waiting','stalled','playing','seeking','seeked','error'])v.addEventListener(type,()=>result.events.push({type,wall:performance.now(),media:v.currentTime,active:v===active}));
  const frame=(now,m)=>{if(!running)return;if(v===active){ctx.drawImage(v,16,16,1,1,0,0,1,1);const rgb=Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);const marker=rgb[0]>rgb[1]&&rgb[0]>rgb[2]?'low':rgb[1]>rgb[2]?'high':'fast';result.frames.push({wall:now,expected:m.expectedDisplayTime,media:m.mediaTime,width:m.width,height:m.height,marker,presented:m.presentedFrames,audio:ac.currentTime});}v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);
 }
 const make=()=>{const v=document.createElement('video');v.playsInline=true;v.preload='auto';stage.append(v);connect(v);observe(v);return v;};
 const loadFile=async(v,id,target=0)=>{v.src='/media/'+id+'.mp4';await until(()=>v.readyState>=2);if(target){v.currentTime=target;await until(()=>!v.seeking&&v.readyState>=2);} };
 try{
  if(production){
   const {Player}=await import('/runtime/web/generated/index.js');
   const select=context=>{
    const requested=candidates.find(c=>c.id===requestedId),target=context.candidates.find(q=>q.height===requested.height&&q.frameRate===requested.frameRate);
    result.decisions.push({wall:performance.now(),requestedId,context,idsMatchPublicState:context.candidates.every(q=>demuxe.getStreamingState().qualities.some(v=>v.id===q.id))});
    return target?{type:'switch',id:target.id,urgency:'responsive'}:{type:'default'};
   };
   demuxe=new Player(stage,{assetBase:location.origin+'/runtime/',buffering:{aheadSeconds:6,behindSeconds:2},adaptation:customSelection?{select}:{}});
   await demuxe.open({url:location.origin+'/media/master.m3u8',format:'hls'});
   active=demuxe.surface;connect(active);observe(active);
   if(!customSelection){const low=demuxe.getStreamingState().qualities.find(q=>q.height===360);await demuxe.setQuality({mode:'manual',id:low.id});await demuxe.seek(0);}
   result.route=demuxe.diagnostics.plan;await demuxe.play();
  }else{
   active=make();
   if(name.startsWith('file-')){await loadFile(active,'low');await active.play();}
   else{
    shaka.polyfill.installAll();engine=new shaka.Player();await engine.attach(active);
    engine.addEventListener('error',e=>result.errors.push({code:e.detail.code,category:e.detail.category}));
    window.labEngine=engine;
    engine.configure({abr:{enabled:false,defaultBandwidthEstimate:500000},streaming:{bufferingGoal:6,rebufferingGoal:1,bufferBehind:2}});
    if(name.endsWith('-delayed'))engine.getNetworkingEngine().registerRequestFilter((type,req)=>{if(type===shaka.net.NetworkingEngine.RequestType.SEGMENT)req.uris=req.uris.map(uri=>uri+(uri.includes('?')?'&':'?')+'delay=350');});
    await engine.load('/media/master.m3u8');result.variants=engine.getVariantTracks();const low=engine.getVariantTracks().find(t=>t.height===360);engine.selectVariantTrack(low,true);await active.play();
    result.route='standalone-shaka-mse';
   }
  }
  result.audioStart=ac.currentTime;result.wallStart=performance.now();
  const schedule=name==='baseline'?[]:[{at:4,id:'high'},{at:12,id:'fast'},{at:20,id:'low'}];
  for(const request of schedule){
   await until(()=>active.currentTime>=request.at,20000);
   const ranges=active.buffered;let buffered=0;for(let i=0;i<ranges.length;i++)if(ranges.start(i)<=active.currentTime&&ranges.end(i)>=active.currentTime)buffered=ranges.end(i)-active.currentTime;
   const custom=name.includes('clear')||name.includes('margin')?context=>({...defaultSwitchingPolicy(context),clearBuffer:true,safeMargin:name.includes('margin')?2:0}):undefined;
   const decision=decide({candidates,currentId,requestedId:request.id,bufferedSeconds:buffered,pending:null},custom);
   const sw={...request,decision,wall:performance.now(),media:active.currentTime,audio:ac.currentTime,buffered};result.switches.push(sw);
   if(decision.type==='keep'){sw.returned=performance.now();continue;}
   request.id=decision.id;sw.id=decision.id;
   if(production){
    const quality=demuxe.getStreamingState().qualities.find(q=>q.height===candidates.find(c=>c.id===request.id).height&&q.frameRate===candidates.find(c=>c.id===request.id).frameRate);
    if(!quality&&!customSelection)throw Error('Requested rendition missing');
    if(customSelection)requestedId=request.id;
    else await demuxe.setQuality({mode:'manual',id:quality.id,...name==='demuxe-buffered'?{switching:'buffered'}:{}});
   }else if(name==='file-cold'){
    const target=active.currentTime;await loadFile(active,request.id,target);await active.play();
   }else if(name==='file-prepared'){
    const old=active,next=make();next.style.visibility='hidden';gains.get(next).gain.value=0;
    let target=old.currentTime+1;await loadFile(next,request.id,target);
    if(old.currentTime>=target-.15){target=old.currentTime+.75;next.currentTime=target;await until(()=>!next.seeking&&next.readyState>=2);}
    await until(()=>old.currentTime>=target,5000);
    await next.play();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No candidate frame')),3000);next.requestVideoFrameCallback(()=>{clearTimeout(timer);resolve();});});
    sw.commitSkew=next.currentTime-old.currentTime;sw.commitWall=performance.now();
    gains.get(old).gain.setValueAtTime(0,ac.currentTime);gains.get(next).gain.setValueAtTime(1,ac.currentTime);
    active=next;next.style.visibility='visible';old.style.visibility='hidden';old.pause();old.remove();
   }else{
    const candidate=candidates.find(c=>c.id===decision.id),track=engine.getVariantTracks().find(t=>t.height===candidate.height&&t.frameRate===candidate.frameRate);
    if(!track)throw Error('Requested rendition missing');engine.selectVariantTrack(track,decision.clearBuffer,decision.safeMargin);
   }
   sw.returned=performance.now();currentId=request.id;
  }
  await until(()=>active.currentTime>=28,35000);
  result.wallEnd=performance.now();result.audioEnd=ac.currentTime;result.quality=active.getVideoPlaybackQuality();
 }catch(error){result.errors.push(String(error.stack??error));}
 finally{
  running=false;for(const v of videos)v.pause();await sleep(150);result.audioSampleRate=ac.sampleRate;result.audioBlocks=audioBlocks;
  const pcm=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){pcm.set(c,offset);offset+=c.length;}
  await save(name+'.f32',pcm.buffer);await save(name+'.json',JSON.stringify(result));
  if(demuxe)await demuxe.destroy();if(engine)await engine.destroy();for(const v of videos){v.removeAttribute('src');v.load();v.remove();}await ac.close();stage.replaceChildren();
 }
 return {name,frames:result.frames.length,errors:result.errors,switches:result.switches.length};
}
window.runExperiment=async(names=['baseline','demuxe-buffered','demuxe-responsive','shaka-clear','shaka-margin','shaka-clear-delayed','shaka-margin-delayed','file-cold','file-prepared'])=>{
 if(lab.state==='running')throw Error('Already running');lab.state='running';
 try{for(const name of names){lab.current=name;status.textContent='Running '+name;lab.results.push(await runCase(name));status.textContent=JSON.stringify(lab.results,null,2);}lab.state='done';}catch(error){lab.state='failed';lab.error=String(error.stack);status.textContent=lab.error;}
};
document.querySelector('#start').onclick=()=>runExperiment();
