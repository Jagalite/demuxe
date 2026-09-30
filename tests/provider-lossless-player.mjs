// SPDX-License-Identifier: Apache-2.0
// Public installed package APIs -> verified lazy acquisition -> complete output.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome';
const setup=JSON.parse(await readFile('build/provider-lossless-audio/installed.json','utf8'));
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json','utf8'));
assert.equal(host.passed,true);
const deployment=JSON.parse(await readFile(setup.work+'/deployed/demuxe-providers.json','utf8'));
const identities=Object.fromEntries(deployment.providers.map(p=>[p.id,p.implementationIdentity]));
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;requests.push({case:active,path:name});
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><div id="player"></div>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):path.resolve(setup.work);
 const file=path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const b=await readFile(file);if(active==='cancel'&&file.endsWith('truehd-mlp/module.wasm'))await new Promise(r=>setTimeout(r,300));res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const result={passed:false,family,setup,cases:[],scope:'original local sources through automatic public Player, selected codecs only; bounded finite profile'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}
 else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const f of host.results){
  active=f.id;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(90000);await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await page.locator('#start').click();
  const sample=await page.evaluate(async f=>{
   const {Player}=await import('/node_modules/demuxe/dist/index.js');
   const input=await(await fetch('/fixtures/'+f.id+'.mkv')).arrayBuffer();
   const player=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed/',location.href).href,preview:false});
   try{
    const began=performance.now();try{await player.open(new File([input],f.id+'.mkv'));}catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}const openMs=performance.now()-began;
    await player.play();
    const seek=f.channels===8?4:.2;await player.seek(seek);
    const deadline=performance.now()+10000;while(player.state.currentTime<seek+.2&&performance.now()<deadline)await new Promise(r=>setTimeout(r,20));
    if(player.state.currentTime<seek+.2)throw Error('Original source Player playback stalled: '+JSON.stringify(player.diagnostics));
    const explanation=player.getPlaybackExplanation(),diagnostics=player.diagnostics;
    if(explanation.planId!=='native-transcode'||diagnostics.backend?.projection?.kind!=='codec-components')throw Error('Unexpected original-source implementation: '+JSON.stringify({explanation,diagnostics}));
    const video=document.querySelector('#player video'),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);
    const nonblack=cx.getImageData(0,0,160,90).data.some((v,i)=>i%4!==3&&v>60);if(!nonblack)throw Error('Original source Player produced black video');
    await player.seek(f.channels===8?6:.6);
    return {openMs,played:true,nonblack,seekTime:player.state.currentTime,explanation,diagnostics};
   }catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}finally{await player.destroy();}
  },f);
  assert.deepEqual(errors,[]);
  const wasm=requests.filter(r=>r.case===f.id&&r.path.endsWith('.wasm')).map(r=>r.path),profile=f.codec==='dts-hd'?'dts-hd':'truehd-mlp';
  assert.deepEqual(wasm.sort(),['/deployed/web/providers/audio/'+profile+'/module.wasm','/deployed/web/providers/audio/flac/module.wasm'].sort());
  result.cases.push({id:f.id,...sample,wasmRequests:wasm});console.log(f.id,'original Player passed');await page.close();
 }
 active='cancel';
 const page=await browser.newPage();page.setDefaultTimeout(90000);await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await page.locator('#start').click();
 const requested=page.waitForRequest(r=>r.url().endsWith('/audio/truehd-mlp/module.wasm'));
 await page.evaluate(async()=>{
  const {Player}=await import('/node_modules/demuxe/dist/index.js');
  window.input=await(await fetch('/fixtures/truehd-stereo.mkv')).arrayBuffer();
  window.player=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed/',location.href).href,preview:false,nativeRemux:'always'});
  window.controller=new AbortController();window.opening=player.open(new File([input],'cancel.mkv'),{signal:controller.signal}).then(()=>({opened:true}),e=>({code:e.code,name:e.name}));
 });
 await requested;await page.evaluate(()=>controller.abort());
 const cancelled=await page.evaluate(async()=>{
  const outcome=await opening;
  if(outcome.code!=='ABORTED'&&outcome.name!=='AbortError')throw Error('Cancellation was not terminal: '+JSON.stringify(outcome));
  await player.open(new File([input],'reopen.mkv'));await player.play();
  if(player.getPlaybackExplanation().planId!=='native-transcode')throw Error('Reopen after cancellation did not use codec preparation');
  await player.destroy();return {...outcome,reopened:true,destroyed:true};
 });
 result.cancellation=cancelled;await page.close();
 result.passed=true;
} catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{if(browser)try{result.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});}catch(error){result.cleanupError=String(error);result.passed=false;process.exitCode=1;}server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-audio',{recursive:true});const text=JSON.stringify(result,null,2)+'\n';await mkdir('results/media-components/production-audio/player-attempts',{recursive:true});await writeFile('results/media-components/production-audio/player-attempts/'+Date.now()+'-'+family+'.json',text);await writeFile('results/media-components/production-audio/player-'+family+'.json',text);console.log(result.passed,result.error??'');}
