// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {chromium} from 'playwright';

const root=process.cwd(),dir='experiments/webgpu-compute-decoder';
const frameCount=Number(process.env.FRAMES||900);
const modes=(process.env.MODES||'readback,resident').split(',');
const output=`${dir}/raw/run-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith(`/${dir}/`))throw Error('Outside experiment');
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(resolve(root,dir)+'/'))throw Error('Outside experiment');
    const body=await readFile(file);
    res.setHeader('Content-Type',{'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html'}[extname(file)]||'application/octet-stream');
    res.end(body);
  }catch(error){res.writeHead(404).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const result={date:new Date().toISOString(),git:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  toolchain:{node:process.version,playwright:JSON.parse(await readFile('node_modules/playwright/package.json','utf8')).version},
  headless:process.env.HEADED!=='1',
  host:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,
    memoryBytes:os.totalmem()},fixture:JSON.parse(await readFile(`${dir}/raw/fixture.json`,'utf8')),
  protocol:`${frameCount} sequential reconstruction frames, selected PTS 0..${frameCount-1} at 640x360; queue completion awaited; repeated first-frame coefficients; synthetic clock/PTS, no mpv bridge`,
  trials:[]};
const save=()=>writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');
let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:process.env.HEADED!=='1',
    args:['--autoplay-policy=no-user-gesture-required']});
  result.browserVersion=browser.version();
  for(const mode of modes){
    const trial={mode,pageErrors:[],consoleErrors:[]};result.trials.push(trial);
    const page=await browser.newPage({viewport:{width:700,height:450}});
    page.on('pageerror',error=>trial.pageErrors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')trial.consoleErrors.push(message.text());});
    try{
      await page.goto(`${origin}/${dir}/page.html`);
      trial.ready=await page.evaluate(async mode=>window.start(mode,await fetch('./raw/coefficients.i32').then(r=>r.arrayBuffer())),mode);
      const cdp=await browser.newBrowserCDPSession();
      const processes=async()=>new Map((await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>[p.id,p.cpuTime]));
      const before=await processes(),start=performance.now();
      const presented=await page.evaluate(async count=>{
        let first,last,orderCorrect=true;
        for(let i=0;i<count;i++){const frame=await window.frame(i);if(i===0)first=frame.stats;
          last=frame.stats;orderCorrect &&= frame.pts===i;}
        return {first,last,orderCorrect};
      },frameCount);
      const elapsed=(performance.now()-start)/1000,after=await processes();
      let cpu=0;for(const [id,time] of after)if(before.has(id))cpu+=time-before.get(id);
      trial.processing={elapsedSeconds:elapsed,fps:frameCount/elapsed,browserCpuPercent:100*cpu/elapsed,
        first:presented.first,last:presented.last};
      trial.orderCorrect=presented.orderCorrect;
      const screenshot=`${output}/${mode}.png`;await page.screenshot({path:screenshot});trial.screenshot=screenshot;
      const pacedStart=performance.now();
      trial.clock=await page.evaluate(async()=>{const observed=[];
        for(let i=0;i<12;i++)observed.push((await window.frame(300000+i,33.333)).pts);
        return {observed};
      });
      trial.clock.elapsedSeconds=(performance.now()-pacedStart)/1000;
      trial.clock.correct=trial.clock.observed.every((pts,i)=>pts===300000+i)&&trial.clock.elapsedSeconds>=.35;
      trial.beforeReset=await page.evaluate(async()=>{
        for(let i=900100;i<900103;i++)await window.queue(i);
        window.scheduleSelection(900100,500);
        return window.reset();
      });
      await page.waitForTimeout(550);
      trial.afterCancelledDeadline=await page.evaluate(()=>window.getMessages().filter(m=>m.type==='presented'&&m.pts===900100).length);
      trial.afterReset=await page.evaluate(async()=>window.frame(200));
      trial.destroy=await page.evaluate(()=>window.destroy());
      for(let attempt=0;attempt<30&&page.workers().length;attempt++)await page.waitForTimeout(100);
      trial.workersAfter=page.workers().length;
      trial.messages=await page.evaluate(()=>window.getMessages().map(({type,pts,error})=>({type,pts,error})));
      trial.passed=trial.orderCorrect&&trial.clock.correct&&trial.beforeReset.stats.retained===0&&trial.afterCancelledDeadline===0&&
        trial.destroy.stats.liveResources===0&&trial.destroy.stats.retained===0&&
        trial.workersAfter===0&&trial.pageErrors.length===0&&trial.consoleErrors.length===0;
    }catch(error){trial.error=String(error.stack||error);result.stoppedAt=mode;}
    finally{await save();await page.close();}
    if(trial.error)break;
  }
}catch(error){result.fatal=String(error.stack||error);}
finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  result.passed=result.trials.length===modes.length&&result.trials.every(t=>t.passed);await save();console.log(output);
  console.log(JSON.stringify({passed:result.passed,stoppedAt:result.stoppedAt,fatal:result.fatal,
    trials:result.trials.map(t=>({mode:t.mode,error:t.error,processing:t.processing&&{
      fps:t.processing.fps,browserCpuPercent:t.processing.browserCpuPercent}}))},null,2));
  if(!result.passed)process.exitCode=1;}
