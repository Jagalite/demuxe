// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='results/software-yuv-fidelity/geometry';await mkdir(dir,{recursive:true});
const server=await serve({pagePath:'experiments/software-yuv-fidelity/page.html'}),browser=await chromium.launch({channel:'chrome',headless:true});
const cases=[];
const metrics=(a,b,w)=>{const errors=[];let sum=0,max=0,diff=0,worst=[];for(let i=0;i<a.length;i+=4){let px=0;for(let c=0;c<3;c++){const e=Math.abs(a[i+c]-b[i+c]);sum+=e;errors.push(e);px=Math.max(px,e);if(e>max){max=e;worst=[(i/4)%w,Math.floor(i/4/w),c,a[i+c],b[i+c]];}}if(px)diff++;}errors.sort((x,y)=>x-y);return {max,mean:+(sum/errors.length).toFixed(3),p95:errors[Math.ceil(errors.length*.95)-1],p99:errors[Math.ceil(errors.length*.99)-1],diffPct:+(diff*400/a.length).toFixed(2),worst};};
const analytic=(planes,w,h,dw,dh)=>{const cw=Math.ceil(w/2),ch=Math.ceil(h/2),out=new Uint8Array(dw*dh*4);
 const sample=(data,pw,ph,x,y)=>{const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,at=(xx,yy)=>data[Math.max(0,Math.min(ph-1,yy))*pw+Math.max(0,Math.min(pw-1,xx))];return (at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy;};
 for(let py=0;py<dh;py++)for(let px=0;px<dw;px++){
  const nx=(px+.5)/dw,ny=(py+.5)/dh;
  const yy=(sample(planes[0],w,h,nx*w-.5,ny*h-.5)-16)*255/219;
  const u=(sample(planes[1],cw,ch,nx*w/2-.25,ny*h/2-.5)-128)*255/224;
  const v=(sample(planes[2],cw,ch,nx*w/2-.25,ny*h/2-.5)-128)*255/224;
  const i=(py*dw+px)*4;out[i]=Math.max(0,Math.min(255,Math.round(yy+1.402*v)));out[i+1]=Math.max(0,Math.min(255,Math.round(yy-.344136*u-.714136*v)));out[i+2]=Math.max(0,Math.min(255,Math.round(yy+1.772*u)));out[i+3]=255;
 }return out;};
try{const page=await browser.newPage({viewport:{width:256,height:192}});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.renderFrame);
 for(const pattern of ['vertical','checker','diagonal','lumaRamp']){
  const raw=await readFile(`results/software-yuv-fidelity/${pattern}-601-limited-left.yuv`),w=64,h=48,cw=32,ch=24;
  const planes=[raw.subarray(0,w*h),raw.subarray(w*h,w*h+cw*ch),raw.subarray(w*h+cw*ch)];
  const base={w,h,planes:planes.map(p=>Array.from(p)),strides:[w,cw,cw],system:0,full:0,chroma:[-.5,0]};
  const full=await page.evaluate(p=>window.renderFrame(p),{...base,dw:w,dh:h});
  for(const [name,dw,dh] of [['up2',128,96],['upFraction',91,73],['downHalf',32,24],['downFraction',37,29],['oddDestination',93,71]]){
   const path=`${dir}/${pattern}-${name}.rgba`;execFileSync('build/yuv-fidelity-reference',[`results/software-yuv-fidelity/${pattern}-601-limited-left.yuv`,path,w,h,dw,dh,'601','limited','left','fullchr']);
   const reference=await readFile(path),linear=await page.evaluate(p=>window.renderFrame(p),{...base,dw,dh}),nearest=await page.evaluate(p=>window.renderFrame(p),{...base,dw,dh,filter:'nearest'});
   cases.push({pattern,mode:name,referenceVsLinear:metrics(reference,linear,dw),analyticVsLinear:metrics(analytic(planes,w,h,dw,dh),linear,dw),referenceVsNearest:metrics(reference,nearest,dw)});
  }
  for(const [name,x,y,sw,sh] of [['even',2,2,60,44],['oddX',1,0,62,48],['oddY',0,1,64,46],['oddXY',1,1,62,46]]){
   const cropped=await page.evaluate(p=>window.renderFrame(p),{...base,dw:sw,dh:sh,src:[x,y,sw,sh]});
   const expected=[];for(let row=y;row<y+sh;row++)expected.push(...full.slice((row*w+x)*4,(row*w+x+sw)*4));
   cases.push({pattern,mode:`crop-${name}`,fullFrameCropVsYuv:metrics(expected,cropped,sw)});
  }
  const padded=planes.map((p,i)=>{const pw=i?cw:w,ph=i?ch:h,stride=pw+8,out=new Uint8Array(stride*ph);out.fill(211);for(let row=0;row<ph;row++)out.set(p.subarray(row*pw,(row+1)*pw),row*stride);return out;});
  const paddedResult=await page.evaluate(p=>window.renderFrame(p),{...base,dw:w,dh:h,planes:padded.map(p=>Array.from(p)),strides:[w+8,cw+8,cw+8]});
  cases.push({pattern,mode:'paddedStride',contiguousVsPadded:metrics(full,paddedResult,w)});
  const dest=[13,7,91,73],canvasW=120,canvasH=90;
  const letter=await page.evaluate(p=>window.renderFrame(p),{...base,dw:canvasW,dh:canvasH,dst:dest});
  const image=await readFile(`${dir}/${pattern}-upFraction.rgba`),expected=new Uint8Array(canvasW*canvasH*4);for(let i=3;i<expected.length;i+=4)expected[i]=255;
  for(let row=0;row<dest[3];row++)expected.set(image.subarray(row*dest[2]*4,(row+1)*dest[2]*4),((dest[1]+row)*canvasW+dest[0])*4);
  cases.push({pattern,mode:'letterbox',referenceVsYuv:metrics(expected,letter,canvasW)});
 }
 const oddW=65,oddH=49,oddCW=33,oddCH=25,raw=new Uint8Array(oddW*oddH+2*oddCW*oddCH);raw.fill(128,0,oddW*oddH);
 for(let row=0;row<oddCH;row++)for(let col=0;col<oddCW;col++){const i=row*oddCW+col;raw[oddW*oddH+i]=col%2?220:36;raw[oddW*oddH+oddCW*oddCH+i]=row%2?220:36;}
 const oddPath=`${dir}/odd.yuv`,oddRgb=`${dir}/odd-fullchr.rgba`;await writeFile(oddPath,raw);execFileSync('build/yuv-fidelity-reference',[oddPath,oddRgb,oddW,oddH,oddW,oddH,'601','limited','left','fullchr']);
 const oddBase={w:oddW,h:oddH,dw:oddW,dh:oddH,planes:[Array.from(raw.subarray(0,oddW*oddH)),Array.from(raw.subarray(oddW*oddH,oddW*oddH+oddCW*oddCH)),Array.from(raw.subarray(oddW*oddH+oddCW*oddCH))],strides:[oddW,oddCW,oddCW],system:0,full:0,chroma:[-.5,0]};
 const odd=await page.evaluate(p=>window.renderFrame(p),oddBase);await writeFile(`${dir}/odd-yuv.rgba`,Buffer.from(odd));cases.push({pattern:'oddSource',mode:'1to1',referenceVsYuv:metrics(await readFile(oddRgb),odd,oddW),analyticVsYuv:metrics(analytic(oddBase.planes,oddW,oddH,oddW,oddH),odd,oddW)});
 for(const row of cases){
  if(row.referenceVsLinear)assert.ok(row.referenceVsLinear.max<=2&&row.referenceVsLinear.p99<=1,`${row.pattern}/${row.mode}: scaling reference bound`);
  if(row.mode==='letterbox')assert.ok(row.referenceVsYuv.max<=2&&row.referenceVsYuv.p99<=1,`${row.pattern}: letterbox reference bound`);
  if(row.contiguousVsPadded)assert.equal(row.contiguousVsPadded.max,0,`${row.pattern}: padded stride`);
 }
 await writeFile(`${dir}/result.json`,JSON.stringify({browser:browser.version(),cases},null,2)+'\n');
 console.log(JSON.stringify(cases.map(c=>({pattern:c.pattern,mode:c.mode,max:c.referenceVsLinear?.max??c.fullFrameCropVsYuv?.max??c.contiguousVsPadded?.max??c.referenceVsYuv?.max,p99:c.referenceVsLinear?.p99??c.fullFrameCropVsYuv?.p99??c.contiguousVsPadded?.p99??c.referenceVsYuv?.p99})),null,2));
}finally{await browser.close();await server.close();}
