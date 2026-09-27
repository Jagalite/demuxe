// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {summarizeCpu} from './head-to-head/benchmark-browser.mjs';
const root=path.resolve(process.argv[2]),hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(path.join(root,'result.json')),report=JSON.parse(bytes);
const selected=process.argv[3],runtimes=process.argv[4]?.split(',')??['pthread','jspi','asyncify'];
assert.ok(runtimes.length>0&&new Set(runtimes).size===runtimes.length&&runtimes.every(r=>['pthread','jspi','asyncify'].includes(r)));
if(selected)assert.ok(['m0-long.mkv','pcm-long.mkv'].includes(selected));else assert.equal(report.passed,true);
const rows=report.rows.filter(r=>!selected||r.file===selected);assert.ok(rows.length>0);
const cases=report.cases.filter(r=>rows.some(row=>row.file===r.file)&&runtimes.includes(r.name));
assert.equal(cases.length,rows.length*runtimes.length*3);
assert.equal(report.assetsSHA256,hash(await fs.readFile(path.join(root,'assets-manifest.json'))));
const blocks=report.blocks.filter(b=>rows.some(r=>r.file===b.id));assert.equal(blocks.length,rows.length);
for(const block of blocks){
 assert.equal(block.status,'complete');assert.equal(block.browserLaunch.startupReadiness.status,'complete');
 assert.equal(block.browserLaunch.startupReadiness.traceStopped,true);
 assert.deepEqual(block.browserExit.remainingProcessIDs,[]);
}
for(const row of cases){
 assert.equal(row.passed,true);assert.deepEqual(row.cpu,summarizeCpu(row.samples));
 assert.ok(row.cpu.processIdsStable);assert.ok(row.cpu.wallSeconds>=19.9);
 assert.deepEqual(row.errors,[]);
 // Worker termination alone cannot prove native teardown acknowledged close.
 if(row.name!=='pthread'){
  const closes=[row.cleanup.subtitles?.cleanup,row.cleanup.audio?.cleanup].filter(Boolean);
  assert.equal(closes.length,1);
  assert.ok(!row.cleanup.subtitles?.closeError);
  for(const close of closes){assert.ok(!close.error);assert.equal(close.live,0);assert.equal(close.scheduler.liveTasks,0);assert.equal(close.scheduler.retainedTasks,0);assert.equal(close.source.handles,0);assert.equal(close.source.pending,0);}
 }
}
for(const file of rows.map(r=>r.file))for(const name of runtimes){
 const rows=report.cases.filter(r=>r.file===file&&r.name===name);
 assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.round).sort(),[1,2,3]);
 const values=rows.map(r=>r.cpu.oneCorePercent).sort((a,b)=>a-b);
 assert.equal(report.rows.find(r=>r.file===file).results.find(r=>r.runtime===name).medianOneCorePercent,values[1]);
}
const environmentBytes=await fs.readFile(path.join(root,'environment.json'));
const result={passed:true,cases:cases.length,rows:rows.map(r=>r.file),runtimes,archivePassed:report.passed,excludedCases:report.cases.length-cases.length,environment:JSON.parse(environmentBytes),environmentSHA256:hash(environmentBytes),reportSHA256:hash(bytes),harnessSHA256:hash(await fs.readFile(path.join(root,'harness.mjs'))),verifierSHA256:hash(await fs.readFile(import.meta.filename)),assetsSHA256:report.assetsSHA256,scope:'Matched CPU aggregates, completed startup gates, process retirement and acknowledged native service teardown'};
await fs.copyFile(import.meta.filename,path.join(root,'verifier.mjs'));
await fs.writeFile(path.join(root,selected?'verification-'+selected+'.json':'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
