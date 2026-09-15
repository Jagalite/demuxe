// Exercise the experimental integrated mpv session. Only measurement hooks
// are overridden; source manifests and switching implementation are unchanged.
import {chromium,firefox} from 'playwright';import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const archive=path.resolve(process.env.BETA_ARCHIVE),fixture=path.resolve(process.env.STREAM_FIXTURES),out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';await mkdir(out);await writeFile(path.join(out,'harness.mjs'),await readFile(import.meta.filename));await mkdir(path.join(out,'extracted'));execFileSync('tar',['-xzf',archive,'-C',path.join(out,'extracted')]);
const assets=path.join(out,'extracted/package'),sha=b=>createHash('sha256').update(b).digest('hex');
const overrides={};
if(process.env.TRACE_PACKETS==='1'){
 const name='web/retained-decoder-worker.js';const old=await readFile(path.join(assets,name),'utf8');
 const next=old.replace('     decoder.decode(new EncodedVideoChunk(',`     stats.packetTrace??=[];if(stats.packetTrace.length<128){let hash=2166136261;for(const value of bytes)hash=Math.imul(hash^value,16777619);stats.packetTrace.push({timestamp,duration,size:bytes.length,key:header[7],hash:hash>>>0});}
     decoder.decode(new EncodedVideoChunk(`);
 assert.notEqual(next,old);overrides[name]=next;
}


for(const name of ['web/filter-retained-engine-worker.js','web/software-full-engine-worker.js']){
 let s=await readFile(path.join(assets,name),'utf8');s='const probeLifetime={id:crypto.randomUUID(),creates:0,destroys:0};globalThis.probeDraws=[];\n'+s;
 s=s.replace('const result = engine._web_create(data.sampleRate);','probeLifetime.creates++;const result = engine._web_create(data.sampleRate);');
 s=s.replace('engine?._web_destroy();','probeLifetime.destroys++;engine?._web_destroy();');
 s=s.replaceAll("post({type:'log',message})","(console.log('native:',message),post({type:'log',message}))");
 if(process.env.TRACE_EVENTS==='1')s=s.replace('const event = JSON.parse(engine.UTF8ToString(ptr));',"const event = JSON.parse(engine.UTF8ToString(ptr));console.log('mpv-event',JSON.stringify(event));");
 s=s.replace('context.putImageData(frameImage, 0, 0);', 'context.putImageData(frameImage, 0, 0);if(probeDraws.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),position,kind:\"software-clock-estimate\"});');
 s=s.replace("type:'diagnostics', data:{","type:'diagnostics', data:{probeLifetime:{...probeLifetime},probeThreads:{running:engine.PThread.runningWorkers.length,unused:engine.PThread.unusedWorkers.length},probeFrame:globalThis.probeFrame,probeDraws:globalThis.probeDraws.splice(0),");overrides[name]=s;
}
const draw='web/retained-video.js';overrides[draw]=(await readFile(path.join(assets,draw),'utf8')).replace('  context.drawImage(frame,','  globalThis.probeFrame={width:frame.displayWidth,height:frame.displayHeight,pts:frame.timestamp/1e6};if(globalThis.probeDraws?.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),pts:frame.timestamp/1e6,kind:"retained-frame"});\n  context.drawImage(frame,');
for(const[name,s]of Object.entries(overrides)){await mkdir(path.dirname(path.join(out,'overrides',name)),{recursive:true});await writeFile(path.join(out,'overrides',name),s);}
const result={scope:'Sustained rolling playback, periodic persistent manual switching, resource/frame/worker bounds; no physical A/V or ABR claim',family,archiveSHA256:sha(await readFile(archive)),harnessSHA256:sha(await readFile(import.meta.filename)),overrides:Object.fromEntries(Object.entries(overrides).map(([n,s])=>[n,sha(s)])),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};let active;
const server=http.createServer(async(req,res)=>{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/arm-delay'){assert.equal(req.method,'POST');active.delay={armed:performance.now(),milliseconds:Number(process.env.CANDIDATE_DELAY_MS)||0};res.end();return;}if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
 if(u.pathname.startsWith('/media/')){
  const upstream=http.request(process.env.LIVE_ORIGIN+u.pathname.slice(6),{headers:req.headers},response=>{
   const record={file:u.pathname.slice(7),status:response.statusCode,bytes:0,at:performance.now()};active.requests.push(record);
   res.writeHead(response.statusCode,response.headers);response.on('data',chunk=>record.bytes+=chunk.length);response.pipe(res);
  });upstream.on('error',()=>res.destroy());req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());upstream.end();return;
 }
 const media=u.pathname.startsWith('/media/'),base=media?fixture:assets,name=u.pathname.slice(media?7:8),f=path.resolve(base,name);if(!f.startsWith(base+path.sep))throw Error('Path');const data=Buffer.from(!media&&name in overrides?overrides[name]:await readFile(f));
 const record=media?{file:name,bytes:0,at:performance.now(),range:req.headers.range}:null;if(record)active.requests.push(record);
 if(record&&active.delay?.milliseconds&&!active.delay.started&&/^(high\/|dash\/(init|chunk)-stream2)/.test(name)){active.delay.started=performance.now();active.delay.file=name;await new Promise(r=>setTimeout(r,active.delay.milliseconds));active.delay.finished=performance.now();}
 res.setHeader('Content-Type',f.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(f)?'text/javascript':'application/octet-stream');res.setHeader('ETag','"'+sha(data)+'"');res.setHeader('Accept-Ranges','bytes');const m=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range??'');const a=m?Number(m[1]):0,b=m?Number(m[2])+1:data.length;res.writeHead(m?206:200,{'Content-Length':b-a,...(m?{'Content-Range':`bytes ${a}-${b-1}/${data.length}`}:{})});res.end(data.subarray(a,b));if(record)record.bytes=b-a;
 }catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browserType=({chrome:chromium,firefox})[family],browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browserPid=browserServer.process().pid;const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();

