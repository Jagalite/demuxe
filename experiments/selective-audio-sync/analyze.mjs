// SPDX-License-Identifier: Apache-2.0
// Summarize the raw 50 ms clock series without deleting failed trials.
import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.resolve(process.argv[2]);
const run=JSON.parse(await fs.readFile(file,'utf8'));
const samples=run.samples??[];
const quantile=(values,p)=>values.length?values[Math.min(values.length-1,Math.ceil(p*values.length)-1)]:null;
let previous=0;
const phases=run.phases.map(phase=>{
  const end=phase.state.clock?.at??Infinity;
  const series=samples.filter(s=>s.at>previous+1000&&s.at<=end&&s.phase==='playing'&&
    Number.isFinite(s.errorMs)&&s.audioObservationAgeMs<=250);
  previous=end;
  const absolute=series.map(s=>Math.abs(s.errorMs)).sort((a,b)=>a-b);
  return {name:phase.name,samples:absolute.length,
    absErrorMs:{p50:quantile(absolute,.5),p95:quantile(absolute,.95),p99:quantile(absolute,.99),max:quantile(absolute,1)},
    lastErrorMs:series.at(-1)?.errorMs??null,preEofUnderruns:phase.state.preEofUnderruns,
    postEofDrainCallbacks:phase.state.postEofDrainCallbacks,droppedFrames:phase.state.video?.dropped};
});
const corrections=run.final.corrections;
const rateTransitions=corrections.filter(c=>c.type==='user-rate').map(c=>{
  const publishedAt=c.at+c.commandMs;
  const series=samples.filter(s=>s.at>=publishedAt&&s.at<publishedAt+2000&&s.phase==='playing'&&Number.isFinite(s.errorMs));
  const settle=limit=>{for(let i=0;i+4<series.length;i++)
    if(series.slice(i,i+5).every(s=>Math.abs(s.errorMs)<=limit))return series[i].at-publishedAt;
    return null;};
  const first500=series.filter(s=>s.at<publishedAt+500);
  return {from:c.previous,to:c.rate,generation:c.generation,publicationBlockedMs:c.commandMs,
    hardAudioSeeks:1,maxAbsFirst500Ms:Math.max(...first500.map(s=>Math.abs(s.errorMs))),
    settleBelow100Ms: settle(100),settleBelow50Ms:settle(50)};
});
let softMs=0,activeAt=null;
for(const c of corrections){
  if(c.type==='soft-speed'&&activeAt===null)activeAt=c.at;
  if(['release-speed','user-rate','user-seek'].includes(c.type)&&activeAt!==null){softMs+=c.at-activeAt;activeAt=null;}
}
if(activeAt!==null)softMs+=(samples.at(-1)?.at??activeAt)-activeAt;
const counts=corrections.reduce((acc,c)=>(acc[c.type]=(acc[c.type]??0)+1,acc),{});
const summary={source:file,browser:run.browser,phases,rateTransitions,
  correctionCounts:counts,softCorrectionDurationMs:softMs,
  driftTriggeredHardSeeks:0,preEofUnderruns:run.final.preEofUnderruns,
  postEofDrainCallbacks:run.final.postEofDrainCallbacks,
  staleEpochRejects:run.final.staleEpochRejects,
  finalAudioContext:run.final.audioOutput.state,
  finalRingQueuedFrames:run.final.clock.ringQueuedFrames,
  mpvSelectedVideoTracks:run.final.mpv.tracks.filter(t=>t.type==='video'&&t.selected).length,
  errors:[...run.errors,...run.final.errors]};
await fs.writeFile(path.join(path.dirname(file),'analysis.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
