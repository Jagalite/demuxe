// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const execute=promisify(execFile),testRoot=dirname(fileURLToPath(import.meta.url)),root=resolve(testRoot,'..');
if(!process.env.DEMUXE_PUBLIC_RUNTIME_CANDIDATE||!process.env.DEMUXE_BROWSER_EVIDENCE)throw Error('Set DEMUXE_PUBLIC_RUNTIME_CANDIDATE and DEMUXE_BROWSER_EVIDENCE');
const directory=await mkdtemp(join(tmpdir(),'demuxe-retired-owners-')),raw=join(directory,'workload.json'),snapshots=join(directory,'heap');
const analysisInputs={};
for(const name of ['summarize-heap.py','heap_snapshot.py'])analysisInputs[name]=createHash('sha256').update(await readFile(join(testRoot,name))).digest('hex');
const report={status:'running-not-qualified',artifacts:directory,harnessSha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),analysisInputs};
const save=()=>writeFile(process.env.DEMUXE_BROWSER_EVIDENCE,JSON.stringify(report,null,2)+'\n');await save();
try{
 await execute(process.execPath,[join(testRoot,'browser-resources.mjs')],{cwd:root,env:{...process.env,DEMUXE_PUBLIC_FIXTURE:process.env.DEMUXE_PUBLIC_FIXTURE??join(root,'qualification/fixtures/avc-aac-320x240.mp4'),DEMUXE_RESOURCE_TRIALS:'1',DEMUXE_RESOURCE_CYCLES:'10',DEMUXE_RESOURCE_HEAP_SNAPSHOT:snapshots,DEMUXE_BROWSER_EVIDENCE:raw},maxBuffer:8*1024*1024});
 report.workload=JSON.parse(await readFile(raw,'utf8'));assert.equal(report.workload.status,'heap-diagnostic-not-qualification');
 const summarize=async stage=>{const {stdout}=await execute('python3',[join(testRoot,'summarize-heap.py'),snapshots+'.'+stage],{maxBuffer:8*1024*1024});return JSON.parse(stdout);};
 report.active=await summarize('active');report.destroyed=await summarize('destroyed');
 const owners=['Player','NativePlayer','ProviderRuntime','DemuxeRuntime','RemuxPlayer','SharedProviderAssets','PlayerPresentation','SessionPreviewProvider'];
 for(const owner of owners){assert.ok(report.active.counts[owner]>=1,'Missing positive control: '+owner);assert.equal(report.destroyed.counts[owner]??0,0,'Destroyed owner retained: '+owner);}
 for(const cycle of report.workload.trials[0].cycles){assert.equal(cycle.closed.workers,0);assert.equal(cycle.closed.objectURLs,0);}
 report.status='finite-browser-owner-retirement-passed-not-release';report.limits=['Heap class/prototype census covers the named owners only','DOM subclasses identified by their direct prototype constructor; V8 implementation dependent','No full native-memory, decoder-capacity, general memory-stability or release claim'];await save();console.log(report.status);
}catch(error){report.status='failed-not-qualified';report.error={message:error.message,stack:error.stack};try{report.workload=JSON.parse(await readFile(raw,'utf8'));}catch{}await save();throw error;}
