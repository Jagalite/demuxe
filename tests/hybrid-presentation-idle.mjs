// SPDX-License-Identifier: Apache-2.0
// Clean headed Chrome process-family idle baseline for the presentation campaign.
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out=process.env.OUT??'results/hybrid-presentation/idle-20260923.json';
const result={windows:[]};
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 result.browser=browser.version();const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
 const page=await context.newPage();await page.goto('about:blank');await page.waitForTimeout(5000);
 const cdp=await browser.newBrowserCDPSession();
 for(let i=0;i<3;i++){
  const a={at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo};
  await page.waitForTimeout(12000);
  const b={at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo};
  const before=new Map(a.processes.map(p=>[p.id,p]));const elapsed=(b.at-a.at)/1000;
  const processCPU=b.processes.map(p=>({type:p.type,oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
  result.windows.push({elapsed,processCPU,totalCPU:processCPU.reduce((n,p)=>n+p.oneCorePercent,0)});
  console.log(i+1,result.windows.at(-1).totalCPU.toFixed(1),processCPU.map(p=>p.type+':'+p.oneCorePercent.toFixed(1)).join(' '));
 }
 await context.close();
}finally{await browser.close();await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');}
