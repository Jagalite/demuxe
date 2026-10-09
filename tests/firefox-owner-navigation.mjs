// SPDX-License-Identifier: Apache-2.0
import {firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const arm=process.env.OWNER_ARM||'baseline',out=`results/firefox-owner-navigation/${arm}`;await mkdir(out,{recursive:true});
const report={arm,cycles:[],events:[],passed:false},save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
let browser;
try{
 browser=await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1400,height:600}});page.setDefaultTimeout(30000);
 page.on('crash',()=>report.events.push({event:'crash',time:Date.now()}));page.on('pageerror',e=>report.events.push({event:'pageerror',message:String(e),time:Date.now()}));
 for(let cycle=0;cycle<40;cycle++){
  const row={cycle,phase:'navigation',passed:false};report.cycles.push(row);await save();
  try{
   await page.goto(origin+'/');await page.waitForFunction(()=>window.player);const v=page.locator('demuxe-player');
   row.phase='open';await v.locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&!player.state.pendingOperation);
   for(const mode of ['native','software','hybrid']){row.phase=mode;await save();await page.evaluate(m=>player.setMode(m),mode);await v.evaluate(el=>Array.from(el.shadowRoot.querySelectorAll('video,canvas'),surface=>surface.getBoundingClientRect().width));}
   row.phase='paint';await page.screenshot({path:out+'/latest.png'});row.passed=true;console.log('PASS active navigation cycle',cycle,arm);
  }catch(error){row.error=String(error.stack);throw error;}finally{await save();}
 }
 await page.evaluate(()=>player.destroy());report.passed=report.cycles.length===40&&report.cycles.every(r=>r.passed)&&report.events.length===0;
 if(!report.passed)process.exitCode=1;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});server.kill();await save();}
