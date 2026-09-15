// Real browser playback through the experimental Fetch -> mailbox -> AVIO path.
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const archive=path.resolve(process.env.BETA_ARCHIVE),fixture=path.resolve(process.env.LARGE_FIXTURE);
const out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';
await mkdir(out);await mkdir(path.join(out,'extracted'));
execFileSync('tar',['-xzf',archive,'-C',path.join(out,'extracted')]);
const assets=path.join(out,'extracted/package');const manifest=JSON.parse(await readFile(path.join(assets,'release-manifest.json')));
for(const [file,expected] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(path.join(assets,file))).digest('hex'),expected.sha256);
const sha=async f=>createHash('sha256').update(await readFile(f)).digest('hex');
const result={stage:'incremental-AVIO',releaseQualified:false,family,archiveSHA256:await sha(archive),testHarnessSHA256:await sha(import.meta.filename),fixture:JSON.parse(await readFile(path.join(fixture,'manifest.json'))),cases:[]};
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
  const size=(await stat(file)).size;
  if(media&&file.endsWith('.m4s')){
   const state=current;const request={started:performance.now(),sent:0,size,complete:false,aborted:false};state.requests.push(request);
   if(!state.unknown)res.setHeader('Content-Length',size);
   res.flushHeaders();
   const stream=createReadStream(file,{highWaterMark:65536});res.on('close',()=>{request.aborted=!request.complete;stream.destroy();});
   for await(const chunk of stream){await delay(50);if(res.destroyed)break;res.write(chunk);request.sent+=chunk.length;}
   if(!res.destroyed){request.complete=true;request.finished=performance.now();res.end();}
  }else{res.setHeader('Content-Length',size);res.end(await readFile(file));}
 }catch(error){if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end('Fixture request failed');}}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browser=browser.version();
try{
 for(const mode of ['hybrid','software'])for(const unknown of [false,true]){
  const c={name:`${mode}:${unknown?'unknown':'known'}-length`,mode,unknown,requests:[],errors:[]};current=c;result.cases.push(c);
  const page=await browser.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>c.errors.push(String(e)));
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.Player);const began=performance.now();
   await page.evaluate(async mode=>{window.errors=[];window.logs=[];window.p=new Player(document.querySelector('#host'),{mode,width:640,height:360});p.addEventListener('error',e=>errors.push(e.detail));p.addEventListener('log',e=>{logs.push(e.detail);if(logs.length>80)logs.shift();});await p.openRemote({url:location.origin+'/media/index.m3u8',format:'hls'});await p.play();},mode);
   await page.waitForFunction(()=>p.properties.get('time-pos')>.4&&p.audioDiagnostics()?.mediaFrames>0&&p.audioDiagnostics()?.rms>.001);
   c.startupMs=performance.now()-began;c.startupRequests=structuredClone(c.requests);
   assert.ok(c.requests.some(r=>r.sent>0&&r.sent<r.size&&!r.complete),'Playback starts before segment delivery completes');
   c.startup=await page.evaluate(()=>({diagnostics:p.diagnostics,audio:p.audioDiagnostics(),errors,logs}));
   const pixels=()=>page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const ctx=canvas.getContext('2d');ctx.drawImage(p.surface,0,0,64,36);return Array.from(ctx.getImageData(0,0,64,36).data).reduce((h,x)=>Math.imul(h^x,16777619)>>>0,2166136261);});
   const first=await pixels();await page.waitForTimeout(600);const second=await pixels();assert.notEqual(first,second,'Actual rendered video changes');c.pixels=[first,second];
   c.beforeReplacement=await page.evaluate(()=>({diagnostics:p.diagnostics,audio:p.audioDiagnostics(),errors}));assert.deepEqual(c.beforeReplacement.errors,[]);
   const oldRequests=c.requests.slice(),replacementBegan=performance.now();
   await page.evaluate(async()=>{await p.openRemote({url:location.origin+'/media/index.m3u8?replacement',format:'hls'});await p.play();});
   await page.waitForFunction(()=>p.properties.get('time-pos')>.4&&p.audioDiagnostics()?.mediaFrames>0&&p.audioDiagnostics()?.rms>.001);
   c.replacementMs=performance.now()-replacementBegan;
   const closeDeadline=performance.now()+1000;
   while(!oldRequests.some(r=>r.aborted)&&performance.now()<closeDeadline)await delay(25);
   assert.ok(oldRequests.some(r=>r.aborted),'Source replacement cancels the old nested segment');
   assert.ok(c.requests.length>oldRequests.length,'Replacement owns a fresh nested request');
   c.beforeDestroy=await page.evaluate(()=>({diagnostics:p.diagnostics,audio:p.audioDiagnostics(),errors}));assert.deepEqual(c.beforeDestroy.errors,[]);
   const destroy=performance.now();await page.evaluate(()=>p.destroy());c.destroyMs=performance.now()-destroy;
   await page.waitForTimeout(250);assert.equal(page.workers().length,0,'All playback and transport workers retire');assert.ok(c.requests.some(r=>r.aborted),'Outstanding segment cancelled');
   c.passed=true;console.log('PASS',c.name,Math.round(c.startupMs)+'ms');
  }catch(error){c.error=String(error.stack);c.state=await page.evaluate(()=>({diagnostics:window.p?.diagnostics,errors:window.errors,logs:window.logs})).catch(()=>null);c.passed=false;console.log('FAIL',c.name,c.error);process.exitCode=1;}
  finally{await page.evaluate(()=>window.p?.destroy()).catch(()=>{});await page.close();await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));result.passed=result.cases.length===4&&result.cases.every(c=>c.passed);await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
