// Bounded extension of tests/playback-performance.mjs: same CDP whole-browser
// CPU counters and ps RSS accounting, now covering open through destroy.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=`${process.env.RESULT_ROOT||'results/optimization-integration/stage2'}/cost-${Date.now()}`;await mkdir(out,{recursive:true});
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),10000);app.on('error',reject);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0])}})});
const fixture=process.env.FIXTURE||'build/optimization-fixtures/long-pcm.mkv';
const ass=process.env.ASS==='1',gain=Number(process.env.GAIN??1),profile=process.env.PROFILE||'flac';
assert.ok(['flac','opus'].includes(profile));
const variants=process.env.VARIANTS?.split(',');
const variantAssets=variants?await Promise.all(variants.map(async path=>({path,mjs:await readFile(path+'/remux.mjs'),wasm:await readFile(path+'/remux.wasm')}))):[];
const result={profile,ass,gain,scope:'Local PCM fixture (dimensions recorded by fixture manifest); short headless Chrome cost screen. CDP browser processes only; external OS services excluded. New processes include their observed lifetime CPU; any disappearing process invalidates the run. Cold means fresh browser, not flushed OS cache. Warm means one preceding open/play/destroy. No sustained or universal ranking claim.',fixture,fixtureSHA256:createHash('sha256').update(await readFile(fixture)).digest('hex'),trials:[]};
try{
 const trials=variants?[['cold','native',0],['cold','native',1],['warm','native',1],['warm','native',0]]:[['cold','native'],['cold','hybrid'],['warm','hybrid'],['warm','native'],['cold','hybrid'],['cold','native'],['warm','native'],['warm','hybrid']].slice(0,process.env.QUICK==='1'?4:8);
 for(const [condition,mode,variant] of trials){
  const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage(),cdp=await browser.newBrowserCDPSession();const item={condition,mode,browser:browser.version(),samples:[]};result.trials.push(item);
  try{
   if(variants){const assets=variantAssets[variant];item.variant=assets.path;item.artifacts={mjs:createHash('sha256').update(assets.mjs).digest('hex'),wasm:createHash('sha256').update(assets.wasm).digest('hex')};await page.route('**/engine-adaptation/remux.*',r=>r.fulfill({contentType:r.request().url().endsWith('.wasm')?'application/wasm':'text/javascript',body:r.request().url().endsWith('.wasm')?assets.wasm:assets.mjs}));}
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async()=>{await player.destroy();window.PlayerClass=(await import('/web/generated/index.js')).Player;const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f)});await page.locator('#file').setInputFiles(fixture);
   async function open(){return page.evaluate(async({mode,ass,gain,profile})=>{
    window.errors=[];window.player=new PlayerClass(document.querySelector('#surface'),{mode,nativeRemux:'always',experimentalAudioAdaptation:profile,allowLossyAudio:profile==='opus',experimentalNativeASS:ass,audioGain:gain,experimentalBufferedNativeSeeks:true});
    player.addEventListener('error',e=>errors.push(e.detail));const start=performance.now();await player.open(document.querySelector('#file').files[0]);const opened=performance.now();
    if(ass){const bytes=await(await fetch('/fixtures/qualification.ass')).arrayBuffer();await player.addSubtitle(new File([bytes],'qualification.ass'));}
    const subtitleReady=performance.now();let frame;
    if(mode==='native')frame=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('First playing frame timeout')),5000);player.surface.requestVideoFrameCallback((_,metadata)=>{clearTimeout(t);resolve({at:performance.now(),mediaTime:metadata.mediaTime});});});
    await player.play();const first=frame?await frame:undefined;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const c=document.createElement('canvas');c.width=32;c.height=18;c.getContext('2d').drawImage(player.surface,0,0,32,18);const pixels=c.getContext('2d').getImageData(0,0,32,18).data;
    let colorful=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(...pixels.slice(i,i+3))-Math.min(...pixels.slice(i,i+3))>40)colorful++;
    if(colorful<20)throw Error('No meaningful moving-fixture video output observed');
    return {start,openMs:opened-start,setupMs:subtitleReady-start,firstPlayingFrame:first,observedVideoMs:performance.now()-start,colorful};
   },{mode,ass,gain,profile})}
   if(condition==='warm'){await open();await page.waitForFunction(()=>player.state.currentTime>.5);await page.evaluate(()=>player.destroy());for(let i=0;i<20&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0)}
   async function sample(){const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;const rss=execFileSync('/bin/ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).map(Number).reduce((a,b)=>a+b,0)*1024;item.samples.push({at:Date.now(),processes,rss})}
   await sample();item.startup=await open();
   await page.waitForFunction(()=>player.state.currentTime>.15);item.startup.progressMs=await page.evaluate(start=>performance.now()-start,item.startup.start);await sample();
   const deadline=Date.now()+10000;
   while(Date.now()<deadline){
    await page.waitForTimeout(500);await sample();
    if(!variants&&!item.seek&&Date.now()>deadline-5000){
     item.seek=await page.evaluate(async()=>{
      const backend=player.current.backend,r=backend.remux,worker=r?.worker,media=r?.media,sb=r?.sb;
      const before=player.diagnostics,start=performance.now(),target=player.state.currentTime+1;
      await player.seek(target);const presented=performance.now();
      const until=performance.now()+5000;
      while(r&&!r.eof&&(r.busy||(r.remuxStats.adaptation?.sourceEnd??0)-player.state.currentTime<4.5)){
       if(performance.now()>until)throw Error('Seek refill deadline');await new Promise(resolve=>setTimeout(resolve,20));
      }
      return {target,firstCorrectOutputMs:presented-start,recoveryIncludingRefillMs:performance.now()-start,sameBackend:backend===player.current.backend,sameWorker:r?worker===r.worker:undefined,sameMedia:r?media===r.media:undefined,sameBuffer:r?sb===r.sb:undefined,before,after:player.diagnostics};
     });assert.equal(item.seek.sameBackend,true);if(mode==='native'){assert.equal(item.seek.sameWorker,true);assert.equal(item.seek.sameMedia,true);assert.equal(item.seek.sameBuffer,true);}
    }
   }
   item.final=await page.evaluate(()=>({diagnostics:player.diagnostics,position:player.state.currentTime,errors}));assert.deepEqual(item.final.errors,[]);assert.ok(item.final.position>=9.5);
   const destroyAt=Date.now();await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.destroyMs=Date.now()-destroyAt;await sample();
   let cpu=0;const churn=[];
   for(let i=1;i<item.samples.length;i++){const previous=new Map(item.samples[i-1].processes.map(p=>[p.id,p.cpuTime])),present=new Set(item.samples[i].processes.map(p=>p.id));for(const id of previous.keys())if(!present.has(id))churn.push({removed:id});for(const p of item.samples[i].processes){if(previous.has(p.id))cpu+=p.cpuTime-previous.get(p.id);else {cpu+=p.cpuTime;churn.push({added:p.id,type:p.type,countedLifetimeCPU:p.cpuTime})}}}
   item.summary={cpuSeconds:cpu,elapsedSeconds:(item.samples.at(-1).at-item.samples[0].at)/1000,peakRSS:Math.max(...item.samples.map(s=>s.rss)),churn};assert.equal(churn.some(p=>'removed' in p),false,'A disappeared process prevents complete interval CPU');item.passed=true;
  }catch(error){item.error=String(error.stack);process.exitCode=1}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(condition,mode,item.passed?'PASS':item.error)}
 }
}finally{app.kill()}
console.log(out);
