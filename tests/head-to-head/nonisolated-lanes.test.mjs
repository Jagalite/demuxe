// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
test('CLI list includes four explicit playback lanes and preserves remux rows',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'demuxe-lane-list-'));
  try{
    await mkdir(path.join(root,'fixtures'));
    await writeFile(path.join(root,'fixtures/catalogue.json'),JSON.stringify({file:{file:'file.mkv',video:true,audio:true},stream:{file:'stream.m3u8',streamFormat:'hls',live:true}}));
    const args=['tests/head-to-head/run.mjs','--catalogue','--assets',root,'--include-private-remux','--include-nonisolated-playback','--list'];
    const rows=execFileSync(process.execPath,args,{encoding:'utf8'}).trim().split('\n');
    for(const fixture of ['file','stream'])for(const lane of ['auto','jspi','asyncify','hybrid-jspi','hybrid-asyncify','software-jspi','software-asyncify'])assert.ok(rows.includes('demuxe.'+lane+'.'+fixture));
    assert.equal(new Set(rows).size,rows.length);
    assert.throws(()=>execFileSync(process.execPath,[...args,'--demuxe-mode','software'],{stdio:'pipe'}),/Command failed/);
  }finally{await rm(root,{recursive:true,force:true});}
});
