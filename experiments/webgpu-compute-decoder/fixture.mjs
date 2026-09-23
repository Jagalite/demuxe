// SPDX-License-Identifier: Apache-2.0
// Reproducible ProRes-derived luma block workload. Coefficients are a forward
// DCT of a frame decoded by FFmpeg, not coefficients extracted from the stream.
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const width=640,height=360,dir=process.argv[2]||'experiments/webgpu-compute-decoder/raw';
await mkdir(dir,{recursive:true});
const media=join(dir,'prores-proxy.mov');
const yuvMedia=join(dir,'yuv420-h264.mp4');
const encode=['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
  `testsrc2=size=${width}x${height}:rate=30`,'-frames:v','180','-c:v','prores_ks',
  '-profile:v','0','-pix_fmt','yuv422p10le',media];
execFileSync('ffmpeg',encode,{stdio:'pipe'});
const transcode=['-hide_banner','-loglevel','error','-y','-i',media,'-an','-c:v','libx264',
  '-crf','18','-pix_fmt','yuv420p',yuvMedia];
execFileSync('ffmpeg',transcode,{stdio:'pipe'});
const decoded=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',media,
  '-frames:v','1','-f','rawvideo','-pix_fmt','yuv422p10le','-'],{maxBuffer:width*height*5});
const luma=new Uint16Array(decoded.buffer,decoded.byteOffset,width*height);
const coeffs=new Int32Array(width*height);
const cos=Array.from({length:8},(_,x)=>Array.from({length:8},(_,u)=>Math.cos((2*x+1)*u*Math.PI/16)));
for(let by=0;by<height/8;by++)for(let bx=0;bx<width/8;bx++){
  const base=(by*(width/8)+bx)*64;
  for(let v=0;v<8;v++)for(let u=0;u<8;u++){
    let sum=0;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)sum+=(luma[(by*8+y)*width+bx*8+x]-512)*cos[x][u]*cos[y][v];
    const c=.25*(u?1:Math.SQRT1_2)*(v?1:Math.SQRT1_2)*sum;
    coeffs[base+v*8+u]=Math.round(c/4);
  }
}
await writeFile(join(dir,'coefficients.i32'),Buffer.from(coeffs.buffer));
await writeFile(join(dir,'luma.u16'),Buffer.from(luma.buffer,luma.byteOffset,luma.byteLength));
const metadata={width,height,codec:'ProRes proxy',pixelFormat:'yuv422p10le',
  note:'First decoded luma frame was forward transformed and quantized by four; these are not bitstream coefficients.',
  ffmpeg:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],encode,transcode};
await writeFile(join(dir,'fixture.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata));
