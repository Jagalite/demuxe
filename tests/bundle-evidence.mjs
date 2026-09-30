// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyBundleBinding} from '../scripts/bundle-evidence.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('browser evidence rejects missing binding, replaced bytes and a rebuilt manifest',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'demuxe-evidence-'));
 try{
  const outputs={'demuxe.mjs':{bytes:3,sha256:sha('one')}};
  const manifest=JSON.stringify({outputs});
  await writeFile(path.join(root,'demuxe.mjs'),'one');await writeFile(path.join(root,'bundle-manifest.json'),manifest);
  const binding={manifestSHA256:sha(manifest),outputs};
  await verifyBundleBinding(root,binding);
  await assert.rejects(verifyBundleBinding(root,undefined),/no artifact binding/);
  await writeFile(path.join(root,'demuxe.mjs'),'two');
  await assert.rejects(verifyBundleBinding(root,binding),/output changed/);
  await writeFile(path.join(root,'bundle-manifest.json'),JSON.stringify({outputs:{'demuxe.mjs':{bytes:3,sha256:sha('two')}}}));
  await assert.rejects(verifyBundleBinding(root,binding),/different bundle manifest/);
 }finally{await rm(root,{recursive:true,force:true});}
});
