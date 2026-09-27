import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {frozenInputs} from './frozen-inputs.mjs';

test('served bytes stay equal to the snapshot after source edits',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'demuxe-frozen-'));
 try{
  const file=path.join(dir,'bridge.mjs'),inputs=frozenInputs();
  await writeFile(file,'recorded source');const snapshot=Buffer.from(await inputs.load(file));inputs.seal();
  await writeFile(file,'changed source');assert.deepEqual(await inputs.load(file),snapshot);
  const unrecorded=path.join(dir,'late.mjs');await writeFile(unrecorded,'unrecorded source');
  await assert.rejects(inputs.load(unrecorded),/Unrecorded input/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
