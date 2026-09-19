// SPDX-License-Identifier: Apache-2.0
// Actual Wasm demux failures over HTTP; no injected engine result.
import {chromium,firefox} from 'playwright';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out=path.resolve(process.env.OUT),archive=path.resolve(process.env.BETA_ARCHIVE);
const fixture=path.resolve(process.env.SEGMENT_FIXTURE),singleMPD=path.resolve(process.env.SINGLE_VIDEO_MPD);
const family=process.env.BROWSER||'chrome';
await mkdir(out);await mkdir(out+'/extracted');execFileSync('tar',['-xzf',archive,'-C',out+'/extracted']);
const assets=out+'/extracted/package',hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(assets+'/release-manifest.json'));
for(const [name,expected]of Object.entries(manifest.files))assert.equal(hash(await readFile(path.join(assets,name))),expected.sha256);
const mpd=await readFile(singleMPD);let current;
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<div id="host"></div><script type="module">import{Player}from"/vendor/index.js";window.Player=Player;</script>');return;}
  const media=u.pathname.startsWith('/media/'),base=media?fixture:assets;
  const name=u.pathname.slice(media?7:8),file=path.resolve(base,name);
  if(!file.startsWith(base+path.sep)||(!media&&!u.pathname.startsWith('/vendor/'))){res.writeHead(404).end();return;}
  const bytes=media&&name==='dash/single.mpd'?mpd:await readFile(file);
  let response=bytes,declared=bytes.length;
  if(media){
   const targets=current.fault==='init'?['low/init.mp4','dash/init-stream0.m4s']:['low/002.m4s','dash/chunk-stream0-00003.m4s'];
   const bad=targets.includes(name);
   if(bad){if(current.fault==='init')declared+=100000;else response=bytes.subarray(0,Math.floor(bytes.length/2));}
   current.requests.push({name,sha256:hash(bytes),bytes:bytes.length,sent:response.length,declared,truncated:bad});
  }
  res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(file)?'text/javascript':'application/octet-stream');
  res.setHeader('Content-Length',declared);res.setHeader('Connection','close');res.end(response);
 }catch(e){if(!res.headersSent)res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
const result={scope:'Actual browser HLS/DASH truncated init/media errors',releaseQualified:false,family,browser:browser.version(),archiveSHA256:hash(await readFile(archive)),testHarnessSHA256:hash(await readFile(import.meta.filename)),singleMPDSHA256:hash(mpd),cases:[]};
try{
 for(const mode of ['hybrid','software'])for(const format of ['hls','dash'])for(const fault of ['init','media']){
  const c={name:`${mode}:${format}:${fault}`,mode,format,fault,requests:[]};current=c;result.cases.push(c);
  const page=await browser.newPage();page.setDefaultTimeout(20000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);
   await page.evaluate(({mode,format})=>{
    window.errors=[];window.openOutcome='pending';window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});
    p.addEventListener('error',e=>errors.push(e.detail));
    p.openRemote({url:location.origin+'/media/'+(format==='hls'?'low/media.m3u8':'dash/single.mpd'),format})
      .then(async()=>{openOutcome='opened';await p.play();}).catch(e=>{openOutcome='rejected';errors.push({code:e.code,message:e.message});});
   },{mode,format});
   await page.waitForFunction(()=>errors.length>0);
   if(fault==='init')await page.waitForFunction(()=>openOutcome!=='pending');
   c.state=await page.evaluate(()=>({state:p.state,errors,openOutcome,diagnostics:p.diagnostics}));
   assert.ok(c.requests.some(r=>r.truncated),'The intended resource fault was exercised');
   assert.notEqual(c.state.state.status,'ended','A truncated resource must not be clean EOF');
   assert.ok(c.state.errors.some(e=>/resource|transport|fetch|truncat|network|input|load/i.test(e.message)),'Failure is surfaced');
   if(fault==='init')assert.notEqual(c.state.openOutcome,'opened','Incomplete initialization cannot be accepted');
   if(fault==='media')assert.ok(!c.requests.some(r=>['low/003.m4s','dash/chunk-stream0-00004.m4s'].includes(r.name)),'Failed media cannot silently advance');
   await page.evaluate(()=>p.destroy());await page.waitForTimeout(250);assert.equal(page.workers().length,0);
   c.passed=true;console.log('PASS',c.name);
  }catch(e){c.error=String(e.stack);c.state??=await page.evaluate(()=>({state:window.p?.state,errors:window.errors,openOutcome:window.openOutcome})).catch(()=>null);c.passed=false;console.log('FAIL',c.name,c.error);}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.cases.length===8&&result.cases.every(c=>c.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
process.exitCode=result.passed?0:1;
