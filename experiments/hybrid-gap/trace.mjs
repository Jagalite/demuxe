// SPDX-License-Identifier: Apache-2.0
// Short Chrome traces on the same frozen fixture; diagnostic, not CPU trials.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const assets=path.resolve('build/hybrid-gap/assets');
const out=path.resolve(process.env.RESULTS??`results/hybrid-gap/traces-${new Date().toISOString().replaceAll(':','-')}`);
const harness=path.resolve(process.env.HARNESS??'results/hybrid-gap/20260924-h264-five-rounds/h264-1080p60-harness');
const seconds=Number(process.env.SECONDS??6);
const arms=[{id:'A',lane:'auto'},{id:'B',lane:'hybrid'},{id:'C',lane:'hybrid'}];
await fs.mkdir(out,{recursive:true});
const server=await serve(assets,harness,path.join(out,`requests-${Date.now()}-${process.pid}.jsonl`));
const result={createdAt:new Date().toISOString(),fixture:'h264-1080p60-aac.mkv',seconds,arms:[]};
try{
 for(const arm of arms){
  const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
  try{
   const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
   const media=await page.context().newCDPSession(page),mediaEvents=[];
   for(const event of ['playerPropertiesChanged','playerEventsAdded','playerMessagesLogged','playerErrorsRaised'])
    media.on(`Media.${event}`,data=>mediaEvents.push({event,data}));
   await media.send('Media.enable');
   await page.goto(server.origin+'/harness/harness.html');
   await page.waitForFunction(()=>window.api);
   await page.evaluate(noDraw=>{globalThis.__hybridGapNoDraw=noDraw;},arm.id==='C');
   await page.evaluate(({id,lane})=>api.start({id:`hybrid-gap-trace-${id}`,player:'demuxe',lane,file:'h264-1080p60-aac.mkv'}),arm);
   await page.waitForFunction(id=>{const state=api.snapshot();return state.position>1&&(id==='A'?String(state.route).startsWith('native'):state.route==='hybrid'&&state.diagnostics?.backend?.presentation?.drawn>5);},arm.id,{timeout:25000});
   await page.waitForTimeout(3000);
   const cdp=await browser.newBrowserCDPSession();
   const categories=['toplevel','media','disabled-by-default-media','devtools.timeline','disabled-by-default-devtools.timeline','v8','disabled-by-default-v8.cpu_profiler','cc','gpu','viz','skia','renderer.scheduler','sequence_manager'].join(',');
   await cdp.send('Tracing.start',{categories,options:'record-as-much-as-possible',transferMode:'ReturnAsStream'});
   const before=await page.evaluate(()=>api.snapshot());
   await page.waitForTimeout(seconds*1000);
   const after=await page.evaluate(()=>api.snapshot());
   const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   await cdp.send('Tracing.end');
   const {stream}=await complete,chunks=[];
   for(;;){const part=await cdp.send('IO.read',{handle:stream,size:1024*1024});chunks.push(part.base64Encoded?Buffer.from(part.data,'base64'):Buffer.from(part.data));if(part.eof)break;}
   await cdp.send('IO.close',{handle:stream});
   const raw=Buffer.concat(chunks);
   await fs.writeFile(path.join(out,`${arm.id}-trace.json.gz`),gzipSync(raw));
   const trace=JSON.parse(raw),events=trace.traceEvents??[];
   const counts={},durationUs={};
   for(const event of events){const name=event.name;if(!name)continue;counts[name]=(counts[name]??0)+1;if(event.ph==='X'&&event.dur)durationUs[name]=(durationUs[name]??0)+event.dur;}
   const interesting=/video|decode|canvas|draw|raster|composit|texture|mailbox|frame|gpu|media/i;
   const top=Object.entries(counts).filter(([name])=>interesting.test(name)).sort((a,b)=>b[1]-a[1]).slice(0,120).map(([name,count])=>({name,count,durationUs:durationUs[name]??0}));
   const record={arm:arm.id,browserVersion:browser.version(),route:after.route,traceEvents:events.length,traceBytes:raw.length,
    before:{position:before.position,backend:before.diagnostics?.backend},after:{position:after.position,backend:after.diagnostics?.backend},
    mediaEvents,interestingEvents:top};
   result.arms.push(record);
   await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');
   console.log(`${arm.id}: ${record.route} ${events.length} events, ${mediaEvents.length} media events`);
   await page.evaluate(()=>api.stop());
  }finally{await browser.close();}
 }
}finally{await server.close();await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');}
