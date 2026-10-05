// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const origin=process.env.ORIGIN??'http://127.0.0.1:4187';
const output=process.env.OUTPUT??`results/native-subtitle-selection/chrome-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.goto(origin+'/examples/custom-controls.html');
 await page.evaluate(await readFile('tests/native-subtitle-selection-timing.browser.js','utf8'));
 const report=await page.evaluate(async({trials,instrumentWorker})=>{const {Player}=await import('/web/generated/index.js');return runSubtitleTiming(Player,trials,{instrumentWorker});},{trials:Number(process.env.TRIALS??5),instrumentWorker:process.env.INSTRUMENT_WORKER==='1'});
 report.browser=browser.version();report.head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();report.dirty=true;
 report.files=Object.fromEntries(await Promise.all(['tests/native-subtitle-selection-timing.browser.js','web/generated/internal/native-mpv-subtitles.js','web/mpv-subtitle-worker.js','web/engine-subtitles/service.wasm','fixtures/example.mp4','fixtures/qualification.ass'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
 await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,qualification:report.qualification,trials:report.trials.map(({worker,failureDiagnostics,...r})=>r)},null,2));
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
