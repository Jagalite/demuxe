// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
const dir='experiments/webgpu-compute-decoder',output=`${dir}/raw/baseline-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const server=await serve({pagePath:`${dir}/baseline.html`,mediaPaths:{movie:`${dir}/raw/prores-proxy.mov`,
  yuv:`${dir}/raw/yuv420-h264.mp4`}});
const result={date:new Date().toISOString(),host:{cpu:os.cpus()[0].model,arch:os.arch(),release:os.release()},
  toolchain:{node:process.version},headless:process.env.HEADED!=='1',
  git:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  scope:'640x360, 180-frame ProRes source and H.264 8-bit 4:2:0 transcode; 1 second warmup + 3 seconds playback; headless Chrome, separate process per case',trials:[]};
const save=()=>writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');
try{
  for(const [mode,media] of [['rgb','movie'],['yuv','movie'],['rgb','yuv'],['yuv','yuv']]){
    const trial={mode,media,errors:[]};result.trials.push(trial);
    const browser=await chromium.launch({channel:'chrome',headless:process.env.HEADED!=='1',
      args:['--autoplay-policy=no-user-gesture-required']});
    trial.browserVersion=browser.version();
    const page=await browser.newPage({viewport:{width:700,height:450}});
    page.on('pageerror',e=>trial.errors.push(String(e)));
    try{
      await page.goto(server.origin+'/experiment/page.html');
      trial.start=await page.evaluate(async({mode,url})=>window.start(mode,url),
        {mode,url:server.origin+`/media/${media}?id=${mode}-${media}`});
      await page.waitForTimeout(1000);
      const cdp=await browser.newBrowserCDPSession();
      const processes=async()=>new Map((await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>[p.id,p.cpuTime]));
      const first=await page.evaluate(()=>window.snapshot()),cpuFirst=await processes(),started=Date.now();
      await page.waitForTimeout(3000);
      const last=await page.evaluate(()=>window.snapshot()),cpuLast=await processes(),elapsed=(Date.now()-started)/1000;
      let cpu=0;for(const [id,time] of cpuLast)if(cpuFirst.has(id))cpu+=time-cpuFirst.get(id);
      trial.measure={first,last,elapsedSeconds:elapsed,fps:(last.frames-first.frames)/elapsed,
        browserCpuPercent:100*cpu/elapsed,positionAdvance:last.position-first.position,
        dropped:last.dropped-first.dropped};
      await page.screenshot({path:`${output}/${mode}-${media}.png`});
      trial.stop=await page.evaluate(()=>window.stop());
      trial.passed=trial.errors.length===0&&last.errors.length===0&&last.frames>first.frames&&
        trial.measure.positionAdvance>2.5;
    }catch(error){trial.error=String(error.stack||error);}
    finally{await save();await browser.close();}
  }
}finally{await server.close();result.passed=result.trials.length===4&&result.trials.every(t=>t.passed);
  await save();console.log(output);console.log(JSON.stringify({passed:result.passed,
    trials:result.trials.map(t=>({mode:t.mode,media:t.media,error:t.error,fps:t.measure?.fps,
      cpu:t.measure?.browserCpuPercent,position:t.measure?.positionAdvance}))},null,2));
  if(!result.passed)process.exitCode=1;}
