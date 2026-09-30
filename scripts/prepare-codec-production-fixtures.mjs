// SPDX-License-Identifier: Apache-2.0
import {copyFile,readFile,writeFile,mkdir,open,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const work=path.resolve('build/codec-preparation/fixtures');await mkdir(work,{recursive:true});
const specialist=process.env.LOSSLESS_SPECIALIST_DIR??'/Volumes/seed2/Projects/demuxe/build/head-to-head/assets-backlog-20260928-03/fixtures/specialist';
const run=args=>execFileSync('ffmpeg',['-v','error','-y',...args],{stdio:'inherit'});
const reordered=work+'/avc-bframes-truehd.mkv';
run(['-f','lavfi','-i','testsrc2=size=320x180:rate=30','-f','lavfi','-i','aevalsrc=0.08*sin(2*PI*220*t)|0.08*sin(2*PI*330*t):s=48000:d=20:c=stereo','-map','0:v:0','-map','1:a:0','-t','20','-c:v','libx264','-bf','3','-g','60','-preset','fast','-c:a','truehd','-strict','-2',reordered]);
const large=work+'/large-truehd.mkv';await copyFile('build/provider-lossless-audio/long-truehd.mkv',large);
const padding=65*1024*1024,voidSize=Buffer.from([0x10|(padding>>>24),padding>>>16&255,padding>>>8&255,padding&255]);
const handle=await open(large,'r+');try{const {size}=await handle.stat();await handle.write(Buffer.concat([Buffer.from([0xec]),voidSize]),0,5,size);await handle.truncate(size+5+padding);}finally{await handle.close();}
const multi=work+'/multi-lossless.mkv';run(['-i','build/provider-lossless-audio/truehd-71.mkv','-i','build/provider-lossless-audio/dtshd-71.mkv','-map','0:v:0','-map','0:a:0','-map','1:a:0','-c','copy','-disposition:a:0','default','-disposition:a:1','0',multi]);
for(const name of ['hevc-truehd','hevc-dtshd'])await copyFile(path.join(specialist,name+'.mkv'),work+'/'+name+'.mkv');
const cases=[{id:'avc-bframes-truehd',profile:'truehd-mlp',seek:[8,16]},{id:'large-truehd',profile:'truehd-mlp',seek:[30,90],large:true},{id:'multi-lossless',profile:'truehd-mlp',seek:[2,5],multipleAudio:true},{id:'hevc-truehd',profile:'truehd-mlp',seek:[2,5],hevc:true},{id:'hevc-dtshd',profile:'dts-hd',seek:[2,5],hevc:true}];
for(const c of cases){c.file=work+'/'+c.id+'.mkv';c.bytes=(await stat(c.file)).size;c.sha256=createHash('sha256').update(await readFile(c.file)).digest('hex');c.probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',c.file],{encoding:'utf8'}));}
if(!cases[0].probe.streams[0].has_b_frames)throw Error('Reordered fixture has no B frames');
await writeFile(work+'/manifest.json',JSON.stringify({cases},null,2)+'\n');console.log(cases.map(c=>({id:c.id,bytes:c.bytes})));
