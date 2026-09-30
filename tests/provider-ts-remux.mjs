// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {remuxMatroska} from '../build/component-candidates/provider-container/src/remux.js';
const input='build/provider-container/no-reorder.mkv',source=await readFile(input),signal=new AbortController().signal;
const output='build/provider-container/recipe.mp4';
await writeFile(output,new Uint8Array(await(await remuxMatroska(new Blob([source]),signal)).arrayBuffer()));
for(const [stream,format]of [['0:v:0','rawvideo'],['0:a:0','f32le']]){
 const decode=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',stream,'-f',format,'-'],{maxBuffer:64*1024*1024});
 assert.deepEqual(decode(output),decode(input));
}
const controller=new AbortController();controller.abort();await assert.rejects(()=>remuxMatroska(new Blob([source]),controller.signal),e=>e.name==='AbortError');
await assert.rejects(()=>remuxMatroska(new Blob([source.subarray(0,100)]),signal));
await mkdir('results/media-components/container-provider',{recursive:true});
await writeFile('results/media-components/container-provider/recipe.json',JSON.stringify({passed:true,scope:'TS AVC no reordered pictures plus AAC LC 48 kHz packet copy',fixtureSHA256:createHash('sha256').update(source).digest('hex'),videoDecodedExact:true,audioDecodedExact:true,abort:true,truncationRejected:true},null,2)+'\n');
