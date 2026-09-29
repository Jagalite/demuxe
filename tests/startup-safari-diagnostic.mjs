// SPDX-License-Identifier: Apache-2.0
// Installed Safari (or BROWSER=firefox-system with DRIVER), local File inputs.
// Diagnostic samples, not a benchmark.
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import net from 'node:net';
const family=process.env.BROWSER||'safari',executable=process.env.DRIVER||'safaridriver';
const out=`results/startup-presentation/${family}-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
const report={browser:execFileSync(executable,['--version'],{encoding:'utf8'}).trim(),runs:[]};
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const driver=spawn(executable,['-p',String(port)],{stdio:'ignore'});let session;
async function request(path,body,method=body===undefined?'GET':'POST'){
 const r=await fetch(`http://127.0.0.1:${port}${path}`,{method,signal:AbortSignal.timeout(90000),...(body===undefined?{}:{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}})});const d=await r.json();if(d.value?.error)throw Error(d.value.error+': '+d.value.message);return d.value;
}
const execute=(fn,...args)=>request(`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];Promise.resolve((${fn.toString()})(...Array.from(arguments).slice(0,-1))).then(value=>done({value}),error=>done({error:String(error)+' | '+String(error.stack||'')}));`,args}).then(r=>{if(r.error)throw Error(r.error);return r.value;});
const element=async selector=>(await request(`/session/${session}/element`,{using:'css selector',value:selector}))['element-6066-11e4-a52e-4f735466cecf'];
try{
 for(let i=0;i<30;i++){try{await request('/status');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const created=await request('/session',{capabilities:{alwaysMatch:family==='safari'?{browserName:'safari'}:{browserName:'firefox','moz:firefoxOptions':{binary:'/Applications/Firefox.app/Contents/MacOS/firefox',args:['-headless']}}}});session=created.sessionId;report.capabilities=created.capabilities;
 await request(`/session/${session}/timeouts`,{script:75000,pageLoad:60000});
 for(const file of (process.env.FILES||'/Volumes/seed2/Projects/startup-repro/stuck.mkv,/Volumes/seed2/Projects/startup-repro/full_subs_test.mkv,/Volumes/seed2/Projects/startup-repro/software_test_slow.mkv,/Volumes/seed2/Projects/startup-repro/no_audio.mkv').split(',')){
  const row={file,url:'/',baseURL:process.env.BASE_URL||'http://127.0.0.1:4179'};report.runs.push(row);console.log('START',file);
  try{
   await request(`/session/${session}/url`,{url:(process.env.BASE_URL||'http://127.0.0.1:4179')+'/'});
   await execute(async()=>{
    await customElements.whenDefined('demuxe-player');window.viewer=document.querySelector('demuxe-player');window.p=await viewer.ready;await p.preparationReady;
    // A real click starts each operation to respect Safari activation policy.
    viewer.removeAttribute('autoplay');window.trace=[];window.t0=performance.now();
    // Install event observers in the page realm (Firefox WebDriver otherwise wraps CustomEvent.detail).
    const observer=document.createElement('script');observer.textContent=`window.trace=[];for(const type of ['inspectionchange','selectionchange','modechange','error'])window.p.addEventListener(type,e=>window.trace.push({ms:performance.now()-window.t0,type,detail:e.detail}));`;document.head.append(observer);observer.remove();
    const probe=document.createElement('script');probe.type='module';probe.textContent=`
     window.addEventListener('startup-diagnostic',({detail:data})=>window.trace.push({type:'worker-phase',name:data.phase,ms:data.start-performance.timeOrigin-window.t0,duration:data.duration}));const OriginalWorker=window.Worker;window.Worker=class extends OriginalWorker{constructor(url,options){super(url,options);this.addEventListener('message',({data})=>{if(data.type==='startup-diagnostic')window.trace.push({type:'worker-phase',name:data.phase,ms:data.start-performance.timeOrigin-window.t0,duration:data.duration});});}};
     const {NativePlayer}=await import('/web/generated/internal/native-player.js');
     const {NativeMpvSubtitles}=await import('/web/generated/internal/native-mpv-subtitles.js');
     for(const [prototype,names] of [[NativePlayer.prototype,['wait','load','startRemux','openServices','verifyStartup']],[NativeMpvSubtitles.prototype,['verify','request']]])for(const name of names){const original=prototype[name];prototype[name]=async function(...args){const start=performance.now();try{return await original.apply(this,args);}finally{const duration=performance.now()-start;if(name!=='request'||['init','select','profile'].includes(args[0])||duration>20)window.trace.push({type:'phase',io:name==='startRemux'?this.remux?.snapshot()?.source:name==='openServices'?this.mpvSubs?.service?.io:undefined,name,request:['request','wait'].includes(name)?args[0]:undefined,seconds:name==='request'?args[1]?.seconds:undefined,ms:start-window.t0,duration});}};}
     window.instrumented=true;`;document.head.append(probe);
    while(!window.instrumented)await new Promise(r=>setTimeout(r,10));
    const input=document.createElement('input');input.type='file';input.id='diagnostic-file';document.body.append(input);
   for(const action of ['open','play']){const b=document.createElement('button');b.id='diagnostic-'+action;b.textContent=action;document.body.prepend(b);b.onclick=()=>{window.operation={pending:true};if(action==='open'){window.t0=performance.now();window.trace.length=0;}const start=performance.now();(action==='open'?viewer.open(input.files[0]):p.play()).then(()=>window.operation={ms:performance.now()-start},e=>window.operation={ms:performance.now()-start,error:String(e),code:e.code});};}
   });
   const input=await element('#diagnostic-file');await request(`/session/${session}/element/${input}/value`,{text:file,value:[file]});
   row.input=await execute(()=>({name:document.querySelector('#diagnostic-file').files[0]?.name,size:document.querySelector('#diagnostic-file').files[0]?.size}));
    if(process.env.READER_CHECK)row.reader=await execute(async()=>{
    const {LocalFileReader}=await import('/web/file-reader.js');const file=document.querySelector('#diagnostic-file').files[0],reader=new LocalFileReader(file,{cacheBytes:4*1024*1024});
    try{for(const offset of [0,65537,Math.floor(file.size/2),file.size-31]){const size=Math.min(262144,file.size-offset),actual=await reader.read(BigInt(offset),262144),expected=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer());if(actual.length!==expected.length||actual.some((byte,i)=>byte!==expected[i]))throw Error('Reader bytes differ at '+offset);}
     const work=reader.read(123n,262144);reader.beginEpoch();let cancelled=false;try{await work;}catch(e){if(e.name!=='AbortError')throw e;cancelled=true;}if(!cancelled)throw Error('Read was not cancelled');await reader.read(123n,16);return {passed:true,stats:reader.stats};
    }finally{reader.close();}
   });
   if(process.env.READER_BENCH)row.readerComparison=await execute(()=>new Promise((resolve,reject)=>{const worker=new Worker('/web/reader-comparison.js',{type:'module'});worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage(document.querySelector('#diagnostic-file').files[0]);}));
   for(const action of ['open','play']){
    await request(`/session/${session}/element/${await element('#diagnostic-'+action)}/click`,{});
    row[action]=await execute(async()=>{const end=performance.now()+65000;while(operation.pending&&performance.now()<end)await new Promise(r=>setTimeout(r,50));return operation;});
    if(row[action].pending||row[action].error)throw Error(action+': '+JSON.stringify(row[action]));
   }
   row.output=await execute(async()=>{const initial=p.state.currentTime;await new Promise(r=>setTimeout(r,2000));return {initial,current:p.state.currentTime,state:p.state,diagnostics:p.diagnostics,trace};});
   if(!(row.output.current>row.output.initial+.5))throw Error('Playback failed to advance');
   if(process.env.LIFECYCLE)row.lifecycle=await execute(async()=>{
    const samples=[];await p.pause();for(const target of [5,1]){await p.seek(target);const text=await p.current.backend.mpvSubs?.currentText();samples.push({target,position:p.state.currentTime,text});if(Math.abs(p.state.currentTime-target)>.25)throw Error('Seek missed '+target);}
    await p.setPlaybackRate(1.25);await p.play();const before=p.state.currentTime;await new Promise(r=>setTimeout(r,1500));const after=p.state.currentTime;await p.pause();if(after<before+.5)throw Error('Resume did not advance');return {samples,before,after,rate:p.state.playbackRate,plan:p.diagnostics.plan.id};
   });
   row.startupMs=row.open.ms+row.play.ms;row.passed=true;
  }catch(e){row.error=String(e);process.exitCode=1;row.output=await execute(()=>({state:window.p?.state,diagnostics:window.p?.diagnostics,trace:window.trace})).catch(()=>null);}
  console.log(JSON.stringify({file,row:row.file,startupMs:row.startupMs,passed:row.passed,error:row.error,plan:row.output?.diagnostics?.plan?.id}));
  await writeFile(out+'/result.json',JSON.stringify(report,null,2));await execute(async()=>{await window.p?.destroy();}).catch(()=>{});
 }
}catch(e){report.error=String(e);process.exitCode=1;console.log(report.error);}
finally{if(session)await request(`/session/${session}`,undefined,'DELETE').catch(()=>{});driver.kill();await writeFile(out+'/result.json',JSON.stringify(report,null,2));}
