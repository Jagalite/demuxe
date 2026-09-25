// SPDX-License-Identifier: Apache-2.0
// Frozen-fixture Native/Hybrid/no-draw attribution. Research only.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'../..');
const root=path.resolve('build/unsupported-audio-cpu-20260924');
const assets=path.resolve('build/hybrid-gap/assets');
const out=path.resolve(process.env.RESULTS??`results/hybrid-gap/run-${new Date().toISOString().replaceAll(':','-')}`);
const manifest=JSON.parse(await fs.readFile(path.join(root,'fixtures.json'),'utf8'));
const family='h264-1080p60';
const rounds=Number(process.env.ROUNDS??5),warmup=Number(process.env.WARMUP??4),seconds=Number(process.env.SECONDS??20);
const startRound=Number(process.env.START_ROUND??0);
const preflight=process.env.PREFLIGHT==='1';
const arms=[
  {id:'A',label:'Native AAC',file:`${family}-aac.mkv`,lane:'auto',expected:'native'},
  {id:'B',label:'Forced Hybrid AAC',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
  {id:'C',label:'Forced Hybrid AAC no-draw',file:`${family}-aac.mkv`,lane:'hybrid',expected:'hybrid'},
];
const videoRate=manifest.fixtures.find(f=>f.file===arms[0].file).video.avgFrameRate.split('/').map(Number);
const minimumAcceptedFps=videoRate[0]/videoRate[1]*.9;
const permutations=[['A','B','C'],['B','C','A'],['C','A','B'],['C','B','A'],['A','C','B'],['B','A','C']];
const orders=Array.from({length:rounds},(_,i)=>permutations[i%permutations.length]);
const byId=Object.fromEntries(arms.map(arm=>[arm.id,arm]));
const stateSummary=state=>({position:state.position,duration:state.duration,route:state.route,decoder:state.diagnostics?.backend?.decoder,
  diagnostics:state.diagnostics?.backend??null,video:state.video,selectedAudioTrack:state.selectedAudioTrack,
  mediaTracks:state.mediaTracks,audioParams:state.audioParams,audio:state.audioOutput,mpv:state.mpv});
const resultName=`${family}-result.json`;
const save=async()=>{const temporary=path.join(out,`${resultName}.${process.pid}.tmp`);await fs.writeFile(temporary,JSON.stringify(result,null,2)+'\n');await fs.rename(temporary,path.join(out,resultName));};

await fs.mkdir(out,{recursive:true});
for(const arm of arms)if(!manifest.fixtures.some(f=>f.file===arm.file))throw Error(`Fixture missing from manifest: ${arm.file}`);
const fixtureMeta=Object.fromEntries(manifest.fixtures.map(f=>[f.file,f]));
let result={schema:1,family,createdAt:new Date().toISOString(),preflight,host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},
  runtime:manifest.runtime,protocol:{rounds,warmupSeconds:warmup,windowSeconds:seconds,channel:'chrome',headed:true,
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
await fs.writeFile(adapterPath,adapter.replace('if(c.componentTrial)window.componentPlayer=player;','window.__cpuPlayer=player;'));

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
      context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
      page=await context.newPage();
      record.browserErrors=[];
      page.on('pageerror',error=>record.browserErrors.push(String(error)));
      page.on('console',message=>{if(message.type()==='error'&&record.browserErrors.length<50)record.browserErrors.push(`console: ${message.text()}`);});
      await page.goto(server.origin+'/harness/harness.html');
      await page.waitForFunction(()=>window.api);
      await page.evaluate(noDraw=>{globalThis.__hybridGapNoDraw=noDraw;},id==='C');
      const config={id:`hybrid-gap.${family}.${arm.id}.r${round+1}`,player:'demuxe',lane:arm.lane,file:arm.file};
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
        return {...state,audioOutput:backend?.audioDiagnostics?.()??null,mpv};
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
        return {label,monotonicMs:performance.now(),wall:Date.now(),processes,...(includeState?{state}:{})};
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
        record.webCodecs.visibleCanvasDraws=id==='C'?0:record.webCodecs.draws;
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
