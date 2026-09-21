// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,access,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/remux-jspi/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const fixtureDir='build/remux-jspi-fixtures-v1',fixture=fixtureDir+'/avc-aac.ts',mp4Fixture=fixtureDir+'/avc-aac.mp4';
await mkdir(fixtureDir,{recursive:true});
try{await access(fixture);}catch{
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-g','24','-bf','2','-c:a','aac','-b:a','96k','-f','mpegts',fixture]);
}
try{await access(mp4Fixture);}catch{execFileSync('ffmpeg',['-v','error','-i',fixture,'-c','copy',mp4Fixture]);}
let assetRoot='.';
const archive=process.env.ARCHIVE;
if(archive){const extracted=await mkdtemp('build/remux-jspi-package-');execFileSync('tar',['-xzf',archive,'-C',extracted]);assetRoot=extracted+'/package';}
const longFixture=fixtureDir+'/avc-aac-24s.ts';
try{await access(longFixture);}catch{execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','24','-c:v','libx264','-preset','ultrafast','-b:v','3M','-minrate','3M','-maxrate','3M','-bufsize','6M','-x264-params','nal-hrd=cbr','-g','30','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-f','mpegts',longFixture]);}
const isolated=process.env.ISOLATED==='1';
const server=await serve({isolated,assetRoot,mediaPaths:{ts:fixture,movie:mp4Fixture,longts:longFixture}});
const family=process.env.BROWSER??'chrome';
const browser=await (family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true,firefoxUserPrefs:{'media.autoplay.default':0}}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const capabilityPage=await browser.newPage();await capabilityPage.goto(server.origin+'/experiment/page.html');
const jspi=await capabilityPage.evaluate(()=>typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function');await capabilityPage.close();
const result={family,isolated,jspi,archiveSHA256:archive?createHash('sha256').update(await readFile(archive)).digest('hex'):null,testHarnessSHA256:createHash('sha256').update(await readFile('tests/remux-jspi.mjs')).digest('hex'),browser:browser.version(),sourceSHA256:createHash('sha256').update(await readFile(fixture)).digest('hex'),cases:[]};
async function waitForWorkers(page,timeout=1500){
 const deadline=Date.now()+Math.max(0,timeout);
 while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(25);
 assert.equal(page.workers().length,0,'Workers must terminate within the cleanup deadline');
}
async function check(name,run){
 if(!isolated&&!jspi&&name!=='missing JSPI rejects before worker startup')return;
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async isolated=>{
   // This suite instruments the producer in the window-owner fallback.
   // tests/worker-mse.mjs qualifies the separate worker-owned consumer.
   Object.defineProperty(MediaSource,'canConstructInDedicatedWorker',{value:false});
   if(crossOriginIsolated!==isolated||(!isolated&&typeof SharedArrayBuffer!=='undefined'))throw Error('Unexpected isolation state');
   window.output=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(['ready','fragment'].includes(data.type)&&data.buffer?.byteLength)window.output.push([...new Uint8Array(data.buffer)]);});}};
   const {Player}=await import('/web/generated/index.js');window.Player=Player;
   window.player=new Player(document.querySelector('#surface'),{nativeRemux:'always'});
  },isolated);
  const evidence=await run(page);
  await page.evaluate(()=>player.destroy());await waitForWorkers(page);
  result.cases.push({name,passed:true,evidence});console.log('PASS',name);
 }catch(error){result.cases.push({name,passed:false,error:String(error.stack)});process.exitCode=1;console.error('FAIL',name,String(error));}
 finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}
