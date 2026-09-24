// SPDX-License-Identifier: Apache-2.0
// Compare matched paused-seek screenshots after playback measurements.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir=process.argv[2];if(!dir)throw Error('usage: node frame-diff.mjs result-directory');
const run=JSON.parse(await readFile(`${dir}/result.json`,'utf8'));
const decode=path=>execFileSync('ffmpeg',['-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:8_000_000});
const rows=[];
for(const name of run.cases)for(const round of [...new Set(run.trials.filter(t=>t.name===name).map(t=>t.round))].sort((a,b)=>a-b)){
 const rgb=decode(`${dir}/${name}-${round}-software.png`),yuv=decode(`${dir}/${name}-${round}-yuv.png`);
 if(rgb.length!==yuv.length)throw Error(`${name} round ${round}: screenshot dimensions differ`);
 const counts=new Uint32Array(256);let sum=0,nonzero=0,above16=0,max=0;
 for(let i=0;i<rgb.length;i++){const e=Math.abs(rgb[i]-yuv[i]);counts[e]++;sum+=e;if(e)nonzero++;if(e>16)above16++;if(e>max)max=e;}
 let cumulative=0,p95=0,p99=0;for(let e=0;e<256;e++){cumulative+=counts[e];if(!p95&&cumulative>=rgb.length*.95)p95=e;if(!p99&&cumulative>=rgb.length*.99)p99=e;}
 rows.push({name,round,channels:rgb.length,mae:sum/rgb.length,p95,p99,max,fractionAbove16:above16/rgb.length,fractionNonzero:nonzero/rgb.length});
}
await writeFile(`${dir}/frame-diff.json`,JSON.stringify(rows,null,2)+'\n');
console.log(rows);
