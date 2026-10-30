// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {platform,release,arch,cpus,totalmem,loadavg} from 'node:os';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {sampleBrowser,resourceLedger} from './process-resources.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(root,'../..');
const fixturePath=process.env.DEMUXE_PUBLIC_FIXTURE,candidate=process.env.DEMUXE_PUBLIC_RUNTIME_CANDIDATE,evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!fixturePath||!candidate||!evidence)throw Error('Set DEMUXE_PUBLIC_FIXTURE, DEMUXE_PUBLIC_RUNTIME_CANDIDATE and DEMUXE_BROWSER_EVIDENCE');
const trials=Number(process.env.DEMUXE_RESOURCE_TRIALS??3),cycles=Number(process.env.DEMUXE_RESOURCE_CYCLES??3),remote=process.env.DEMUXE_TEST_REMOTE==='1';
assert.ok(Number.isInteger(trials)&&trials>=1&&trials<=10);assert.ok(Number.isInteger(cycles)&&cycles>=1&&cycles<=10);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fixture=await readFile(fixturePath);assert.ok(fixture.length>0&&fixture.length<=32*1024*1024);
const manifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
assert.ok(['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'].includes(manifest.providers[0].id));
const asset=manifest.assets[0],worker=await readFile(join(candidate,asset.path));assert.equal(hash(worker),asset.sha256);
const app=await build({absWorkingDir:repo,stdin:{contents:`export {Player,DemuxeRuntime} from ${JSON.stringify(join(repo,'src/index.ts'))};`,resolveDir:repo},bundle:true,format:'esm',platform:'browser',write:false});
const application=Buffer.from(app.outputFiles[0].contents),identity='sha256:'+hash(application);
manifest.providers.push({id:'browser-prepared',implementationIdentity:identity,applicationBuild:identity,technology:'browser-native',delivery:['browser','application-bundle'],offers:[{capability:'media.present.prepared',version:1,profile:'selected-streams'}],assetIds:[]});
const receipt={status:'running-not-qualified',recordedAt:new Date().toISOString(),environment:{platform:platform(),release:release(),arch:arch(),cpu:cpus()[0]?.model,logicalCPUs:cpus().length,totalMemoryBytes:totalmem(),initialLoadAverage:loadavg(),node:process.version},workload:{trials,cycles,remote,sourceBytes:fixture.length,sourceSha256:hash(fixture),aheadSeconds:1,behindSeconds:1,codedBudgetBytes:8*1024*1024,playbackSecondsPerLeg:.4,seekTarget:1.25,sampleIntervalMs:200},identities:{provider:manifest.providers[0].implementationIdentity,presenter:identity,worker:hash(worker),harness:hash(await readFile(fileURLToPath(import.meta.url))),sampler:hash(await readFile(join(root,'test/process-resources.js')))},trials:[],limitations:['Fresh browser per trial; operating-system disk/code caches are not cleared','Route interception measures served response-body bytes, not real network/TLS/compressed traffic','Sampled browser-tree RSS sums shared pages and includes browser/runtime overhead; it is not unique physical or decoder-retained memory','CDP renderer JS heap after forced GC excludes dedicated worker heaps, media decoders and native allocations','Observed CPU maxima miss work of processes born and exited between samples','No whole-process peak-retained-memory qualification, independent FFmpeg performance comparator, large-file throughput or release approval']};
const save=()=>writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');
await save();
try{
for(let trial=0;trial<trials;trial++){
 let server,browser,timer,poll,active=false,pending=Promise.resolve();const ledger=resourceLedger(),samples=[],sampleErrors=[],deliveries=new Map();let phase='launch';
 const take=()=>{const label=phase;pending=pending.then(async()=>{try{samples.push({phase:label,at:performance.now(),...ledger.observe(await sampleBrowser(server.process().pid))});}catch(error){sampleErrors.push(error.message);}});return pending;};
 const record={trial,cycles:[],samples,sampleErrors};receipt.trials.push(record);
 try{
  server=await chromium.launchServer({channel:'chrome',headless:true});browser=await chromium.connect(server.wsEndpoint());receipt.browser=browser.version();
  timer=setTimeout(()=>void server.close(),90000);await take();active=true;
  const schedule=()=>{poll=setTimeout(async()=>{if(!active)return;await take();if(active)schedule();},200);};schedule();
  const page=await browser.newPage();const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  await page.route('https://measure.test/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   const deliver=async(body,contentType,status=200,headers={})=>{const bytes=Buffer.isBuffer(body)?body:Buffer.from(body);const entry=deliveries.get(path)??{requests:0,bodyBytes:0};entry.requests++;entry.bodyBytes+=bytes.length;deliveries.set(path,entry);return route.fulfill({status,contentType,headers,body:bytes});};
   if(path==='/')return deliver('<body></body>','text/html',200,{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
   if(path==='/app.js')return deliver(application,'text/javascript');
   if(path==='/demuxe-providers.json')return deliver(JSON.stringify(manifest),'application/json');
   if(path==='/'+asset.path)return deliver(worker,'text/javascript');
   if(path==='/media.mp4'){
    const range=/^bytes=(\d+)-(\d*)$/.exec(request.headers().range??''),start=range?Number(range[1]):0,end=range?Math.min(range[2]?Number(range[2]):fixture.length-1,fixture.length-1):fixture.length-1;
    assert.ok(start>=0&&end>=start&&end<fixture.length);const headers={ETag:'"resource-fixture-v1"','Content-Length':String(end-start+1),...(range?{'Content-Range':`bytes ${start}-${end}/${fixture.length}`}:{})};
    return deliver(fixture.subarray(start,end+1),'video/mp4',range?206:200,headers);
   }
   if(path.startsWith('/web/engine')||path.startsWith('/web/providers/'))throw Error('Unexpected fallback asset '+path);
   const file=resolve(repo,path.replace(/^\//,''));assert.ok(file.startsWith(repo+sep));return deliver(await readFile(file),'text/javascript');
  });
  await page.goto('https://measure.test/');await page.mouse.click(1,1);
  await page.evaluate(async({manifest,bytes,remote})=>{
   if(!crossOriginIsolated)throw Error('Real isolation required');const {Player,DemuxeRuntime}=await import('/app.js');
   const workers=new Set(),urls=new Set(),OriginalWorker=globalThis.Worker,create=URL.createObjectURL,revoke=URL.revokeObjectURL;let createdWorkers=0;
   globalThis.Worker=class extends OriginalWorker{constructor(...args){super(...args);workers.add(this);createdWorkers++;const terminate=this.terminate.bind(this);this.terminate=()=>{workers.delete(this);terminate();};}};
   URL.createObjectURL=value=>{const url=create.call(URL,value);urls.add(url);return url;};URL.revokeObjectURL=url=>{urls.delete(url);return revoke.call(URL,url);};
   let runtime=new DemuxeRuntime({assetBase:'https://measure.test/',qualifiedProviders:Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity]))});
   let host=document.createElement('div');document.body.append(host);
   let player=new Player(host,{runtime,mode:'native',nativeRemux:'always',remuxRuntime:'off',preview:false,buffering:{aheadSeconds:1,behindSeconds:1,memoryBudget:8*1024*1024}});
   let source=remote?{url:'https://measure.test/media.mp4',format:'file',headers:{Authorization:'fixture-only'},credentials:'omit',allowedOrigins:['https://measure.test']}:new File([new Uint8Array(bytes)],'resource.mp4');
   const handles=()=>({workers:workers.size,objectURLs:urls.size,createdWorkers});
   const fresh=async(target)=>{const video=player.surface,bias=player.diagnostics.backend?.remux?1:0;const frame=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Measured playback stalled')),5000);const observe=(_now,frame)=>{if(frame.mediaTime>target+bias){clearTimeout(timeout);resolve(frame.mediaTime-bias);}else video.requestVideoFrameCallback(observe);};video.requestVideoFrameCallback(observe);});await player.play();const time=await frame;await player.pause();return time;};
   globalThis.measurement={handles,
    async load(){await runtime.providers.load('demuxe-providers.json');await player.setMuted(true);},
    async open(){const start=performance.now();await player.open(source);const milliseconds=performance.now()-start;if(player.diagnostics.plan?.id!=='native-remux')throw Error('Unexpected measured route');if(player.state.mediaInfo.audio?.sampleRate!==48000||player.state.mediaInfo.audio?.channelLayout!=='stereo')throw Error('Measured A/V metadata changed');return {milliseconds,plan:player.diagnostics.plan.id,handles:handles()};},
    async play(){const start=performance.now(),target=player.state.currentTime+.4,time=await fresh(target);return {milliseconds:performance.now()-start,time};},
    async seek(){const start=performance.now();await player.seek(1.25);const confirmed=player.state.currentTime,milliseconds=performance.now()-start;if(Math.abs(confirmed-1.25)>.05)throw Error('Measured seek target changed');const freshStart=performance.now(),time=await fresh(1.25);return {milliseconds,confirmed,freshMilliseconds:performance.now()-freshStart,time};},
    async close(){await player.close();const result=handles();if(result.workers||result.objectURLs)throw Error('Measured close leaked handles');return result;},
    async destroy(){await player.destroy();await runtime.destroy();host.remove();source=undefined;player=undefined;runtime=undefined;host=undefined;globalThis.Worker=OriginalWorker;URL.createObjectURL=create;URL.revokeObjectURL=revoke;globalThis.measurement={handles};const result=handles();if(result.workers||result.objectURLs)throw Error('Measured destroy leaked handles');return result;}
   };
  },{manifest,bytes:Array.from(fixture),remote});
  const snapshot=async label=>{
   phase=label;await cdp.send('HeapProfiler.collectGarbage');const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));await take();
   return {phase:label,rendererJsHeapUsedBytes:metrics.JSHeapUsedSize,rendererJsHeapTotalBytes:metrics.JSHeapTotalSize,rendererNodes:metrics.Nodes,rendererDocuments:metrics.Documents,rendererTaskSeconds:metrics.TaskDuration,process:samples.at(-1),handles:await page.evaluate(()=>measurement.handles())};
  };
  const captureHeap=async stage=>{
   assert.equal(trials,1,'Heap diagnostics require one trial');phase='heap-diagnostic';
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await cdp.send('HeapProfiler.collectGarbage');
   const chunks=[],chunk=event=>chunks.push(event.chunk);cdp.on('HeapProfiler.addHeapSnapshotChunk',chunk);
   try{await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});}finally{cdp.off('HeapProfiler.addHeapSnapshotChunk',chunk);}
   const heapMetrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const data=chunks.join(''),path=process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT+'.'+stage;await writeFile(path,data);record.heapSnapshots??={};record.heapSnapshots[stage]={sha256:hash(data),bytes:Buffer.byteLength(data),rendererJsHeapUsedAfterSnapshot:heapMetrics.JSHeapUsedSize};
  };
  record.baseline=await snapshot('public-entry-loaded-before-catalog');phase='catalog';await page.evaluate(()=>measurement.load());record.catalog=await snapshot('catalog-loaded');if(process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT)await captureHeap('catalog');
  for(let cycle=0;cycle<cycles;cycle++){
   const before=deliveries.get('/'+asset.path)?.bodyBytes??0;phase='opening';const opened=await page.evaluate(()=>measurement.open());
   phase='playing';const played=await page.evaluate(()=>measurement.play());phase='seeking';const seek=await page.evaluate(()=>measurement.seek());
   const retainedActive=await snapshot('paused-after-seek');if(cycle===0&&process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT)await captureHeap('active');phase='closing';const closed=await page.evaluate(()=>measurement.close());const retainedClosed=await snapshot('source-closed-runtime-alive');if(process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT&&(cycle===0||cycle===cycles-1))await captureHeap('closed-'+cycle);
   record.cycles.push({cycle,opened,played,seek,retainedActive,closed,retainedClosed,providerBodyBytesThisCycle:(deliveries.get('/'+asset.path)?.bodyBytes??0)-before});await save();
  }
  phase='destroy';record.destroyed=await page.evaluate(()=>measurement.destroy());record.retainedDestroyed=await snapshot('player-and-runtime-destroyed');
  if(process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT)await captureHeap('destroyed');
  assert.equal(deliveries.get('/'+asset.path)?.requests,1);assert.equal(record.cycles[0].providerBodyBytesThisCycle,worker.length);assert.ok(record.cycles.slice(1).every(cycle=>cycle.providerBodyBytesThisCycle===0));
  assert.deepEqual(sampleErrors,[]);record.delivery=Object.fromEntries(deliveries);record.status='measured-workload-passed';
 }finally{active=false;clearTimeout(poll);await pending;clearTimeout(timer);await browser?.close();await server?.close();await save();}
 console.log('Measured trial',trial,'completed');
}
receipt.status=process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT?'heap-diagnostic-not-qualification':'finite-public-resource-measurements-not-release';if(process.env.DEMUXE_RESOURCE_HEAP_SNAPSHOT)receipt.limitations.push('Active and destroyed heap snapshot capture changes resource use; this run is diagnostic');await save();
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};await save();throw error;}
console.log(JSON.stringify({status:receipt.status,trials:receipt.trials.length,evidence}));
