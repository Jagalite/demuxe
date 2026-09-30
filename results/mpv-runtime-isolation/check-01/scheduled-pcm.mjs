// SPDX-License-Identifier: Apache-2.0
// Test-only steady-state 1x PCM transport. Seek/rate/EOF are deliberately unqualified.
export async function attachScheduledPCM(player){
 const a=player.current.backend.mpvAudio,e=a.engine,h=e.audioHeader;
 await player.pause();
 const rate=e.audioContext.sampleRate;
 e.audioNode.port.onmessage=null;e.audioNode.port.postMessage('close');e.audioNode.disconnect();await e.audioContext.close();
 const context=new AudioContext({sampleRate:rate,latencyHint:'interactive'}),gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
 e.audioContext=context;e.audioNode=undefined;e.selectiveGain=gain;e.analyser=context.createAnalyser();gain.connect(e.analyser);
 a.context=context;a.gain=gain;
 const pcm=new Float32Array(h.buffer,64,8192*2),meta=new Float64Array(h.buffer,64+8192*8,8192*2);
 const epoch=Atomics.load(h,3),generation=Atomics.load(h,10);
 let copied=Atomics.load(h,1)>>>0,consumed=copied,nextAt=null,started=false,failed=false;
 const queue=[],nodes=new Set(),stats={transport:'scheduled-real-mpv-pcm',sampleRate:rate,blocks:0,frames:0,consumed:0,underruns:0,maxQueuedSeconds:0,maxAbsSyncMs:0,errors:[]};
 const fail=error=>{if(failed)return;failed=true;stats.errors.push(String(error));clearInterval(timer);};
 function pump(){
  if(failed)return;
  try{
   if(Atomics.load(h,3)!==epoch||Atomics.load(h,10)!==generation)throw Error('Prototype epoch/generation transition is not implemented');
   const now=context.currentTime;
   while(queue.length){
    const q=queue[0],n=Math.max(0,Math.min(q.count,Math.floor((now-q.at)*rate)));
    const read=q.first+n;
    if(read>consumed){const delta=read-consumed;consumed=read;Atomics.store(h,1,read);Atomics.add(h,5,delta);stats.consumed+=delta;Atomics.store(h,11,generation);Atomics.store(h,13,epoch);}
    if(n<q.count)break;queue.shift();
   }
   if(!Atomics.load(h,12)||!Atomics.load(h,2))return;
   if(Atomics.load(h,14)!==epoch)throw Error('Unexpected permitted epoch');
   if(started&&nextAt<now){stats.underruns++;throw Error('Scheduled PCM queue underrun');}
   if(nextAt===null)nextAt=now+.045;
   const written=Atomics.load(h,0)>>>0;
   if(written-copied>8192)throw Error('PCM ring capacity exceeded');
   while(written-copied>=2048&&nextAt-now<.12){
    const count=2048,buffer=context.createBuffer(2,count,rate),left=buffer.getChannelData(0),right=buffer.getChannelData(1),first=copied,pts=meta[(first%8192)*2];
    for(let i=0;i<count;i++){const at=((first+i)%8192)*2;if(meta[at+1]!==1)throw Error('Prototype only supports 1x PCM');left[i]=pcm[at];right[i]=pcm[at+1];}
    const source=context.createBufferSource();source.buffer=buffer;source.connect(gain);nodes.add(source);source.onended=()=>{source.disconnect();nodes.delete(source);};
    source.start(nextAt);queue.push({first,count,at:nextAt});
    const stamp=context.getOutputTimestamp(),wallTime=performance.timeOrigin+stamp.performanceTime+(nextAt-stamp.contextTime)*1000;
    a.onOutput({kind:'timeline',wallTime,mediaTime:pts,rate:1,generation,epoch,audioFrame:Math.round(nextAt*rate)});
    copied+=count;nextAt+=count/rate;started=true;stats.blocks++;stats.frames+=count;stats.maxQueuedSeconds=Math.max(stats.maxQueuedSeconds,nextAt-now);
   }
   const estimate=a.estimatedAudioPresentationTime();if(estimate!==null&&a.running)stats.maxAbsSyncMs=Math.max(stats.maxAbsSyncMs,Math.abs(estimate-a.time())*1000);
  }catch(error){fail(error);}
 }
 const timer=setInterval(pump,20);await context.resume();
 // An unprimed DAC timestamp can start video early relative to the first buffer.
 const deadline=performance.now()+1000;
 while(context.getOutputTimestamp().contextTime<=0||context.getOutputTimestamp().performanceTime<=0){if(performance.now()>deadline){clearInterval(timer);throw Error('DAC timestamp did not become available');}await new Promise(r=>setTimeout(r,5));}
 e.sendTiming(true);pump();
 return {stats,stop(){clearInterval(timer);for(const n of nodes){try{n.stop();}catch{}}nodes.clear();}};
}
