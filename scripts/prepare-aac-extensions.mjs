// SPDX-License-Identifier: Apache-2.0
// Real FATE AAC packets; synthetic AVC supplies only the bounded video track.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'/tmp/demuxe-aac-extensions');await mkdir(root,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const rows=[{id:'he',aacProfile:'he',sampleRate:48000,url:'https://fate-suite.ffmpeg.org/aac/al_sbr_cm_48_2.mp4',sha256:'7e7c0390c950eda21775d1a193e05ee703257bed85602884e7d30a8b3c65be90',suffix:'mp4',frames:70},{id:'he-v2',aacProfile:'he-v2',sampleRate:44100,url:'https://fate-suite.ffmpeg.org/aac/CT_DecoderCheck/sbr_i-ps_i.aac',sha256:'76e84aa3e0d142696699bdb5d9bc8b037415065c604e2fa9f7d00e5f59bb597d',suffix:'aac',frames:64}];
const ff=args=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-y',...args],{maxBuffer:64*1024*1024});
const fixtures=[];
for(const row of rows){const original=root+'/'+row.id+'.'+row.suffix;let bytes;try{bytes=await readFile(original);}catch{const response=await fetch(row.url);if(!response.ok)throw Error('Fixture download '+response.status);bytes=Buffer.from(await response.arrayBuffer());await writeFile(original,bytes);}if(hash(bytes)!==row.sha256)throw Error('Fixture source hash differs');
 let audio=original;if(row.id==='he-v2'){audio=root+'/he-v2.m4a';ff(['-i',original,'-map','0:a:0','-c:a','copy','-bsf:a','aac_adtstoasc','-use_editlist','0',audio]);}
 const originalPCM=ff(['-i',original,'-map','0:a:0','-f','f32le','-']);
 for(const bounded of[false,true]){const id='aac-'+row.id+(bounded?'-bounded':'-full'),input=root+'/'+id+'.mp4';ff(['-f','lavfi','-i','testsrc2=size=128x72:rate=25:duration='+(bounded?'3':row.id==='he'?'33':'8'),'-i',audio,'-map','0:v','-map','1:a','-c:v','libx264','-profile:v','baseline','-preset','ultrafast','-tune','zerolatency','-bf','0','-g','25','-c:a','copy',...(bounded?['-frames:a',String(row.frames)]:[]),'-shortest','-use_editlist','0','-movflags','+faststart',input]);
 const data=await readFile(input),reference=ff(['-i',input,'-map','0:a:0','-f','f32le','-']);if(!reference.equals(originalPCM.subarray(0,reference.length))||(!bounded&&reference.length!==originalPCM.length)||(bounded&&reference.length!==row.frames*2048*8))throw Error('Original AAC sample extent or prefix differs');await writeFile(root+'/'+id+'.f32',reference);fixtures.push({id,aacProfile:row.aacProfile,codec:'aac',container:'isobmff',sampleRate:row.sampleRate,channels:2,input:path.basename(input),inputSHA256:hash(data),bytes:data.length,referenceSamples:reference.length/8,referenceSHA256:hash(reference),bounded,playbackSeekSeconds:.6,source:{url:row.url,sha256:row.sha256},outputs:row.sampleRate===48000?['flac','opus']:['flac']});}
}
await writeFile(root+'/browser-fixtures.json',JSON.stringify(fixtures.filter(f=>f.bounded).map(f=>({...f,profile:'aac',input:path.join(root,f.input),fixtureRoot:root,encodings:f.outputs})),null,2)+'\n');
await writeFile(root+'/fixtures.json',JSON.stringify({schema:1,fixtureRoot:root,fixtures},null,2)+'\n');console.log(root+'/fixtures.json');
