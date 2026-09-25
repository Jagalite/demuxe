// SPDX-License-Identifier: Apache-2.0
// Diagnostic only: sample Chrome's own browser process while about:blank is idle.
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
const run=promisify(execFile);
const out='results/hybrid-presentation/idle-browser-sample-20260923.txt';
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});await page.goto('about:blank');await page.waitForTimeout(5000);
 const cdp=await browser.newBrowserCDPSession();const before=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
 const browserPid=before.find(p=>p.type==='browser')?.id;
 if(!browserPid)throw Error('Browser PID not exposed');
 let sampling;try{sampling=await run('/usr/bin/sample',[String(browserPid),'5','-file',out],{timeout:30000});}catch(error){sampling={error:String(error),stdout:error.stdout,stderr:error.stderr};}
 const after=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;const a=before.find(p=>p.id===browserPid),b=after.find(p=>p.id===browserPid);
 await fs.writeFile('results/hybrid-presentation/idle-browser-sample-20260923.json',JSON.stringify({browserPid,cpuSeconds:b.cpuTime-a.cpuTime,sampling},null,2)+'\n');
 console.log('browser',browserPid,'cpuSeconds',b.cpuTime-a.cpuTime,'sample',sampling.error??'ok');
}finally{await browser.close();}
