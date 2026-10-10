// SPDX-License-Identifier: Apache-2.0
import {createHash} from 'node:crypto';
import {demoEntryAssets,verifyDemoAssets} from '../scripts/verify-demo-assets.mjs';
import {chromium, firefox} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.env.PAGES_DIR||'build/pages-site');
const kind=process.env.BROWSER||'chrome';
const out=`results/pages/${kind}-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
let server;
let origin=process.env.PAGES_URL;
if(!origin){
 server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');
   if(!url.pathname.startsWith('/demuxe/')){res.writeHead(404).end();return;}
   const name=decodeURIComponent(url.pathname.slice('/demuxe/'.length));
   let file=path.resolve(root,name||'index.html');
   if(!file.startsWith(root+path.sep))throw Error();
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   const info=await stat(file);let start=0,end=info.size-1,status=200;
   const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
   if(range){start=Number(range[1]);end=range[2]?Math.min(end,Number(range[2])):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
   const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.ttf':'font/ttf'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
   res.setHeader('Content-Length',end-start+1);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');
   // Intentionally no isolation headers: this models GitHub Pages.
   res.writeHead(status);if(req.method==='HEAD'){res.end();return;}
   createReadStream(file,{start,end}).pipe(res);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}/demuxe/`;
}
const trials=Number(process.env.PAGES_TRIALS||3);
assert.ok(Number.isInteger(trials)&&trials>0&&trials<=10,'PAGES_TRIALS must be 1–10');
const browser=await(kind==='firefox'?firefox:chromium).launch({headless:true,...(kind==='chrome'?{channel:'chrome'}:{})});
const result={passed:false,url:origin,browser:kind,browserVersion:browser.version(),scope:process.env.PAGES_ALLOW_PREVIEW==='1'?'local asset snapshot; not a clean release build':'assembled Pages site',trials:[],checks:[]};
const hash=data=>createHash('sha256').update(data).digest('hex');
let activePage;
const browserEvents=[];
browser.on('disconnected',()=>browserEvents.push('browser disconnected'));
// Observe real output: native video frame callbacks, Wasm renderer counters,
// changing surface screenshots, and non-silent PCM at the audio destination.
async function observeOutput(page){
 await page.addInitScript(()=>{
  const originalConnect=AudioNode.prototype.connect,OriginalContext=window.AudioContext;
  const analysers=[],tapped=new WeakSet(),media=new Set(),observerContexts=[];
  let nativeObserver;
  const now=()=>performance.now();
  const probe=window.pagesProbe={started:null,openMs:null,videoMs:null,audioMs:null,videoEvidence:null,peakRms:0,videoFrames:0,
   closeObservers:()=>Promise.all(observerContexts.splice(0).map(context=>context.close()))};
  function tap(node){
   if(tapped.has(node))return;tapped.add(node);
   const analyser=node.context.createAnalyser();analyser.fftSize=2048;
   originalConnect.call(node,analyser);analysers.push(analyser);
  }
  AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode)tap(this);return originalConnect.call(this,destination,...args);};
  const create=document.createElement;
  document.createElement=function(tag,...args){const element=create.call(this,tag,...args);if(String(tag).toLowerCase()==='video'||String(tag).toLowerCase()==='audio')media.add(element);return element;};
  const seen=new WeakSet();
  setInterval(()=>{
   for(const element of media){
    const surface=document.querySelector('demuxe-player')?.shadowRoot?.getElementById('surface');
    if(seen.has(element)||!surface?.contains(element)||!element.src&&!element.currentSrc&&!element.srcObject)continue;
    seen.add(element);
    if(element.requestVideoFrameCallback){
     const frame=()=>{if(probe.started!==null&&element.isConnected&&surface.contains(element)){probe.videoFrames++;probe.videoMs??=now()-probe.started;probe.videoEvidence='requestVideoFrameCallback';}element.requestVideoFrameCallback(frame);};element.requestVideoFrameCallback(frame);
    }
    try{const context=nativeObserver??new OriginalContext(),source=context.createMediaElementSource(element);if(!nativeObserver)observerContexts.push(context);source.connect(context.destination);void context.resume();}catch(error){probe.audioObserverError=String(error);}
   }
   if(probe.started===null)return;
   const player=window.player;
   if(player?.state.sourceId!==null&&player?.state.sourceId!==undefined&&!player.state.pendingOperation)probe.openMs??=now()-probe.started;
   if(Number(player?.diagnostics.backend?.rendered)>0&&probe.videoMs===null){probe.videoMs=now()-probe.started;probe.videoEvidence='renderer counter';}
   for(const analyser of analysers){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length);probe.peakRms=Math.max(probe.peakRms,rms);if(rms>.005)probe.audioMs??=now()-probe.started;}
  },10);
  document.addEventListener('click',event=>{
   const clicked=id=>event.composedPath().some(n=>n instanceof Element&&n.id===id);
   // Prepare measurement infrastructure during the source-menu gesture, before
   // timing example playback. A suspended observer can stall the media clock.
   if(clicked('open-menu')&&!nativeObserver){nativeObserver=new OriginalContext();observerContexts.push(nativeObserver);window.pagesAudioObserverReady=nativeObserver.resume().then(()=>{probe.audioObserverReadyAt=now();});}
   if(clicked('demo'))probe.started=now();
  },true);
 });
}
try{
 const harness=await readFile(import.meta.filename);result.testHarnessSHA256=hash(harness);await writeFile(`${out}/harness.mjs`,harness);
 for(const mode of ['native','hybrid','software'])for(let trial=1;trial<=trials;trial++){
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const pageEvents=[];
  try{
   const page=activePage=await context.newPage();page.setDefaultTimeout(60000);
   page.on('crash',()=>pageEvents.push('page crashed'));page.on('close',()=>pageEvents.push('page closed'));
   const errors=[],badRequests=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('request',request=>{if(/^https?:/.test(request.url())&&(request.method()!=='GET'||!request.url().startsWith(origin)))badRequests.push({url:request.url(),method:request.method()});});
   await observeOutput(page);
   const navigationStart=performance.now();await page.goto(origin);
   await page.waitForFunction(()=>crossOriginIsolated&&window.player);
   const navigationReadyMs=performance.now()-navigationStart;
   assert.equal(await page.locator('#pages-startup').count(),0);
   assert.equal(await page.evaluate(()=>document.querySelector('demuxe-player').layout),'classic');
   assert.ok(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/pages-isolation-sw.js')));
   if(!result.deployment){
    const response=await page.request.get(new URL('deployment-manifest.json',origin).href);assert.ok(response.ok());
    const bytes=await response.body(),deployment=JSON.parse(bytes);
    if(deployment.status==='local-preview-not-for-deployment')assert.equal(process.env.PAGES_ALLOW_PREVIEW,'1','Local previews cannot pass deployment checks');
    if(process.env.PAGES_EXPECT_TAG){assert.equal(deployment.status,'tagged-development-demo');assert.equal(deployment.sourceTag,process.env.PAGES_EXPECT_TAG);assert.equal(deployment.dirtySource,false);}
    result.deployment={status:deployment.status,sourceCommit:deployment.sourceCommit,sourceTag:deployment.sourceTag,dirtySource:deployment.dirtySource,sha256:hash(bytes)};
    const fixture=await page.request.get(new URL('fixtures/example.mp4',origin).href);assert.ok(fixture.ok());const fixtureBytes=await fixture.body();
    result.fixture={path:'fixtures/example.mp4',bytes:fixtureBytes.length,sha256:hash(fixtureBytes)};
    const assetNames=[...demoEntryAssets,...Object.keys(deployment.files).filter(name=>name.endsWith('.wasm')||name.endsWith('.mjs')||name.startsWith('web/generated/player/'))];
    result.assetHashes=await verifyDemoAssets(origin,deployment,assetNames,async url=>{const response=await page.request.get(url);assert.ok(response.ok(),url);return response.body();});
    if(deployment.status!=='local-preview-not-for-deployment'){
     const source=await page.request.get(new URL('source/source-manifest.json',origin).href);assert.ok(source.ok());result.source=await source.json();
     assert.ok(result.source['demuxe-source.tar.gz']);assert.ok(result.source['emscripten-source.tar.gz']);
    }
   }
   await page.evaluate(mode=>player.setMode(mode),mode);
   await page.locator('#viewer #open-menu').click();
   await page.evaluate(()=>window.pagesAudioObserverReady);
   await page.getByRole('button',{name:'Try an example'}).click();
   await page.waitForFunction(()=>pagesProbe.openMs!==null&&pagesProbe.videoMs!==null&&pagesProbe.audioMs!==null&&player.state.currentTime>.65&&player.state.status==='playing');
   const initial=await page.evaluate(()=>({...pagesProbe,mode:player.state.activeMode,route:player.diagnostics.plan,position:player.state.currentTime}));
   assert.equal(initial.mode,mode);assert.ok(initial.peakRms>.005);
   const surface=page.locator('#viewer #surface');
   const first=await surface.screenshot({path:`${out}/${mode}-${trial}-first.png`});
   await page.waitForFunction(position=>player.state.currentTime>position+.5,initial.position);
   const second=await surface.screenshot({path:`${out}/${mode}-${trial}-advancing.png`});
   assert.notEqual(hash(first),hash(second),'Media surface must visibly change during playback');
   await page.evaluate(()=>document.querySelector('demuxe-player').pause());
   for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:600,height:280}]){
    await page.setViewportSize(viewport);
    await page.locator('#viewer #settings-toggle').click();
    await page.locator('#viewer #settings').waitFor({state:'visible'});
    assert.equal(await page.locator('#viewer #settings-toggle').getAttribute('aria-expanded'),'true');
    // Narrow layouts deliberately hide transport behind the settings panel.
    // Assert the settled layout, then require restoration after dismissal.
    await page.waitForFunction(()=>{
     const viewer=document.querySelector('demuxe-player'),style=getComputedStyle(viewer.shadowRoot.getElementById('transport'));
     return viewer.clientWidth<=600?style.visibility==='hidden':style.visibility==='visible'&&style.opacity==='1';
    });
    await page.keyboard.press('Escape');
    await page.locator('#viewer #settings').waitFor({state:'hidden'});
    await page.waitForFunction(()=>{const style=getComputedStyle(document.querySelector('demuxe-player').shadowRoot.getElementById('transport'));return style.visibility==='visible'&&style.opacity==='1';});
    const geometry=await page.evaluate(()=>{const v=document.querySelector('demuxe-player'),r=v.getBoundingClientRect();return ['play','timeline','fullscreen'].map(id=>{const b=v.shadowRoot.getElementById(id).getBoundingClientRect();return {id,inside:b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom&&b.bottom<=innerHeight};});});
    assert.ok(geometry.every(control=>control.inside),JSON.stringify({viewport,geometry}));
   }
   await page.setViewportSize({width:1280,height:900});
   const seekStart=performance.now();await page.evaluate(()=>document.querySelector('demuxe-player').seek(2));
   await page.waitForFunction(()=>!player.state.pendingOperation&&Math.abs(player.state.currentTime-2)<.3);
   const seekMs=performance.now()-seekStart;
   const seekImage=await surface.screenshot({path:`${out}/${mode}-${trial}-seek.png`});
   assert.notEqual(hash(second),hash(seekImage),'Seeking must change the displayed picture');
   assert.equal(await page.evaluate(()=>player.state.error),null);
   const range=await page.evaluate(async()=>{const response=await fetch('./fixtures/example.mp4',{headers:{Range:'bytes=10-29'}});return {status:response.status,length:(await response.arrayBuffer()).byteLength};});
   assert.deepEqual(range,{status:206,length:20});
   await page.evaluate(async()=>{await document.querySelector('demuxe-player').close();await pagesProbe.closeObservers();});
   assert.equal(await page.evaluate(()=>player.state.sourceId),null);
   const returningStart=performance.now();await page.reload();await page.waitForFunction(()=>crossOriginIsolated&&window.player);
   const returningReadyMs=performance.now()-returningStart;
   assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
   result.trials.push({mode,trial,navigationReadyMs,returningReadyMs,...initial,seekMs,surfaceHashes:[hash(first),hash(second),hash(seekImage)]});
   console.log('PASS',mode,trial,JSON.stringify({navigationReadyMs,firstVideoMs:initial.videoMs,firstAudioMs:initial.audioMs,seekMs}));
  }catch(error){
   result.failedTrial={mode,trial,pageEvents,browserEvents,state:await activePage?.evaluate(()=>({probe:window.pagesProbe,state:window.player?.state,diagnostics:window.player?.diagnostics})).catch(()=>null)};
   await activePage?.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});
   throw error;
  }finally{await context.close();activePage=undefined;}
 }
 result.checks=['Fresh and returning visits establish isolation under the project subpath','Native, Hybrid and Software produce changing pictures and non-silent audio','Pause and seek update the rendered picture','Range responses retain status and byte count','No page errors, external asset requests or uploads'];
 result.summary=Object.fromEntries(['native','hybrid','software'].map(mode=>{
  const rows=result.trials.filter(row=>row.mode===mode);
  const metrics=Object.fromEntries(['navigationReadyMs','returningReadyMs','openMs','videoMs','audioMs','seekMs'].map(key=>{const values=rows.map(row=>row[key]).sort((a,b)=>a-b);return [key,{min:values[0],median:values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2,max:values.at(-1)}];}));
  return [mode,metrics];
 }));
 result.passed=true;
}catch(error){result.failure=String(error.stack);console.error(error);process.exitCode=1;if(activePage)await activePage.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});}
finally{await browser.close();await new Promise(resolve=>server?server.close(resolve):resolve());await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');}
