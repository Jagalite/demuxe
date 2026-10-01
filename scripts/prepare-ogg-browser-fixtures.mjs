// SPDX-License-Identifier: Apache-2.0
// Materialize only exact media and integer precision references for Ogg composition.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
const reportPath=process.env.OGG_READER_REPORT??'results/media-components/codec-expansion/ogg.json',raw=await readFile(reportPath),report=JSON.parse(raw);
assert.equal(report.passed,true);const root=path.resolve(process.env.OGG_BROWSER_FIXTURES??'/tmp/demuxe-ogg-browser-fixtures'),manifest=process.env.OGG_BROWSER_MANIFEST??'build/codec-expansion/ogg-browser.json';await mkdir(root,{recursive:true});const rows=[];
for(const f of report.results.filter(f=>f.codec)){
 const input=await readFile(path.join(report.home,f.id+'.ogg'));assert.equal(sha(input),f.inputSHA256,'Reader fixture changed');
 const integer=f.codec==='flac'?execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',path.join(report.home,f.id+'.ogg'),'-map','0:a:0','-f','s32le','-'],{maxBuffer:16*1024*1024}).subarray(0,f.samples*f.channels*4):undefined;
 if(integer)assert.equal(integer.length,f.samples*f.channels*4);
 for(const output of ['flac',...(f.rate===48000&&f.channels===2?['opus']:[])]){
  const id='ogg-'+f.id+'-'+output,inputPath=path.join(root,id+'.ogg');await writeFile(inputPath,input);if(integer)await writeFile(path.join(root,id+'.s32'),integer);
  rows.push({id,profile:f.codec==='flac'?'lossless':'opus-vorbis',codec:f.codec,sampleRate:f.rate,channels:f.channels,bitsPerSample:f.bits,input:inputPath,fixtureRoot:root,container:'ogg',audioOnly:true,output,generated:true,duration:f.samples/f.rate,referenceSamples:f.samples,preSkip:f.preSkip,endGranule:f.endGranule,inputSHA256:f.inputSHA256,readerEvidenceSHA256:sha(raw),...(integer?{referenceSHA256:sha(integer)}:{}),precisionRejected:output==='flac'&&f.codec==='flac'&&f.bits===32});
 }
}
assert.equal(rows.length,27);await mkdir(path.dirname(manifest),{recursive:true});await writeFile(manifest,JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({manifest,fixtures:rows.length,positive:rows.filter(f=>!f.precisionRejected).length,precisionRejected:rows.filter(f=>f.precisionRejected).length,root}));
