// SPDX-License-Identifier: Apache-2.0
// Qualify Apple's WebKit port against the exact installed release archive.
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {installLiveRuntime} from './api-stability/live-runtime.mjs';
import {liveBoundaryCases} from './api-stability/live-boundary-scenarios.mjs';
import {liveNetworkCases} from './api-stability/live-network-scenarios.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const out='results/webkit-release';await mkdir(out,{recursive:true});
assert.ok(process.env.BETA_ARCHIVE,'BETA_ARCHIVE is required');
const runtime=await installLiveRuntime(process.env.BETA_ARCHIVE);
const report={platform:process.platform,archiveSHA256:runtime.archiveSHA256,sourceCommit:runtime.manifest.sourceCommit,checks:[],harnesses:{},passed:false};
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
try{
 assert.equal(process.platform,'darwin','Apple WebKit qualification requires macOS');
 assert.equal(report.sourceCommit,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),'Archive must match the checked-out tag');
 const env={...process.env,BROWSER:'webkit',DEMUXE_RUNTIME_ROOT:runtime.runtimeRoot};
 for(const key of ['ONLY','CASES','PROFILE','LIVE_NEGATIVE_CONTROL','DEMUXE_WEBKIT_TEST_MODULE'])delete env[key];
 const jobs=[['api','tests/public-api.mjs',21],['component','tests/player-component.mjs',61],['boundaries','tests/api-stability/live-boundaries.mjs',19],['worker-tree','tests/worker-tree-containment.mjs',10]];
 for(const [name,script,count]of jobs){
  report.harnesses[script]=hash(await readFile(script));await save();
  const result=spawnSync(process.execPath,[script],{env,encoding:'utf8',timeout:20*60*1000,maxBuffer:30*1024*1024});
  await writeFile(out+'/'+name+'.log',(result.stdout||'')+(result.stderr||''));
  assert.equal(result.status,0,name+' failed: '+(result.error||result.stdout+'\n'+result.stderr));
  const directory=name==='worker-tree'?'results/worker-tree-containment/webkit':name==='boundaries'?[...(result.stdout||'').matchAll(/^Live boundary report: (.+)$/gm)].at(-1)?.[1]:[...(result.stdout||'').matchAll(/^results\/(?:public-api|player-component)\/.+$/gm)].at(-1)?.[0];
  assert.ok(directory,'Missing fresh '+name+' receipt');
  const receiptBytes=await readFile(directory+'/result.json'),receipt=JSON.parse(receiptBytes);
  assert.equal(receipt.family,'webkit');assert.equal(receipt.passed,true);assert.equal(receipt.checks.length,count);assert.ok(receipt.checks.every(row=>row.passed));
  if(name==='boundaries'){
   assert.equal(receipt.archiveSHA256,report.archiveSHA256);assert.equal(receipt.sourceCommit,report.sourceCommit);assert.equal(receipt.negativeControl,false);
   assert.deepEqual(receipt.checks.map(row=>row.scenario).sort(),[...liveBoundaryCases,...liveNetworkCases].sort());
  }
  await writeFile(out+'/'+name+'.json',receiptBytes);
  report.checks.push({name,passed:true,cases:count,browser:receipt.browser,receiptSHA256:hash(receiptBytes)});await save();console.log('PASS macOS WebKit installed archive',name);
 }
 report.passed=true;
}finally{await save();await runtime.cleanup();}
