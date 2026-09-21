// SPDX-License-Identifier: Apache-2.0
// Sequential media jobs: never overlap CPU/network qualification runs.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
if(!process.env.BUFFERING_RUNTIME)throw Error('Set BUFFERING_RUNTIME to a frozen candidate');
const jobs=[
 ['firefox-remux-observer',{BROWSER:'firefox',STAGE:'qualification',FIXTURES:'high',ONLY:'high-remux-2',ASSERT_REMUX_WAITING:'1'}],
 ['firefox-remux-prior-runtime',{BROWSER:'firefox',STAGE:'seeks',FIXTURES:'high',ONLY:'high-remux-2',BUFFERING_RUNTIME:'results/buffering/runtime-2026-09-21T01-53-47.392Z'}],
 ['chrome-remux-observer',{STAGE:'qualification',FIXTURES:'high,h264',ONLY:'high-remux-2,h264-remux-1'}],
 ['chrome-cache-on',{STAGE:'qualification',FIXTURES:'high',ONLY:'high-native-1,high-hybrid-1,high-software-1',RTT_MS:'0'}],
 ['chrome-resilient-outage',{STAGE:'qualification',FIXTURES:'high',ONLY:'high-hybrid-1',RTT_MS:'0',BUFFERING_PROFILE:'resilient'}],
 ['chrome-cache-off',{STAGE:'baseline',FIXTURES:'high',ONLY:'high-hybrid-1-no,high-software-1-no',RTT_MS:'0'}],
 ['chrome-budget-extremes',{STAGE:'profiles',PROFILE_FIXTURE:'high',ONLY:'budget',RTT_MS:'0'}],
 ['firefox-profiles',{BROWSER:'firefox',STAGE:'profiles',PROFILE_FIXTURE:'high',ONLY:'hybrid-none-low-latency,hybrid-auto-resilient,software-none-low-latency,software-auto-resilient',RTT_MS:'0'}],
 ['chrome-blocked-close',{STAGE:'cleanup'}],
 ['firefox-blocked-close',{BROWSER:'firefox',STAGE:'cleanup'}],
 ['chrome-hevc',{STAGE:'qualification',FIXTURES:'hevc',ONLY:'hevc-native-1,hevc-hybrid-1,hevc-software-1'}],
 ['chrome-shaka',{},'tests/shaka-lifecycle.mjs'],
 ['firefox-shaka',{BROWSER:'firefox'},'tests/shaka-lifecycle.mjs'],
 ['chrome-public-api',{},'tests/public-api.mjs'],
 ['firefox-public-api',{BROWSER:'firefox'},'tests/public-api.mjs'],
].filter(([name])=>!process.env.ONLY_JOB||process.env.ONLY_JOB.split(',').includes(name));
const out=path.join('results/buffering','followups-'+new Date().toISOString().replaceAll(':','-'));await fs.mkdir(out,{recursive:false});
const result={runtime:process.env.BUFFERING_RUNTIME,jobs:[]};
for(const [name,env,file='tests/buffering/run.mjs'] of jobs){
 const rec={name,file,env,started:new Date().toISOString()};result.jobs.push(rec);console.log('START',name);
 const clean={...process.env};for(const key of ['BROWSER','STAGE','FIXTURES','PROFILE_FIXTURE','ONLY','RTT_MS','ONLY_JOB','BUFFERING_PROFILE','ASSERT_REMUX_WAITING'])delete clean[key];
 let output='';const child=spawn(process.execPath,[file],{env:{...clean,...env},stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{output+=String(data);process.stdout.write(data);});
 rec.code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});rec.finished=new Date().toISOString();
 await fs.writeFile(path.join(out,name+'.log'),output);await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));
 if(rec.code!==0){process.exitCode=1;console.log('STOP: inspect failed job',name);break;}
}
console.log(out);
