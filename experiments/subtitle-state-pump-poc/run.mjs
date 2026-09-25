// SPDX-License-Identifier: Apache-2.0
// Isolated real-time cadence comparison. No production worker or host edits.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {serve} from '../pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-state-pump-poc');
const late=process.env.SCENARIO==='late';
const mediaStart=late?199.5:0;
const fixtures=late?{srt:{path:'results/subtitle-stack-upgrade/late-three.mkv',starts:[200],duration:1.5},ass:{path:'results/subtitle-state-pump-poc/late-static-ass.mkv',starts:[200],duration:1.5}}:{srt:{path:'results/subtitle-stack-upgrade/wakeup-static.mkv',starts:[1,3,8],duration:9.5},ass:{path:'results/subtitle-stack-upgrade/same-text-style.mkv',starts:[3,4],duration:11.5}};
const lanes=process.env.LANES?.split(',')??['reference','60','30','15','10','5'];
const kinds=process.env.KINDS?.split(',')??['srt','ass'];
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const cdp=await browser.newBrowserCDPSession();
const report={createdAt:new Date().toISOString(),chrome:browser.version(),protocol:{scenario:late?'late-interleaved':'multi-cue',mediaStart,realTime:true,reference:'60 Hz full worker render RPC',pump:'PTS + update_subtitles; render at decoded boundaries',lateThresholdMs:100,runsPerCell:1},fixtures:{},lanes:[]};
for(const [kind,fixture] of Object.entries(fixtures))report.fixtures[kind]={...fixture,sha256:createHash('sha256').update(await readFile(fixture.path)).digest('hex')};
const cpu=async()=>(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
try{
 for(const kind of kinds)for(const lane of lanes){
  const fixture=fixtures[kind],page=await browser.newPage({viewport:{width:960,height:540}});
  const cell={kind,lane,fixture:fixture.path};report.lanes.push(cell);
  try{
   await page.route('**/web/engine-subtitles/service.mjs',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(root+'/engine/service.mjs')}));
   await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service.wasm')}));
   await page.route('**/web/mpv-subtitle-worker.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    const marker="}else if(d.type==='render'){";
    if(!source.includes(marker))throw Error('Worker patch target drift');
    source=source.replace(marker,`}else if(d.type==='pump'){
      if(!Number.isFinite(d.seconds))throw Error('Invalid PTS');
      const started=performance.now();engine._subtitle_service_block(0);
      let ready=0,calls=0,nativeMs=0;
      for(let i=0;i<400&&!ready;i++){
       check();const a=performance.now();ready=engine._subtitle_poc_update(d.seconds);nativeMs+=performance.now()-a;calls++;
       if(ready<0)ready=0;if(!ready)await delay(5);
      }
      engine._subtitle_service_block(1);
      if(!ready)throw Error('Subtitle packet deadline exceeded');
      const view=new DataView(engine.HEAPU8.buffer),ptr=timingPointer;
      const timingStatus=engine._subtitle_service_next_raw_boundary(-.001,ptr,ptr+8);
      const firstNext=view.getFloat64(ptr,true),epoch=view.getUint32(ptr+8,true),boundaries=[];
      if(epoch!==globalThis.pocEpoch){
       globalThis.pocEpoch=epoch;let from=-.001;
       for(let i=0;i<32;i++){
        const status=engine._subtitle_service_next_raw_boundary(from,ptr,ptr+8);
        if(status!==1)break;
        const next=view.getFloat64(ptr,true);
        if(!Number.isFinite(next)||next>500||next<=from+.00001)break;
        boundaries.push(next);from=next+.0001;
       }
      }
      postMessage({id:d.id,ready,calls,nativeMs,workerMs:performance.now()-started,epoch,timingStatus,firstNext,boundaries,avChains:engine._subtitle_service_av_chains()});return;
    }else if(d.type==='render'){`);
    const call='ready=engine._subtitle_service_render(d.seconds,d.width,d.height);';
    if(!source.includes(call))throw Error('Render call patch target drift');
    source=source.replace('let ready=0;\n    for(let i=0;i<400&&!ready;i++){','let ready=0,nativeMs=0,nativeCalls=0;\n    for(let i=0;i<400&&!ready;i++){');
    source=source.replace(call,'const nativeStart=performance.now();ready=engine._subtitle_service_render(d.seconds,d.width,d.height);nativeMs+=performance.now()-nativeStart;nativeCalls++;');
    source=source.replace('postMessage({id:d.id,bitmap,unchanged:','postMessage({id:d.id,bitmap,nativeMs,nativeCalls,unchanged:');
    await route.fulfill({response,body:source});
   });
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(fixture.path);
   await page.evaluate(async(mediaStart)=>{
    const file=document.querySelector('#media').files[0],worker=new Worker('/web/mpv-subtitle-worker.js',{type:'module'});
    let id=0,start=0;const pending=new Map(),notifications=[];
    worker.onmessage=({data})=>{
      if(data.type==='subtitleTimingChanged'){notifications.push({epoch:data.epoch,at:(performance.now()-start)/1000});return;}
      const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data);
    };
    worker.onerror=e=>{for(const p of pending.values())p.reject(Error(e.message));pending.clear();};
    const request=(type,extra={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});worker.postMessage({id:key,type,...extra});});
    const font=await (await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer();
    const init=await request('init',{file,fonts:[{name:'DejaVuSans.ttf',bytes:font}]});
    await request('select',{trackId:init.tracks[0].mpvId});
    if(mediaStart>0)await request('seek',{seconds:mediaStart});
    window.poc={worker,request,notifications,setStart:value=>start=value,tracks:init.tracks};
   },mediaStart);
   const before=await cpu();
   await page.evaluate(({lane,duration,mediaStart})=>{
    const poc=window.poc,reference=lane==='reference',hz=reference?60:Number(lane),period=1000/hz;
    const started=performance.now();poc.setStart(started);
    const updates=[],renders=[],known=new Map(),timers=new Map(),errors=[];
    let nextTick=0,busy=false,finished=false;
    const current=()=>Math.max(0,(performance.now()-started)/1000);
    const mediaNow=()=>mediaStart+current();
    const render=async(target,reason)=>{
      const sent=mediaNow();
      try{const result=await poc.request('render',{seconds:Math.max(sent,target),width:640,height:360,force:false});
       result.bitmap?.close();renders.push({target,reason,sent,done:mediaNow(),nativeMs:result.nativeMs,nativeCalls:result.nativeCalls,hasOverlay:result.hasOverlay,text:result.text});}
      catch(e){errors.push(String(e));}
    };
    const addBoundary=boundary=>{
      if(known.has(boundary))return;
      known.set(boundary,mediaNow());
      if(!reference&&boundary<=mediaStart+duration+.02&&boundary>mediaStart-.01){
       const wait=Math.max(0,(boundary-mediaNow())*1000);
       timers.set(boundary,setTimeout(()=>{timers.delete(boundary);void render(boundary,'deadline');},wait));
      }
    };
    const tick=async()=>{
      if(finished)return;
      const now=mediaNow();
      if(current()>=duration)return;
      if(!busy){
       busy=true;const sent=now;
       try{
        if(reference){await render(sent,'full-60hz');updates.push({sent,done:mediaNow(),calls:0,nativeMs:0});}
        else{const result=await poc.request('pump',{seconds:sent});updates.push({sent,done:mediaNow(),calls:result.calls,nativeMs:result.nativeMs,workerMs:result.workerMs,epoch:result.epoch,timingStatus:result.timingStatus,firstNext:result.firstNext,boundaries:result.boundaries,text:result.text,avChains:result.avChains});for(const boundary of result.boundaries)addBoundary(boundary);}
       }catch(e){errors.push(String(e));}
       busy=false;
      }
      nextTick++;const delay=Math.max(0,started+nextTick*period-performance.now());setTimeout(tick,delay);
    };
    void tick();
    window.poc.done=new Promise(resolve=>setTimeout(async()=>{
      finished=true;for(const timer of timers.values())clearTimeout(timer);
      while(busy)await new Promise(r=>setTimeout(r,5));
      await new Promise(r=>setTimeout(r,80));
      resolve({elapsed:current(),updates,renders,known:[...known].map(([boundary,discovered])=>({boundary,discovered})),notifications:poc.notifications,errors});
    },duration*1000+100));
   },{lane,duration:fixture.duration,mediaStart});
   const result=await page.evaluate(()=>window.poc.done);
   const after=await cpu();
   const processes=after.map(p=>({id:p.id,type:p.type,cpuSeconds:p.cpuTime-(before.find(q=>q.id===p.id)?.cpuTime??p.cpuTime)}));
   const reference=lane==='reference';
   const starts=fixture.starts.map(start=>{
    const discovery=result.known.find(x=>Math.abs(x.boundary-start)<.002);
    const render=result.renders.find(x=>x.reason==='deadline'&&Math.abs(x.target-start)<.002);
    const firstFull=result.renders.find(x=>x.reason==='full-60hz'&&x.sent>=start);
    return {start,discoveredAt:discovery?.discovered??null,discoveryLatencyMs:discovery?1000*(discovery.discovered-start):null,renderSentAt:render?.sent??firstFull?.sent??null,renderLatencyMs:render?1000*(render.sent-start):firstFull?1000*(firstFull.sent-start):null,late:!reference&&(!render||render.done-start>.1)};
   });
   Object.assign(cell,{elapsed:result.elapsed,updates:result.updates.length,updateSamples:late?result.updates:undefined,updateCalls:result.updates.reduce((n,x)=>n+(x.calls??0),0),updateCallsPerSecond:result.updates.reduce((n,x)=>n+(x.calls??0),0)/result.elapsed,fullRenders:result.renders.length,fullRendersPerSecond:result.renders.length/result.elapsed,nativeUpdateMs:result.updates.reduce((n,x)=>n+(x.nativeMs??0),0),nativeRenderMs:result.renders.reduce((n,x)=>n+(x.nativeMs??0),0),workerPumpMs:result.updates.reduce((n,x)=>n+(x.workerMs??0),0),cpuSeconds:processes.reduce((n,x)=>n+x.cpuSeconds,0),processes,starts,discoveredBoundaries:result.known,notifications:result.notifications,errors:result.errors,renderEvents:result.renders.map(x=>({target:x.target,reason:x.reason,sent:x.sent,done:x.done,nativeMs:x.nativeMs,hasOverlay:x.hasOverlay}))});
   await page.evaluate(()=>window.poc.worker.postMessage({type:'close'}));
   if(cell.errors.length)throw Error(cell.errors.join('; '));
   console.log(kind,lane,JSON.stringify({updateHz:cell.updateCallsPerSecond,renderHz:cell.fullRendersPerSecond,nativeUpdateMs:cell.nativeUpdateMs,nativeRenderMs:cell.nativeRenderMs,cpuSeconds:cell.cpuSeconds,starts:cell.starts}));
  }catch(error){cell.error=String(error.stack||error);console.error(kind,lane,cell.error);}
  finally{await page.close();await mkdir(root,{recursive:true});await writeFile(root+(late?'/raw-late.json':'/raw.json'),JSON.stringify(report,null,2)+'\n');}
 }
}finally{await browser.close();await server.close();}
if(report.lanes.some(x=>x.error))process.exitCode=1;
