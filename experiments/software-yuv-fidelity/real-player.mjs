// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='results/software-yuv-fidelity/real-player';await mkdir(dir,{recursive:true});
const server=await serve({pagePath:'experiments/software-yuv-fidelity/player.html',mediaPaths:{mpeg2ts:'build/yuv-cpu-investigation/mpeg2-ac3.ts',mpeg2ps:'build/yuv-cpu-investigation/mpeg2-mp2.mpg',mpeg4avi:'build/yuv-cpu-investigation/mpeg4-mp3.avi'}}),rows=[],w=960,h=540;
const metrics=(a,b)=>{const errors=[];let sum=0,max=0,diff=0;for(let i=0;i<a.length;i+=4){let px=0;for(let c=0;c<3;c++){const e=Math.abs(a[i+c]-b[i+c]);sum+=e;errors.push(e);max=Math.max(max,e);px=Math.max(px,e);}if(px)diff++;}errors.sort((x,y)=>x-y);return {max,mean:+(sum/errors.length).toFixed(3),p99:errors[Math.ceil(errors.length*.99)-1],diffPct:+(diff*100/(w*h)).toFixed(2)};};
try{for(const name of ['mpeg2ts','mpeg2ps','mpeg4avi'])for(const variant of ['rgb','yuv']){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const row={name,variant,browser:browser.version()};rows.push(row);
 try{const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.openFixture);
  row.info=await page.evaluate(p=>window.openFixture(p.variant,p.url,960,540,4),{variant,url:`${server.origin}/media/${name}`});
  row.canvas=await page.locator('canvas').evaluate(e=>({width:e.width,height:e.height}));
  const png=`${dir}/${name}-${variant}.png`;await page.locator('canvas').screenshot({path:png});
  const actual=execFileSync('ffmpeg',['-v','error','-i',png,'-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:3_000_000});
  const base=`results/software-yuv-fidelity/real/${name}-n${name==='mpeg4avi'?119:120}`;
  row.vsFast=metrics(await readFile(`${base}-fast.rgba`),actual);row.vsFull=metrics(await readFile(`${base}-fullchr.rgba`),actual);
  assert.equal(row.info.backend?.softwarePresenter,variant==='rgb'?'rgb':'yuv',`${name}: presenter selection`);
  assert.ok((variant==='rgb'?row.vsFast:row.vsFull).max<=3,`${name}: independent reference bound`);
  console.log(name,variant,row.info.backend?.presentedPosition,row.info.backend?.yuv?.lastPts,row.vsFast,row.vsFull);
  await page.evaluate(()=>player.destroy());
 }catch(e){row.error=String(e.stack||e);console.error(name,variant,row.error);process.exitCode=1;}finally{await browser.close();await writeFile(`${dir}/result.json`,JSON.stringify(rows,null,2)+'\n');}
 }
}finally{await server.close();await writeFile(`${dir}/result.json`,JSON.stringify(rows,null,2)+'\n');}
