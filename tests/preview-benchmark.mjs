// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=process.env.OUT??`results/preview/${new Date().toISOString().replaceAll(':','-')}`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);
 const records=await page.evaluate(async()=>{
  await window.player.destroy();const {Player}=await import('/web/generated/index.js');const p=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'never',preview:{debounceMs:0}});
  await p.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4'));
  const records=[];try{for(const time of [0.2,1.2,2.2,3.2,0.8,1.8,2.8,3.8]){const f=await p.preview.getFrame({time,width:240,height:135});if(!f)throw Error('Missing baseline preview');records.push({requestedTime:f.requestedTime,actualTime:f.actualTime,estimatedTime:f.time,provider:f.path,temporalAccuracy:f.temporalAccuracy,fidelity:f.fidelity,cache:f.cache,width:f.width,height:f.height,...f.metrics});}}finally{await p.destroy();}return records;
 });
 const groups={};for(const row of records){const key=`${row.provider}/${row.temporalAccuracy}/${row.cache}`;(groups[key]??=[]).push(row.totalMs);}
 const summary=Object.fromEntries(Object.entries(groups).map(([key,values])=>{values.sort((a,b)=>a-b);return [key,{samples:values.length,medianMs:(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2,minMs:values[0],maxMs:values.at(-1)}];}));
 const sourceHashes={};for(const path of ['src/preview/controller.ts','src/preview/providers.ts','src/preview/images.ts','src/internal/shaka-backend.ts','src/internal/shaka-network.ts'])sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
 const report={sourceHashes,browser:browser.version(),fixture:'fixtures/example.mp4',sha256:createHash('sha256').update(await readFile('fixtures/example.mp4')).digest('hex'),notes:'Local browser media-time baseline; actual PTS, sample lookup, byte reads and decoder-internal phases are unavailable and remain null. No exact-frame/keyframe equivalence claim. Debounce disabled for measurement.',summary,records};
 await mkdir(out,{recursive:true});await writeFile(out+'/benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,summary},null,2));
}finally{await browser?.close();server.kill();}
