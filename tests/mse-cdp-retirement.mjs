// SPDX-License-Identifier: Apache-2.0
// Control experiment: drive real remux/ASS through CDP without attaching a
// debugger to worker targets. Never substitutes for the release playback gates.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const out=`results/mse-cdp-retirement/${Date.now()}`;await mkdir(out,{recursive:true});
const rounds=Number(process.env.MSE_CDP_ROUNDS??20);if(!Number.isInteger(rounds)||rounds<1||rounds>20)throw Error('CDP diagnostic requires 1 to 20 trials');
const report={rounds,scope:'Browser-debug attachment control only; not release qualification',workerAutoAttach:false,checks:[],passed:false};
const profile=await mkdtemp(path.join(tmpdir(),'demuxe-cdp-retirement-'));
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
const executable=process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/opt/google/chrome/chrome';
const chrome=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--mute-audio','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',`--user-data-dir=${profile}`],{stdio:['ignore','ignore','pipe']});
const exited=new Promise(resolve=>chrome.once('exit',(code,signal)=>resolve({code,signal})));
let socket,serial=0;const pending=new Map(),events=new Map();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function send(method,params={},sessionId){
 const id=++serial;
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP deadline: '+method));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
}
async function evaluate(sessionId,expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
try{
 const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chrome DevTools startup timed out')),15000);chrome.once('error',reject);chrome.stderr.on('data',data=>{const m=/DevTools listening on (ws:\/\/\S+)/.exec(String(data));if(m){clearTimeout(timer);resolve(m[1]);}});});
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 const disconnect=()=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('CDP connection closed'));}pending.clear();};socket.addEventListener('close',disconnect);socket.addEventListener('error',disconnect);
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(events.has(message.sessionId)&&(['Runtime.exceptionThrown','Network.loadingFailed'].includes(message.method)||message.method==='Network.responseReceived'&&message.params.response.status>=400)){const entries=events.get(message.sessionId);if(entries.length<30)entries.push(message);}const entry=pending.get(message.id);if(!entry)return;pending.delete(message.id);clearTimeout(entry.timer);message.error?entry.reject(Error(message.error.message)):entry.resolve(message.result);});
 report.browser=await send('Browser.getVersion');await send('Target.setDiscoverTargets',{discover:true});
 for(const documentRetirement of ['immediate','delay50','navigate'])for(let iteration=0;iteration<rounds;iteration++){
  const frameRemovalDelayMs=documentRetirement==='delay50'?50:0;
  const row={iteration,documentRetirement,frameRemovalDelayMs,passed:false};report.checks.push(row);let browserContextId;
  try{
   ({browserContextId}=await send('Target.createBrowserContext'));
   const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
   const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
   row.startupEvents=[];events.set(sessionId,row.startupEvents);await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);
   await send('Page.navigate',{url:origin+'/examples/custom-controls.html'},sessionId);
   const started=Date.now();while(!await evaluate(sessionId,'!!document.querySelector("#surface")')){if(Date.now()-started>15000)throw Error('Player document startup timed out: '+JSON.stringify(row.startupEvents));await delay(50);}
   events.delete(sessionId);delete row.startupEvents;
   await evaluate(sessionId,`(async()=>{await window.player?.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalNativeASS:true,experimentalBufferedNativeSeeks:true});window.playbackErrors=[];player.addEventListener('error',event=>playbackErrors.push(event.detail));const font=await(await fetch('/fixtures/DejaVuSans.ttf')).blob();await player.addFont(new File([font],'DejaVuSans.ttf'));const input=document.createElement('input');input.type='file';input.id='mse-cdp-media';document.body.append(input);})()`);
   await evaluate(sessionId,`(async()=>{
    window.frameRetirements=[];window.frameNavigationTimeouts=0;window.frameRemovalDelayMs=${frameRemovalDelayMs};window.documentRetirement=${JSON.stringify(documentRetirement)};
    if(documentRetirement==='immediate')return;
    const {WorkerRemuxController}=await import('/web/worker-remux-controller.js'),release=WorkerRemuxController.prototype.releaseResources;
    WorkerRemuxController.prototype.releaseResources=function(id){
     const frame=this.workerOwner;
     if(frame&&!frame.diagnosticDelayedRemoval){frame.diagnosticDelayedRemoval=true;const remove=frame.remove.bind(frame);frame.remove=()=>{frameRetirements.push(new Promise(resolve=>{
      const previousDocument=frame.contentDocument;let timer,finished=false;
      const loaded=()=>{if(frame.contentDocument!==previousDocument)finish();};
      const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);frame.removeEventListener('load',loaded);remove();resolve();};
      if(documentRetirement==='delay50')timer=setTimeout(finish,frameRemovalDelayMs);
      else{frame.addEventListener('load',loaded);timer=setTimeout(()=>{frameNavigationTimeouts++;finish();},500);frame.src='about:blank';}
     }));};}
     return release.call(this,id);
    };
   })()`);
   const {root}=await send('DOM.getDocument',{},sessionId),{nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#mse-cdp-media'},sessionId);
   await send('DOM.setFileInputFiles',{nodeId,files:[path.resolve('build/optimization-fixtures/gain.mp4')]},sessionId);
   await evaluate(sessionId,`(async()=>{window.mediaFile=document.querySelector('#mse-cdp-media').files[0];await player.open(mediaFile);const ass=await(await fetch('/fixtures/qualification.ass')).blob();await player.addSubtitle(new File([ass],'qualification.ass'));await player.seek(2.25);})()`);
   const painted=Date.now();while(!await evaluate(sessionId,'player.current.backend.mpvSubs.stats.renders>0')){if(Date.now()-painted>10000)throw Error('ASS rendering did not begin');await delay(50);}
   await evaluate(sessionId,'(async()=>{await player.seek(2.75);await player.rate(1.5);await player.play();})()');await delay(250);
   await evaluate(sessionId,`(async()=>{await player.seek(4);await player.pause();await player.setAudioGain(.25);const id=player.state.subtitleTracks.find(track=>track.external).id;await player.selectSubtitleTrack(id);await player.setMode('hybrid');await player.setMode('native');await document.querySelector('#surface').requestFullscreen();await document.exitFullscreen();})()`);
   row.targetsBeforeRetirement=(await send('Target.getTargets')).targetInfos.filter(target=>target.type==='worker'&&target.browserContextId===browserContextId);
   row.mseOwner=await evaluate(sessionId,"player.current.backend.remux.snapshot().mseOwner");
   if(row.mseOwner!=='worker'||!row.targetsBeforeRetirement.length||row.targetsBeforeRetirement.some(target=>target.attached))throw Error('Control did not observe active, debugger-detached worker MSE');
   row.teardown=await evaluate(sessionId,'(async()=>{await player.open(mediaFile);const startedAt=Date.now();await player.destroy();await Promise.all(frameRetirements);return {startedAt,delayedFrames:frameRetirements.length,navigationTimeouts:frameNavigationTimeouts};})()');
   if(documentRetirement!=='immediate'&&!row.teardown.delayedFrames)throw Error('Document-retirement control did not run');
   if(documentRetirement==='navigate'&&row.teardown.navigationTimeouts)throw Error('Document navigation barrier not observed');
   row.playbackErrors=await evaluate(sessionId,'playbackErrors');
   const retirement=row.teardown.startedAt;let targets;
   do{targets=(await send('Target.getTargets')).targetInfos.filter(target=>target.type==='worker'&&target.browserContextId===browserContextId);if(!targets.length||Date.now()-retirement>=5000)break;await delay(25);}while(true);
   row.retirementMs=Date.now()-retirement;row.remainingTargets=targets;
   if(targets.length||row.playbackErrors.length)throw Error('Direct-CDP playback/retirement failed');row.passed=true;
  }catch(error){row.error=String(error.stack);if(row.startupEvents)throw error;}
  finally{if(browserContextId)await send('Target.disposeBrowserContext',{browserContextId}).catch(error=>{row.contextError=String(error);row.passed=false;});await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}
 }
 report.passed=report.checks.every(row=>row.passed);if(!report.passed)process.exitCode=1;
}finally{
 if(socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});
 const exit=await Promise.race([exited,delay(10000).then(()=>null)]);report.processExit=exit;if(!exit){chrome.kill('SIGKILL');report.passed=false;process.exitCode=1;}socket?.close();for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('CDP diagnostic closed'));}pending.clear();server.kill();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');await rm(profile,{recursive:true,force:true});console.log('Direct CDP retirement control:',out);
}
