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
 s=s.replace("type:'diagnostics', data:{","type:'diagnostics', data:{probeLifetime:{...probeLifetime},probeThreads:{running:engine.PThread.runningWorkers.length,unused:engine.PThread.unusedWorkers.length},probeFrame:globalThis.probeFrame,probeDraws:globalThis.probeDraws,");overrides[name]=s;
}
const draw='web/retained-video.js';overrides[draw]=(await readFile(path.join(assets,draw),'utf8')).replace('  context.drawImage(frame,','  globalThis.probeFrame={width:frame.displayWidth,height:frame.displayHeight,pts:frame.timestamp/1e6};if(globalThis.probeDraws?.length<10000)probeDraws.push({wall:performance.timeOrigin+performance.now(),pts:frame.timestamp/1e6,kind:"retained-frame"});\n  context.drawImage(frame,');
for(const[name,s]of Object.entries(overrides)){await mkdir(path.dirname(path.join(out,'overrides',name)),{recursive:true});await writeFile(path.join(out,'overrides',name),s);}
const result={scope:'Public source-scoped API manual quality switching with explicit lifetime/frame instrumentation; no adapter or switching implementation overrides; rolling HLS or DASH live startup, switching, window refresh and DVR seek; optional explicit paused-expiry check; not ABR qualification',family,archiveSHA256:sha(await readFile(archive)),harnessSHA256:sha(await readFile(import.meta.filename)),overrides:Object.fromEntries(Object.entries(overrides).map(([n,s])=>[n,sha(s)])),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};let active;
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

result.scope='Integrated DASH startup and persistent switch while the oldest advertised segment expires during discovery';
const browserType=({chrome:chromium,firefox})[family],browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
result.browserPid=browserServer.process().pid;const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();
const mode=process.env.MODE,format=process.env.FORMAT,c={name:mode+':'+format,requests:[]};active=c;result.cases.push(c);
const page=await browser.newPage();page.setDefaultTimeout(35000);
try{
 await page.goto(origin);await page.waitForFunction(()=>window.Player);
 await page.evaluate(async mode=>{
  window.errors=[];window.logs=[];window.p=new Player(document.querySelector('#host'),{mode,assetBase:'/vendor/'});
  p.addEventListener('error',e=>errors.push(e.detail));p.addEventListener('log',e=>logs.push(e.detail));
  window.snap=()=>({state:p.state,diagnostics:p.diagnostics,audio:p.audioDiagnostics(),errors:[...errors],logs:[...logs]});
  await p.open({url:location.origin+'/media/dash/manifest.mpd',format:'dash',streaming:{qualityPolicy:{mode:'manual'}}});await p.play();
 },mode);
 await page.waitForFunction(()=>p.state.currentTime>18&&p.audioDiagnostics()?.rms>.001&&p.state.quality.presentedId);
 c.initial=await page.evaluate(()=>snap());assert.deepEqual(c.initial.errors,[]);
 assert.equal(c.initial.diagnostics.backend.probeLifetime.creates,1);
 await page.evaluate(()=>p.setQuality({mode:'manual',qualityId:p.state.quality.qualities[1].id}));
 await page.waitForFunction(()=>p.state.quality.presentedId===p.state.quality.qualities[1].id&&p.audioDiagnostics()?.rms>.001);
 c.final=await page.evaluate(()=>snap());assert.deepEqual(c.final.errors,[]);
 assert.deepEqual(c.final.diagnostics.backend.probeLifetime,c.initial.diagnostics.backend.probeLifetime);
 assert.ok(c.final.state.currentTime>=c.initial.state.currentTime);
 assert.ok(c.requests.some(r=>/^dash\/chunk-stream0-/.test(r.file)));
 assert.equal(c.requests.find(r=>/^dash\/chunk-stream0-/.test(r.file)).file,'dash/chunk-stream0-00010.m4s','Probe and coordinator must use the containing startup segment');
 assert.ok(c.requests.every(r=>r.status===200||r.status===206));
 assert.ok(c.requests.every(r=>!/^dash\/chunk-stream\d+-00005\.m4s$/.test(r.file)),'Discovery must avoid the expired oldest segment');
 c.passed=true;
}catch(error){c.error=String(error.stack);c.failure=await page.evaluate(()=>window.snap?.()).catch(()=>null);c.passed=false;process.exitCode=1;}
finally{
 await page.evaluate(()=>window.p?.destroy()).catch(()=>{c.passed=false;});await page.waitForTimeout(250);c.remainingWorkers=page.workers().length;if(c.remainingWorkers)c.passed=false;await page.close();
 let timer;try{await Promise.race([(async()=>{await browserServer.close();await browser.close();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}catch(error){result.cleanupError=String(error);result.browserClosed=false;await browserServer.kill();}clearTimeout(timer);server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=c.passed&&result.browserClosed;if(!result.passed)process.exitCode=1;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,name:c.name,error:c.error}));
}
async function pPause(){await page.evaluate(()=>p.pause());}
