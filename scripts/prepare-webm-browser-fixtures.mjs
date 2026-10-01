// SPDX-License-Identifier: Apache-2.0
// WebM packet copy uses container only; no video/audio decoder assets are needed.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),reportPath=process.env.WEBM_COPY_REPORT??'results/media-components/codec-expansion/webm-copy.json',raw=await readFile(reportPath),report=JSON.parse(raw);assert.equal(report.passed,true);
const root=path.resolve(process.env.WEBM_BROWSER_FIXTURES??'/tmp/demuxe-webm-browser-fixtures'),manifest=process.env.WEBM_BROWSER_MANIFEST??'build/codec-expansion/webm-browser.json';await mkdir(root,{recursive:true});const rows=[];
for(const f of report.results.filter(f=>f.video)){
 const source=await readFile(path.join(report.home,f.id+'.webm'));assert.equal(sha(source),f.inputSHA256);const id='webm-'+f.id,input=path.join(root,id+'.webm');await writeFile(input,source);
 rows.push({id,caseType:'webm-copy',providers:['container'],codec:f.audio,videoCodec:f.video,sampleRate:f.sampleRate,channels:f.channels,container:'webm',audioOnly:false,output:'webm',generated:true,input,fixtureRoot:root,inputSHA256:f.inputSHA256,nativeOutputSHA256:f.outputSHA256,duration:f.durationSeconds,referenceSamples:f.audioSamples,nativeAudioSHA256:f.audioSHA256,nativeVideoSHA256:f.videoSHA256,nativeEvidenceSHA256:sha(raw)});
}
assert.equal(rows.length,9);await mkdir(path.dirname(manifest),{recursive:true});await writeFile(manifest,JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({manifest,fixtures:rows.length,root}));
