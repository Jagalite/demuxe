// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/worker-mse/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={browser:browser.version(),cases:[],measurements:[],scope:'Maintained Player, AVC/AAC TS, real delayed range responses; no general throughput claim'};
async function setup(server,owner='worker'){
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async owner=>{if(owner==='window')Object.defineProperty(MediaSource,'canConstructInDedicatedWorker',{value:false});const {Player}=await import('/web/generated/index.js');window.Player=Player;window.player=new Player(document.querySelector('#surface'),{nativeRemux:'always'});},owner);return page;
}
async function cleanup(page){await page.evaluate(()=>player.destroy());await page.waitForFunction(()=>!document.querySelector('video')?.srcObject);await page.waitForTimeout(100);assert.equal(page.workers().length,0);await page.close();}
try{
 for(const isolated of [false,true]){
  const server=await serve({isolated,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac.ts'}});
  try{
   for(const scenario of [{name:'idle',load:0,delay:0},{name:'ui',load:35,delay:0},{name:'paced-ui',load:35,delay:40}])for(let pair=0;pair<Number(process.env.PAIRS??3);pair++)for(const owner of pair%2?['worker','window']:['window','worker']){
    const page=await setup(server,owner),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
    const before=await cdp.send('Performance.getMetrics');
    const row=await page.evaluate(async({url,load})=>{
     const timer=load?setInterval(()=>{const until=performance.now()+load;while(performance.now()<until){}},50):null;
     try{const began=performance.now();await player.openRemote({url});const startupMs=performance.now()-began;await player.play();await new Promise(r=>setTimeout(r,650));
      const seekBegan=performance.now();await player.seek(2);const seekMs=performance.now()-seekBegan;
      await new Promise((resolve,reject)=>{const deadline=performance.now()+10000;const check=()=>{if(player.surface.ended)resolve();else if(performance.now()>deadline)reject(Error('EOF timeout'));else setTimeout(check,25);};check();});
      const q=player.surface.getVideoPlaybackQuality();return {startupMs,seekMs,position:player.surface.currentTime,quality:{frames:q.totalVideoFrames,dropped:q.droppedVideoFrames},snapshot:player.current.backend.remux.snapshot()};
     }finally{clearInterval(timer);}
    },{url:server.origin+`/media/ts?delay=${scenario.delay}&id=${isolated}-${scenario.name}-${pair}-${owner}`,load:scenario.load});
    const after=await cdp.send('Performance.getMetrics');const metric=(m,n)=>m.metrics.find(v=>v.name===n)?.value??0;
    row.mainTaskSeconds=metric(after,'TaskDuration')-metric(before,'TaskDuration');
    assert.equal(row.snapshot.mseOwner??'window',owner);assert.ok(row.quality.frames>20);assert.equal(row.snapshot.remux.transport,isolated?'pthread':'jspi');assert.deepEqual(row.snapshot.stats.errors,[]);
    const started=Date.now();await cleanup(page);results.measurements.push({isolated,scenario:scenario.name,pair,owner,...row,cleanupMs:Date.now()-started});console.log('PASS',isolated,scenario.name,pair,owner);await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');
   }
   const page=await setup(server);
   const evidence=await page.evaluate(async url=>{
    await player.openRemote({url});const previous=player.current.backend.remux;
    await player.openRemote({url:url+'?id=replacement'});if(!previous.stopped)throw Error('Previous owner retained');
    const pending=player.openRemote({url:url+'?delay=400&id=cancel'}).then(()=>false,()=>true);await new Promise(r=>setTimeout(r,50));await player.close();if(!await pending)throw Error('Cancelled open accepted');
    await player.openRemote({url});await player.seek(1);return player.current.backend.remux.snapshot();
   },server.origin+'/media/ts');assert.equal(evidence.mseOwner,'worker');await cleanup(page);results.cases.push({isolated,name:'replacement, cancelled inspection, reopen, seek and destroy',passed:true});
   const auth=await browser.newPage();await auth.goto(server.origin+'/experiment/page.html');
   const authorization=await auth.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const video=document.createElement('video');document.body.append(video);const owner=new RemuxPlayer(video);let refreshes=0;await owner.open({options:{url},refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'Bearer refreshed'}};}});const result={refreshes,owner:owner.snapshot().mseOwner,width:video.videoWidth};await owner.destroy();return result;},server.origin+'/media/ts?auth=1&id=worker-auth');
   assert.ok(authorization.refreshes>0);assert.equal(authorization.owner,'worker');const authDeadline=Date.now()+1500;while(auth.workers().length&&Date.now()<authDeadline)await auth.waitForTimeout(25);assert.equal(auth.workers().length,0);await auth.close();results.cases.push({isolated,name:'worker-owned source authorization refresh traverses the maintained reader',passed:true,evidence:authorization});

  }finally{await server.close();}
 }
 const server=await serve({isolated:false,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac.ts'}});
 try{const page=await setup(server);await page.route('**/native-mse-worker.js',route=>route.abort());await page.evaluate(url=>player.openRemote({url}),server.origin+'/media/ts');const s=await page.evaluate(()=>player.current.backend.remux.snapshot());assert.equal(s.mseOwner,'window');assert.match(s.ownerFallback,/worker/i);await cleanup(page);results.cases.push({name:'worker bootstrap failure uses window owner',passed:true});}finally{await server.close();}
 const suspended=await serve({isolated:true,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac-24s.ts'}});
 try{
  const page=await browser.newPage();await page.goto(suspended.origin+'/experiment/page.html');
  await page.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const video=document.createElement('video');document.body.append(video);window.owner=new RemuxPlayer(video);window.pending=owner.open({options:{url}}).then(()=>false,()=>true);},suspended.origin+'/media/ts?delay=400&id=suspended');
  const until=Date.now()+10000;while(Date.now()<until&&!(suspended.states.get('suspended')?.requests>=2&&suspended.states.get('suspended')?.active))await page.waitForTimeout(10);
  assert.ok(suspended.states.get('suspended')?.requests>=2,'actual producer read must be outstanding');
  const cancelled=await page.evaluate(async()=>{await owner.destroy();return pending;});assert.equal(cancelled,true);
  const deadline=Date.now()+1500;while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(25);assert.equal(page.workers().length,0);
  await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>owner.video.srcObject),null);await page.close();results.cases.push({name:'destroy wakes an actual suspended pthread source read; late response cannot reattach',passed:true});
 }finally{await suspended.close();}
 const rejected=await serve({isolated:false,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac.ts'}});
 try{
  const page=await setup(rejected);await page.route('**/native-mse-worker.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:'MediaSource.isTypeSupported=()=>false;\n'+await response.text()});});
  await page.evaluate(url=>player.openRemote({url}),rejected.origin+'/media/ts');assert.equal(await page.evaluate(()=>player.current.backend.remux.snapshot().mseOwner),'window');await cleanup(page);results.cases.push({name:'worker SourceBuffer capability rejection falls back before appending',passed:true});
 }finally{await rejected.close();}
 const crash=await serve({isolated:false,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac.ts'}});
 try{
  const page=await browser.newPage();await page.goto(crash.origin+'/experiment/page.html');
  await page.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const video=document.createElement('video');document.body.append(video);window.owner=new RemuxPlayer(video);owner.onError=message=>window.ownerFailure=message;await owner.open({options:{url}});},crash.origin+'/media/ts');
  const worker=page.workers().find(w=>w.url().endsWith('/native-mse-worker.js'));assert.ok(worker);await worker.evaluate(()=>setTimeout(()=>{throw Error('Injected MSE owner failure');},0));
  await page.waitForFunction(()=>window.ownerFailure?.includes('Injected MSE owner failure'));await page.evaluate(()=>owner.destroy());const deadline=Date.now()+1500;while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(25);assert.equal(page.workers().length,0);await page.close();results.cases.push({name:'MSE owner runtime failure propagates and retires its workers',passed:true});
 }finally{await crash.close();}
 for(let recoveryAttempt=0;recoveryAttempt<Number(process.env.RECOVERY_REPEATS??1);recoveryAttempt++){
 const recovery=await serve({isolated:false,mediaPaths:{ts:'build/remux-jspi-fixtures-v1/avc-aac.ts'}});
 try{
  const page=await browser.newPage();await page.goto(recovery.origin+'/experiment/page.html');
  await page.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const video=document.createElement('video');document.body.append(video);window.owner=new RemuxPlayer(video);owner.onError=message=>window.recoveryFailure=message;await owner.open({options:{url}});await owner.play();},recovery.origin+'/media/ts');
  await page.waitForFunction(()=>owner.video.currentTime>1.25);
  const producer=page.workers().find(w=>w.url().endsWith('/native-remux-worker.js'));assert.ok(producer);await producer.evaluate(()=>setTimeout(()=>{throw Error('Injected producer failure');},0));
  await page.waitForFunction(()=>owner.snapshot().stats.recoveries.at(-1)?.restored&&!owner.video.paused);assert.equal(await page.evaluate(()=>window.recoveryFailure),undefined);
  await page.evaluate(()=>owner.destroy());const deadline=Date.now()+1500;while(page.workers().length&&Date.now()<deadline)await page.waitForTimeout(25);assert.equal(page.workers().length,0,JSON.stringify(page.workers().map(w=>w.url())));await page.close();results.cases.push({name:'producer worker failure preserves scheduler recovery and resumes element playback',passed:true});
 }finally{await recovery.close();}
 }
}finally{await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');await browser.close();console.log(out);}
