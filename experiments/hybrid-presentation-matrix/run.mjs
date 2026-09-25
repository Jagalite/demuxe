// SPDX-License-Identifier: Apache-2.0
// Counterbalanced Native/Hybrid/no-draw matrix on one frozen file per case.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'../..');
const execFileAsync=promisify(execFile);
const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation-matrix/assets');
const out=path.resolve(process.env.RESULTS??`results/hybrid-presentation-matrix/run-${new Date().toISOString().replaceAll(':','-')}`);
const manifest=JSON.parse(await fs.readFile('results/hybrid-presentation-matrix/fixtures.json','utf8'));
const family=process.env.CASE??'h264-1080p60';
const outputWidth=Number(process.env.CANVAS_WIDTH??960),outputHeight=Number(process.env.CANVAS_HEIGHT??Math.round(outputWidth*9/16));
const fixture=manifest.cases.find(c=>c.id===family);
if(!fixture)throw Error(`Unknown matrix case ${family}`);
const rounds=Number(process.env.ROUNDS??5),warmup=Number(process.env.WARMUP??4),seconds=Number(process.env.SECONDS??20);
const startRound=Number(process.env.START_ROUND??0);
const preflight=process.env.PREFLIGHT==='1';
const allArms=[
  {id:'A',label:'Native AAC',file:`${family}-aac.mkv`,lane:'auto',expected:'native'},
  {id:'B',label:'Forced Hybrid AAC',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'C',label:'Forced Hybrid AAC no-draw',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'D',label:'Forced Hybrid AAC external texture',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'E',label:'External texture offscreen target',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'F',label:'Visible canvas clear only',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'G',label:'Offscreen target clear only',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
];
const requestedArms=(process.env.ARMS??'A,B,C').split(',');
const arms=allArms.filter(arm=>requestedArms.includes(arm.id));
if(arms.length!==requestedArms.length||!arms.length)throw Error(`Invalid ARMS: ${requestedArms}`);
const minimumAcceptedFps=fixture.fps*.9;
const permutations=[['A','B','C'],['B','C','A'],['C','A','B'],['C','B','A'],['A','C','B'],['B','A','C']];
const orders=Array.from({length:rounds},(_,i)=>arms.length===3?permutations[i%permutations.length].map(id=>requestedArms[{A:0,B:1,C:2}[id]]):
  i%2?[...requestedArms].reverse():[...requestedArms]);
const byId=Object.fromEntries(arms.map(arm=>[arm.id,arm]));
const stateSummary=state=>({position:state.position,duration:state.duration,route:state.route,decoder:state.diagnostics?.backend?.decoder,
  diagnostics:state.diagnostics?.backend??null,video:state.video,selectedAudioTrack:state.selectedAudioTrack,
  mediaTracks:state.mediaTracks,audioParams:state.audioParams,audio:state.audioOutput,mpv:state.mpv,surface:state.surface});
const resultName=`${family}-${outputWidth}x${outputHeight}-result.json`;
const save=async()=>{const temporary=path.join(out,`${resultName}.${process.pid}.tmp`);await fs.writeFile(temporary,JSON.stringify(result,null,2)+'\n');await fs.rename(temporary,path.join(out,resultName));};

await fs.mkdir(out,{recursive:true});
for(const arm of arms)if(!manifest.cases.some(f=>f.file===arm.file))throw Error(`Fixture missing from manifest: ${arm.file}`);
const fixtureMeta=Object.fromEntries(manifest.cases.map(f=>[f.file,f]));
let result={schema:1,family,createdAt:new Date().toISOString(),preflight,host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},
  runtime:JSON.parse(await fs.readFile(path.join(assets,'attribution-preparation.json'),'utf8')),
  output:{canvasWidth:outputWidth,canvasHeight:outputHeight,cssStageWidth:960,cssStageHeight:540,
    sourceWidth:fixture.sourceWidth,sourceHeight:fixture.sourceHeight,sourceToCanvasWidthRatio:fixture.sourceWidth/outputWidth,
    sourceToCanvasHeightRatio:fixture.sourceHeight/outputHeight},
  protocol:{rounds,warmupSeconds:warmup,windowSeconds:seconds,channel:'chrome',headed:true,
    processAccounting:'CDP SystemInfo.getProcessInfo CPU-time deltas, all Chrome process roles',orders},
  fixtureFiles:Object.fromEntries(arms.map(a=>[a.id,fixtureMeta[a.file]])),trials:[]};
