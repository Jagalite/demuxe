// SPDX-License-Identifier: Apache-2.0
// Preserve native-qualified sources and prepare independent precision references.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const report=JSON.parse(await readFile('results/media-components/codec-expansion/wave-aiff.json'));
assert.equal(report.passed,true);
const root=path.resolve('build/codec-expansion/wave-browser-fixtures');await mkdir(root,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const ff=args=>execFileSync('ffmpeg',['-v','error','-cpuflags','0',...args],{maxBuffer:32*1024*1024});
const cases=[];
for(const row of report.results.filter(r=>r.format)){
 const source=path.join(report.home,row.id+'.'+row.format),bytes=await readFile(source);assert.equal(sha(bytes),row.inputSHA256);
 const input=root+'/'+row.id+'.'+row.format;await copyFile(source,input);
 cases.push({id:row.id,profile:'pcm',codec:row.codec,sampleRate:row.rate,channels:row.channels,input,fixtureRoot:root,container:'wave-aiff',generated:true,inputSHA256:sha(bytes)});
}
for(const row of cases.filter(r=>r.codec==='pcm-s24le'&&r.input.endsWith('.wav')))for(const bits of [32,64]){
 const id=row.id+'-exact-f'+bits,input=root+'/'+id+'.wav';ff(['-y','-i',row.input,'-c:a','pcm_f'+bits+'le',input]);
 cases.push({...row,id,input,codec:'pcm-f'+bits+'le',inputSHA256:sha(await readFile(input))});
}
for(const row of cases){
 const format=row.codec==='pcm-f64le'?'f64le':row.codec==='pcm-f32le'?'f32le':'s32le',extension=format.slice(0,3);
 await writeFile(root+'/'+row.id+'.'+extension,ff(['-i',row.input,'-map','0:a:0','-f',format,'-']));
}
const output='build/codec-expansion/wave-browser-fixtures.json';await writeFile(output,JSON.stringify(cases,null,2)+'\n');console.log({fixtures:cases.length,output});
