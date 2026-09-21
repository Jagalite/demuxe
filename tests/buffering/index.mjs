// SPDX-License-Identifier: Apache-2.0
// Index retained evidence without rewriting raw runs or counting failures as passes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('results/buffering');
const runs=[];
for(const entry of (await fs.readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
 if(!entry.isDirectory()||!/^\d{4}-/.test(entry.name))continue;
 const file=path.join(root,entry.name,'results.json');
 let bytes;try{bytes=await fs.readFile(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const result=JSON.parse(bytes);if(!Array.isArray(result.trials))continue;
 runs.push({result:path.relative(root,file),sha256:createHash('sha256').update(bytes).digest('hex'),
  browser:result.family,stage:result.stage,started:result.started,revision:result.revision,
  runtimeRoot:result.runtimeRoot,hashes:result.hashes,
  trials:result.trials.map(t=>({id:t.config.id,passed:t.passed===true,error:t.error??null}))});
}
const out=path.join(root,'summary');await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'index.json'),JSON.stringify({generated:new Date().toISOString(),
 scope:'Retained local buffering trials, including failed and superseded candidates. Passing trials are not whole-release qualification. Consult docs/BUFFERING-VALIDATION.md.',runs},null,2)+'\n');
console.log(`Indexed ${runs.length} retained runs in ${path.join(out,'index.json')}`);
