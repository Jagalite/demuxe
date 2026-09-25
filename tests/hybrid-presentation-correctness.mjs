// SPDX-License-Identifier: Apache-2.0
// Test-only lifecycle/visible-output checks for a selected Hybrid presenter.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from './head-to-head/server.mjs';
const root=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation/assets-20260923');
const out=path.resolve(process.env.OUT??`results/hybrid-presentation/correctness-${Date.now()}`);
const arm=process.env.ARM??'webgl2',name=process.env.CASE??'h264-ac3';
const fixture=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')))[name];
await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(root,'tests/head-to-head',file),path.join(harness,file));
const adapter=path.join(harness,'adapters.mjs');
await fs.writeFile(adapter,(await fs.readFile(adapter,'utf8')).replace('if(c.componentTrial)window.componentPlayer=player;','window.__presentationPlayer=player;'));
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
const result={arm,name,steps:[],status:'running'};
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
 await page.evaluate(value=>{globalThis.__hybridPresentationArm=value;},arm);
 await page.evaluate(c=>api.start(c),{id:'demuxe.auto.'+name,player:'demuxe',lane:'auto',fixture:name,...fixture});
 const state=()=>page.evaluate(()=>api.snapshot());
 const step=async label=>{
  await page.waitForTimeout(450);const s=await state();
  await page.locator('#stage').screenshot({path:path.join(out,label+'.png')});
  result.steps.push({label,position:s.position,paused:s.paused,route:s.route,
    decoded:s.diagnostics?.backend?.decoderStats?.frames,drawn:s.diagnostics?.backend?.presentation?.drawn,
    retained:s.diagnostics?.backend?.presentation?.retained,pending:s.diagnostics?.backend?.presentation?.pending,
    underruns:await page.evaluate(()=>window.__presentationPlayer?.current?.backend?.audioDiagnostics?.()?.underruns),errors:s.errors});
  if(s.errors.length||s.route!=='hybrid')throw Error(label+' route/error: '+s.errors);
  return s;
 };
 await page.waitForFunction(()=>api.snapshot().position>1);
 await step('initial');
 await page.evaluate(()=>api.pause());const paused=await step('paused');
 await page.waitForTimeout(850);const held=await step('held');
 if(Math.abs(held.position-paused.position)>.2)throw Error('Pause did not hold position');
 await page.evaluate(()=>api.resume());await page.waitForTimeout(900);const resumed=await step('resumed');
 if(resumed.position<held.position+.5)throw Error('Resume did not advance');
 await page.evaluate(()=>api.seek(11));const forward=await step('forward-seek');
 if(Math.abs(forward.position-11)>1)throw Error('Forward seek did not settle');
 await page.evaluate(()=>api.seek(2));const backward=await step('backward-seek');
 if(Math.abs(backward.position-2)>1)throw Error('Backward seek did not settle');
 await page.evaluate(()=>api.rate(1.5));await page.waitForTimeout(1200);const fast=await step('rate-1.5');
 if(fast.position<backward.position+1.3)throw Error('Playback rate did not advance');
 await page.evaluate(()=>api.rate(1));
 await page.evaluate(()=>api.seek(34));await page.waitForTimeout(2700);const eof=await step('eof');
 if(eof.position<35.5)throw Error('EOF did not arrive');
 result.cleanup=await page.evaluate(()=>api.stop());
 if(result.cleanup.remainingSurfaces!==0)throw Error('Canvas survived cleanup');
 if(errors.length)throw Error('Browser errors: '+errors.join('; '));
 result.status='passed';
 await context.close();
}catch(error){result.status='failed';result.error=String(error.stack??error);}
finally{await browser?.close();await server.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(out,result.status,result.error?.split('\n')[0]);}
