// SPDX-License-Identifier: Apache-2.0
// Short Chrome traces on a matrix fixture; diagnostic, not CPU trials.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation-matrix/assets');
const family=process.env.CASE??'h264-1080p60';
const outputWidth=Number(process.env.CANVAS_WIDTH??960),outputHeight=Number(process.env.CANVAS_HEIGHT??Math.round(outputWidth*9/16));
const out=path.resolve(process.env.RESULTS??`results/hybrid-presentation-matrix/traces-${family}-${new Date().toISOString().replaceAll(':','-')}`);
const harness=path.resolve(process.env.HARNESS??`results/hybrid-presentation-matrix/${family}-five-rounds/${family}-harness`);
const seconds=Number(process.env.SECONDS??6);
const arms=(process.env.ARMS??'A,B,C').split(',').map(id=>({id,lane:id==='A'?'auto':'hybrid'}));
await fs.mkdir(out,{recursive:true});
const server=await serve(assets,harness,path.join(out,`requests-${Date.now()}-${process.pid}.jsonl`));
const result={createdAt:new Date().toISOString(),fixture:`${family}-aac.mkv`,outputWidth,outputHeight,seconds,arms:[]};
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
   await page.evaluate(id=>{globalThis.__hybridGapNoDraw=id==='C';globalThis.__hybridExternalTexture=['D','E','F','G'].includes(id);globalThis.__hybridHandoffMode=({E:'offscreen',F:'clear-visible',G:'clear-offscreen'})[id]??'visible';},arm.id);
   await page.evaluate(({id,lane,file,canvasWidth,canvasHeight})=>api.start({id:`hybrid-matrix-trace-${id}`,player:'demuxe',lane,file,canvasWidth,canvasHeight}),
    {...arm,file:`${family}-aac.mkv`,canvasWidth:outputWidth,canvasHeight:outputHeight});
   await page.waitForFunction(id=>{const state=api.snapshot();return state.position>1&&(id==='A'?String(state.route).startsWith('native'):state.route==='hybrid'&&state.diagnostics?.backend?.presentation?.drawn>5);},arm.id,{timeout:25000});
   await page.waitForTimeout(3000);
   const cdp=await browser.newBrowserCDPSession();
   const categories=(process.env.LIGHT==='1'?
    ['toplevel','media','gpu','cc','viz','blink','renderer.scheduler','sequence_manager']:
    ['toplevel','media','disabled-by-default-media','devtools.timeline','disabled-by-default-devtools.timeline','v8','disabled-by-default-v8.cpu_profiler','cc','gpu','viz','skia','renderer.scheduler','sequence_manager']).join(',');
   await cdp.send('Tracing.start',{categories,options:'record-as-much-as-possible',transferMode:'ReturnAsStream'});
   const before=await page.evaluate(()=>api.snapshot());
   const cpuBefore=(await cdp.send('SystemInfo.getProcessInfo')).processInfo,cpuStart=performance.now();
   await page.waitForTimeout(seconds*1000);
   const after=await page.evaluate(()=>api.snapshot());
   const cpuAfter=(await cdp.send('SystemInfo.getProcessInfo')).processInfo,cpuElapsed=(performance.now()-cpuStart)/1000;
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
    categories,diagnosticCPU:{elapsed:cpuElapsed,before:cpuBefore,after:cpuAfter,note:'Tracing active; diagnostic only, separate from untraced CPU trials.'},
    before:{position:before.position,backend:before.diagnostics?.backend},after:{position:after.position,backend:after.diagnostics?.backend},
    mediaEvents,interestingEvents:top};
   result.arms.push(record);
   await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');
   console.log(`${arm.id}: ${record.route} ${events.length} events, ${mediaEvents.length} media events`);
   await page.evaluate(()=>api.stop());
  }finally{await browser.close();}
 }
}finally{await server.close();await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');}
