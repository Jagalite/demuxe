// SPDX-License-Identifier: Apache-2.0
// Compare revisions without rebuilding or changing the working checkout. Only
// changed browser assets are overridden; both revisions share runtime binaries.
import {chromium,firefox,webkit} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const before=process.env.BEFORE??'HEAD^',after=process.env.AFTER??'HEAD';
const git=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
const revisions={before:git('rev-parse',before).toString().trim(),after:git('rev-parse',after).toString().trim()};
const changed=git('diff','--name-only',revisions.before,revisions.after,'--','web').toString().trim().split('\n').filter(p=>p.endsWith('.js'));
const assets={};
for(const [label,revision] of Object.entries(revisions)){
 assets[label]=new Map();
 for(const path of changed){try{assets[label].set('/'+path,git('show',`${revision}:${path}`));}catch{}}
}
const out=process.env.OUT??`results/startup-capability-comparison/run-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
const temp=await mkdtemp(join(tmpdir(),'demuxe-startup-'));
const mp4=resolve('build/fixtures/software-full/h264-aac.mp4'),mkv=join(temp,'aac.mkv');
execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',mp4,'-c','copy',mkv]);
const cases=[{name:'H264-AAC-MP4',file:mp4},{name:'H264-AAC-MKV',file:mkv},
 {name:'user-AC3-MKV',file:process.env.REPRO_FILE??'/Volumes/seed2/Projects/startup-repro/no_audio.mkv'}];
const server=await serve(),runs=[];
const repetitions=Number(process.env.REPETITIONS??5);
const metadata={revisions,repetitions,changedAssets:changed,
 metric:'Milliseconds from player.open to first nonuniform video image observed by requestAnimationFrame canvas sampling; open-ready recorded independently. Includes immediate play after open. Not physical display timing or first black-frame timing.',
 conditions:'One excluded warmup per revision/scenario/browser. Fresh browser context per run; HTTP cache disabled equally by routing; shared warmed server/runtime files and OS caches; alternating revision order. Imports and File input occur before timer. One browser runs at a time.'};
try{
 for(const name of (process.env.BROWSERS??'chrome,firefox,webkit').split(',')){
  const browser=await ({chrome:chromium,firefox,webkit}[name]).launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
  try{for(const scenario of cases)for(let repetition=-1;repetition<repetitions;repetition++)for(const label of repetition%2?['after','before']:['before','after']){
   const context=await browser.newContext();
   await context.route('**/*',async route=>{const body=assets[label].get(new URL(route.request().url()).pathname);if(body)await route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'},body});else await route.continue();});
   const page=await context.newPage();page.setDefaultTimeout(45000);
   const record={browser:name,version:browser.version(),scenario:scenario.name,repetition,label};runs.push(record);
   try{
    await page.goto(server.origin+'/experiment/page.html');
    await page.evaluate(async()=>{
     const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));
     const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);
    });
    await page.locator('#file').setInputFiles(scenario.file);
    Object.assign(record,await page.evaluate(async()=>{
     const sampler=document.createElement('canvas');sampler.width=32;sampler.height=18;
     const ctx=sampler.getContext('2d',{willReadFrequently:true});let firstContentMs,stopped=false;
     const started=performance.now();window.timing={};
     const scan=()=>{
      if(stopped)return;
      for(const surface of document.querySelectorAll('#surface video,#surface canvas')){
       if(surface instanceof HTMLVideoElement&&surface.readyState<2)continue;
       if(!surface.isConnected||getComputedStyle(surface).visibility==='hidden'||getComputedStyle(surface).display==='none')continue;
       try{ctx.clearRect(0,0,32,18);ctx.drawImage(surface,0,0,32,18);const data=ctx.getImageData(0,0,32,18).data;
        let min=255,max=0;for(let i=0;i<data.length;i+=4){const luminance=(data[i]+data[i+1]+data[i+2])/3;min=Math.min(min,luminance);max=Math.max(max,luminance);}
        if(max-min>12){firstContentMs=performance.now()-started;window.timing.firstContentMs=firstContentMs;return;}
       }catch{}
      }
      requestAnimationFrame(scan);
     };requestAnimationFrame(scan);
     try{
      await player.open(document.querySelector('#file').files[0]);const openMs=performance.now()-started;window.timing.openMs=openMs;
      // Measure first visible content, including the paused-open frame. Waiting
      // for play() would conflate this with later audio/output verification.
      let playError;void player.play().catch(error=>{playError=String(error);});
      while(firstContentMs===undefined&&performance.now()-started<45000)await new Promise(r=>setTimeout(r,10));
      if(firstContentMs===undefined)throw Error('No visible video content within 45 seconds');
      return {openMs,firstContentMs,playError,mode:player.mode,plan:player.diagnostics.plan?.id,attempts:player.diagnostics.selection?.attempts};
     }finally{stopped=true;}
    }));
    console.log(name,scenario.name,repetition,label,Math.round(record.firstContentMs),record.plan);
   }catch(error){record.error=String(error);record.failure=await page.evaluate(()=>({timing:window.timing,state:player.state,diagnostics:player.diagnostics,video:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime,ready:v.readyState,error:v.error?.message}))})).catch(()=>null);console.log('FAIL',record.error,record.failure?.timing,record.failure?.video);process.exitCode=1;}
   finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await context.close();await writeFile(out+'/result.json',JSON.stringify({metadata,runs},null,2)+'\n');}
  }}finally{await browser.close();}
 }
 const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
 const summary=[];
 for(const browser of [...new Set(runs.map(r=>r.browser))])for(const scenario of cases){
  const group=runs.filter(r=>r.browser===browser&&r.scenario===scenario.name&&r.repetition>=0),row={browser,scenario:scenario.name};
  for(const label of ['before','after']){const valid=group.filter(r=>r.label===label&&!r.error);row[label]={n:valid.length,firstContentMs:median(valid.map(r=>r.firstContentMs)),openMs:median(valid.map(r=>r.openMs)),minMs:Math.min(...valid.map(r=>r.firstContentMs)),maxMs:Math.max(...valid.map(r=>r.firstContentMs)),plans:[...new Set(valid.map(r=>r.plan))]};}
  row.deltaMs=row.after.firstContentMs-row.before.firstContentMs;row.deltaPercent=100*row.deltaMs/row.before.firstContentMs;summary.push(row);
 }
 await writeFile(out+'/summary.json',JSON.stringify({metadata,summary},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}finally{await server.close();await rm(temp,{recursive:true,force:true});}
