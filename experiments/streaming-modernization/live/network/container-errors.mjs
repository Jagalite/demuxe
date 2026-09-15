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
const result={stage:'integrated-container-errors',releaseQualified:false,family,archiveSHA256:await sha(archive),testHarnessSHA256:await sha(import.meta.filename),fixture:JSON.parse(await readFile(path.join(fixture,'fixture-manifest.json'))),cases:[]};
let current;
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  const media=u.pathname.startsWith('/media/'),base=media?fixture:assets,relative=u.pathname.slice(media?7:8),file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)||(!media&&!u.pathname.startsWith('/vendor/'))){res.writeHead(404).end();return;}
  let bytes=await readFile(file);if(media&&relative==='low/002.m4s'){
   if(current.scenario==='empty-mdat'){
    let at=0;while(at+8<=bytes.length&&bytes.toString('ascii',at+4,at+8)!=='mdat'){const size=bytes.readUInt32BE(at);assert.ok(size>=8&&at+size<=bytes.length);at+=size;}
    assert.equal(bytes.toString('ascii',at+4,at+8),'mdat');bytes=bytes.subarray(0,at+8);
   }else bytes=bytes.subarray(0,Math.floor(bytes.length/2));
  }res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
  if(!media){res.setHeader('Content-Length',bytes.length);res.end(bytes);return;}
  const c=current,r={file:relative,at:performance.now(),phase:c.phase??0,status:200,sent:0,complete:false,aborted:false,authorized:req.headers.authorization==='Bearer fresh'};c.requests.push(r);
  res.on('close',()=>{r.aborted=!r.complete;});
  res.setHeader('ETag','"'+createHash('sha256').update(bytes).digest('hex')+'"');
  res.setHeader('Content-Length',bytes.length);
  r.sent=bytes.length;r.complete=true;res.end(bytes);
 }catch(error){if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end();}}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browserType=({chrome:chromium,firefox})[family],browserServer=await browserType.launchServer({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});const browser=await browserType.connect(browserServer.wsEndpoint());result.browser=browser.version();result.browserPid=browserServer.process().pid;
try{
 for(const mode of ['hybrid','software'])for(const scenario of ['container-truncated','empty-mdat']){
  const c={name:mode+':'+scenario,mode,scenario,requests:[]};current=c;result.cases.push(c);const page=await browser.newPage();page.setDefaultTimeout(30000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);
   await page.evaluate(async mode=>{
    window.errors=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));
    window.source=()=>({url:location.origin+'/media/master.m3u8',format:'hls',streaming:{qualityPolicy:{mode:'manual'}}});
    window.openOutcome='pending';
    p.openRemote(source()).then(async()=>{openOutcome='opened';await p.play();}).catch(error=>{openOutcome='rejected';errors.push({code:error.code,message:error.message});});
   },mode);
    await page.waitForFunction(()=>errors.length>0);c.failure=await page.evaluate(()=>({state:p.state,diagnostics:p.diagnostics,errors,openOutcome}));
    assert.notEqual(c.failure.state.status,'ended','Container failure must not become successful EOF');assert.ok(c.requests.some(r=>r.file==='low/002.m4s'));
    assert.ok(c.failure.errors.some(e=>/resource|transport|fetch|network|demux/i.test(e.message)),'The completed HTTP body contains a truncated container; native demux failure must be surfaced');
    assert.ok(!c.requests.some(r=>r.file==='low/003.m4s'),'A failed media resource cannot silently advance');
   c.passed=true;
  }catch(error){c.passed=false;c.error=String(error.stack);c.state=await page.evaluate(()=>({state:window.p?.state,diagnostics:window.p?.diagnostics,errors:window.errors})).catch(()=>null);process.exitCode=1;}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(error=>{c.destroyError=String(error);c.passed=false;});await page.waitForTimeout(250);c.remainingWorkers=page.workers().length;if(c.remainingWorkers)c.passed=false;await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({name:c.name,passed:c.passed,error:c.error}));}
 }
}finally{
 let timer;
 try{await Promise.race([(async()=>{await browserServer.close();await browser.close();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser shutdown exceeded 15 seconds')),15000);})]);result.browserClosed=true;}
 catch(error){result.browserClosed=false;result.cleanupError=String(error);await browserServer.kill();}
 clearTimeout(timer);server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.browserClosed&&result.cases.length===4&&result.cases.every(c=>c.passed);if(!result.passed)process.exitCode=1;await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
}
