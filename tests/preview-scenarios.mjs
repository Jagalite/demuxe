// SPDX-License-Identifier: Apache-2.0
// Deterministic controller/UI-state experiment, not a codec or browser benchmark.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PreviewController} from '../web/generated/preview/controller.js';
import {initialScrubber,transitionScrubber,scrubberDistance} from '../web/generated/internal/machine/scrubber.js';

const duration=1440,stepMs=50,traceMs=30000;
const out=process.env.OUT??`results/preview-scenarios/${new Date().toISOString().replaceAll(':','-')}`;
const spreadOrder=Array.from({length:24},(_,i)=>i).sort((a,b)=>reverse(a)-reverse(b));
function reverse(n){let r=0;for(let i=0;i<5;i++){r=r*2+n%2;n=Math.floor(n/2);}return r;}
function coarseFine({duration,focus,interaction,budget}){
 const broadCount=Math.min(24,Math.floor(budget.maxEntries/3));
 const localCount=Math.max(1,budget.maxEntries-broadCount);
 const fine=interaction.source==='hover'&&interaction.dwellMs>=300;
 const spacing=fine?1:5,radius=fine?15:30,center=Math.floor(focus/spacing)*spacing;
 const local=[center];for(let d=spacing;d<=radius;d+=spacing)local.push(center+d,center-d);
 const broad=spreadOrder.slice(0,broadCount).map(i=>(i+.5)*duration/24);
 const result=[];let i=0,j=0;while(i<Math.min(localCount,local.length)||j<broad.length){for(let n=0;n<3&&i<Math.min(localCount,local.length);n++)result.push(local[i++]);if(j<broad.length)result.push(broad[j++]);}
 return result.filter(time=>time>=0&&time<duration).slice(0,256);
}
const policies=[
 ['demuxe',{type:'demuxe'}],['on-demand',{type:'on-demand'}],['uniform-48',{type:'uniform'}],['adaptive-24',{type:'adaptive'}],
 ['gaussian-25',{type:'gaussian'}],['gaussian-49',{type:'gaussian',samples:49}],
 ['directional-25',{type:'directional'}],['demuxe-prototype',{type:'custom',sample:coarseFine}],
];
const path=fn=>Array.from({length:300},(_,i)=>({at:i*100,time:Math.max(0,Math.min(duration-.001,fn(i*100)))}));
const scenarios=[
 {name:'stationary-dwell',events:[{at:0,time:720},{at:8000,time:721},{at:18000,time:720}]},
 {name:'near-playhead',events:path(ms=>30+ms/1000*.5)},
 {name:'fine-inspection',events:path(ms=>700+ms/1000*.25)},
 {name:'slow-scan',events:path(ms=>690+ms/1000*2)},
 {name:'fast-sweep',events:path(ms=>Math.min(1439,ms/20000*1439)).filter(e=>e.at<=20000)},
 {name:'reversals',events:path(ms=>{const t=(ms/1000)%12;return 300+(t<=6?t:12-t)*100;})},
 {name:'random-jumps',events:[90,720,1350,360,1080,720].map((time,i)=>({at:i*5000,time}))},
 {name:'revisit-regions',events:path(ms=>{const leg=Math.floor(ms/6000),base=leg%2?1100:700;return base+(ms%6000)/150;})},
 {name:'buffering-interruption',events:path(ms=>700+ms/1000*2),suspend:[10000,15000]},
];
const percentile=(values,q)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(q*(values.length-1)))]:null;
const round=n=>Math.round(n*1000)/1000;

