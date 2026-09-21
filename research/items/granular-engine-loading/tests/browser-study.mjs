// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {focusForQualification,observeForeground} from '../../../../scripts/qualification-foreground.mjs';
const base='research/items/granular-engine-loading',out=(await readFile(base+'/active-run.txt','utf8')).trim(),runtime=path.resolve(out,'snapshots/runtime'),variant=process.env.VARIANT??'baseline',family=process.env.BROWSER??'chrome',stage=process.env.STAGE??'correctness',network=process.env.NETWORK??'local';
const runName=`${stage}-${family}-${variant}-${network}-${Date.now()}`,dest=path.join(out,runName);await mkdir(dest,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const requests=[],errors=[];let active=0;
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/favicon.ico'){res.writeHead(204).end();return;}if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0;background:#111}#surface{width:320px}</style><div id="surface"></div><input id="file" type="file">');return;}
 let file=u.pathname.startsWith('/web/engine-hybrid/')?path.resolve(out,'variants',variant,path.basename(u.pathname)):path.resolve(runtime,'.'+u.pathname);
 if(!file.startsWith(runtime)&&!file.startsWith(path.resolve(out,'variants',variant)))throw Error('Invalid path');
 const wasm=file.endsWith('.wasm'),gzip=network==='10mbps'&&wasm;
 let bytes=gzip&&u.pathname.startsWith('/web/engine-hybrid/')?await readFile(file+'.gz'):await readFile(file);
 if(gzip&&!u.pathname.startsWith('/web/engine-hybrid/')){const {gzipSync}=await import('node:zlib');bytes=gzipSync(bytes,{level:6,mtime:0});}
 const record={url:u.pathname,bytes:bytes.length,gzip,started:Date.now()};requests.push(record);
 res.setHeader('Content-Type',wasm?'application/wasm':file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.ttf')?'font/ttf':'application/octet-stream');res.setHeader('Content-Length',bytes.length);if(gzip)res.setHeader('Content-Encoding','gzip');
 if(gzip){active++;await sleep(80);for(let offset=0;offset<bytes.length&&!res.destroyed;offset+=32768){const chunk=bytes.subarray(offset,offset+32768);res.write(chunk);await sleep(chunk.length*8/10000);}active--;res.end();}else res.end(bytes);record.finished=Date.now();
 }catch(error){errors.push(String(error));res.writeHead(404).end(String(error));}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await(family==='firefox'?firefox:chromium).launch({headless:false,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});const result={stage,family,variant,network,browser:browser.version(),requests,errors,passed:false};
try{
 const page=await browser.newPage({viewport:{width:640,height:480}});page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.bringToFront();if(family==='chrome')result.foregroundStart=await focusForQualification(page,browser);
 const cdp=family==='chrome'?await browser.newBrowserCDPSession():null;
 async function processSnapshot(){if(!cdp)return null;const info=await cdp.send('SystemInfo.getProcessInfo');let rssKiB=null;try{rssKiB=execFileSync('ps',['-o','rss=','-p',info.processInfo.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).map(Number).reduce((a,b)=>a+b,0);}catch{}return {cpuSeconds:info.processInfo.reduce((s,p)=>s+p.cpuTime,0),rssKiB,pids:info.processInfo.map(p=>p.id)};}
 const file=stage==='correctness'?path.resolve(out,'fixtures-v2/h264-aac-ass.mkv'):'/Volumes/seed2/Projects/startup-repro/software_test_slow.mkv';
 result.fixture=file;await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:320,height:180,assetBase:'/'});window.events=[];for(const type of ['selectionchange','modechange','error'])player.addEventListener(type,e=>events.push({type,detail:e.detail,ms:performance.now()-(window.start??0)}));});
 await page.locator('#file').setInputFiles(file);result.before=await processSnapshot();
 result.startup=await page.evaluate(async()=>{window.start=performance.now();await player.open(document.querySelector('#file').files[0]);const openMs=performance.now()-start;await player.play();return {openMs,playMs:performance.now()-start};});
 await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.2,null,{timeout:30000});
 result.startup.movementMs=await page.evaluate(()=>performance.now()-start);result.after=await processSnapshot();
 result.state=await page.evaluate(()=>({mode:player.mode,diagnostics:player.diagnostics,audio:player.audioDiagnostics(),events}));
 assert.equal(result.state.mode,family==='firefox'&&stage!=='correctness'?'software':'hybrid');if(result.state.mode==='hybrid')assert.equal(result.state.diagnostics.backend.decoder,'webcodecs');assert.ok(result.state.audio.mediaFrames>0);
 if(stage==='correctness'){
  await page.evaluate(()=>player.selectTrack('sub','1'));result.tone=await page.evaluate(()=>{const b=player.current.backend,a=new Float32Array(b.analyser.fftSize);b.analyser.getFloatTimeDomainData(a);let crossings=0;for(let i=1;i<a.length;i++)if(a[i-1]<=0&&a[i]>0)crossings++;return {frequency:crossings*b.audioContext.sampleRate/a.length,rms:Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length)};});
  assert.ok(Math.abs(result.tone.frequency-1000)<80,JSON.stringify(result.tone));assert.ok(result.tone.rms>.01);
  await page.evaluate(()=>player.pause());result.positions=[];
  for(const target of [1,3]){await page.evaluate(t=>player.seek(t),target);await page.waitForTimeout(150);const position=await page.evaluate(()=>player.diagnostics.backend.presentation.position);assert.ok(Math.abs(position-target)<.15);result.positions.push(position);await page.locator('canvas').screenshot({path:path.join(dest,`frame-${target}.png`)});}
  await page.evaluate(()=>player.subtitleVisible(false));await page.waitForTimeout(150);await page.locator('canvas').screenshot({path:path.join(dest,'frame-3-no-sub.png')});
  await page.evaluate(async()=>{await player.subtitleVisible(true);await player.play();});await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>3.2);
  await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.play();});await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.1);result.replacement=true;
  if(family==='chrome'){
   await page.evaluate(()=>player.current.backend.dispatchEvent(new CustomEvent('error',{detail:'Injected runtime decoder failure'})));
   await page.waitForFunction(()=>player.mode==='software'&&Number(player.properties.get('time-pos'))>.2,null,{timeout:30000});result.fallback=await page.evaluate(()=>({mode:player.mode,attempts:player.diagnostics.selection.attempts,audio:player.audioDiagnostics()}));assert.ok(result.fallback.audio.mediaFrames>0);
  }
 }
 if(family==='chrome'){result.foregroundEnd=await observeForeground(page,browser);assert.ok(result.foregroundEnd.matched);}
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);result.remainingWorkers=page.workers().length;assert.equal(result.remainingWorkers,0);assert.deepEqual(errors,[]);result.passed=true;
}catch(error){result.error=String(error.stack);process.exitCode=1;}finally{await browser.close();if(result.after?.pids){await sleep(200);result.survivingPids=result.after.pids.filter(pid=>{try{process.kill(pid,0);return true;}catch{return false;}});if(result.survivingPids.length){result.passed=false;result.error='Browser processes survived close: '+result.survivingPids;process.exitCode=1;}}await new Promise(r=>server.close(r));await writeFile(path.join(dest,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({dest,passed:result.passed,error:result.error,startup:result.startup}));}
