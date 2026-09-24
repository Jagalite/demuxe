// SPDX-License-Identifier: Apache-2.0
// Descriptive paired summaries; no production behavior is involved.
import fs from 'node:fs/promises';
import path from 'node:path';

const input=process.argv[2];
if(!input)throw Error('Usage: node analyze.mjs <three-arm-result.json>');
const data=JSON.parse(await fs.readFile(path.resolve(input),'utf8'));
const accepted=data.trials.filter(trial=>trial.status==='accepted');
const median=values=>{
  const sorted=values.filter(Number.isFinite).toSorted((a,b)=>a-b);
  if(!sorted.length)return null;
  const mid=sorted.length>>1;
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
};
const stats=values=>{
  const valid=values.filter(Number.isFinite),avg=valid.reduce((sum,value)=>sum+value,0)/(valid.length||1);
  const sd=valid.length>1?Math.sqrt(valid.reduce((sum,value)=>sum+(value-avg)**2,0)/(valid.length-1)):0;
  return {n:valid.length,mean:avg,median:median(valid),sd,min:valid.length?Math.min(...valid):null,max:valid.length?Math.max(...valid):null};
};
const nested=(value,keys)=>keys.reduce((current,key)=>current?.[key],value);
const optionalDelta=(trial,keys)=>{
  const before=nested(trial.startState?.diagnostics,keys),after=nested(trial.endState?.diagnostics,keys);
  return Number.isFinite(before)&&Number.isFinite(after)?after-before:null;
};
const arms=['A','B','C'];
const perArm={};
for(const arm of arms){
  const trials=accepted.filter(trial=>trial.arm===arm);
  const roleStats=Object.fromEntries(['browser','renderer','gpu','audioService','other'].map(role=>
    [role,stats(trials.map(trial=>trial.cpu.roles[role]))]));
  perArm[arm]={count:trials.length,statuses:data.trials.filter(trial=>trial.arm===arm).map(trial=>trial.status),
    routeCounts:Object.fromEntries([...new Set(trials.map(trial=>trial.route))].map(route=>[route,trials.filter(trial=>trial.route===route).length])),
    cpu:{whole:stats(trials.map(trial=>trial.cpu.whole)),...roleStats}};
  if(arm!=='A'){
    const hybrid=trials;
    perArm[arm].webCodecs={submitted:stats(hybrid.map(t=>t.webCodecs.submitted)),outputs:stats(hybrid.map(t=>t.webCodecs.outputs)),
      draws:stats(hybrid.map(t=>t.webCodecs.draws)),outputDrawCountDifference:stats(hybrid.map(t=>t.webCodecs.outputDrawCountDifference??t.webCodecs.droppedEstimate)),
      missingFrameEvents:stats(hybrid.map(t=>optionalDelta(t,['presentation','missing']))),errors:stats(hybrid.map(t=>t.webCodecs.errors)),
      packetBytes:stats(hybrid.map(t=>optionalDelta(t,['decoderStats','packetBytes']))),sharedPacketInputs:stats(hybrid.map(t=>optionalDelta(t,['decoderStats','sharedPacketInputs']))),
      sharedPacketFallbacks:stats(hybrid.map(t=>optionalDelta(t,['decoderStats','sharedPacketFallbacks']))),transferredFrames:stats(hybrid.map(t=>optionalDelta(t,['decoderStats','transferredFrames']))),
      decoderCopyMs:stats(hybrid.map(t=>t.webCodecs.decoderCopyMs)),
      synchronousDrawMs:stats(hybrid.map(t=>optionalDelta(t,['presentation','costs','drawMs']))),
      synchronousSelectMs:stats(hybrid.map(t=>optionalDelta(t,['presentation','costs','selectMs']))),
      synchronousReceiveMs:stats(hybrid.map(t=>optionalDelta(t,['presentation','costs','receiveMs']))),
      peakRetained:stats(hybrid.map(t=>t.webCodecs.peakRetained)),peakPending:stats(hybrid.map(t=>t.webCodecs.peakPending)),
      decoderBackend:[...new Set(hybrid.map(t=>t.webCodecs.decoderBackend??t.endState.diagnostics.decoderStats.decoderBackend))],
      codec:[...new Set(hybrid.map(t=>t.webCodecs.codec??t.endState.diagnostics.decoderStats.codec))],
      pixelFormat:[...new Set(hybrid.map(t=>t.webCodecs.pixelFormat??t.endState.diagnostics.decoderStats.pixelFormat))],
      hardwareAcceleration:[...new Set(hybrid.map(t=>t.webCodecs.hardwareAcceleration??t.endState.diagnostics.decoderStats.supportCheck?.recognized?.hardwareAcceleration))]};
    perArm[arm].audioWorklet={mediaFrames:stats(hybrid.map(t=>t.audioWorklet.mediaFrames)),estimatedPcmBytes:stats(hybrid.map(t=>t.audioWorklet.estimatedPcmBytes)),
      underruns:stats(hybrid.map(t=>t.audioWorklet.underruns)),mediaVsVideoDriftMs:stats(hybrid.map(t=>t.audioWorklet.mediaVsVideoDriftMs))};
    perArm[arm].mpv={audioCodecs:[...new Set(hybrid.map(t=>t.endState.mpv?.['audio-codec-name']??null))],
      audioParams:[...new Set(hybrid.map(t=>JSON.stringify(t.endState.mpv?.['audio-params']??null)))].map(JSON.parse),
      audioOutputParams:[...new Set(hybrid.map(t=>JSON.stringify(t.endState.mpv?.['audio-out-params']??null)))].map(JSON.parse),
      af:[...new Set(hybrid.map(t=>JSON.stringify(t.endState.mpv?.af??null)))].map(JSON.parse),
      avsync:stats(hybrid.map(t=>Number(t.endState.mpv?.avsync)))};
  }
}
const byRound=arm=>new Map(accepted.filter(trial=>trial.arm===arm).map(trial=>[trial.round,trial]));
const pairs=[];
for(const round of [...new Set(accepted.map(trial=>trial.round))].sort((a,b)=>a-b)){
  const a=byRound('A').get(round),b=byRound('B').get(round),c=byRound('C').get(round);
  if(!a||!b||!c)continue;
  pairs.push({round,a:a.cpu.whole,b:b.cpu.whole,c:c.cpu.whole,
    hybridTaxPp:b.cpu.whole-a.cpu.whole,hybridTaxRelativePercent:100*(b.cpu.whole-a.cpu.whole)/a.cpu.whole,
    ac3TaxPp:c.cpu.whole-b.cpu.whole,ac3TaxRelativePercent:100*(c.cpu.whole-b.cpu.whole)/b.cpu.whole,
    roleDiffs:{browser:b.cpu.roles.browser-a.cpu.roles.browser,renderer:b.cpu.roles.renderer-a.cpu.roles.renderer,
      gpu:b.cpu.roles.gpu-a.cpu.roles.gpu,audioService:b.cpu.roles.audioService-a.cpu.roles.audioService},
    audioRoleDiff:{ac3MinusAac:c.cpu.roles.audioService-b.cpu.roles.audioService}});
}
const paired={hybridTaxPp:stats(pairs.map(p=>p.hybridTaxPp)),hybridTaxRelativePercent:stats(pairs.map(p=>p.hybridTaxRelativePercent)),
  ac3TaxPp:stats(pairs.map(p=>p.ac3TaxPp)),ac3TaxRelativePercent:stats(pairs.map(p=>p.ac3TaxRelativePercent)),
  positiveHybridTax:pairs.filter(p=>p.hybridTaxPp>0).length,positiveAc3Tax:pairs.filter(p=>p.ac3TaxPp>0).length};
const summary={family:data.family,protocol:data.protocol,acceptedCount:accepted.length,totalCount:data.trials.length,perArm,paired,pairs};
const out=process.env.OUT??path.join(path.dirname(path.resolve(input)),`${data.family}-analysis.json`);
await fs.writeFile(out,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
