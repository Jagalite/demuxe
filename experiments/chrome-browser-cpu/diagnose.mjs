// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {launchBenchmarkChrome,processSample,delay} from '../../tests/head-to-head/benchmark-browser.mjs';
const exec=promisify(execFile),out=process.argv[2];
const {browser,identity}=await launchBenchmarkChrome();
const cdp=await browser.newBrowserCDPSession();
if(process.env.TRACE)await cdp.send('Tracing.start',{categories:'toplevel,toplevel.flow,base,sequence_manager',transferMode:'ReturnAsStream'});
const context=await browser.newContext({viewport:{width:960,height:540}});const page=await context.newPage();await page.goto('about:blank');await page.bringToFront();
const samples=[],profiles=[];let previous,profiled=false;
try{
 for(let i=0;i<=Number(process.env.TICKS??60);i++){
  const s=await processSample(cdp);samples.push(s);
  const p=s.processes.find(p=>p.type==='browser');
  if(previous){const pct=100000*(p.cpuTime-previous.cpu)/(s.at-previous.at);console.log(`${i*2}s browser=${pct.toFixed(1)}% PID=${p.id}`);
   if(pct>20&&!profiled&&!process.env.TRACE){profiled=true;profiles.push(exec('/usr/bin/sample',[String(p.id),'5','1','-file',`${out}/browser-high.sample.txt`],{maxBuffer:2e6}).then(r=>({ok:true,stdout:r.stdout,stderr:r.stderr})).catch(e=>({error:String(e)})));}
  }
  previous={cpu:p.cpuTime,at:s.at};
  await fs.writeFile(`${out}/raw.json`,JSON.stringify({identity,samples},null,2));
  if(i<Number(process.env.TICKS??60))await delay(2000);
 }
 await fs.writeFile(`${out}/profiles.json`,JSON.stringify(await Promise.all(profiles),null,2));
if(process.env.TRACE){const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const {stream}=await done;let data='';for(;;){const r=await cdp.send('IO.read',{handle:stream});data+=r.data;if(r.eof)break;}await fs.writeFile(`${out}/trace.json`,data);await cdp.send('IO.close',{handle:stream});}
}finally{await browser.close();}