if(startRound){result=JSON.parse(await fs.readFile(path.join(out,resultName),'utf8'));result.protocol.rounds=rounds;result.protocol.orders=orders;}
await save();

const harness=path.join(out,`${family}-harness`);
await fs.mkdir(harness,{recursive:true});
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(repo,'tests/head-to-head',file),path.join(harness,file));
const harnessHtmlPath=path.join(harness,'harness.html');
const harnessHtml=await fs.readFile(harnessHtmlPath,'utf8');
await fs.writeFile(harnessHtmlPath,harnessHtml.replace('<meta charset="utf-8">','<meta charset="utf-8"><link rel="icon" href="data:,">'));
const adapterPath=path.join(harness,'adapters.mjs');
const adapter=await fs.readFile(adapterPath,'utf8');
if(!adapter.includes('if(c.componentTrial)window.componentPlayer=player;'))throw Error('Unexpected head-to-head adapter hook');
if(!adapter.includes('width:960,height:540,...options'))throw Error('Unexpected canvas size anchor');
await fs.writeFile(adapterPath,adapter.replace('if(c.componentTrial)window.componentPlayer=player;','window.__cpuPlayer=player;')
  .replace('width:960,height:540,...options','width:c.canvasWidth??960,height:c.canvasHeight??540,...options'));

