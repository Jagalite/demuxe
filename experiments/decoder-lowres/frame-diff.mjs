// SPDX-License-Identifier: Apache-2.0
// Whole-player paused-frame difference at a matched exact seek.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const dir=process.argv[2];if(!dir)throw Error('usage: node frame-diff.mjs result-directory');
const run=JSON.parse(await readFile(`${dir}/result.json`,'utf8'));
const decode=path=>execFileSync('ffmpeg',['-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:32_000_000});
const rows=[];
for(const trial of run.trials.filter(t=>t.lowres>0&&!t.error)){
 const baseline=run.trials.find(t=>t.name===trial.name&&t.round===trial.round&&t.lowres===0&&!t.error);
 if(!baseline)continue;
 const left=decode(`${dir}/${trial.name}-0-${trial.round}.png`),right=decode(`${dir}/${trial.name}-${trial.lowres}-${trial.round}.png`);
 if(left.length!==right.length)continue;
 const counts=new Uint32Array(256);let sum=0,squares=0,above16=0;
 for(let i=0;i<left.length;i++){const e=Math.abs(left[i]-right[i]);counts[e]++;sum+=e;squares+=e*e;if(e>16)above16++;}
 let cumulative=0,p99=0;for(let e=0;e<256;e++){cumulative+=counts[e];if(!p99&&cumulative>=left.length*.99)p99=e;}
 const mse=squares/left.length;rows.push({name:trial.name,round:trial.round,lowres:trial.lowres,mae:sum/left.length,psnr:mse?10*Math.log10(255*255/mse):null,p99,max:counts.findLastIndex(v=>v>0),fractionAbove16:above16/left.length});
}
await writeFile(`${dir}/frame-diff.json`,JSON.stringify(rows,null,2)+'\n');console.log(rows);
