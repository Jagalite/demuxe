// SPDX-License-Identifier: Apache-2.0
// Exploratory matched Auto-vs-Hybrid CPU blocks; correctness must pass first.
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {collectCpuWindow,summarizeCpu} from './head-to-head/benchmark-browser.mjs';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const root='build/head-to-head/assets-release-supplement-20260925-04/fixtures';
const cases={
  'ac3-5.1':`${root}/h264-ac3/index.mkv`,
  'eac3-5.1':`${root}/h264-eac3/index.mkv`,
  'dts-5.1':`${root}/h264-dts/index.mkv`,
  'hevc-eac3':`${root}/hevc10-eac3/index.mkv`,
  'ac3-ass':'build/selective-production/h264-ac3-ass.mkv',
};
const names=(process.env.CPU_CASES??'ac3-5.1,eac3-5.1,dts-5.1,ac3-ass').split(',');
const out='results/native-video-component-routing/cpu-'+new Date().toISOString().replaceAll(':','-');
await mkdir(out,{recursive:true});
const server=await serve(),rows=[];
try{
  for(const name of names){
    const file=cases[name];if(!file)throw Error('Unknown CPU fixture '+name);
    const bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');
    // One Chrome process per fixture; fresh context per arm, ABBA order.
    const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
    try{
      for(const [index,arm] of ['hybrid','native','native','hybrid'].entries()){
        const row={name,arm,round:index<2?1:2,order:index+1,file,sha256,browser:browser.version(),headless:false,warmupSeconds:3,windowSeconds:8,processScope:'all CDP Chrome processes'};rows.push(row);
        const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
        try{
          const page=await context.newPage();await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
          await page.evaluate(async arm=>{
            const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),arm==='hybrid'?{mode:'hybrid'}:{});
            window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail)));
            const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
          },arm);
          await page.locator('#source').setInputFiles(file);
          const opened=performance.now();await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));await page.evaluate(()=>player.play());
          await page.waitForFunction(()=>player.state.currentTime>.2,undefined,{timeout:30000});row.startupMs=performance.now()-opened;
          await page.waitForTimeout(3000);
          const cdp=await browser.newBrowserCDPSession();
          try{
            row.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>({plan:player.diagnostics.plan?.id,time:player.state.currentTime,frames:player.current.backend.video?.getVideoPlaybackQuality?.().totalVideoFrames??player.diagnostics.backend?.rendered??0,underruns:player.diagnostics.backend?.mpvAudio?.preEofUnderruns,errors,visible:document.visibilityState==='visible',focused:document.hasFocus()})),{seconds:8,interval:1});
          }finally{await cdp.detach();}
          row.cpu=summarizeCpu(row.samples);
          const first=row.samples[0].state,last=row.samples.at(-1).state;
          row.accepted=row.cpu.processIdsStable&&row.samples.every(sample=>!sample.state.errors.length&&sample.state.visible&&sample.state.focused)&&
            Math.abs(last.time-first.time-row.cpu.wallSeconds)<.6&&last.frames>first.frames&&
            (arm==='hybrid'?last.plan==='hybrid':last.plan===(name==='ac3-ass'?'native-video-mpv-audio-subtitles':'native-video-mpv-audio')&&last.underruns===0);
          await page.evaluate(()=>player.destroy());
        }catch(error){row.accepted=false;row.error=String(error?.stack??error);}
        finally{await context.close();await writeFile(out+'/result.json',JSON.stringify(rows,null,2)+'\n');}
        console.log(name,arm,index+1,JSON.stringify({accepted:row.accepted,cpu:row.cpu?.oneCorePercent,startupMs:row.startupMs,error:row.error}));
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
    }finally{await browser.close();}
  }
}finally{await server.close();}
console.log(out);
