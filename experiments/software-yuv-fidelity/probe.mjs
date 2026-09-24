// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='results/software-yuv-fidelity';await mkdir(dir,{recursive:true});
const W=64,H=48,CW=W/2,CH=H/2;
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const patterns={
 gray:(x,y)=>[128,128,128],
 primaries:(x,y)=>[[81,90,240],[145,54,34],[41,240,110],[200,128,128]][Math.floor(x/16)],
 lumaRamp:(x,y)=>[16+219*x/(W-1),128,128],
 chromaRamp:(x,y)=>[128,16+224*x/(W-1),240-224*y/(H-1)],
 vertical:(x,y)=>[128,x<32?40:216,x<32?216:40],
 horizontal:(x,y)=>[128,y<24?40:216,y<24?216:40],
 onePixel:(x,y)=>[128,x<31?40:x===31?128:216,x<31?216:x===31?128:40],
 twoPixel:(x,y)=>[128,x<30?40:x<32?128:216,x<30?216:x<32?128:40],
 checker:(x,y)=>[128,(Math.floor(x/2)+Math.floor(y/2))%2?32:224,(Math.floor(x/2)+Math.floor(y/2))%2?224:32],
 diagonal:(x,y)=>[128,x<y+8?40:216,x<y+8?216:40],
};
const cases=[];
function stats(ref,test,w,h){const err=[];let sum=0,diff=0,max=0,worst=[];for(let i=0;i<ref.length;i+=4){let px=0;for(let c=0;c<3;c++){const d=Math.abs(ref[i+c]-test[i+c]);err.push(d);sum+=d;px=Math.max(px,d);if(d>max){max=d;worst=[i/4%w,Math.floor(i/4/w),c,ref[i+c],test[i+c]];}}if(px)diff++;}err.sort((a,b)=>a-b);return {max,mean:+(sum/err.length).toFixed(3),p95:err[Math.ceil(err.length*.95)-1],p99:err[Math.ceil(err.length*.99)-1],diffPct:+(100*diff/(w*h)).toFixed(2),worst};}
const server=await serve({pagePath:'experiments/software-yuv-fidelity/page.html'});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:256,height:192},deviceScaleFactor:1});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.renderFrame);
for(const matrix of ['601','709'])for(const range of ['limited','full'])for(const loc of ['left','center'])for(const [name,pattern] of Object.entries(patterns)){
 const y=new Uint8Array(W*H),u=new Uint8Array(CW*CH),v=new Uint8Array(CW*CH);
 for(let row=0;row<H;row++)for(let col=0;col<W;col++)y[row*W+col]=clamp(pattern(col,row)[0]);
 for(let row=0;row<CH;row++)for(let col=0;col<CW;col++){const val=pattern(2*col,2*row);u[row*CW+col]=clamp(val[1]);v[row*CW+col]=clamp(val[2]);}
 const raw=Buffer.concat([y,u,v]);const id=`${name}-${matrix}-${range}-${loc}`;const rawPath=`${dir}/${id}.yuv`,rgbPath=`${dir}/${id}.rgba`,fullPath=`${dir}/${id}-fullchr.rgba`;
 await writeFile(rawPath,raw);
 execFileSync('build/yuv-fidelity-reference',[rawPath,rgbPath,W,H,W,H,matrix,range,loc,'bilinear']);
 execFileSync('build/yuv-fidelity-reference',[rawPath,fullPath,W,H,W,H,matrix,range,loc,'fullchr']);
 const reference=await readFile(rgbPath),fullReference=await readFile(fullPath),params={w:W,h:H,dw:W,dh:H,planes:[Array.from(y),Array.from(u),Array.from(v)],strides:[W,CW,CW],system:matrix==='709'?1:0,full:range==='full'?1:0};
 const current=await page.evaluate(p=>window.renderFrame(p),{...params,mode:'current'});
 const offset=await page.evaluate(p=>window.renderFrame(p),{...params,mode:'left'});
 const row={id,rawSha256:createHash('sha256').update(raw).digest('hex'),fullVsRgb:stats(fullReference,reference,W,H),fullVsCurrent:stats(fullReference,current,W,H),fullVsOffset:stats(fullReference,offset,W,H),referenceVsCurrent:stats(reference,current,W,H),referenceVsOffset:stats(reference,offset,W,H)};
 // The old same-coordinate sampling is deliberately retained as a negative
 // control. A left-sited chroma edge must not silently become center-sited.
 assert.ok((loc==='left'?row.fullVsOffset:row.fullVsCurrent).max<=2,`${id}: declared chroma siting exceeds independent reference`);
 if(id==='vertical-601-limited-left')assert.ok(row.fullVsCurrent.max>=20&&row.fullVsOffset.max<=1,'left chroma phase regression');
 cases.push(row);
}
await writeFile(`${dir}/probe.json`,JSON.stringify({source:process.env.SOURCE_SHA||'',browser:browser.version(),referenceVersion:execFileSync('pkg-config',['--modversion','libswscale'],{encoding:'utf8'}).trim(),cases},null,2)+'\n');
console.log(JSON.stringify(cases.filter(x=>x.id.startsWith('vertical-601-limited')||x.id.startsWith('gray-601-limited')),null,2));
}finally{await browser.close();await server.close();}