const seconds=Number(process.env.ENDURANCE_SECONDS??300);assert.ok(seconds>=60&&seconds<=360);
const mode=process.env.MODE??'hybrid',format=process.env.FORMAT??'hls',file=format==='dash'?'dash/manifest.mpd':'master.m3u8';
const c={name:mode+':'+format,seconds,requests:[],samples:[],switches:[]};active=c;result.cases.push(c);
const page=await browser.newPage();page.setDefaultTimeout(25000);
try{
 await page.goto(origin);await page.waitForFunction(()=>window.Player);
 await page.evaluate(async({mode,format,file})=>{
  window.errors=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));
  await p.openRemote({url:location.origin+'/media/'+file,format,streaming:{qualityPolicy:{mode:'manual'}}});await p.subtitleVisible(true);await p.play();
  window.snapshot=()=>{
   const b=p.diagnostics.backend,a=p.audioDiagnostics();
   return {time:p.state.currentTime,status:p.state.status,avsync:p.properties.get('avsync'),cache:p.properties.get('demuxer-cache-state'),selectedTracks:p.properties.get('track-list').filter(t=>t.selected&&t.type!=='video').map(t=>({type:t.type,id:t.id})),audio:a,audioFrames:a.mediaFrames,underruns:a.underruns,adaptation:{...b.adaptation,decisions:undefined},drops:{decoder:p.properties.get('decoder-frame-drop-count'),output:p.properties.get('frame-drop-count')},decoder:b.decoderStats,heapBytes:b.heapBytes,io:{...b.io,networkSamples:undefined},frames:b.presentation?{retained:b.presentation.retained,pending:b.presentation.pending,peakRetained:b.presentation.peakRetained,peakPending:b.presentation.peakPending,received:b.presentation.received,closed:b.presentation.closed}:null,threads:b.probeThreads,lifetime:b.probeLifetime,window:p.state.seekable,quality:p.state.quality,errors};
  };
 },{mode,format,file});
 await page.waitForFunction(()=>p.state.currentTime>.5&&p.audioDiagnostics().rms>.001);
 // Collect each small diagnostic batch once, outside the playback worker.
 // Re-cloning a growing five-minute history perturbs the measured workload.
 await page.evaluate(()=>{window.drawLog=[];window.drawBatchPeak=0;let previous;const backend=p.current.backend;backend.addEventListener('activity',()=>{const batch=backend.diagnostics?.probeDraws;if(batch&&batch!==previous){previous=batch;drawBatchPeak=Math.max(drawBatchPeak,batch.length);if(drawLog.length<10000)drawLog.push(...batch);}});});
 c.initial=await page.evaluate(()=>snapshot());const began=performance.now();let nextSwitch=10000,switchIndex=0;
 while(performance.now()-began<seconds*1000){
  await page.waitForTimeout(1000);const sample=await page.evaluate(()=>snapshot());sample.elapsed=performance.now()-began;c.samples.push(sample);if(c.samples.length%10===0)await writeFile(path.join(out,'progress.json'),JSON.stringify(result,null,2)+'\n');
  assert.deepEqual(sample.errors,[]);assert.deepEqual(sample.lifetime,c.initial.lifetime);
  assert.ok(Number.isFinite(sample.avsync)&&Math.abs(sample.avsync)<.2,'mpv reported A/V sync exceeds 200 ms');
  assert.deepEqual(sample.selectedTracks,c.initial.selectedTracks,'Audio/subtitle selection changed');
  assert.ok(sample.io.handles<=16&&sample.io.peakBudgetedBytes<=16*1024*1024);
  assert.ok(sample.io.identityRecords<=256,'Expired segment identity records accumulate');
  assert.ok(sample.threads.running+sample.threads.unused<=16,'Native worker pool grows');
  if(sample.frames)assert.ok(sample.frames.peakRetained<=32&&sample.frames.peakPending<=16);
  // The ABR health signal deliberately includes recent mpv output drops,
  // including discontinuity/reconfiguration retirement. Record it; require
  // actual decoder errors, output continuity and queue bounds independently.
  if(sample.decoder)assert.equal(sample.decoder.errors,c.initial.decoder.errors,'Decoder errors during sustained playback');
  if(c.samples.length>4){const before=c.samples.at(-5);assert.ok(sample.time>before.time+2,'Sustained playback stalled');assert.ok(sample.audioFrames>before.audioFrames);}
  assert.equal(sample.underruns,c.initial.underruns,'Audio underrun during continuous playback');
  if(sample.elapsed>=nextSwitch){
   const index=[2,1,0][switchIndex++%3];const requested=performance.now();
   await page.evaluate(index=>p.setQuality({mode:'manual',qualityId:p.state.quality.qualities[index].id}),index);
   await page.waitForFunction(index=>p.diagnostics.backend.quality.presented===index,index);
   c.switches.push({index,elapsed:performance.now()-began,milliseconds:performance.now()-requested});nextSwitch+=20000;
  }
 }
 c.decoderHealth={samples:c.samples.length,unhealthySamples:c.samples.filter(s=>!s.adaptation.decoderHealthy).length,scope:'Conservative ABR signal includes recent output drops; decoder errors and actual playback continuity are separate gates'};
 c.final=await page.evaluate(()=>snapshot());c.draws=await page.evaluate(()=>drawLog);c.drawBatchPeak=await page.evaluate(()=>drawBatchPeak);assert.ok(c.drawBatchPeak<=128,'Measurement batch grew beyond bounded telemetry');
 const draws=c.draws.filter(d=>(d.pts??d.position)>=c.initial.time);let gap=0;for(let i=1;i<draws.length;i++)gap=Math.max(gap,(draws[i].wall-draws[i-1].wall)/1000);
 c.maxDrawGapSeconds=gap;assert.ok(draws.length>seconds*10);assert.ok(gap<1,'Rendered output gap exceeds one second');
 const warm=c.samples.filter(s=>s.elapsed>=60000&&s.elapsed<120000),late=c.samples.filter(s=>s.elapsed>=(seconds-60)*1000);
 if(seconds>=180)assert.ok(Math.max(...late.map(s=>s.heapBytes))<=Math.max(...warm.map(s=>s.heapBytes))+16*1024*1024,'Wasm heap keeps growing after warm-up');
 assert.ok(c.final.time-c.initial.time>seconds-8);assert.ok(c.switches.length>=Math.floor((seconds-10)/20));
 await page.screenshot({path:path.join(out,'final.png')});c.passed=true;
}catch(error){c.passed=false;c.error=String(error.stack);c.failure=await page.evaluate(()=>window.snapshot?.()).catch(()=>null);process.exitCode=1;}
finally{
 await writeFile(path.join(out,'progress.json'),JSON.stringify(result,null,2)+'\n');
 await page.evaluate(()=>window.p?.destroy()).catch(error=>{c.destroyError=String(error);c.passed=false;});await page.waitForTimeout(250);c.remainingWorkers=page.workers().length;if(c.remainingWorkers)c.passed=false;await page.close();
 let deadline;
 try{await Promise.race([(async()=>{await browserServer.close();await browser.close();})(),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}
 catch(error){result.browserClosed=false;result.cleanupError=String(error);result.processExitAtDeadline={code:browserServer.process().exitCode,signal:browserServer.process().signalCode};await browserServer.kill();}
 clearTimeout(deadline);server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=c.passed&&result.browserClosed;if(!result.passed)process.exitCode=1;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,name:c.name,seconds,reason:c.error,cleanup:result.cleanupError}));
}
