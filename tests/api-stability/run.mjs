// SPDX-License-Identifier: Apache-2.0
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {contracts,browsers} from './suites.mjs';
const [tier,group]=process.argv.slice(2);
if(!['unit','browser'].includes(tier)||tier==='browser'&&(!browsers[group]||group==='bundles'))throw Error('Usage: run.mjs unit | browser core|ui|integration|preview|sequences');
if(process.env.ONLY)throw Error('The API gate forbids partial ONLY selections');
const output=path.resolve(`results/api-stability/gate-${tier}-${group??'all'}-${process.env.BROWSER??'node'}-${Date.now()}`);
await mkdir(output,{recursive:true});
const report={passed:false,tier,group,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runs:[]};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function results(root){try{const files=await readdir(root,{recursive:true});return files.filter(name=>name.endsWith('result.json')).map(name=>path.join(root,name));}catch(error){if(error.code==='ENOENT')return [];throw error;}}
function run(args,env,timeoutMs,log){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{detached:true,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    const chunks=[];let timedOut=false;
    const terminate=()=>{try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}};
    const timer=setTimeout(()=>{timedOut=true;terminate();},timeoutMs);
    for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{chunks.push(data);process.stdout.write(data);});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',(code,signal)=>{clearTimeout(timer);terminate();writeFile(log,Buffer.concat(chunks)).then(()=>resolve({code,signal,timedOut}),reject);});
  });
}
try{
  if(tier==='unit'){
    const files=Object.values(contracts).flat().map(name=>`tests/${name}.mjs`);
    assert.ok(files.length>0);report.files=files;
    const result=await run(['--test','--test-concurrency=2','--test-timeout=120000',...files],{},15*60*1000,output+'/unit.log');
    report.runs.push(result);assert.equal(result.code,0,JSON.stringify(result));
    const types=await run(['node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','tests/integration-types.ts','tests/api-stability/consumer-types.ts'],{},120000,output+'/types.log');
    report.runs.push(types);assert.equal(types.code,0,JSON.stringify(types));
  }else{
    assert.ok(process.env.DEMUXE_RUNTIME_ROOT,'Browser gate requires freshly packaged runtime root');
    report.runtimeRoot=path.resolve(process.env.DEMUXE_RUNTIME_ROOT);
    const manifestPath=path.join(report.runtimeRoot,'../bundle-manifest.json'),bytes=await readFile(manifestPath),manifest=JSON.parse(bytes);
    assert.equal(manifest.delivery,'assets');report.manifestSHA256=sha(bytes);
    // Verify all bytes served, not merely a filename or selected plan.
    for(const [file,expected]of Object.entries(manifest.outputs)){
      const content=await readFile(path.join(report.runtimeRoot,'..',file));
      assert.equal(content.length,expected.bytes,file);assert.equal(sha(content),expected.sha256,file);
    }
    report.inventoryPath=path.resolve(process.env.API_BUNDLE_INVENTORY??'build/bundle-ci-inputs/bundle-ci-inventory.json');
    const inventoryBytes=await readFile(report.inventoryPath),inventory=JSON.parse(inventoryBytes);report.inventorySHA256=sha(inventoryBytes);
    report.runtimeSourceCommit=inventory.commit;report.runtimeQualification=inventory.qualification;
    report.fixtureSHA256=sha(await readFile('fixtures/example.mp4'));
    for(const suite of browsers[group]){
      const previous=new Set(suite.report?await results(suite.report):[]),guard=path.join(output,suite.file.replaceAll('/','-')+'-guard.json');
      const started=Date.now(),record={file:suite.file};report.runs.push(record);
      try{
        record.process=await run(['--import','./tests/api-stability/browser-guard.mjs',`tests/${suite.file}.mjs`],{API_GUARD_REPORT:guard,HEADLESS:'1',...(suite.selection?{ONLY:suite.selection}:{})},process.env.API_EXTENDED==='1'?70*60*1000:group==='sequences'?40*60*1000:20*60*1000,path.join(output,suite.file.replaceAll('/','-')+'.log'));
        assert.equal(record.process.code,0,JSON.stringify(record.process));
        record.guard=JSON.parse(await readFile(guard));assert.ok(record.guard.pages>0);assert.deepEqual(record.guard.errors,[]);
        if(suite.report){
          const fresh=(await results(suite.report)).filter(file=>!previous.has(file));assert.equal(fresh.length,1,'Expected exactly one new report');
          record.report=fresh[0];const evidence=JSON.parse(await readFile(fresh[0]));const checks=evidence.checks??evidence.cases;
          assert.ok(checks?.length>=suite.minimum,`Only ${checks?.length} cases; minimum ${suite.minimum}`);
          assert.ok(checks.every(check=>check.passed===true),'A scenario failed or was skipped');
          assert.deepEqual(evidence.pageErrors??[],[]);
        }
        record.passed=true;
      }catch(error){record.passed=false;record.error=String(error.stack);process.exitCode=1;}
      record.durationMs=Date.now()-started;await writeFile(output+'/result.json',JSON.stringify(report,null,2));
    }
    assert.ok(report.runs.every(run=>run.passed),'One or more browser suites failed');
  }
  report.passed=true;
}finally{await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');console.log('API stability report:',output);}
