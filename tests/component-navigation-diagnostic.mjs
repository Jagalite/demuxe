// SPDX-License-Identifier: Apache-2.0
// Diagnostic only: compare abrupt navigation with awaited owner cleanup.
import {firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const cleanup=process.env.NAV_CLEANUP==='1',out=`results/component-navigation/${cleanup?'awaited':'abrupt'}`;
await mkdir(out,{recursive:true});
const report={cleanup,cycles:[],events:[],passed:false};
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
let browser;
try{
 browser=await firefox.launch({headless:true});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1400,height:600}});page.setDefaultTimeout(30000);
 page.on('crash',()=>report.events.push({type:'crash',time:Date.now()}));browser.on('disconnected',()=>report.events.push({type:'disconnected',time:Date.now()}));
 for(let cycle=0;cycle<30;cycle++){
  const row={cycle,phase:'navigate',passed:false};report.cycles.push(row);await save();
  await page.goto(origin+'/');await page.waitForFunction(()=>window.player);
  row.phase='open';await page.locator('demuxe-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&!player.state.pendingOperation);
  for(const mode of ['native','software','hybrid']){row.phase=mode;await save();await page.evaluate(m=>player.setMode(m),mode);}
  if(cleanup){row.phase='destroy';await save();await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('demuxe-player')].map(p=>p.destroy()));});}
  row.phase='next navigation';await save();await page.goto(origin+'/');row.passed=true;console.log('PASS navigation cycle',cycle,cleanup?'awaited':'abrupt');await save();
 }
 report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;console.error(error);}
finally{await browser?.close().catch(()=>{});server.kill();await save();}
