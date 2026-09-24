// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const fixture='build/yuv-cpu-investigation/primaries-bt470m.mp4';
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=12','-t','4','-vf','format=yuv420p,setparams=range=tv:color_primaries=bt470m:color_trc=bt709:colorspace=bt709:chroma_location=left','-c:v','libx264','-x264-params','colorprim=bt470m:transfer=bt709:colormatrix=bt709:chromaloc=0','-an',fixture]);
const probe=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=pix_fmt,color_primaries,color_space,color_transfer,chroma_location','-of','json',fixture],{encoding:'utf8'});
const tags=JSON.parse(probe).streams[0];
assert.equal(tags.pix_fmt,'yuv420p');assert.equal(tags.color_primaries,'bt470m');
const caption='build/yuv-cpu-investigation/rotation-caption.srt';
await writeFile(caption,'1\n00:00:00,000 --> 00:00:04,000\nUpright subtitle\n');
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','build/yuv-cpu-investigation/rotation.mp4','-i',caption,'-map','0:v:0','-map','1:s:0','-c:v','copy','-c:s','mov_text','-disposition:s:0','default','build/yuv-cpu-investigation/rotation-subtitles.mp4']);
const out=`results/software-yuv-integration/admission-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const server=await serve({pagePath:'experiments/software-yuv-fidelity/player.html',mediaPaths:{primaries:fixture,prores:'build/yuv-cpu-investigation/prores-pcm.mov',odd:'build/yuv-cpu-investigation/odd-yuv420p.mkv',rotation:'build/yuv-cpu-investigation/rotation.mp4','rotation-sub':'build/yuv-cpu-investigation/rotation-subtitles.mp4'}});
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{channel:'chrome'}),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[];
try{
 for(const [name,variant,width,height,expected] of [['primaries','auto',96,64,'color-primaries'],['prores','auto',640,360,'pixel-format'],['prores','rgb',640,360,'forced-rgb'],['odd','auto',65,49,'odd-source-dimensions'],['odd','rgb',65,49,'forced-rgb'],['rotation','auto',240,320,'rotation'],['rotation','rgb',240,320,'forced-rgb'],['rotation-sub','auto',240,320,'rotation'],['rotation-sub','rgb',240,320,'forced-rgb']]){
  console.log('Checking',name,variant);
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  try{
   await page.goto(server.origin+'/experiment/page.html');
   const info=await page.evaluate(p=>openFixture(p.variant,p.url,p.width,p.height,2),{variant,url:server.origin+'/media/'+name,width,height});
   assert.deepEqual(info.errors,[]);assert.equal(info.backend.softwarePresenter,'rgb');assert.equal(info.backend.yuvRejectionReason,expected);
   const file=`${out}/${name}-${variant}.png`;
   await page.locator('canvas').screenshot({path:file});
   const selectedSub=await page.evaluate(()=>player.properties.get('track-list')?.some(t=>t.type==='sub'&&t.selected));
   if(name==='rotation-sub')assert.equal(selectedSub,true,'Rotated subtitle must be selected');
   rows.push({name,variant,tags:name==='primaries'?tags:undefined,presenter:info.backend.softwarePresenter,rejection:info.backend.yuvRejectionReason,pts:info.backend.yuv?.lastPts,selectedSub,file});
   const cleanup=await page.evaluate(async()=>{const logs=[];player.addEventListener('log',e=>logs.push(e.detail));try{await player.destroy();return {logs};}catch(error){return {logs,error:String(error)};}});
   assert.equal(cleanup.error,undefined,JSON.stringify(cleanup));
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
const pixels=path=>execFileSync('ffmpeg',['-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:640*360*4+4096});
const metrics={};
for(const name of ['prores','odd','rotation','rotation-sub']){
 const auto=pixels(`${out}/${name}-auto.png`),rgb=pixels(`${out}/${name}-rgb.png`);
 assert.equal(auto.length,rgb.length);
 const errors=[];for(let i=0;i<auto.length;i+=4)for(let c=0;c<3;c++)errors.push(Math.abs(auto[i+c]-rgb[i+c]));
 errors.sort((a,b)=>a-b);
 metrics[name]={max:errors.at(-1),p99:errors[Math.floor((errors.length-1)*.99)],mean:errors.reduce((a,b)=>a+b,0)/errors.length};
}
await writeFile(`${out}/result.json`,JSON.stringify({rows,metrics},null,2)+'\n');
for(const [name,m] of Object.entries(metrics))assert.ok(m.max<=2&&m.p99<=1,`${name} RGB fallback differs from legacy RGB: ${JSON.stringify(m)}`);
console.log(JSON.stringify({out,metrics,rows:rows.map(({name,variant,rejection})=>({name,variant,rejection}))}));
