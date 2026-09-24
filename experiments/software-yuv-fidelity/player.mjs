// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='results/software-yuv-fidelity';
const server=await serve({pagePath:'experiments/software-yuv-fidelity/player.html',mediaPaths:{synthetic:`${dir}/vertical-left.mkv`}});
const rows=[];
try{for(const variant of ['rgb','yuv']){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{const page=await browser.newPage({viewport:{width:64,height:48},deviceScaleFactor:1});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.openFixture);const info=await page.evaluate(p=>window.openFixture(p.variant,p.url),{variant,url:server.origin+'/media/synthetic'});await page.locator('canvas').screenshot({path:`${dir}/actual-${variant}.png`});await writeFile(`${dir}/actual-${variant}.json`,JSON.stringify(info,null,2)+'\n');rows.push({variant,info});console.log(variant,JSON.stringify(info));await page.evaluate(()=>player.destroy());}finally{await browser.close();}
 }
 await writeFile(`${dir}/actual-player.json`,JSON.stringify(rows,null,2)+'\n');
}finally{await server.close();}
for(const variant of ['rgb','yuv']){
 const rgba=execFileSync('ffmpeg',['-v','error','-i',`${dir}/actual-${variant}.png`,'-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:1000000});
 for(const [name,path] of [['fast',`${dir}/vertical-601-limited-left.rgba`],['fullchr',`${dir}/vertical-601-limited-left-fullchr.rgba`]]){
  const reference=await readFile(path);let max=0,sum=0,diff=0;
  for(let i=0;i<rgba.length;i+=4){let px=0;for(let c=0;c<3;c++){const e=Math.abs(rgba[i+c]-reference[i+c]);sum+=e;max=Math.max(max,e);px=Math.max(px,e);}if(px)diff++;}
  console.log(variant,name,{max,mean:sum/(64*48*3),diffPct:diff*100/(64*48)});
  if((variant==='rgb'&&name==='fast')||(variant==='yuv'&&name==='fullchr'))assert.ok(max<=2,`${variant}: independent reference bound`);
 }
}
