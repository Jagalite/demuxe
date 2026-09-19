// SPDX-License-Identifier: Apache-2.0
// Real browser playback through the experimental Fetch -> mailbox -> AVIO path.
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const archive=path.resolve(process.env.BETA_ARCHIVE),fixture=path.resolve(process.env.STREAM_FIXTURES);
const out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';
await mkdir(out);await writeFile(path.join(out,'harness.mjs'),await readFile(import.meta.filename));await mkdir(path.join(out,'extracted'));
execFileSync('tar',['-xzf',archive,'-C',path.join(out,'extracted')]);
const assets=path.join(out,'extracted/package');const manifest=JSON.parse(await readFile(path.join(assets,'release-manifest.json')));
for(const [file,expected] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(path.join(assets,file))).digest('hex'),expected.sha256);
const sha=async f=>createHash('sha256').update(await readFile(f)).digest('hex');
const result={stage:'integrated-accepted-seek-cancellation',padding:{bytes:9*1024*1024,kind:'Valid trailing MP4 free box; synthetic segment-size stress, unchanged encoded media'},releaseQualified:false,family,archiveSHA256:await sha(archive),testHarnessSHA256:await sha(import.meta.filename),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));let current;
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  const media=u.pathname.startsWith('/media/');
  const base=media?fixture:assets,relative=u.pathname.slice(media?7:8),file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)||(!media&&!u.pathname.startsWith('/vendor/'))){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
  const originalSize=(await stat(file)).size;const padding=media&&/^(?:low|medium|high)\/.*\.m4s$|^dash\/chunk-stream[012]-/.test(relative)?9*1024*1024:0;const size=originalSize+padding;
  // Every fixture representation is immutable, including its deterministic free box.
  // Root probing and the integrated segment reader may open the same URL again.
  if(media)res.setHeader('ETag','"'+createHash('sha256').update(await readFile(file)).update(`free-box:${padding}`).digest('hex')+'"');
  if(padding){
   const state=current;const request={file:relative,started:performance.now(),sent:0,size,originalSize,padding,complete:false,aborted:false};state.requests.push(request);
   if(!state.unknown)res.setHeader('Content-Length',size);
   res.flushHeaders();
   const stream=createReadStream(file,{highWaterMark:65536});res.on('close',()=>{request.aborted=!request.complete;stream.destroy();});
   for await(const chunk of stream){await delay(50);if(res.destroyed)break;res.write(chunk);request.sent+=chunk.length;}
   if(!res.destroyed&&padding){
    const head=Buffer.alloc(8);head.writeUInt32BE(padding);head.write('free',4);res.write(head);request.sent+=8;
    let left=padding-8;const zeros=Buffer.alloc(65536);
    while(left>0&&!res.destroyed){await delay(50);if(res.destroyed)break;const n=Math.min(left,zeros.length);res.write(zeros.subarray(0,n));request.sent+=n;left-=n;}
   }
   if(!res.destroyed){request.complete=true;request.finished=performance.now();res.end();}
  }else{res.setHeader('Content-Length',size);res.end(await readFile(file));}
 }catch(error){if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end('Fixture request failed');}}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browserType=({chrome:chromium,firefox})[family],browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();result.browserPid=browserServer.process().pid;
try{
 for(const mode of ['hybrid','software'])for(const format of ['hls','dash']){
  const c={name:`${mode}:${format}`,mode,format,unknown:false,requests:[],errors:[]};current=c;result.cases.push(c);
  const page=await browser.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>c.errors.push(String(e)));
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);const began=performance.now();
   await page.evaluate(async({mode,format})=>{
    window.errors=[];window.logs=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});
    p.addEventListener('error',e=>errors.push(e.detail));p.addEventListener('log',e=>{logs.push(e.detail);if(logs.length>80)logs.shift();});
    await p.openRemote({url:location.origin+'/media/'+(format==='hls'?'master.m3u8':'dash/manifest.mpd'),format,streaming:{qualityPolicy:{mode:'manual'}}});await p.play();
   },{mode,format});
   await page.waitForFunction(()=>p.state.currentTime>.4&&p.audioDiagnostics()?.rms>.001);
   c.startupMs=performance.now()-began;c.startupRequests=structuredClone(c.requests);
   assert.ok(c.requests.some(r=>r.padding&&r.sent>0&&r.sent<r.size&&!r.complete&&!r.aborted),'A nested video read must be outstanding');
   c.initial=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics}));
   c.operations=[];
   for(const target of [4,8,.5]){
    const before=c.requests.slice();
    await page.evaluate(async target=>{
     await p.pause();const alternate=p.state.audioTracks.find(t=>!t.selected);if(!alternate)throw Error('Alternate audio missing');
     await p.selectAudioTrack(alternate.id);await p.seek(target);await p.play();
    },target);
    await page.waitForFunction(target=>p.state.currentTime>target+.2&&p.audioDiagnostics()?.rms>.001,target);
    const state=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,errors,logs}));
    assert.deepEqual(state.errors,[]);assert.equal(state.state.sourceId,c.initial.state.sourceId);
    assert.ok(before.some(r=>r.aborted),'Accepted seek must cancel an obsolete nested read');
    c.operations.push({target,...state});
   }
   const destroy=performance.now();await page.evaluate(()=>p.destroy());c.destroyMs=performance.now()-destroy;
   await page.waitForTimeout(250);c.remainingWorkers=page.workers().length;assert.equal(c.remainingWorkers,0,'All playback and transport workers retire');assert.ok(c.requests.some(r=>r.aborted),'Outstanding segment cancelled');
   c.passed=true;console.log('PASS',c.name,Math.round(c.startupMs)+'ms');
  }catch(error){c.error=String(error.stack);c.state=await page.evaluate(()=>({diagnostics:window.p?.diagnostics,errors:window.errors,logs:window.logs})).catch(()=>null);c.passed=false;console.log('FAIL',c.name,c.error);process.exitCode=1;}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(()=>{});await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{
 let timer;try{await Promise.race([(async()=>{await browserServer.close();await browser.close();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}catch(error){result.browserClosed=false;result.cleanupError=String(error);process.exitCode=1;await browserServer.kill();}clearTimeout(timer);
 server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.browserClosed&&result.cases.length===4&&result.cases.every(c=>c.passed);await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
}
