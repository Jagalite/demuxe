// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='results/software-yuv-fidelity',w=64,h=48,raw=await readFile(`${dir}/gray-601-limited-left.yuv`);
const planes=[Array.from(raw.subarray(0,w*h)),Array.from(raw.subarray(w*h,w*h+w*h/4)),Array.from(raw.subarray(w*h+w*h/4))];
const base={w,h,dw:w,dh:h,planes,strides:[w,w/2,w/2],system:0,full:0,chroma:[-.5,0]};
const server=await serve({pagePath:'experiments/software-yuv-fidelity/page.html'}),browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:w,height:h}});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.renderFrame);
const plain=await page.evaluate(p=>window.renderFrame(p),base),subtitle={x:9,y:7,w:8,h:6,rgba:[255,0,0,128]},composed=await page.evaluate(p=>window.renderFrame(p),{...base,subtitle});
const at=(data,x,y)=>data.slice((y*w+x)*4,(y*w+x)*4+4),samples={outside:at(composed,0,0),inside:at(composed,12,10),topMirror:at(composed,12,h-10),expectedInside:[Math.round((plain[(10*w+12)*4]+255)/2),Math.round(plain[(10*w+12)*4+1]/2),Math.round(plain[(10*w+12)*4+2]/2),255],plainInside:at(plain,12,10)};
const changed=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if([0,1,2].some(c=>composed[(y*w+x)*4+c]!==plain[(y*w+x)*4+c]))changed.push([x,y]);
const bounds=changed.length?[Math.min(...changed.map(p=>p[0])),Math.min(...changed.map(p=>p[1])),Math.max(...changed.map(p=>p[0])),Math.max(...changed.map(p=>p[1]))]:null;
const result={samples,bounds,changedPixels:changed.length};assert.deepEqual(bounds,[9,7,16,12]);assert.equal(changed.length,48);assert.deepEqual(samples.inside,samples.expectedInside);assert.deepEqual(samples.outside,at(plain,0,0));await writeFile(`${dir}/subtitle.json`,JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();await server.close();}
