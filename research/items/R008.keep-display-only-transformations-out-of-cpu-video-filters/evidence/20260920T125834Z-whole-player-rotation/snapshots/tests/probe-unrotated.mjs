// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import {serve} from '../../../../tests/head-to-head/server.mjs';
const root=path.resolve('build/research-r008-unrotated-01'),out=path.resolve(process.argv[2]);await fs.mkdir(out,{recursive:false});
const result={started:new Date().toISOString(),trials:[]};
for(const lane of ['software','hybrid']){
 let browser,server;const r={lane};result.trials.push(r);
 try{
 server=await serve(root+'/assets',root+'/harness',out+'/'+lane+'-requests.jsonl');
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:320,height:180}});r.console=[];page.on('console',m=>r.console.push(m.text()));page.on('pageerror',e=>r.console.push(String(e)));
 await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
 r.start=await page.evaluate(async lane=>await api.start({file:'r008-bt709.mkv',id:'r008',player:'demuxe',lane,correctness:true}),lane);
 await page.waitForTimeout(2500);r.playing=await page.evaluate(()=>api.snapshot());await page.evaluate(()=>api.pause());await page.evaluate(()=>api.seek(1));await page.waitForTimeout(700);r.seek=await page.evaluate(()=>api.snapshot());await page.screenshot({path:out+'/'+lane+'-seek1.png'});
 r.geometry=await page.evaluate(()=>r008Player.state);r.cleanup=await page.evaluate(()=>api.stop());r.passed=true;
 }catch(e){r.error=String(e.stack);r.passed=false;}finally{await browser?.close();await server?.close();await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));}
}
