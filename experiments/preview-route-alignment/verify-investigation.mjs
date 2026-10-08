// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory=process.argv[2],run=JSON.parse(await readFile(directory+'/run.json','utf8'));
const summary={browser:run.browser,version:run.version,kind:run.kind,cases:[]};
for(const result of run.results){
 assert.deepEqual(result.pageErrors,[]);
 if(run.kind==='decoder'){
  assert.equal(result.status,'pass');assert.equal(result.outputs,4000);assert.deepEqual(result.errors,[]);
  summary.cases.push({id:result.config.id,outputs:result.outputs,duration:result.duration});
 }else{
  const experimental=result.config.override,last=result.samples.at(-1),stats=last.diagnostics.remux.stats;
  assert.equal(result.buffering.effective.forwardLimitBytes,(experimental?64:12)*1024*1024);
  if(experimental){assert.equal(result.playbackStatus??result.status,'pass');assert.ok(result.finalTime>23);assert.deepEqual(result.errors,[]);assert.ok(stats.peakBufferedBytesUpperBound<=72*1024*1024);}
  else{assert.equal(result.status,'fail');assert.ok(result.finalTime<2.1);assert.ok(result.errors.some(e=>e.code==='DECODE_FAILED'&&e.message.includes('coded-data budget')));}
  summary.cases.push({id:result.config.id,expectedPlayback:experimental?'pass':'budget failure',finalTime:result.finalTime,peakCodedBytes:stats.peakBufferedBytesUpperBound,preview:result.preview,pausedPreview:result.pausedPreview,combinedStatus:result.status});
 }
}
if(run.kind==='remux'&&run.results.some(r=>r.config.override))summary.experimentalPolicySha256=createHash('sha256').update(await readFile(directory+'/experimental-buffering-policy.js')).digest('hex');
await writeFile(directory+'/investigation-verified.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
