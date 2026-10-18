// SPDX-License-Identifier: Apache-2.0
// Diagnostic replay only: no engine build, tag, qualification promotion or publication.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {installLiveRuntime} from './api-stability/live-runtime.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const family=process.env.BROWSER;
assert.ok(['chrome','firefox'].includes(family),'Choose chrome or firefox');
assert.match(process.env.REPLAY_ARCHIVE_SHA256??'',/^[a-f0-9]{64}$/);
assert.match(process.env.REPLAY_SOURCE_COMMIT??'',/^[a-f0-9]{40}$/);
const archive=process.env.BETA_ARCHIVE;
assert.equal(hash(await readFile(archive)),process.env.REPLAY_ARCHIVE_SHA256,'Replay archive checksum mismatch');
const runtime=await installLiveRuntime(archive);
const out=`results/ass-archive-replay/${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const report={nodeVersion:process.version,platform:process.platform,scope:'Retained-archive diagnostic only; not release qualification',archiveSHA256:runtime.archiveSHA256,sourceCommit:runtime.manifest.sourceCommit,harnessCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),family,checks:[],passed:false};
try{
 report.fixtures=Object.fromEntries(await Promise.all(['build/optimization-fixtures/gain.mp4','build/optimization-fixtures/long-pcm.mkv','results/optimization-integration/reference/web/edge.mkv','fixtures/qualification.ass'].map(async file=>[file,hash(await readFile(file))])));
 assert.equal(runtime.manifest.sourceCommit,process.env.REPLAY_SOURCE_COMMIT,'Replay source mismatch');
 const env={...process.env,DEMUXE_RUNTIME_ROOT:runtime.runtimeRoot,DEMUXE_TRACE_WORKER_RELEASE:'1'};
 for(const key of ['ONLY','CASES','PROFILE','LIVE_NEGATIVE_CONTROL','DEMUXE_WEBKIT_TEST_MODULE'])delete env[key];
 const scripts=[...Array(3).fill('tests/native-ass.mjs'),'tests/native-ass-selection-regressions.mjs','tests/native-ass-style-regressions.mjs'];
 for(const [iteration,script]of scripts.entries()){
  const row={iteration,script,harnessSHA256:hash(await readFile(script)),passed:false};report.checks.push(row);
  const run=spawnSync(process.execPath,[script],{env,encoding:'utf8',timeout:5*60*1000,maxBuffer:30*1024*1024});
  row.exitCode=run.status;row.error=run.error?String(run.error):undefined;row.passed=run.status===0;
  row.log=iteration+'-'+script.split('/').at(-1)+'.log';await writeFile(out+'/'+row.log,(run.stdout??'')+(run.stderr??''));
  await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(script,row.passed?'PASS':'FAIL');
 }
 report.passed=report.checks.every(row=>row.passed);if(!report.passed)process.exitCode=1;
}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');await runtime.cleanup();console.log('ASS archive replay:',out);}
