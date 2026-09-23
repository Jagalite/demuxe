// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const run=process.argv[2];if(!run)throw Error('Usage: node verify.mjs raw/run-...');
const width=640,height=360,screenshotWidth=700;
const decode=file=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,
  '-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:700*450*3+4096});
const readback=decode(`${run}/readback.png`),resident=decode(`${run}/resident.png`);
const source=await readFile('experiments/webgpu-compute-decoder/raw/luma.u16');
const luma=new Uint16Array(source.buffer,source.byteOffset,width*height);
let between=0,betweenMax=0,reference=0,referenceMax=0,channelMismatch=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const pixel=y*width+x,screen=(y*screenshotWidth+x)*3;
  const a=readback[screen],b=resident[screen];
  const diff=Math.abs(a-b);between+=diff;betweenMax=Math.max(betweenMax,diff);
  const wanted=Math.round(luma[pixel]*255/1023);
  const error=Math.abs(b-wanted);reference+=error;referenceMax=Math.max(referenceMax,error);
  channelMismatch+= +(resident[screen]!==resident[screen+1]||resident[screen]!==resident[screen+2]);
}
const result={pixels:width*height,readbackVsResident:{meanAbs:between/(width*height),maxAbs:betweenMax},
  residentVsDecodedProResLuma:{meanAbs:reference/(width*height),maxAbs:referenceMax},
  residentNonGrayscalePixels:channelMismatch,
  note:'Screenshot path adds a validation-only GPU readback outside benchmark measurements.'};
await writeFile(`${run}/correctness.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
