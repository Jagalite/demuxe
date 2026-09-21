// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('failed trials remain analyzable when a network phase has no final sample',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'demuxe-buffering-analysis-'));
 try{
  const sample={wall:1000,state:{status:'playing',currentTime:1}};
  const trial={config:{id:'interrupted'},error:'browser closed',data:{samples:[sample]},
   phases:[{name:'fast',start:{wall:1000},samples:[{wall:1000}]},
    {name:'outage',start:{wall:1100},samples:[]}]};
  const file=path.join(dir,'results.json');
  await fs.writeFile(file,JSON.stringify({family:'firefox',stage:'qualification',rttMs:75,trials:[trial]}));
  const [row]=JSON.parse(execFileSync('python3',['tests/buffering/analyze.py',file],{encoding:'utf8'}));
  assert.equal(row.passed,false);assert.equal(row.error,'browser closed');
  assert.equal(row.bytesBeforeSeeks,null);assert.deepEqual(row.cpu,[]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