const open=page=>page.evaluate(url=>player.openRemote({url}),server.origin+'/media/ts');
try{
 await check('public Player remote playback, seek, and source replacement',async page=>{
  await open(page);await page.evaluate(()=>player.play());
  await page.waitForFunction(()=>player.properties.get('time-pos')>.25);
  await page.waitForFunction(()=>player.current.backend.remux.eof);
  const runtime=await page.evaluate(()=>player.current.backend.remux.snapshot().remux);assert.equal(runtime.transport,isolated?'pthread':'jspi');assert.equal(runtime.sharedHeap,isolated);
  const bytes=Buffer.concat((await page.evaluate(()=>window.output)).map(b=>Buffer.from(b)));
  const captured=out+'/public-player.mp4';await writeFile(captured,bytes);
  const decoded=(file,kind)=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',`0:${kind}:0`,...(kind==='v'?['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo']:['-f','f32le']),'-'],{maxBuffer:32*1024*1024});
  for(const kind of ['v','a'])assert.ok(decoded(captured,kind).equals(decoded(fixture,kind)),`Independent ${kind} output identity`);
  await page.evaluate(()=>player.seek(2));
  await page.waitForFunction(()=>player.properties.get('time-pos')>=1.9);
  const evidence=await page.evaluate(()=>({mode:player.mode,position:player.properties.get('time-pos'),width:player.surface.videoWidth,diagnostics:player.diagnostics}));
  assert.equal(evidence.mode,'native');assert.ok(evidence.width>0);
  await open(page);return {...evidence,runtime,independentPixelsAndPCMExact:true,outputSHA256:createHash('sha256').update(bytes).digest('hex')};
 });
 await check('default automatic selection chooses Native remux for TS',async page=>{
  await page.evaluate(async()=>{await player.destroy();window.player=new Player(document.querySelector('#surface'));});
  await open(page);
  const evidence=await page.evaluate(()=>({mode:player.mode,remux:player.current.backend.remux?.snapshot().remux}));
  assert.equal(evidence.mode,'native');assert.equal(evidence.remux?.transport,isolated?'pthread':'jspi');return evidence;
 });
 await check('bounded long-file playback and forward/backward seeks',async page=>{
  await page.evaluate(url=>player.openRemote({url}),server.origin+'/media/longts');
  await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.properties.get('time-pos')>2);
  for(const target of [21,7]){await page.evaluate(t=>player.seek(t),target);await page.waitForFunction(t=>Math.abs(player.properties.get('time-pos')-t)<1,target);}
  const evidence=await page.evaluate(()=>player.current.backend.remux.snapshot());
  assert.ok(evidence.source.fetchedBytes>0);assert.ok(evidence.remux.heapBytes<=128*1024*1024);assert.ok(evidence.stats.peakQueueDepth<=1);return evidence;
 });
 await check('local File playback and independent players',async page=>{
  const evidence=await page.evaluate(async url=>{
   const blob=await (await fetch(url)).blob();const file=new File([blob],'sample.ts');
   const surface=document.createElement('div');document.body.append(surface);const second=new Player(surface,{mode:'native',nativeRemux:'always'});
   try{await Promise.all([player.open(file),second.open(file)]);return {first:player.surface.videoWidth,second:second.surface.videoWidth};}finally{await second.destroy();}
  },server.origin+'/media/ts');assert.ok(evidence.first>0&&evidence.second>0);return evidence;
 });
 if(!isolated)await check('unqualified MP4 rejects and preserves accepted playback',async page=>{
  await open(page);
  const evidence=await page.evaluate(async url=>{const surface=player.surface;try{await player.openRemote({url});return {accepted:true};}catch(error){return {error:String(error),sameSurface:surface===player.surface};}},server.origin+'/media/movie');
  assert.match(evidence.error,/Non-isolated|qualified|eligible|playback plan/i);assert.equal(evidence.sameSurface,true);return evidence;
 });
 if(!isolated)await check('missing JSPI rejects before worker startup',async page=>{
  await page.evaluate(()=>{Object.defineProperty(WebAssembly,'Suspending',{value:undefined,configurable:true});});
  const error=await page.evaluate(async url=>{try{await player.openRemote({url});return null;}catch(error){return String(error);}},server.origin+'/media/ts');
  assert.ok(error);assert.equal(page.workers().length,0);return {error};
 });
 await check('authorization refresh uses the production range reader',async page=>{
  const evidence=await page.evaluate(async url=>{
   let refreshes=0;await player.openRemote({url,refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'Bearer refreshed'}};}});
   return {refreshes,width:player.surface.videoWidth};
  },server.origin+'/media/ts?auth=1&id=jspi-auth');assert.ok(evidence.refreshes>0);assert.ok(evidence.width>0);return evidence;
 });
 // Interpose only in this test: real Wasm must request bytes before cancellation.
 // The withheld response keeps JSPI suspended (or pthread AVIO waiting).
 for(const control of [true,false])await check(control?'cancellation barrier rejects initialization-only evidence':'close cancels a suspended remux and permits a fresh open',async page=>{
  await page.evaluate(control=>{
   window.pendingSettled=false;window.cancelBarrierActive=true;window.barrierPorts=[];
   const ParentWorker=Worker;
   window.Worker=class extends ParentWorker{
    terminate(){
     // The isolated read barrier substitutes a mailbox; preserve the real
     // owner's cancellation signal instead of stranding Atomics.wait there.
     if(this.productionMailbox&&Atomics.load(new Int32Array(this.productionMailbox),4)){
      const h=new Int32Array(this.testMailbox);Atomics.store(h,4,1);Atomics.store(h,0,3);Atomics.notify(h,0);
     }
     return super.terminate();
    }
    postMessage(data,transfer=[]){
     if(window.cancelBarrierActive&&data.type==='init'&&data.size){
      window.muxInitObserved=true;
      if(control){if(data.port)window.barrierPorts.push(data.port);return;} // Init alone cannot prove a pending Wasm read.
      if(data.jspi){
       const channel=new MessageChannel();window.barrierPorts.push(data.port,channel.port1);
       channel.port1.onmessage=({data:request})=>{window.observedRemuxRead=request;};
       return super.postMessage({...data,port:channel.port2},transfer.map(port=>port===data.port?channel.port2:port));
      }
      window.blockedReadMailbox=new SharedArrayBuffer(data.mailbox.byteLength);this.testMailbox=window.blockedReadMailbox;this.productionMailbox=data.mailbox;
      return super.postMessage({...data,mailbox:window.blockedReadMailbox},transfer);
     }
     return super.postMessage(data,transfer);
    }
   };
   window.remuxReadObserved=()=>!!window.observedRemuxRead||!!window.blockedReadMailbox&&Atomics.load(new Int32Array(window.blockedReadMailbox),0)===1;
  },control);
  try{
   await page.evaluate(url=>{window.pending=player.openRemote({url}).then(()=>{window.pendingSettled=true;return {accepted:true};},error=>{window.pendingSettled=true;return {error:String(error)};});},server.origin+'/media/ts');
   await page.waitForFunction(()=>window.muxInitObserved===true);
   if(control)await assert.rejects(page.waitForFunction(()=>window.remuxReadObserved(),{},{timeout:500}),/Timeout/);
   else await page.waitForFunction(()=>window.remuxReadObserved());
   const before=await page.evaluate(()=>({readObserved:window.remuxReadObserved(),settled:window.pendingSettled,request:window.observedRemuxRead}));
   assert.equal(before.readObserved,!control);assert.equal(before.settled,false);
   if(before.request){assert.ok(Number.isSafeInteger(before.request.offset)&&before.request.offset>=0);assert.ok(before.request.count>0&&before.request.count<=262144);}
   const start=Date.now();const evidence=await page.evaluate(async()=>{await player.close();return await pending;});
   assert.ok(evidence.error);await waitForWorkers(page,1500-(Date.now()-start));const cancellationMs=Date.now()-start;assert.ok(cancellationMs<1500);
   await page.evaluate(()=>{window.cancelBarrierActive=false;for(const port of window.barrierPorts)port.close();});
   await open(page);return {...evidence,...before,cancellationMs};
  }finally{await page.evaluate(()=>{window.cancelBarrierActive=false;for(const port of window.barrierPorts)port.close();}).catch(()=>{});}
 });
 await check('seek rejects changed remote identity',async page=>{
  let changed=false;
  await page.route('**/media/ts',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),etag:changed?'"jspi-changed"':'"jspi-original"'}});});
  await open(page);changed=true;
  const error=await page.evaluate(async()=>{try{await player.seek(2);return null;}catch(error){return String(error);}});
  assert.match(error,/representation changed/);return {error};
 });
 await check('destroy cancels delayed inspection',async page=>{
  await page.evaluate(url=>{window.pending=player.openRemote({url}).then(()=>({accepted:true}),error=>({error:String(error)}));},server.origin+'/media/ts?delay=1500');
  await page.waitForTimeout(100);const start=Date.now();
  const evidence=await page.evaluate(async()=>{await player.destroy();return await pending;});
  assert.ok(evidence.error);assert.ok(Date.now()-start<1500);return evidence;
 });
}finally{await browser.close();await server.close();result.passed=result.cases.every(c=>c.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out);}
