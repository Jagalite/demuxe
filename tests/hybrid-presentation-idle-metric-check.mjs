// SPDX-License-Identifier: Apache-2.0
// Check whether CDP SystemInfo.getProcessInfo perturbs the Chrome browser process.
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
const exec=promisify(execFile);
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const result={segments:[]};
const cpu=async()=>{
 const {stdout}=await exec('/bin/ps',['-p',String(result.pid),'-o','time=']);
 const parts=stdout.trim().split(':').map(Number);return parts.reduce((n,v)=>n*60+v,0);
};
try{
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});await page.goto('about:blank');await page.waitForTimeout(5000);
 const cdp=await browser.newBrowserCDPSession();
 result.pid=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.find(p=>p.type==='browser')?.id;
 if(!result.pid)throw Error('Browser PID not exposed');
 for(let i=0;i<2;i++){
  const start=Date.now(),a=await cpu();await page.waitForTimeout(12000);const b=await cpu();
  result.segments.push({kind:'os-idle',elapsed:(Date.now()-start)/1000,cpuSeconds:b-a});
 }
 for(let i=0;i<4;i++){
  const start=Date.now(),a=await cpu();
  const cdpStart=Date.now();await cdp.send('SystemInfo.getProcessInfo');const cdpMs=Date.now()-cdpStart;
  const b=await cpu();result.segments.push({kind:'cdp-call',elapsed:(Date.now()-start)/1000,cdpMs,cpuSeconds:b-a});
 }
 console.log(result);
}finally{await browser.close();await fs.writeFile('results/hybrid-presentation/idle-metric-check-20260923.json',JSON.stringify(result,null,2)+'\n');}
