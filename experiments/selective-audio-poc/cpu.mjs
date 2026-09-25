// SPDX-License-Identifier: Apache-2.0
// Frozen three-arm headed Chrome CPU comparison. No production changes.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const exec=promisify(execFile);
const out=path.resolve(process.env.OUT??`results/selective-audio-poc/cpu-${Date.now()}`);
const assets=path.resolve('build/selective-audio-poc/assets'),rounds=Number(process.env.ROUNDS??3);
const warmup=Number(process.env.WARMUP??4),windowSeconds=Number(process.env.SECONDS??20);
await fs.mkdir(out,{recursive:true});const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,f),path.join(harness,f));
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
const orders=[['A','B','C'],['C','B','A'],['B','A','C'],['B','C','A'],['C','A','B']];
const result={schema:1,createdAt:new Date().toISOString(),host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},
 protocol:{rounds,warmupSeconds:warmup,windowSeconds,orders:orders.slice(0,rounds),headed:true,
 cpu:'CDP SystemInfo.getProcessInfo process CPU-time deltas, percentages of one core'},trials:[]};
const save=async()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const role=type=>type==='browser'?'browser':type==='renderer'?'renderer':type==='GPU'?'gpu':type.includes('audio.mojom.AudioService')?'audioService':'other';
const measure=(first,last,elapsed)=>{const before=new Map(first.map(x=>[x.id,x]));
 const stable=first.length===last.length&&last.every(x=>before.has(x.id));
 const roles={browser:0,renderer:0,gpu:0,audioService:0,other:0};
 const processes=last.filter(x=>before.has(x.id)).map(p=>({id:p.id,type:p.type,role:role(p.type),percent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
 for(const p of processes)roles[p.role]+=p.percent;
 return {stable,roles,processes,whole:Object.values(roles).reduce((a,b)=>a+b,0)};};
const sampleThreads=async processes=>Promise.all(processes.map(async p=>{
 try{const {stdout}=await exec(path.resolve('build/hybrid-handoff/thread-cpu'),[String(p.id)]);
 return {pid:p.id,type:p.type,threads:JSON.parse(stdout)};}
 catch(e){return {pid:p.id,type:p.type,error:String(e)};}}));
try{for(let round=0;round<rounds;round++)for(const arm of orders[round]){
 const trial={round:round+1,arm,order:orders[round],status:'running',startedAt:new Date().toISOString()};result.trials.push(trial);await save();
 let browser,page;
 try{browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});trial.browserVersion=browser.version();
 page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});trial.pageErrors=[];
 page.on('pageerror',e=>trial.pageErrors.push(String(e)));
 const media=await page.context().newCDPSession(page);trial.mediaEvents=[];
 for(const event of ['playerPropertiesChanged','playerMessagesLogged','playerErrorsRaised'])media.on(`Media.${event}`,data=>trial.mediaEvents.push({event,data}));
 await media.send('Media.enable');
 await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
 await page.evaluate(id=>poc.start(id),arm);
 await page.waitForFunction(id=>{const s=poc.snapshot();return s.position>.4&&
   (id==='A'?String(s.route).startsWith('native'):id==='B'?s.route==='hybrid':s.route==='selective-poc')},arm,{timeout:25000});
 await page.waitForTimeout(warmup*1000);
 const cdp=await browser.newBrowserCDPSession();
 const read=async()=>{const process=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const state=await page.evaluate(()=>poc.snapshot());
   const threads=await sampleThreads(process);
   return {at:performance.now(),process,state,threads};};
 const first=await read();await page.waitForTimeout(windowSeconds*1000);const last=await read();
 const elapsed=(last.at-first.at)/1000;trial.elapsed=elapsed;trial.cpu=measure(first.process,last.process,elapsed);
 trial.start=first.state;trial.end=last.state;trial.threadCPU={start:first.threads,end:last.threads};
 trial.route=last.state.route;trial.advance=last.state.position-first.state.position;
 const mediaProperties=trial.mediaEvents.filter(e=>e.event==='playerPropertiesChanged').flatMap(e=>e.data.properties??[]);
 const prop=name=>mediaProperties.find(p=>p.name===name)?.value??null;
 trial.browserVideoDecoder={name:prop('kVideoDecoderName'),platform:prop('kIsPlatformVideoDecoder')};
 const bv=first.state.video,ev=last.state.video;
 trial.browserVideo={frames:ev?.total-bv?.total,dropped:ev?.dropped-bv?.dropped};
 if(arm==='C'){
   const samples=await page.evaluate(()=>poc.samples());const relevant=samples.filter(s=>s.at>=first.state.clock.at&&s.at<=last.state.clock.at&&
     s.errorMs!==null&&s.audioObservationAgeMs<500);
   trial.av={initialOffsetMs:relevant[0]?.errorMs??null,maxAbsClockSkewMs:Math.max(...relevant.map(s=>Math.abs(s.errorMs))),
     medianClockSkewMs:relevant.length?relevant.map(s=>s.errorMs).sort((a,b)=>a-b)[Math.floor(relevant.length/2)]:null,
     samples:relevant.length,method:'mpv time-pos extrapolated from observed property updates minus HTMLVideoElement.currentTime; not an acoustic latency probe'};
   trial.corrections=last.state.corrections.filter(c=>c.at>=first.state.clock.at&&c.at<=last.state.clock.at);
   trial.audioUnderruns=last.state.audioOutput.underruns-first.state.audioOutput.underruns;
   trial.audioFrames=last.state.audioOutput.mediaFrames-first.state.audioOutput.mediaFrames;
   trial.mpvVideoChain={videoParams:last.state.mpv.videoParams,videoCodec:last.state.mpv.videoCodec,
     selectedVideoTracks:last.state.mpv.tracks?.filter(t=>t.type==='video'&&t.selected).length,
     selectedAudioTracks:last.state.mpv.tracks?.filter(t=>t.type==='audio'&&t.selected).length};
   trial.worker=last.state.worker;
   trial.noCanvas=last.state.canvasCount===0&&last.state.worker.visibleCanvas===false;
   trial.noWebCodecs=last.state.webCodecsDecodeWorker===false&&last.state.worker.videoDecoderWorker===false;
 }
 const hybrid=arm==='B'?{submitted:last.state.diagnostics?.backend?.decoderStats?.submitted-first.state.diagnostics?.backend?.decoderStats?.submitted,
    outputs:last.state.diagnostics?.backend?.decoderStats?.frames-first.state.diagnostics?.backend?.decoderStats?.frames,
    presented:last.state.diagnostics?.backend?.presentation?.drawn-first.state.diagnostics?.backend?.presentation?.drawn,
    underruns:last.state.audioOutput?.underruns-first.state.audioOutput?.underruns}:null;trial.hybrid=hybrid;
 const cadence=Math.abs(trial.advance-elapsed)<.8&&
   (arm==='B'?(hybrid.submitted>=elapsed*55&&hybrid.outputs>=elapsed*55&&hybrid.presented>=elapsed*55&&hybrid.underruns===0):
    trial.browserVideo.frames>=elapsed*55);
 const routeOK=arm==='A'?String(trial.route).startsWith('native'):arm==='B'?trial.route==='hybrid':trial.route==='selective-poc';
 const specific=arm!=='C'||(trial.mpvVideoChain.selectedVideoTracks===0&&trial.mpvVideoChain.selectedAudioTracks===1&&
   trial.mpvVideoChain.videoParams===null&&trial.noCanvas&&trial.noWebCodecs&&trial.audioUnderruns===0&&
   trial.audioFrames>=elapsed*48000*.97);
 trial.status=trial.cpu.stable&&cadence&&routeOK&&specific&&!trial.pageErrors.length&&!last.state.errors.length?'accepted':'rejected';
 if(trial.status==='rejected')trial.rejection={stable:trial.cpu.stable,cadence,routeOK,specific,pageErrors:trial.pageErrors,stateErrors:last.state.errors};
 trial.finishedAt=new Date().toISOString();await save();
 console.log(`${round+1} ${arm} ${trial.status} whole=${trial.cpu.whole.toFixed(2)} browser=${trial.cpu.roles.browser.toFixed(2)} renderer=${trial.cpu.roles.renderer.toFixed(2)} gpu=${trial.cpu.roles.gpu.toFixed(2)} av=${trial.av?.maxAbsClockSkewMs?.toFixed(1)??'-'}ms`);
 await page.evaluate(()=>poc.stop());
 }catch(e){trial.status='failed';trial.error=String(e.stack??e);trial.failureState=await page?.evaluate(()=>poc.snapshot()).catch(()=>null);await save();
 console.log(`${round+1} ${arm} failed ${trial.error.split('\n')[0]}`);
 }finally{await browser?.close().catch(()=>{});await save();}
}}finally{await server.close();await save();}
