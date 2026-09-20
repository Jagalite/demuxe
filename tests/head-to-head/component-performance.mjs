// SPDX-License-Identifier: Apache-2.0
// Whole-player paired comparison, gated by matching headed marked-output correctness.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {serve} from './server.mjs';
const [baseArg,candidateArg,baseProofArg,candidateProofArg,outArg,exclusive]=process.argv.slice(2);
assert.equal(exclusive,'--exclusive','Run with no concurrent builds/tests/benchmarks; pass --exclusive');
const out=path.resolve(outArg),sha=b=>createHash('sha256').update(b).digest('hex');
const variants=[];
for(const [label,arg,proofArg] of [['baseline',baseArg,baseProofArg],['candidate',candidateArg,candidateProofArg]]){
 execFileSync(process.execPath,[path.join(import.meta.dirname,'verify.mjs'),proofArg],{stdio:'pipe'});
 const assets=path.resolve(arg),bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes),proof=JSON.parse(await fs.readFile(path.join(proofArg,'summary.json')));
 assert.equal(proof.assetsSHA256,sha(bytes));assert.match(proof.browserIdentity,/headed$/);
 assert.equal(proof.cases.find(c=>c.id==='demuxe.auto.h264-vtt')?.status,'passed');
 for(const [name,value] of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
 // Preserve the exact correctness observer that established output equivalence.
 assert.equal(sha(await fs.readFile(path.join(import.meta.dirname,'adapters.mjs'))),sha(await fs.readFile(path.join(proofArg,'files/harness/adapters.mjs'))));
 variants.push({label,assets,manifest,bytes,proof,proofArg});
}
for(const name of ['fixtures/h264-vtt/index.mp4','fixtures/captions.vtt'])assert.equal(variants[0].manifest.files[name].sha256,variants[1].manifest.files[name].sha256);
assert.equal(variants[0].proof.browserIdentity,variants[1].proof.browserIdentity);
await fs.mkdir(out,{recursive:false});await fs.mkdir(path.join(out,'files'),{recursive:true});
for(const name of ['component-performance.mjs','server.mjs','harness.html','adapters.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
for(const v of variants){await fs.writeFile(path.join(out,v.label+'-assets.json'),v.bytes);await fs.cp(v.proofArg,path.join(out,v.label+'-correctness'),{recursive:true});}
const result={command:process.argv,startedAt:new Date().toISOString(),browser:variants[0].proof.browserIdentity,rounds:[],limits:[
 'One shared Chrome/macOS host, 36s synthetic stereo file. Three alternating pairs; OS caches are not flushed. Background user workloads are recorded and not stopped; results are exploratory, not isolated-host qualification.',
 'CPU covers CDP-listed Chrome processes, excluding external media services/server; summed RSS may double count shared pages.',
 'Main-thread TaskDuration/ScriptDuration are CDP renderer metrics, not worker or Wasm CPU attribution.',
 'Total bytes copied and isolated Wasm/mpv CPU time are not exposed; null means unavailable, never zero.',
 'Startup ends at API play plus 0.5s media progression, not first physical sound/photon. No intrusive audio analysis during performance.'
]};
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser,server;
try{
 for(let round=1;round<=3;round++)for(const v of round%2?variants:[...variants].reverse()){
  server=await serve(v.assets,path.join(out,'files'),path.join(out,`${round}-${v.label}-requests.jsonl`));
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
  assert.ok(result.browser.includes('/'+browser.version()+'/'));
  const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
  const cdp=await browser.newBrowserCDPSession(),renderer=await page.context().newCDPSession(page);await renderer.send('Performance.enable');
  const sample=async()=>{
   const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const rssKiB=execFileSync('ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).reduce((a,x)=>a+Number(x),0);
   const metrics=Object.fromEntries((await renderer.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
   const state=await page.evaluate(()=>api.snapshot());assert.ok(state.visible&&state.focused);assert.equal(state.errors.length,0);
   return {at:performance.now(),processes,rssKiB,metrics,state,workers:page.workers().map(w=>w.url())};
  };
  const cpu=(a,b)=>{const old=new Map(a.processes.map(p=>[p.id,p.cpuTime]));assert.ok(a.processes.every(p=>b.processes.some(q=>p.id===q.id)),'CPU sample lost a process');return b.processes.reduce((sum,p)=>sum+p.cpuTime-(old.get(p.id)??0),0);};
  const config=JSON.parse(await fs.readFile(path.join(v.assets,'fixtures/catalogue.json')))['h264-vtt'];
  const entry={round,variant:v.label,samples:[],hostProcesses:execFileSync('ps',['-axo','pid,pcpu,comm'],{encoding:'utf8'})};result.rounds.push(entry);
  entry.start=await sample();const start=performance.now();
  await page.evaluate(c=>api.start(c),{...config,id:'demuxe.auto.h264-vtt',player:'demuxe',lane:'auto',correctness:false});
  await page.waitForFunction(()=>api.snapshot().position>.5);entry.open=await sample();
  entry.startupWallMs=performance.now()-start;entry.startupCPUSeconds=cpu(entry.start,entry.open);
  assert.equal(entry.open.state.route,v.label==='candidate'?'native-direct':'hybrid');
  await delay(5000);
  for(let t=0;t<=20;t+=2){entry.samples.push(await sample());if(t<20)await delay(2000);}
  const first=entry.samples[0],last=entry.samples.at(-1),wall=(last.at-first.at)/1000;
  assert.ok(entry.samples.every(s=>s.processes.map(p=>p.id).sort().join(',')===first.processes.map(p=>p.id).sort().join(',')),'Steady CPU process turnover');
  assert.ok(Math.abs(last.state.position-first.state.position-wall)<1,'Steady playback stalled');
  const rendered=s=>s.state.video?.total??s.state.diagnostics?.backend?.rendered;
  assert.ok(rendered(last)-rendered(first)>wall*25,'Too few presented frames');
  if(first.state.video)assert.ok(last.state.video.dropped-first.state.video.dropped<=Math.max(2,wall*30*.01),'Excess dropped Native frames');
  const a=first.state.diagnostics.backend,b=last.state.diagnostics.backend;
  entry.observedWork={wasmHeapBytes:b.heapBytes??0,enginePumpTicks:a.pumpTicks===undefined?0:b.pumpTicks-a.pumpTicks,subtitleBitmapBytes:a.subtitles?b.subtitles.bytes-a.subtitles.bytes:0,subtitleBitmapBytesAtStartup:entry.open.state.diagnostics.backend.subtitles?.bytes??0,ownedCompressedPacketBytes:a.decoderStats?b.decoderStats.ownedPacketBytes-a.decoderStats.ownedPacketBytes:0,sharedPacketInputs:a.decoderStats?b.decoderStats.sharedPacketInputs-a.decoderStats.sharedPacketInputs:0,scope:'Demuxe-owned counters only. Browser internal copies/allocations remain opaque.'};
  entry.steady={wallSeconds:wall,cpuSeconds:cpu(first,last),oneCorePercent:100*cpu(first,last)/wall,peakSummedRssKiB:Math.max(...entry.samples.map(s=>s.rssKiB)),mainThreadTaskSeconds:last.metrics.TaskDuration-first.metrics.TaskDuration,mainThreadScriptSeconds:last.metrics.ScriptDuration-first.metrics.ScriptDuration,bytesCopied:null,wasmCPUSeconds:null};
  entry.seeks=[];
  for(const target of [10,1,35.4]){const before=await sample(),began=performance.now();await page.evaluate(t=>api.seek(t),target);const after=await sample();entry.seeks.push({target,wallMs:performance.now()-began,cpuSeconds:cpu(before,after),state:after.state});}
  await page.waitForFunction(()=>api.snapshot().position>35.8);await delay(1200);entry.eof=await sample();
  entry.cleanup=await page.evaluate(()=>api.stop());assert.equal(entry.cleanup.remainingSurfaces,0);await delay(400);assert.equal(page.workers().length,0);
  entry.passed=true;await save();console.log(JSON.stringify({round,variant:v.label,startupWallMs:entry.startupWallMs,...entry.steady}));
  await browser.close();browser=null;await server.close();server=null;
 }
 const metrics=['startupWallMs','startupCPUSeconds','oneCorePercent','peakSummedRssKiB','mainThreadTaskSeconds','mainThreadScriptSeconds'];
 result.pairs=Array.from({length:3},(_,i)=>{const base=result.rounds.find(r=>r.round===i+1&&r.variant==='baseline'),candidate=result.rounds.find(r=>r.round===i+1&&r.variant==='candidate');return {round:i+1,metrics:Object.fromEntries(metrics.map(k=>{const b=base[k]??base.steady[k],c=candidate[k]??candidate.steady[k];return [k,{baseline:b,candidate:c,deltaPercent:100*(c-b)/b}];}))};});
 result.passed=true;
}catch(e){result.passed=false;result.error=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await server?.close();result.finishedAt=new Date().toISOString();await save();const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');}
console.log(JSON.stringify({passed:result.passed,error:result.error,output:out}));