test('preview behavior matrix with real controller and scrubber transitions',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);
 const results=[];
 async function run(scenario,name,strategy,latency,maxEntries,warmMs){
  const start=clock,completed=[],used=new Set(),useful=new Set();let decodeId=0,decodeMs=0,cancelled=0;
  const provider={id:'synthetic-native',priority:1,requiresDecoder:true,allowDuringPlayback:true,canHandle:()=>true,
   getFrame:r=>new Promise((resolve,reject)=>{
    const id=++decodeId,began=clock;
    const abort=()=>{clearTimeout(timer);decodeMs+=clock-began;cancelled++;reject(new DOMException('cancelled','AbortError'));};
    const timer=setTimeout(()=>{r.signal.removeEventListener('abort',abort);decodeMs+=clock-began;completed.push({id,time:r.time,at:clock-start});resolve({time:r.time,width:240,height:135,image:{blob:new Blob(['synthetic'])},path:`synthetic-${id}`});},latency);
    r.signal.addEventListener('abort',abort,{once:true});
   })};
  const c=new PreviewController([provider],{strategy,maxEntries,maxCacheBytes:maxEntries===24?4*1024*1024:16*1024*1024});
  c.setDuration(duration);c.setPlaybackActive(true);c.setPlaybackPosition(0);
  let ui=initialScrubber(),shown=null,target=null,activeAbort=null,settleTimer=null;
  let events=0,immediate=0,nearHits=0,peakEntries=0,peakBytes=0,blankTicks=0,usefulTicks=0,coarseTicks=0,ticks=0;
  const errors=[],firstUseful=[];let episode=null,lastMovement=-Infinity,movingTicks=0,movingUseful=0;
  const transition=command=>{const next=transitionScrubber(ui,command);ui=next.state;return next;};
  const show=frame=>{shown=frame;used.add(Number(frame.path.split('-')[1]));};
  const near=(frame,time)=>!!frame&&Math.abs(frame.time-time)<=1;
  const next=()=>{
   const decision=transition({type:'generate'});if(!decision.generate)return;
   const request=decision.generate,abort=new AbortController();activeAbort=abort;
   void c.getFrame({time:request.time,width:240,height:135,maxDistance:scrubberDistance(c.strategy,duration,true),signal:abort.signal}).then(frame=>{
    const done=transition({type:'generated',id:request.id,aborted:abort.signal.aborted,hasFrame:!!frame});
    if(done.show&&frame)show(frame);else if(done.clear)shown=null;
   }).catch(()=>{const done=transition({type:'generated',id:request.id,aborted:abort.signal.aborted,hasFrame:false});if(done.clear)shown=null;}).finally(()=>{if(activeAbort===abort)activeAbort=null;transition({type:'generation-finished',id:request.id});next();});
  };
  const sample=async(time,id,settled=false)=>{
   const frame=await c.getFrame({time,width:240,height:135,maxDistance:scrubberDistance(c.strategy,duration),cacheOnly:true});
   if(!settled&&frame){immediate++;if(near(frame,time))nearHits++;}
   const demuxe=c.strategy?.type==='demuxe';
   const refine=!!frame&&(demuxe&&settled||c.strategy?.type==='adaptive'&&Math.abs(frame.time-time)>scrubberDistance(c.strategy,duration,true));
   const cached=transition({type:'cache',hover:id,target:{owner:1,time},hit:!!frame,refine,defer:demuxe&&!settled});
   if(cached.show&&frame)show(frame);next();
  };
  const hover=async time=>{
   if(target!==time)lastMovement=clock;target=time;events++;const decision=transition({type:'hover'});
   clearTimeout(settleTimer);
   if(c.strategy?.type==='demuxe')settleTimer=setTimeout(()=>{
    if(ui.hover!==decision.id)return;
    const refined=transition({type:'hover'});void sample(time,refined.id,true);
   },180);
   await sample(time,decision.id);
  };
  const tick=async()=>{clock+=stepMs;t.mock.timers.tick(stepMs);await new Promise(setImmediate);const d=c.diagnostics;peakEntries=Math.max(peakEntries,d.cacheEntries);peakBytes=Math.max(peakBytes,d.cacheBytes);};
  for(let ms=0;ms<warmMs;ms+=stepMs){c.setPlaybackPosition(ms/1000);await tick();}
  let index=0;
  try{
   for(let ms=0;ms<traceMs;ms+=stepMs){
    c.setPlaybackPosition((warmMs+ms)/1000);
    c.setSuspended(!!scenario.suspend&&ms>=scenario.suspend[0]&&ms<scenario.suspend[1]);
    if(index<scenario.events.length&&scenario.events[index].at===ms){
     const event=scenario.events[index++];
     if(!episode||Math.abs(event.time-episode.time)>1){if(episode&&!episode.done)firstUseful.push(null);episode={time:event.time,at:clock,done:false};}
     await hover(event.time);
    }
    await tick();ticks++;if(clock-lastMovement<=300){movingTicks++;if(near(shown,target))movingUseful++;}
    if(shown&&Math.abs(shown.time-target)<=10)coarseTicks++;
    if(!shown)blankTicks++;else{errors.push(Math.abs(shown.time-target));if(near(shown,target)){usefulTicks++;useful.add(Number(shown.path.split('-')[1]));}}
    if(episode&&!episode.done&&near(shown,episode.time)){firstUseful.push(clock-episode.at);episode.done=true;}
   }
   if(episode&&!episode.done)firstUseful.push(null);
   const d=c.diagnostics;
   assert.ok(peakEntries<=maxEntries);assert.ok(peakBytes<=(maxEntries===24?4:16)*1024*1024);
   const measured=firstUseful.filter(n=>n!==null);
   return {scenario:scenario.name,policy:name,latencyMs:latency,maxEntries,warmMs,events,
    immediatePct:round(100*immediate/events),nearHitPct:round(100*nearHits/events),usefulTimePct:round(100*usefulTicks/ticks),blankTimePct:round(100*blankTicks/ticks),
    withinTenSecondsPct:round(100*coarseTicks/ticks),movingUsefulTimePct:movingTicks?round(100*movingUseful/movingTicks):null,movingTicks,
    p95ErrorSeconds:percentile(errors,.95),p95FulfilledLatencyMs:percentile(measured,.95),unfulfilledEpisodes:firstUseful.filter(n=>n===null).length,episodes:firstUseful.length,
    generated:completed.length,neverDisplayed:completed.filter(f=>!used.has(f.id)).length,neverUseful:completed.filter(f=>!useful.has(f.id)).length,cancelled,decodeMs,
    peakEntries,peakBytes,finalEntries:d.cacheEntries};
  }finally{clearTimeout(settleTimer);transition({type:'hide'});activeAbort?.abort();await c.destroy();await new Promise(setImmediate);performance.now.mock.resetCalls();}
 }
 for(const warmMs of [0,30000])for(const maxEntries of [24,96])for(const latency of [100,400,1000])for(const scenario of scenarios)for(const [name,strategy]of policies){
  results.push(await run(scenario,name,strategy,latency,maxEntries,warmMs));
 }
 const files=['tests/preview-scenarios.mjs','src/internal/machine/preview-demuxe.ts','web/generated/internal/machine/preview-demuxe.js','src/preview/controller.ts','src/preview/strategies.ts','src/preview/samplers.ts','src/internal/machine/preview.ts','src/internal/machine/preview-interaction.ts','src/internal/machine/preview-pregeneration.ts','src/internal/machine/scrubber.ts','src/player/preview.ts',
 'web/generated/preview/controller.js','web/generated/preview/strategies.js','web/generated/preview/samplers.js','web/generated/internal/machine/preview.js','web/generated/internal/machine/preview-interaction.js','web/generated/internal/machine/preview-pregeneration.js','web/generated/internal/machine/scrubber.js'];
 const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
 const report={kind:'deterministic-synthetic-provider',duration,traceMs,stepMs,cases:results.length,
 notes:['Actual PreviewController and scrubber state transitions; synthetic provider returns exact requested bucket after fixed latency.','No video decoding, network, image rendering, codec/keyframe costs, or playback frame drops are modeled.','Time advances in 50ms steps; provider latencies are assumptions, not measurements.','Near/useful means represented timestamp within one media second of hover. Error percentile excludes blank time, which is reported separately.','Moving means target changed in the last 300ms; stationary portions remain included in overall useful time.','Never displayed/useful counts are bounded by the 30-second trace horizon, not lifetime usefulness.','Fulfilled latency excludes unfulfilled episodes; read both together.','Demuxe is the public preset; demuxe-prototype retains the earlier experimental callback. The default remains adaptive.','Demuxe mirrors UI cache-only movement and 180ms settled refinement; timers quantize to the 50ms simulation step.','Within-ten-seconds coverage is also recorded; neither tolerance proves scene recognition.','All scenarios use an independent native-like provider admitted during playback; the pressure scenario suspends previews for five seconds.'],hashes,scenarios,results};
 await mkdir(out,{recursive:true});await writeFile(`${out}/matrix.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({out,cases:results.length}));
});
