// SPDX-License-Identifier: Apache-2.0
// Diagnostic trace only, not a performance qualification.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {serve} from './head-to-head/server.mjs';
import path from 'node:path';
const out=path.resolve('results/hevc-root-trace/20260926-01');await mkdir(out,{recursive:true});
const assets=path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01');
const server=await serve(assets,path.resolve('tests/head-to-head'),out+'/requests.jsonl');
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),cdp=await browser.newBrowserCDPSession();
 await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
 const catalogue=JSON.parse(await readFile(assets+'/fixtures/catalogue.json'));
 await page.evaluate(c=>api.start({...c,id:'demuxe.auto.hevc10-ac3',fixture:'hevc10-ac3',player:'demuxe',lane:'auto',correctness:false}),catalogue['hevc10-ac3']);
 await page.waitForTimeout(5000);
 const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 await cdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,v8,audio,media,gpu,viz,cc,disabled-by-default-v8.cpu_profiler',options:'record-as-much-as-possible',transferMode:'ReportEvents'});
 await page.waitForTimeout(8000);
 const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
 await writeFile(out+'/trace.json',JSON.stringify({traceEvents:events}));await writeFile(out+'/state.json',JSON.stringify(await page.evaluate(()=>api.snapshot()),null,2));
 console.log('trace',events.length);
}finally{await browser.close();await server.close();}
