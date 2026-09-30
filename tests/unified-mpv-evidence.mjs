// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
// Negative controls: valid bundle hashes must not excuse failed output checks.
for(const [name,mutate,message] of [
 ['backward seek did nothing',r=>r.results[0].seeks[1].arrival=2.3,'Seek missed target'],
 ['audio went silent after seek',r=>r.results[0].audio[2].peak=0,'Missing audio'],
 ['clock stopped after seek',r=>r.results[0].audio[2].end=r.results[0].audio[2].start,'No post-seek progression'],
])test(name,async()=>{
 const report=JSON.parse(await readFile('results/media-components/bundling/unified-mpv-review.json'));
 mutate(report);const directory=await mkdtemp(path.join(tmpdir(),'demuxe-unified-evidence-'));
 try{const file=path.join(directory,'report.json');await writeFile(file,JSON.stringify(report));const result=spawnSync(process.execPath,['scripts/verify-unified-mpv.mjs',file],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,new RegExp(message));}
 finally{await rm(directory,{recursive:true,force:true});}
});
