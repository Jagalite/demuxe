// SPDX-License-Identifier: Apache-2.0
// Run the maintained API shards on one archive, restoring fixture inputs afterward.
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
if(!process.env.BETA_ARCHIVE)throw Error('BETA_ARCHIVE is required');
if(process.env.ONLY||process.env.CASES||process.env.API_EXTENDED==='1')throw Error('Release API matrix requires the standard complete selection');
const archive=path.resolve(process.env.BETA_ARCHIVE),output=`results/api-stability/archive-matrix-${Date.now()}`;
await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={passed:false,archiveSHA256:sha(await readFile(archive)),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runs:[]};
const saved=new Map();
for(const file of ['fixtures/example.mp4','fixtures/filter-reference.mp4','build/fixtures/tracks.mkv','build/fixtures/captions.srt','build/fixtures/api-fixtures.json']){
 try{saved.set(file,await readFile(file));}catch(error){if(error.code!=='ENOENT')throw error;saved.set(file,null);}
}
async function run(args,env,log,timeout){
 const child=spawn(process.execPath,args,{env:{...process.env,...env},detached:true,stdio:['ignore','pipe','pipe']});
 const chunks=[];let timedOut=false;
 const kill=()=>{try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}};
 const timer=setTimeout(()=>{timedOut=true;kill();},timeout);
 try{
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>chunks.push(b));
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  const text=Buffer.concat(chunks).toString();await writeFile(log,text);
  assert.equal(timedOut,false,'Matrix process timed out');assert.equal(code,0,`Matrix process failed; see ${log}`);return text;
 }finally{clearTimeout(timer);kill();}
}
try{
 await run(['tests/api-stability/fixtures.mjs'],{},output+'/fixtures.log',120000);
 report.fixtures=JSON.parse(await readFile('build/fixtures/api-fixtures.json','utf8'));
 for(const family of ['chromium','firefox'])for(const group of ['core','ui','integration','preview','sequences','streaming']){
  const row={family,group,passed:false};report.runs.push(row);
  try{
   const log=await run(['tests/api-stability/run.mjs','browser',group],{BROWSER:family,BETA_ARCHIVE:archive},`${output}/${family}-${group}.log`,90*60*1000);
   const matches=[...log.matchAll(/^API stability report: (.+)$/gm)];assert.equal(matches.length,1);
   row.receipt=path.join(matches[0][1],'result.json');const bytes=await readFile(row.receipt),receipt=JSON.parse(bytes);
   assert.equal(receipt.passed,true);assert.equal(receipt.archiveSHA256,report.archiveSHA256);
   row.receiptSHA256=sha(bytes);row.passed=true;
  }catch(error){row.error=String(error.stack);process.exitCode=1;}
  await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');
  console.log(family,group,row.passed?'PASS':'FAIL',row.error??'');
 }
 for(const family of ['chrome','webkit']){
  const row={family,group:'mobile',passed:false};report.runs.push(row);
  try{
   const log=await run(['tests/player-mobile.mjs'],{BROWSER:family,BETA_ARCHIVE:archive},`${output}/${family}-mobile.log`,10*60*1000);
   const matches=[...log.matchAll(/^Mobile player report: (.+)$/gm)];assert.equal(matches.length,1);
   row.receipt=path.join(matches[0][1],'result.json');const bytes=await readFile(row.receipt),receipt=JSON.parse(bytes);
   assert.equal(receipt.passed,true);assert.equal(receipt.family,family);assert.equal(receipt.archiveSHA256,report.archiveSHA256);
   row.receiptSHA256=sha(bytes);row.passed=true;
  }catch(error){row.error=String(error.stack);process.exitCode=1;}
  await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');
  console.log(family,'mobile',row.passed?'PASS':'FAIL',row.error??'');
 }
 report.passed=report.runs.length===14&&report.runs.every(row=>row.passed);
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{
 for(const [file,bytes]of saved){if(bytes===null)await rm(file,{force:true});else await writeFile(file,bytes);}
 await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');console.log('Archive API matrix:',output);
}
