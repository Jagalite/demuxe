// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {assertDtsHdAdmission} from '../dtshd-high-rate-admission-controls.mjs';
test('DTS-HD actual frame admission rejects unqualified tuples without configuration and disposes owner',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),home=await mkdtemp(path.join(os.tmpdir(),'demuxe-dtshd-contract-'));
 try{
  const output=path.join(home,'decoder.mjs');await build({entryPoints:[path.join(root,'packages/provider-audio/src/packet-decoder.ts')],bundle:true,format:'esm',platform:'node',outfile:output,logLevel:'silent'});
  const {PacketAudioDecoder}=await import(pathToFileURL(output));assert.equal(assertDtsHdAdmission(PacketAudioDecoder).length,5);
 }finally{await rm(home,{recursive:true,force:true});}
});
