// SPDX-License-Identifier: Apache-2.0
const status=document.querySelector('#status');
const check=(ok,message)=>{if(!ok)throw Error(message);};
const bounded=async(promise,label,ms=15000)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' deadline')),ms);})]);}finally{clearTimeout(timer);}};
document.querySelector('#run').onclick=async()=>{
 const report={passed:false,cases:[],userAgent:navigator.userAgent,jspi:typeof WebAssembly.Suspending==='function'};
 try{
  const config=await(await fetch('/config')).json();
  for(const runtime of ['jspi','asyncify'])for(const fixture of config.fixtures){
   status.textContent='Running '+runtime+' '+fixture.id;
   const file=new File([await(await fetch('/fixtures/'+fixture.id+'.mkv')).arrayBuffer()],fixture.id+'.mkv');
   const worker=new Worker('/repository/tests/provider-lossless-broad-worker.mjs',{type:'module'});let preparation;
   try{preparation=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preparation deadline')),60000);worker.onmessage=({data})=>{clearTimeout(timer);resolve(data);};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage({file,runtime,engineURL:'/engines/'+runtime+'/remux.mjs'});});}finally{worker.terminate();}
   if(fixture.negative){check(!preparation.passed&&/decoder unavailable/i.test(preparation.error),'Unsupported AAC must fail because its decoder is absent: '+JSON.stringify(preparation));report.cases.push({runtime,id:fixture.id,unsupportedDecoderRejected:true});continue;}
   check(preparation.passed,preparation.error);
   const response=await fetch('/validate?id='+fixture.id+'&runtime='+runtime,{method:'POST',body:preparation.output});check(response.ok,await response.clone().text());const validation=await response.json();
   const sample={runtime,id:fixture.id,preparationMs:preparation.preparationMs,...validation};
   if(config.consumer){
    const {Player}=await import('/node_modules/demuxe/dist/index.js');
    const player=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed-'+runtime+'/',location.href).href,preview:false,remuxRuntime:runtime,nativeRemux:'always'});
    const originalArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=()=>{throw Error('Whole File materialization is forbidden');};
    try{
     await bounded(player.open(file),'Open',60000);await bounded(player.play(),'Play');await bounded(player.seek(2),'First seek');
     const deadline=performance.now()+10000;while(player.state.currentTime<2.2&&performance.now()<deadline)await new Promise(r=>setTimeout(r,30));
     check(player.state.currentTime>=2.2,'Playback must advance after seek');await bounded(player.pause(),'Pause',5000);const pausedTime=player.state.currentTime;await new Promise(r=>setTimeout(r,200));check(Math.abs(player.state.currentTime-pausedTime)<.2,'Pause must hold position');await bounded(player.play(),'Resume');await bounded(player.seek(4),'Second seek');
     const secondDeadline=performance.now()+10000;while(player.state.currentTime<4.2&&performance.now()<secondDeadline)await new Promise(r=>setTimeout(r,30));check(player.state.currentTime>=4.2,'Playback must advance after resume and second seek');
     const diagnostics=player.diagnostics;check(JSON.stringify(diagnostics).includes('/ac3-eac3-'+runtime+'/'),'Selected full-file AC3 provider');check(player.getPlaybackExplanation().planId==='native-transcode','Selected transcoding plan');check(diagnostics.backend?.remux?.remux?.adaptation?.audioSamplesDecoded>0,'Actual audio decoder execution');
     if(fixture.large){const source=diagnostics.backend?.remux?.source;check(source&&source.peakActiveBytes<=262144&&source.peakOwnedBytes<=524288&&source.fetchedBytes<file.size/2,'Bounded source reads: '+JSON.stringify(source));sample.largeSource={bytes:file.size,...source};}
     const video=document.querySelector('#player video'),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,160,90);check(ctx.getImageData(0,0,160,90).data.some((v,i)=>i%4!==3&&v>60),'Decoded visible video');
     sample.player={played:true,paused:true,sought:true,diagnostics};
    }catch(error){throw Error(String(error)+'; '+JSON.stringify(player.diagnostics));}finally{try{await bounded(player.destroy(),'Destroy',10000);}finally{File.prototype.arrayBuffer=originalArrayBuffer;}}
    sample.player.destroyed=true;
   }
   report.cases.push(sample);
  }
  check(config.consumer,'Installed consumer required for complete qualification');report.passed=true;
 }catch(error){report.error=String(error.stack);}
 status.textContent=JSON.stringify(report,null,2);window.ac3Result=report;await fetch('/result',{method:'POST',body:JSON.stringify(report)});
};
