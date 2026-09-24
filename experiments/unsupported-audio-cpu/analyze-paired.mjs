// SPDX-License-Identifier: Apache-2.0
// Paired Hybrid AAC versus one unsupported-audio variant. Research only.
import fs from 'node:fs/promises';
import path from 'node:path';

const input=process.argv[2];
if(!input)throw Error('Usage: node analyze-paired.mjs <paired-result.json>');
const data=JSON.parse(await fs.readFile(path.resolve(input),'utf8'));
const accepted=data.trials.filter(trial=>trial.status==='accepted');
const median=values=>{
  const sorted=values.filter(Number.isFinite).toSorted((a,b)=>a-b);
  if(!sorted.length)return null;
  const middle=sorted.length>>1;
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
};
const stats=values=>{
  const valid=values.filter(Number.isFinite),mean=valid.reduce((sum,value)=>sum+value,0)/(valid.length||1);
  return {n:valid.length,median:median(valid),mean,min:valid.length?Math.min(...valid):null,max:valid.length?Math.max(...valid):null};
};
const byArm=Object.fromEntries(['B','C'].map(arm=>[arm,new Map(accepted.filter(t=>t.arm===arm).map(t=>[t.round,t]))]));
const pairs=[];
for(const round of [...byArm.B.keys()].filter(round=>byArm.C.has(round)).sort((a,b)=>a-b)){
  const aac=byArm.B.get(round),variant=byArm.C.get(round),difference=variant.cpu.whole-aac.cpu.whole;
  pairs.push({round,aacWholeCorePercent:aac.cpu.whole,variantWholeCorePercent:variant.cpu.whole,
    differenceCorePercentagePoints:difference,relativeDifferencePercent:100*difference/aac.cpu.whole,
    audioServiceDifferenceCorePercentagePoints:variant.cpu.roles.audioService-aac.cpu.roles.audioService});
}
const positives=pairs.filter(pair=>pair.differenceCorePercentagePoints>0).length;
const negatives=pairs.filter(pair=>pair.differenceCorePercentagePoints<0).length;
const n=positives+negatives,k=Math.min(positives,negatives);
const choose=(m,r)=>{let value=1;for(let i=1;i<=r;i++)value=value*(m-r+i)/i;return value;};
let tail=0;for(let i=0;i<=k;i++)tail+=choose(n,i);
const summary={family:data.family,audioVariant:data.audioVariant,protocol:data.protocol,
  acceptedCount:accepted.length,totalCount:data.trials.length,
  perArm:Object.fromEntries(['B','C'].map(arm=>{
    const trials=accepted.filter(t=>t.arm===arm);
    return [arm,{label:trials[0]?.label,count:trials.length,
      wholeCorePercent:stats(trials.map(t=>t.cpu.whole)),
      rendererCorePercent:stats(trials.map(t=>t.cpu.roles.renderer)),
      gpuCorePercent:stats(trials.map(t=>t.cpu.roles.gpu)),
      audioServiceCorePercent:stats(trials.map(t=>t.cpu.roles.audioService))}];
  })),
  paired:{differenceCorePercentagePoints:stats(pairs.map(pair=>pair.differenceCorePercentagePoints)),
    relativeDifferencePercent:stats(pairs.map(pair=>pair.relativeDifferencePercent)),positiveRounds:positives,negativeRounds:negatives,
    exactTwoSidedSignTestP:n?Math.min(1,2*tail/2**n):null,pairs}};
const output=process.env.OUT??path.join(path.dirname(path.resolve(input)),`${data.family}-${data.audioVariant}-paired-analysis.json`);
await fs.writeFile(output,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
