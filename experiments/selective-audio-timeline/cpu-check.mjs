// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const out=path.resolve(`results/selective-audio-timeline/cpu-${Date.now()}`);await fs.mkdir(out,{recursive:true});const results=[];
for(const [index,arm] of ['prior','timeline','timeline','prior'].entries()){
 const dir=path.join(out,index+'-'+arm);await fs.mkdir(dir);const harness=path.join(dir,'harness');await fs.mkdir(harness);
 const experiment=arm==='prior'?'experiments/selective-audio-sync':'experiments/selective-audio-timeline';
 for(const f of ['poc.html','poc.mjs'])await fs.copyFile(path.join(experiment,f),path.join(harness,f));
 const server=await serve(path.resolve(arm==='prior'?'build/selective-audio-sync':'build/selective-audio-timeline/assets'),harness,path.join(dir,'requests.jsonl'));
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 try{const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);await page.evaluate(()=>poc.start('C'));await page.waitForTimeout(4000);
 const cdp=await browser.newBrowserCDPSession();const read=async()=>({at:performance.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>poc.snapshot())});
 const first=await read();await page.waitForTimeout(20000);const last=await read();const dt=(last.at-first.at)/1000;const before=new Map(first.processes.map(p=>[p.id,p]));
 const roles={browser:0,renderer:0,gpu:0,audioService:0,other:0};let stable=first.processes.length===last.processes.length;
 for(const p of last.processes){const a=before.get(p.id);if(!a){stable=false;continue;}const role=p.type==='browser'?'browser':p.type==='renderer'?'renderer':p.type==='GPU'?'gpu':p.type.includes('audio.mojom.AudioService')?'audioService':'other';roles[role]+=100*(p.cpuTime-a.cpuTime)/dt;}
 const row={index,arm,browser:browser.version(),elapsed:dt,stable,roles,whole:Object.values(roles).reduce((a,b)=>a+b,0),first,last};results.push(row);console.log(arm,{whole:row.whole,...roles,underruns:last.state.preEofUnderruns-first.state.preEofUnderruns});
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(results,null,2));await page.evaluate(()=>poc.stop());
 }finally{await browser.close();await server.close();}
}