const server=await serve(assets,harness,path.join(out,`${family}-requests-${Date.now()}-${process.pid}.jsonl`));
const roleOf=type=>{
  const key=String(type).toLowerCase();
  if(key==='browser')return 'browser';
  if(key==='gpu')return 'gpu';
  if(key==='renderer')return 'renderer';
  if(key.includes('audio')&&key.includes('service'))return 'audioService';
  return 'other';
};
const processDelta=(first,last,elapsed)=>{
  const before=new Map(first.map(p=>[p.id,p]));
  const beforeIds=[...before.keys()].sort(),lastIds=last.map(p=>p.id).sort();
  const stable=JSON.stringify(beforeIds)===JSON.stringify(lastIds);
  if(!stable)throw Error(`Chrome process turnover during window: ${JSON.stringify({before:beforeIds,after:lastIds})}`);
  const details=last.map(p=>({id:p.id,type:p.type,role:roleOf(p.type),oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
  const roles={browser:0,renderer:0,gpu:0,audioService:0,other:0};
  for(const process of details)roles[process.role]+=process.oneCorePercent;
  return {stable,details,roles,whole:details.reduce((n,p)=>n+p.oneCorePercent,0)};
};

try{
  for(let round=startRound;round<rounds;round++)for(const id of orders[round]){
    const arm=byId[id],record={arm:id,label:arm.label,round:round+1,order:orders[round],status:'running',startedAt:new Date().toISOString()};
    result.trials.push(record);await save();
    let browser,context,page;
    try{
      browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
      record.browserVersion=browser.version();
      record.lifecycle=[];
      const lifecycle=event=>record.lifecycle.push({event,at:new Date().toISOString()});
      browser.on('disconnected',()=>lifecycle('browser-disconnected'));
      context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
      context.on('close',()=>lifecycle('context-close'));
      page=await context.newPage();
      page.on('crash',()=>lifecycle('page-crash'));
      page.on('close',()=>lifecycle('page-close'));
      record.browserErrors=[];
      page.on('pageerror',error=>record.browserErrors.push(String(error)));
      page.on('console',message=>{if(message.type()==='error'&&record.browserErrors.length<50)record.browserErrors.push(`console: ${message.text()}`);});
      record.mediaEvents=[];
      const media=await context.newCDPSession(page);
      for(const event of ['playerPropertiesChanged','playerMessagesLogged','playerErrorsRaised'])
        media.on(`Media.${event}`,data=>record.mediaEvents.push({event,data}));
      await media.send('Media.enable');
      await page.goto(server.origin+'/harness/harness.html');
      await page.waitForFunction(()=>window.api);
      await page.evaluate(id=>{globalThis.__hybridGapNoDraw=id==='C';globalThis.__hybridExternalTexture=['D','E','F','G'].includes(id);globalThis.__hybridHandoffMode=({E:'offscreen',F:'clear-visible',G:'clear-offscreen'})[id]??'visible';},id);
      const config={id:`hybrid-matrix.${family}.${arm.id}.r${round+1}`,player:'demuxe',lane:arm.lane,file:arm.file,canvasWidth:outputWidth,canvasHeight:outputHeight};
      await page.evaluate(config=>api.start(config),config);
      await page.waitForFunction(expected=>{
        const state=api.snapshot();
        if(state.position<.4)return false;
        if(expected==='native')return typeof state.route==='string'&&state.route.startsWith('native');
        return state.route==='hybrid'&&state.diagnostics?.backend?.decoder==='webcodecs'&&state.diagnostics?.backend?.presentation?.drawn>5;
      },arm.expected,{timeout:25000});
      const readState=()=>page.evaluate(()=>{
        const state=api.snapshot(),backend=window.__cpuPlayer?.current?.backend;
        const names=['audio-codec-name','audio-codec','video-codec','video-params','audio-params','audio-out-params','af',
          'avsync','demuxer-cache-state','demuxer','track-list','frame-drop-count','decoder-frame-drop-count'];
        const mpv={};for(const name of names){const value=backend?.properties?.get(name);if(value!==undefined)mpv[name]=value;}
        const stage=document.querySelector('#stage'),canvas=stage?.querySelector('canvas'),video=stage?.querySelector('video');
        const surface={stageClientWidth:stage?.clientWidth??null,stageClientHeight:stage?.clientHeight??null,
          canvasWidth:canvas?.width??null,canvasHeight:canvas?.height??null,
          canvasClientWidth:canvas?.clientWidth??null,canvasClientHeight:canvas?.clientHeight??null,
          nativeVideoWidth:video?.videoWidth??null,nativeVideoHeight:video?.videoHeight??null};
        return {...state,audioOutput:backend?.audioDiagnostics?.()??null,mpv,surface};
      });
      record.ready=stateSummary(await readState());
      record.startState=record.ready;
      if(preflight){
        record.status='preflight';
        record.endState=stateSummary(await readState());
        await page.evaluate(()=>api.stop());await context.close();context=null;await browser.close();browser=null;
        record.finishedAt=new Date().toISOString();await save();continue;
      }
      await page.waitForTimeout(warmup*1000);
      const cdp=await browser.newBrowserCDPSession();
      const sampleAt=async(label,includeState)=>{
        const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
        const state=includeState?await readState():undefined;
        const threads=includeState&&process.env.THREAD_CPU?await Promise.all(processes.map(async p=>{
          try{const {stdout}=await execFileAsync(path.resolve(process.env.THREAD_CPU),[String(p.id)]);
            return {pid:p.id,type:p.type,at:performance.now(),threads:JSON.parse(stdout)};
          }catch(error){return {pid:p.id,type:p.type,error:String(error)};}
        })):undefined;
        return {label,monotonicMs:performance.now(),wall:Date.now(),processes,...(includeState?{state}:{}),...(threads?{threads}:{})};
      };
      const first=await sampleAt('start',true);
      await page.waitForTimeout(Math.max(1000,Math.floor(seconds*500)));
      const middle=await sampleAt('middle',false);
      await page.waitForTimeout(seconds*1000-(middle.wall-first.wall));
      const last=await sampleAt('end',true);
      const elapsed=(last.monotonicMs-first.monotonicMs)/1000;
      const cpu=processDelta(first.processes,last.processes,elapsed);
      const getDelta=(before,after,key)=>before?.[key]===undefined||after?.[key]===undefined?null:Number(after[key])-Number(before[key]);
      const a=first.state,b=last.state,da=a.diagnostics?.backend??{},db=b.diagnostics?.backend??{};
      const hybrid=arm.expected==='hybrid';
      record.elapsed=elapsed;record.cpu=cpu;record.advance=Number(b.position)-Number(a.position);
      if(first.threads)record.threadCPU={start:first.threads,end:last.threads};
      record.route=b.route;record.decoder=b.diagnostics?.backend?.decoder;
      record.processWindowAudit={sameProcessSetAtMid:JSON.stringify(first.processes.map(p=>p.id).sort())===JSON.stringify(middle.processes.map(p=>p.id).sort()),
        sameProcessSetAtEnd:cpu.stable};
      if(hybrid){
        record.webCodecs={submitted:getDelta(da.decoderStats,db.decoderStats,'submitted'),outputs:getDelta(da.decoderStats,db.decoderStats,'frames'),
          errors:getDelta(da.decoderStats,db.decoderStats,'errors'),decoderCopyMs:getDelta(da.decoderStats,db.decoderStats,'copyMs'),
          decoderBackend:db.decoderStats?.decoderBackend??null,codec:db.decoderStats?.codec??null,pixelFormat:db.decoderStats?.pixelFormat??null,
          actualWidth:db.decoderStats?.actualWidth??null,actualHeight:db.decoderStats?.actualHeight??null,
          hardwareAcceleration:db.decoderStats?.supportCheck?.recognized?.hardwareAcceleration??null,
          packetBytes:getDelta(da.decoderStats,db.decoderStats,'packetBytes'),sharedPacketInputs:getDelta(da.decoderStats,db.decoderStats,'sharedPacketInputs'),
          sharedPacketFallbacks:getDelta(da.decoderStats,db.decoderStats,'sharedPacketFallbacks'),transferredFrames:getDelta(da.decoderStats,db.decoderStats,'transferredFrames'),
          draws:getDelta(da.presentation,db.presentation,'drawn'),received:getDelta(da.presentation,db.presentation,'received'),
          closed:getDelta(da.presentation,db.presentation,'closed'),redraws:getDelta(da.presentation,db.presentation,'redraws'),
          missing:getDelta(da.presentation,db.presentation,'missing'),
          peakRetained:db.presentation?.peakRetained,peakPending:db.presentation?.peakPending,
          drawCalls:getDelta(da.presentation?.costs,db.presentation?.costs,'drawCalls'),
          drawMs:getDelta(da.presentation?.costs,db.presentation?.costs,'drawMs'),
          selectMs:getDelta(da.presentation?.costs,db.presentation?.costs,'selectMs'),
          receiveMs:getDelta(da.presentation?.costs,db.presentation?.costs,'receiveMs'),
          subtitleMs:getDelta(da.presentation?.costs,db.presentation?.costs,'subtitleMs'),
          outputDrawCountDifference:getDelta(da.decoderStats,db.decoderStats,'frames')-getDelta(da.presentation,db.presentation,'drawn')};
        record.webCodecs.visibleCanvasDraws=['C','E','G'].includes(id)?0:record.webCodecs.draws;
        record.worker={pumpTicks:getDelta(da,db,'pumpTicks'),canvasSubmissions:getDelta(da,db,'canvasSubmissions'),
          rendered:getDelta(da,db,'rendered'),ioStart:da.io??null,ioEnd:db.io??null};
        record.audioWorklet={sampleRate:b.audioOutput?.sampleRate??null,mediaFrames:getDelta(a.audioOutput,b.audioOutput,'mediaFrames'),
          underruns:getDelta(a.audioOutput,b.audioOutput,'underruns'),estimatedPcmBytes:getDelta(a.audioOutput,b.audioOutput,'mediaFrames')*8,
          mediaVsVideoDriftMs:((getDelta(a.audioOutput,b.audioOutput,'mediaFrames')/(b.audioOutput?.sampleRate||48000))-record.advance)*1000,
          start:a.audioOutput,end:b.audioOutput};
        record.mpv={start:a.mpv,end:b.mpv};
      }else{
        record.nativeVideo={frames:getDelta(a.video,b.video,'total'),dropped:getDelta(a.video,b.video,'dropped'),start:a.video,end:b.video};
        record.nativeAV={mediaClockWallDriftMs:(record.advance-elapsed)*1000,audioOutput:'browser-owned; separate audio clock/skew not exposed by this harness'};
      }
      record.startState=stateSummary(a);record.endState=stateSummary(b);
      record.presenter=db.presenter??null;
      const nativeProperties=record.mediaEvents.filter(event=>event.event==='playerPropertiesChanged').flatMap(event=>event.data.properties??[]);
      const nativeProperty=name=>nativeProperties.find(property=>property.name===name)?.value??null;
      record.nativeDecoderEvidence={name:nativeProperty('kVideoDecoderName'),platform:nativeProperty('kIsPlatformVideoDecoder'),
        audioName:nativeProperty('kAudioDecoderName')};
      record.avSync={mediaPositionAdvanceSeconds:record.advance,audioWorkletConsumedSeconds:hybrid?record.audioWorklet.mediaFrames/(b.audioOutput?.sampleRate||48000):null,
        measuredAudioVideoAdvanceDriftMs:hybrid?record.audioWorklet.mediaVsVideoDriftMs:null,
        nativeBrowserAvaSyncSkew:'not observable from public HTMLMediaElement API'};
      record.browserErrors=[...new Set(record.browserErrors)];
      const routeOK=arm.expected==='native'?String(record.route).startsWith('native'):record.route==='hybrid'&&record.decoder==='webcodecs';
      const cadenceOK=Math.abs(record.advance-elapsed)<1&&(!hybrid||record.webCodecs.submitted>=elapsed*minimumAcceptedFps&&record.webCodecs.draws>=elapsed*minimumAcceptedFps&&record.audioWorklet.underruns===0&&Math.abs(record.audioWorklet.mediaVsVideoDriftMs)<250)&&
        (hybrid||record.nativeVideo.frames>=elapsed*minimumAcceptedFps);
      record.status=routeOK&&cadenceOK&&record.browserErrors.length===0?'accepted':'rejected';
      if(!routeOK)record.rejection='route mismatch';
      else if(!cadenceOK)record.rejection='cadence/audio continuity gate failed';
      else if(record.browserErrors.length)record.rejection='browser errors';
      if(['D','E','F','G'].includes(id)&&(record.presenter?.kind!=='webgpu-external-texture'||record.presenter?.errors?.length)){
        record.status='rejected';record.rejection='external texture presenter missing or GPU error';
      }
      if(process.env.SCREENSHOTS==='1')await page.screenshot({path:path.join(out,`round-${round+1}-${id}.png`)});
      if(process.env.NATIVE_SAMPLE==='1'){
        // Separate diagnostic phase, after the CPU window; sampler overhead is excluded above.
        await save();
        await page.evaluate(async()=>{await api.pause();await api.seek(4);await api.resume();});
        await page.waitForTimeout(1500);
        const targets=['browser','renderer','gpu'].map(role=>record.cpu.details.filter(p=>p.role===role).sort((a,b)=>b.oneCorePercent-a.oneCorePercent)[0]).filter(Boolean);
        record.nativeSamples=await Promise.all(targets.map(async p=>{
          const file=path.join(out,`sample-r${round+1}-${id}-${p.role}-${p.id}.txt`);
          try{const r=await execFileAsync('/usr/bin/sample',[String(p.id),'5','5','-file',file],{timeout:45000,maxBuffer:1024*1024});
            return {pid:p.id,role:p.role,file,stderr:r.stderr};
          }catch(error){return {pid:p.id,role:p.role,file,error:String(error),stderr:error.stderr};}
        }));
      }
      await page.evaluate(()=>api.stop());
      await context.close();context=null;
      record.finishedAt=new Date().toISOString();await save();
      console.log(`${family} round=${round+1} arm=${id} status=${record.status} route=${record.route} whole=${record.cpu?.whole?.toFixed(1)}%`);
    }catch(error){
      record.status='failed';record.error=String(error.stack??error);
      record.failureState=await page?.evaluate(()=>api.snapshot()).catch(()=>null);
      record.finishedAt=new Date().toISOString();await save();
      console.log(`${family} round=${round+1} arm=${id} status=failed ${record.error.split('\n')[0]}`);
    }finally{
      await context?.close().catch(()=>{});
      await browser?.close().catch(()=>{});
    }
  }
}finally{
  await server.close();await save();
}
