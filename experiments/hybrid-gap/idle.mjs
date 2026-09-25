// SPDX-License-Identifier: Apache-2.0
// Fresh headed Chrome control with the same launch and CPU sampling method.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const out=path.resolve(process.env.RESULTS??`results/hybrid-gap/idle-${new Date().toISOString().replaceAll(':','-')}.json`);
const rounds=Number(process.env.ROUNDS??3),warmup=Number(process.env.WARMUP??4),seconds=Number(process.env.SECONDS??20);
const result={rounds,warmup,seconds,trials:[]};
await fs.mkdir(path.dirname(out),{recursive:true});
for(let round=1;round<=rounds;round++){
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
  const page=await context.newPage();await page.goto('about:blank');await page.waitForTimeout(warmup*1000);
  const cdp=await browser.newBrowserCDPSession();
  const first=(await cdp.send('SystemInfo.getProcessInfo')).processInfo,begin=performance.now();
  await page.waitForTimeout(seconds*1000);
  const last=(await cdp.send('SystemInfo.getProcessInfo')).processInfo,elapsed=(performance.now()-begin)/1000;
  const before=new Map(first.map(p=>[p.id,p]));
  if(last.length!==first.length||last.some(p=>!before.has(p.id)))throw Error('Chrome process turnover');
  const processes=last.map(p=>({id:p.id,type:p.type,cpu:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
  result.trials.push({round,chrome:browser.version(),elapsed,processes,whole:processes.reduce((n,p)=>n+p.cpu,0)});
  await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');
  console.log(`idle ${round}: ${result.trials.at(-1).whole.toFixed(1)}%`);
 }finally{await browser.close();}
}
