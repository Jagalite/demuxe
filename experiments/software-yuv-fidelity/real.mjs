// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='results/software-yuv-fidelity/real';await mkdir(dir,{recursive:true});
const media={mpeg2ts:'mpeg2-ac3.ts',mpeg2ps:'mpeg2-mp2.mpg',mpeg4avi:'mpeg4-mp3.avi'};
const W=960,H=540,CW=W/2,CH=H/2;
const stats=(ref,test)=>{const err=[];let sum=0,diff=0,max=0,worst=[];for(let i=0;i<ref.length;i+=4){let px=0;for(let c=0;c<3;c++){const e=Math.abs(ref[i+c]-test[i+c]);err.push(e);sum+=e;px=Math.max(px,e);if(e>max){max=e;worst=[i/4%W,Math.floor(i/4/W),c,ref[i+c],test[i+c]];}}if(px)diff++;}err.sort((a,b)=>a-b);return {max,mean:+(sum/err.length).toFixed(3),p95:err[Math.ceil(err.length*.95)-1],p99:err[Math.ceil(err.length*.99)-1],diffPct:+(diff*100/(W*H)).toFixed(2),worst};};
const server=await serve({pagePath:'experiments/software-yuv-fidelity/page.html'}),browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[];
try{const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.renderFrame);
for(const [name,file] of Object.entries(media)){
 const frameIndex=name==='mpeg4avi'?119:120;
 const source=`build/yuv-cpu-investigation/${file}`,rawPath=`${dir}/${name}-n${frameIndex}.yuv`,fastPath=`${dir}/${name}-n${frameIndex}-fast.rgba`,fullPath=`${dir}/${name}-n${frameIndex}-fullchr.rgba`;
 const raw=execFileSync('ffmpeg',['-v','error','-i',source,'-vf',`select=eq(n\\,${frameIndex})`,'-frames:v','1','-f','rawvideo','-pix_fmt','yuv420p','-'],{maxBuffer:10_000_000});
 if(raw.length!==W*H+2*CW*CH)throw Error(`${name}: decoded bytes ${raw.length}`);
 await writeFile(rawPath,raw);
 for(const [p,flag] of [[fastPath,'bilinear'],[fullPath,'fullchr']])execFileSync('build/yuv-fidelity-reference',[rawPath,p,W,H,W,H,'601','limited','left',flag]);
 const y=raw.subarray(0,W*H),u=raw.subarray(W*H,W*H+CW*CH),v=raw.subarray(W*H+CW*CH);
 const params={w:W,h:H,dw:W,dh:H,planes:[Array.from(y),Array.from(u),Array.from(v)],strides:[W,CW,CW],system:0,full:0};
 const current=await page.evaluate(p=>window.renderFrame(p),{...params,mode:'current'});
 const corrected=await page.evaluate(p=>window.renderFrame(p),{...params,mode:'left'});
 const fast=await readFile(fastPath),full=await readFile(fullPath);
 const row={name,source,frameIndex,rawSha256:createHash('sha256').update(raw).digest('hex'),fastVsFull:stats(full,fast),currentVsFull:stats(full,current),correctedVsFull:stats(full,corrected),currentVsFast:stats(fast,current),correctedVsFast:stats(fast,corrected)};
 rows.push(row);console.log(name,JSON.stringify(row));
}
await writeFile(`${dir}/result.json`,JSON.stringify({browser:browser.version(),rows},null,2)+'\n');
}finally{await browser.close();await server.close();}
