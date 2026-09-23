// SPDX-License-Identifier: Apache-2.0
// Read-only summary of a completed, correctness-gated head-to-head CPU campaign.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const directory=process.argv[2];assert.ok(directory,'Pass a completed campaign directory');
const summary=JSON.parse(await readFile(path.join(directory,'summary.json')));
assert.equal(summary.kind,'performance');assert.equal(summary.passed,true,'Incomplete or failed campaign');
const groups=new Map();
for(const entry of summary.cases){
  assert.equal(entry.status,'passed',entry.id+' round '+entry.round);
  const record=JSON.parse(await readFile(path.join(directory,entry.recordPath)));
  const first=record.samples[0]?.state?.diagnostics?.backend,last=record.samples.at(-1)?.state?.diagnostics?.backend;
  const before=new Map(record.samples[0].processes.map(p=>[p.id,p]));
  const processCpuSeconds={};for(const p of record.samples.at(-1).processes){const old=before.get(p.id);assert.ok(old,'Process membership changed');
    processCpuSeconds[p.type]=(processCpuSeconds[p.type]??0)+p.cpuTime-old.cpuTime;
  }
  const data={round:entry.round,cpu:record.measurement.oneCorePercent,frames:record.measurement.quality?.presentedFrames,
    expected:record.measurement.quality?.expectedFrames,route:record.samples.at(-1)?.state?.route,
    processCpuSeconds,
    renderMs:first?.renderMs!==undefined&&last?.renderMs!==undefined?last.renderMs-first.renderMs:null,
    copyMs:first?.copyMs!==undefined&&last?.copyMs!==undefined?last.copyMs-first.copyMs:null,
    pumpTicks:first?.pumpTicks!==undefined&&last?.pumpTicks!==undefined?last.pumpTicks-first.pumpTicks:null};
  if(!groups.has(entry.id))groups.set(entry.id,[]);groups.get(entry.id).push(data);
}
for(const [id,rounds] of groups){
  assert.equal(rounds.length,3,id+' needs three rounds');
  const median=rounds.map(x=>x.cpu).sort((a,b)=>a-b)[1];
  console.log(JSON.stringify({id,medianCpu:median,rounds}));
}
