import {execFileSync} from 'node:child_process';
// SPDX-License-Identifier: Apache-2.0
// Diagnostic trace only, not a performance qualification.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {collectCpuWindow,summarizeCpu} from './head-to-head/benchmark-browser.mjs';
import {serve} from './head-to-head/server.mjs';
import path from 'node:path';
const out=path.resolve('results/hevc-root-trace/20260926-06');await mkdir(out,{recursive:true});
const assets=path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01');
const server=await serve(assets,path.resolve('tests/head-to-head'),out+'/requests.jsonl');
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),cdp=await browser.newBrowserCDPSession();
 await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
 const catalogue=JSON.parse(await readFile(assets+'/fixtures/catalogue.json'));
 await page.evaluate(c=>api.start({...c,id:'demuxe.auto.hevc10-ac3',fixture:'hevc10-ac3',player:'demuxe',lane:'auto',correctness:false}),catalogue['hevc10-ac3']);
 await page.waitForTimeout(5000);
 const observations=[];
 const observe=async label=>{const samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>api.snapshot()),{seconds:8});observations.push({label,cpu:summarizeCpu(samples),samples});await writeFile(out+'/cpu.json',JSON.stringify(observations,null,2));console.log(label,JSON.stringify(observations.at(-1).cpu.roles));};
 await observe('before-task-trace');
 const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
 await writeFile(out+'/processes.json',JSON.stringify(processes,null,2));
 for(const type of ['GPU','renderer']){
  const process=processes.filter(p=>p.type===type).sort((a,b)=>b.cpuTime-a.cpuTime)[0];
  execFileSync('sample',[String(process.id),'3','1','-file',out+'/'+type+'.txt'],{timeout:15000});
 }
 await writeFile(out+'/state.json',JSON.stringify(await page.evaluate(()=>api.snapshot()),null,2));
 console.log('native samples complete');
}finally{await browser.close();await server.close();}
