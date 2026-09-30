// SPDX-License-Identifier: Apache-2.0
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const work='build/provider-lossless-audio';await mkdir(work,{recursive:true});
const specialist=process.env.LOSSLESS_SPECIALIST_DIR??'/Volumes/seed2/Projects/demuxe/build/head-to-head/assets-backlog-20260928-03/fixtures/specialist';
const fixtures=[
 {id:'truehd-stereo',codec:'truehd',audio:'build/ffmpeg-codec-split/fixtures/truehd.mka',channels:2},
 {id:'truehd-51',codec:'truehd',audio:'build/ffmpeg-codec-split/fixtures/truehd-51.mka',channels:6},
 {id:'mlp-stereo',codec:'mlp',audio:'build/ffmpeg-codec-split/fixtures/mlp.mka',channels:2},
 {id:'mlp-51',codec:'mlp',audio:'build/ffmpeg-codec-split/fixtures/mlp-51.mka',channels:6},
 {id:'truehd-71',codec:'truehd',audio:specialist+'/hevc-truehd.mkv',channels:8},
 {id:'dtshd-71',codec:'dts-hd',audio:specialist+'/hevc-dtshd.mkv',channels:8},
];
for(const f of fixtures){
 if(f.channels!==8){
  const frequencies=[220,330,440,55,550,660].slice(0,f.channels);
  f.audio=work+'/'+f.id+'.mka';
  const expression=frequencies.map(hz=>'0.08*sin(2*PI*'+hz+'*t)').join('|');
  execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','aevalsrc='+expression+':s=48000:d=1:c='+(f.channels===2?'stereo':'5.1'),'-c:a',f.codec,'-strict','-2',f.audio]);
  f.frequencies=frequencies;
 }
 f.input=work+'/'+f.id+'.mkv';f.seconds=f.channels===8?8:1;
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=30','-i',f.audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-bf','0','-preset','ultrafast','-c:a','copy','-t',String(f.seconds),f.input]);
 f.sourceSHA256=createHash('sha256').update(await readFile(f.input)).digest('hex');
 console.log(f.id,'prepared');
}
await writeFile(work+'/fixtures.json',JSON.stringify({fixtures},null,2)+'\n');
