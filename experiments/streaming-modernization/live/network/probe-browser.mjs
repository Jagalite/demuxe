// SPDX-License-Identifier: Apache-2.0
// Real browser playback through the experimental Fetch -> mailbox -> AVIO path.
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
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
const result={stage:'integrated-network-lifecycle',releaseQualified:false,family,archiveSHA256:await sha(archive),testHarnessSHA256:await sha(import.meta.filename),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));let current;
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/media/exfil'){current.exfilRequests=(current.exfilRequests??0)+1;res.end();return;}
  if(u.pathname==='/arm'){current.armed=true;res.end();return;}
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  const media=u.pathname.startsWith('/media/'),base=media?fixture:assets,relative=u.pathname.slice(media?7:8),file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)||(!media&&!u.pathname.startsWith('/vendor/'))){res.writeHead(404).end();return;}
  const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
  if(!media){res.setHeader('Content-Length',bytes.length);res.end(bytes);return;}
  const c=current,r={file:relative,at:performance.now(),phase:c.phase??0,status:200,sent:0,complete:false,aborted:false,authorized:req.headers.authorization==='Bearer fresh'};c.requests.push(r);
  res.on('close',()=>{r.aborted=!r.complete;});
  if(c.scenario==='retry-refresh-trickle'){
   if(relative==='low/000.m4s'&&!r.authorized){r.status=401;r.complete=true;res.writeHead(401).end();return;}
   if(relative==='low/001.m4s'&&(c.failures??0)<2){c.failures=(c.failures??0)+1;r.status=503;r.complete=true;res.writeHead(503).end();return;}
  }
  if(c.scenario==='replace-candidate'&&c.armed&&!c.held&&relative==='high/init.mp4'){
   c.held=r;
   await new Promise(resolve=>{const timer=setTimeout(resolve,30000);res.once('close',()=>{clearTimeout(timer);resolve();});});
   if(res.destroyed)return;
  }
  if(relative==='low/002.m4s'&&c.scenario==='redirect'){
   r.status=302;r.complete=true;res.writeHead(302,{Location:`http://localhost:${server.address().port}/media/exfil`}).end();return;
  }
  res.setHeader('ETag','"'+createHash('sha256').update(bytes).digest('hex')+'"');
  const truncated=relative==='low/002.m4s'&&c.scenario==='truncated';
  res.setHeader('Content-Length',bytes.length+(truncated?17:0));if(truncated)res.setHeader('Connection','close');
  res.flushHeaders();
  if(relative==='low/002.m4s'&&c.scenario==='stalled'){res.write(bytes.subarray(0,8192));r.sent=8192;return;}
  if(relative==='low/002.m4s'&&c.scenario==='retry-refresh-trickle'){
   for(let at=0;at<bytes.length&&!res.destroyed;at+=8192){await delay(100);if(res.destroyed)break;const chunk=bytes.subarray(at,at+8192);res.write(chunk);r.sent+=chunk.length;}
   if(!res.destroyed){r.complete=true;res.end();}return;
  }
  r.sent=bytes.length;r.complete=true;res.end(bytes);
 }catch(error){if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end();}}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browserType=({chrome:chromium,firefox})[family],browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();result.browserPid=browserServer.process().pid;
