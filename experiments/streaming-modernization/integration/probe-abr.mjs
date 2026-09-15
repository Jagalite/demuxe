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
const result={scope:'Actual mpv ABR playback with one aggregate 12 -> 2 -> 8 Mbit/s fixture transport; explicit measurement hooks, no playback implementation overrides',family,archiveSHA256:sha(await readFile(archive)),harnessSHA256:sha(await readFile(import.meta.filename)),overrides:Object.fromEntries(Object.entries(overrides).map(([n,s])=>[n,sha(s)])),networkPhases:[{start:0,bitsPerSecond:12000000},{start:30,bitsPerSecond:2000000},{start:60,bitsPerSecond:8000000}],sampleThroughSeconds:114,fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};
assert.ok(result.fixture.durationSeconds>=120,'Use the recorded 120-second ladder');
let active;const pending=[];let credit=0,lastTick=performance.now();
const rate=elapsed=>elapsed<30000?12000000:elapsed<60000?2000000:8000000;
const pump=setInterval(()=>{
 const now=performance.now(),bits=rate(active?.started===undefined?0:now-active.started);
 if(active?.started!==undefined&&active.lastRate!==bits){active.lastRate=bits;active.rateChanges.push({at:now-active.started,bitsPerSecond:bits});}
 credit=Math.min(16384,credit+(now-lastTick)*bits/8000);lastTick=now;
 let skipped=0;
 while(pending.length&&credit>=1&&skipped<pending.length){
  const item=pending.shift();if(item.res.destroyed)continue;
  if(item.blocked){pending.push(item);skipped++;continue;}
  skipped=0;
  const size=Math.min(8192,Math.floor(credit),item.end-item.at);
  const ready=item.res.write(item.data.subarray(item.at,item.at+size));item.at+=size;credit-=size;item.record.bytes+=size;
  if(item.at===item.end){item.record.completed=now;item.res.end();}
  else{if(!ready){item.blocked=true;item.res.once('drain',()=>item.blocked=false);}pending.push(item);}
 }
},10);
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store','Timing-Allow-Origin':'*'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  const media=u.pathname.startsWith('/media/'),base=media?fixture:assets,name=u.pathname.slice(media?7:8),file=path.resolve(base,name);
  if(!file.startsWith(base+path.sep))throw Error('Path');
  const data=Buffer.from(!media&&name in overrides?overrides[name]:await readFile(file));
  res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
  res.setHeader('ETag','"'+sha(data)+'"');res.setHeader('Accept-Ranges','bytes');
  const match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range??'');const start=match?Number(match[1]):0,end=match?Number(match[2])+1:data.length;
  if(start<0||end>data.length||end<=start)throw Error('Range');
  res.writeHead(match?206:200,{'Content-Length':end-start,...(match?{'Content-Range':`bytes ${start}-${end-1}/${data.length}`}:{})});
  if(!media){res.end(data.subarray(start,end));return;}
  active.started??=performance.now();
  const record={file:name,at:performance.now(),bytes:0,expected:end-start,range:req.headers.range};active.requests.push(record);
  res.flushHeaders();res.once('close',()=>{record.closed=performance.now();record.aborted=record.bytes!==record.expected;});
  pending.push({res,data,at:start,end,record,blocked:false});
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browser=browser.version();
try{
 for(const mode of ['hybrid','software'])for(const [format,file]of [['hls','master.m3u8'],['dash','dash/manifest.mpd']]){
  if(process.env.ONE&&process.env.ONE!==mode+':'+format)continue;
  const c={name:mode+':'+format,requests:[],rateChanges:[]};active=c;credit=0;lastTick=performance.now();result.cases.push(c);
  const page=await browser.newPage();page.setDefaultTimeout(20000);page.on('console',m=>(c.console??=[]).push(m.text()));
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);
   await page.evaluate(async({mode,format,file})=>{
    window.errors=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));
    window.snap=()=>{const b=p.diagnostics?.backend??{};return {wall:performance.timeOrigin+performance.now(),time:p.properties.get('time-pos'),avsync:p.properties.get('avsync'),paused:p.properties.get('pause'),tracks:p.properties.get('track-list'),quality:b.quality,adaptation:b.adaptation,io:b.io,heapBytes:b.heapBytes,lifetime:b.probeLifetime,threads:b.probeThreads,audio:p.audioDiagnostics(),errors:[...errors]};};
    await p.openRemote({url:location.origin+'/media/'+file,format,immutable:true,streaming:{qualityPolicy:{mode:'auto'}}});
    const alternate=p.properties.get('track-list').find(t=>t.type==='audio'&&!t.selected);if(alternate)await p.selectTrack('audio',String(alternate.id));
    await p.subtitleVisible(true);await p.volume(37);await p.play();
   },{mode,format,file});
   await page.waitForFunction(()=>p.properties.get('time-pos')>.5&&p.audioDiagnostics().rms>.001);
   await page.evaluate(()=>{window.drawLog=[];const backend=p.current.backend;backend.addEventListener('activity',()=>{const batch=backend.diagnostics?.probeDraws;if(batch&&drawLog.length<10000)drawLog.push(...batch);});});
   c.initial=await page.evaluate(()=>snap());console.log(c.name,'startup',c.initial.time);
   c.samples=[];
   while(performance.now()-c.started<114000){
    const s=await page.evaluate(()=>snap());c.samples.push(s);assert.deepEqual(s.errors,[]);
    assert.deepEqual(s.lifetime,c.initial.lifetime,'ABR recreated the native engine');
    await page.waitForTimeout(200);
   }
   c.final=await page.evaluate(()=>snap());
   c.draws=await page.evaluate(()=>drawLog);
   const epoch=performance.timeOrigin+c.started,phase=s=>(s.wall-epoch)/1000;
   const startup=c.samples.filter(s=>phase(s)<30),slow=c.samples.filter(s=>phase(s)>=30&&phase(s)<60),recovery=c.samples.filter(s=>phase(s)>=60);
   c.presentedByPhase=[startup,slow,recovery].map(samples=>[...new Set(samples.map(s=>s.quality?.presented))]);
   console.log(c.name,'presented phases',JSON.stringify(c.presentedByPhase),'samples',c.final.adaptation?.acceptedSamples);
   assert.ok(startup.some(s=>s.quality?.presented===2),'No presented upswitch during 12 Mbit/s');
   assert.ok(slow.some(s=>s.quality?.presented>=0&&s.quality.presented<2),'No presented downswitch during 2 Mbit/s');
   assert.ok(recovery.some(s=>s.quality?.presented===2),'No presented recovery during 8 Mbit/s');
   assert.ok(c.final.adaptation.acceptedSamples>=3,'ABR lacks measured network samples');
   assert.equal(c.initial.lifetime.creates,1);assert.equal(c.final.lifetime.destroys,0);
   const draws=c.draws.filter(d=>d.wall>=c.initial.wall&&d.wall<=c.final.wall);let gap=0;
   for(let i=1;i<draws.length;i++)gap=Math.max(gap,(draws[i].wall-draws[i-1].wall)/1000);
   assert.ok(c.samples.every(s=>typeof s.avsync==='number'&&Number.isFinite(s.avsync)),'mpv A/V timing must be observable');
   c.continuity={maxDrawGap:gap,underruns:c.final.audio.underruns-c.initial.audio.underruns,maxReportedAVSync:Math.max(...c.samples.map(s=>Math.abs(s.avsync))),scope:'Actual drawing callbacks and AudioWorklet counters; reported mpv A/V estimate, not physical A/V timing'};
   assert.ok(draws.length>1000);assert.ok(gap<.5);assert.equal(c.continuity.underruns,0);assert.ok(c.continuity.maxReportedAVSync<.2);
   assert.equal(c.final.tracks.find(t=>t.type==='audio'&&t.selected)?.id,c.initial.tracks.find(t=>t.type==='audio'&&t.selected)?.id);
   assert.equal(c.final.tracks.find(t=>t.type==='sub'&&t.selected)?.id,c.initial.tracks.find(t=>t.type==='sub'&&t.selected)?.id);
   await page.screenshot({path:path.join(out,mode+'-'+format+'-recovery.png')});
   await page.evaluate(()=>p.setQuality({mode:'manual',qualityId:p.state.quality.qualities[0].id}));
   await page.waitForFunction(()=>p.diagnostics.backend.adaptation.policy.mode==='manual');
   await page.evaluate(()=>p.seek(4));
   await page.waitForFunction(()=>p.diagnostics.backend.quality.presented===0);
   c.manual=await page.evaluate(()=>snap());await page.waitForTimeout(3000);c.manualAfter=await page.evaluate(()=>snap());
   assert.equal(c.manualAfter.adaptation.policy.mode,'manual');assert.equal(c.manualAfter.quality.request,c.manual.quality.request);assert.equal(c.manualAfter.quality.presented,0);
   c.passed=true;console.log('PASS',c.name);
  }catch(error){c.error=String(error.stack);c.state=await page.evaluate(()=>window.snap?.()).catch(()=>null);c.passed=false;process.exitCode=1;console.log('FAIL',c.name,c.error);}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(()=>{});await page.waitForTimeout(150);c.remainingWorkers=page.workers().length;if(c.remainingWorkers){c.passed=false;process.exitCode=1;}await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{
 clearInterval(pump);let deadline;
 try{await Promise.race([browser.close(),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}
 catch(error){result.cleanupError=String(error);result.browserClosed=false;process.exitCode=1;}
 finally{clearTimeout(deadline);await new Promise(r=>{server.close(r);server.closeAllConnections();});}
 result.passed=result.browserClosed&&result.cases.length===4&&result.cases.every(c=>c.passed);await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
}
