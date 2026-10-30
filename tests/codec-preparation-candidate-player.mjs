// SPDX-License-Identifier: Apache-2.0
// Candidate-only variant: test-owned qualification; never a maintained release gate.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',runtime=process.env.CODEC_RUNTIME??'asyncify';
const setup=JSON.parse(await readFile(process.env.DEMUXE_CANDIDATE_SETUP??'build/codec-preparation/installed-'+runtime+'.json','utf8'));
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json','utf8'));
assert.equal(host.passed,true);
const deployment=JSON.parse(await readFile(setup.work+'/deployed/demuxe-providers.json','utf8'));
const identities=Object.fromEntries(deployment.providers.map(p=>[p.id,p.implementationIdentity]));
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;const request={case:active,path:name};requests.push(request);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><div id="player"></div>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):path.resolve(setup.work);
 const file=path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const b=await readFile(file);request.bodyBytes=b.length;if(active==='cancel'&&file.includes('truehd-mlp-'+runtime+'/engine-adaptation-'+runtime+'/remux.wasm'))await new Promise(r=>setTimeout(r,300));res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const result={passed:false,family,runtime,setup,cases:[],harnessSHA256:digest(await readFile(new URL(import.meta.url))),deploymentSHA256:digest(await readFile(setup.work+'/deployed/demuxe-providers.json')),hostSHA256:digest(await readFile('results/media-components/production-audio/host-recipes.json')),scope:'candidate test-owned identity map; original local sources and public Player; not release qualification'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}
 else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const f of host.results){
  active=f.id;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(90000);await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await page.locator('#start').click();
  const sample=await page.evaluate(async ({f,runtime,identities})=>{
   const {Player,DemuxeRuntime}=await import('/node_modules/demuxe/dist/index.js');
   const candidateRuntime=new DemuxeRuntime({assetBase:new URL('/deployed/',location.href).href,qualifiedProviders:identities});
   await candidateRuntime.providers.load('demuxe-providers.json');
   const input=await(await fetch('/fixtures/'+f.id+'.mkv')).arrayBuffer();
   const sourceSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),v=>v.toString(16).padStart(2,'0')).join('');if(sourceSHA256!==f.sourceSHA256)throw Error('Candidate fixture hash changed');
   const player=new Player(document.querySelector('#player'),{runtime:candidateRuntime,preview:false,remuxRuntime:runtime});
   try{
    const began=performance.now();try{await player.open(new File([input],f.id+'.mkv'));}catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}const openMs=performance.now()-began;
    await player.play();
    const seek=f.channels===8?4:.2;await player.seek(seek);
    const deadline=performance.now()+10000;while(player.state.currentTime<seek+.2&&performance.now()<deadline)await new Promise(r=>setTimeout(r,20));
    if(player.state.currentTime<seek+.2)throw Error('Original source Player playback stalled: '+JSON.stringify(player.diagnostics));
    const explanation=player.getPlaybackExplanation(),diagnostics=player.diagnostics;
    if(explanation.planId!=='native-transcode'||diagnostics.backend?.projection?.kind==='codec-components')throw Error('Unexpected original-source implementation: '+JSON.stringify({explanation,diagnostics}));
    const video=document.querySelector('#player video'),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);
    const nonblack=cx.getImageData(0,0,160,90).data.some((v,i)=>i%4!==3&&v>60);if(!nonblack)throw Error('Original source Player produced black video');
    await player.seek(f.channels===8?6:.6);
    return {openMs,played:true,nonblack,seekTime:player.state.currentTime,sourceSHA256,explanation,diagnostics};
   }catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}finally{await player.destroy();await candidateRuntime.destroy();}
  },{f,runtime,identities});
  const retirement=Date.now()+5000;while(page.workers().length&&Date.now()<retirement)await new Promise(r=>setTimeout(r,25));assert.equal(page.workers().length,0,'Player.destroy must retire source and decoder workers');
  assert.deepEqual(errors,[]);
  const wasm=requests.filter(r=>r.case===f.id&&r.path.endsWith('.wasm')).map(r=>r.path),profile=f.codec==='dts-hd'?'dts-hd':'truehd-mlp';
  assert.deepEqual(wasm.sort(),['/deployed/web/providers/preparation/'+profile+'-'+runtime+'/engine-adaptation-'+runtime+'/remux.wasm']);
  result.cases.push({id:f.id,...sample,wasmRequests:wasm});console.log(f.id,'original Player passed');await page.close();
 }
 active='cancel';
 const page=await browser.newPage();page.setDefaultTimeout(90000);await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await page.locator('#start').click();
 const requested=page.waitForRequest(r=>r.url().endsWith('/preparation/truehd-mlp-'+runtime+'/engine-adaptation-'+runtime+'/remux.wasm'));
 await page.evaluate(async ({runtime,identities})=>{
  const {Player,DemuxeRuntime}=await import('/node_modules/demuxe/dist/index.js');
  window.candidateRuntime=new DemuxeRuntime({assetBase:new URL('/deployed/',location.href).href,qualifiedProviders:identities});
  await candidateRuntime.providers.load('demuxe-providers.json');
  window.input=await(await fetch('/fixtures/truehd-stereo.mkv')).arrayBuffer();
  window.player=new Player(document.querySelector('#player'),{runtime:candidateRuntime,preview:false,remuxRuntime:runtime,nativeRemux:'always'});
  window.controller=new AbortController();window.opening=player.open(new File([input],'cancel.mkv'),{signal:controller.signal}).then(()=>({opened:true}),e=>({code:e.code,name:e.name}));
 },{runtime,identities});
 await requested;await page.evaluate(()=>controller.abort());
 const cancelled=await page.evaluate(async()=>{
  const outcome=await opening;
  if(outcome.code!=='ABORTED'&&outcome.name!=='AbortError')throw Error('Cancellation was not terminal: '+JSON.stringify(outcome));
  await player.open(new File([input],'reopen.mkv'));await player.play();
  if(player.getPlaybackExplanation().planId!=='native-transcode')throw Error('Reopen after cancellation did not use codec preparation');
  await player.destroy();await candidateRuntime.destroy();return {...outcome,reopened:true,destroyed:true};
 });
 result.cancellation=cancelled;await page.close();
 result.requests=requests;result.passed=true;
} catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{if(browser)try{result.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});}catch(error){result.cleanupError=String(error);result.passed=false;process.exitCode=1;}server.closeAllConnections();await new Promise(r=>server.close(r));if(!process.env.DEMUXE_CANDIDATE_RECEIPT)throw Error('Set DEMUXE_CANDIDATE_RECEIPT');await writeFile(process.env.DEMUXE_CANDIDATE_RECEIPT,JSON.stringify(result,null,2)+'\n');console.log(result.passed,result.error??'');}