try{
 for(const mode of ['hybrid','software'])for(const scenario of ['retry-refresh-trickle','truncated','stalled','redirect','replace-candidate']){
  const c={name:mode+':'+scenario,mode,scenario,requests:[]};current=c;result.cases.push(c);const page=await browser.newPage();page.setDefaultTimeout(30000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);
   await page.evaluate(async mode=>{
    window.errors=[];window.refreshes=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));
    window.source=()=>({url:location.origin+'/media/master.m3u8',format:'hls',streaming:{qualityPolicy:{mode:'manual'}},refreshAuthorization:async({url})=>{refreshes.push(new URL(url).pathname);return {url:url+'?signed=fixture',headers:{Authorization:'Bearer fresh'}};}});
    window.openOutcome='pending';
    p.openRemote(source()).then(async()=>{openOutcome='opened';await p.play();}).catch(error=>{openOutcome='rejected';errors.push({code:error.code,message:error.message});});
   },mode);
   if(['retry-refresh-trickle','replace-candidate'].includes(scenario)){
    await page.waitForFunction(()=>p.state.currentTime>.4&&p.audioDiagnostics()?.rms>.001);
    c.initial=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,audio:p.audioDiagnostics(),refreshes,openOutcome}));
   }
   if(scenario==='retry-refresh-trickle'){
    await page.waitForFunction(()=>p.state.currentTime>7);c.final=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,audio:p.audioDiagnostics(),errors,refreshes}));
    assert.deepEqual(c.final.errors,[]);assert.equal(c.final.refreshes.length,1);assert.equal(c.failures,2);assert.ok(c.final.diagnostics.backend.io.retries>=2);
    assert.ok(c.requests.some(r=>r.file==='low/000.m4s'&&r.authorized));assert.ok(c.final.diagnostics.backend.io.pendingRequests<=8);
    assert.ok(!JSON.stringify(c.final.diagnostics).includes('signed=fixture'),'Signed URL must be redacted');
   }else if(scenario==='replace-candidate'){
    await page.evaluate(()=>fetch('/arm'));await page.evaluate(()=>p.setQuality({mode:'manual',qualityId:p.state.quality.qualities[2].id}));
    const deadline=performance.now()+10000;while(!c.held&&performance.now()<deadline)await delay(20);assert.ok(c.held,'Candidate initialization was actually outstanding');
    await page.waitForTimeout(500);c.phase=1;await page.evaluate(async()=>{await p.openRemote(source());await p.play();});await page.waitForFunction(()=>p.state.currentTime>.4&&p.audioDiagnostics()?.rms>.001);
    assert.equal(c.held.aborted,true,'Source replacement cancels the candidate request');c.final=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,errors}));assert.deepEqual(c.final.errors,[]);
    assert.notEqual(c.final.state.sourceId,c.initial.state.sourceId);assert.ok(c.requests.some(r=>r.phase===1));
   }else{
    await page.waitForFunction(()=>errors.length>0);c.failure=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,errors,openOutcome}));
    assert.notEqual(c.failure.state.status,'ended','Transport failure must not become successful EOF');assert.ok(c.requests.some(r=>r.file==='low/002.m4s'));
    assert.ok(c.failure.errors.some(e=>/resource|transport|fetch|network/i.test(e.message)),'The transport fault is surfaced');
    assert.ok(!c.requests.some(r=>r.file==='low/003.m4s'),'A failed media resource cannot silently advance');
    if(scenario==='stalled')assert.ok(c.failure.errors.some(e=>e.code==='NETWORK_TIMEOUT'));
    if(scenario==='redirect')assert.ok(!(c.exfilRequests??0),'Redirect destination was never fetched');
   }
   c.passed=true;
  }catch(error){c.passed=false;c.error=String(error.stack);c.state=await page.evaluate(()=>({state:window.p?.state,diagnostics:window.p?.diagnostics,errors:window.errors})).catch(()=>null);process.exitCode=1;}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(error=>{c.destroyError=String(error);c.passed=false;});await page.waitForTimeout(250);c.remainingWorkers=page.workers().length;if(c.remainingWorkers)c.passed=false;await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({name:c.name,passed:c.passed,error:c.error}));}
 }
}finally{
 let timer;
 try{await Promise.race([(async()=>{await browserServer.close();await browser.close();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}
 catch(error){result.browserClosed=false;result.cleanupError=String(error);await browserServer.kill();}
 clearTimeout(timer);server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.browserClosed&&result.cases.length===10&&result.cases.every(c=>c.passed);if(!result.passed)process.exitCode=1;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
}
