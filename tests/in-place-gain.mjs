import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.env.BROWSER||'chrome',out=`results/optimization-completion/gain-${name}-${Date.now()}`;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),10000);server.on('error',reject);server.stdout.on('data',d=>{const m=String(d).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
const browser=await(name==='firefox'?firefox:chromium).launch(name==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const result={browser:browser.version(),scope:'Digital graph output and resource identity; not speaker output or endurance',cases:[]};
try{
 for(const mode of ['native','hybrid','software']){
  const page=await browser.newPage(),item={mode};result.cases.push(item);
  try{
   await page.route('**/gain-signal.mp4',async r=>r.fulfill({contentType:'video/mp4',body:await readFile('build/optimization-fixtures/gain.mp4')}));
   await page.goto(origin+'/examples/custom-controls.html');
   if(mode==='hybrid')item.chunkOwnership=await page.evaluate(()=>{
    const source=new Uint8Array(new SharedArrayBuffer(4));source.set([1,2,3,4]);
    try{const chunk=new EncodedVideoChunk({type:'key',timestamp:0,data:source});source.fill(9);const copied=new Uint8Array(4);chunk.copyTo(copied);return {shared:true,copied:Array.from(copied),heapBytes:source.buffer.byteLength};}
    catch(error){if(error.name!=='TypeError')throw error;return {shared:false,reason:String(error)};}
   });
   if(item.chunkOwnership?.shared){assert.deepEqual(item.chunkOwnership.copied,[1,2,3,4]);assert.equal(item.chunkOwnership.heapBytes,4);}
   item.output=await page.evaluate(async mode=>{
    await window.player?.destroy();const {Player}=await import('/web/generated/index.js');
    window.player=new Player(document.querySelector('#surface'),{mode,experimentalHybridAudioFilters:true,audioFilters:mode==='native'?'':'volume=0.5'});
    const bytes=await(await fetch('/gain-signal.mp4')).arrayBuffer();
    const source=new File([bytes],'gain.mp4');await player.open(source);await player.play();
    const backend=player.current.backend,worker=backend.worker,decoder=backend.diagnostics?.decoder,remux=backend.remux;
    const originalContext=backend.audioContext;
    if(backend.gainNode)throw Error('Unity allocated a gain stage');
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(400);
    // First allocation while playing must not pause or replace the session.
    await player.setAudioGain(.5);await sleep(150);
    if(!player.diagnostics.planAdmission.some(p=>p.id===player.diagnostics.plan.id&&p.eligible))throw Error('Gain admission diagnostics are stale');
    const context=backend.gainContext||backend.audioContext,gain=backend.gainNode;
    const analyser=context.createAnalyser();gain.connect(analyser);
    const sample=async()=>{await sleep(150);const values=[];for(let i=0;i<6;i++){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);values.push(Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length));await sleep(25);}return values.sort((a,b)=>a-b)[3];};
    const half=await sample();await player.setAudioGain(.25);const quarter=await sample();
    await player.setAudioGain(0);const zero=await sample();await player.setAudioGain(1);const unity=await sample();
    if(!player.diagnostics.planAdmission.some(p=>p.id===player.diagnostics.plan.id&&p.eligible))throw Error('Unity admission diagnostics are stale');
    await player.setMuted(true);const muted=await sample();await player.setMuted(false);
    await player.pause();const position=player.state.currentTime;
    await Promise.all([.9,.2,0,.6,1].map(v=>player.setAudioGain(v)));
    if(!player.properties.get('pause'))throw Error('Gain resumed a paused player');
    if(Math.abs(player.state.currentTime-position)>.02)throw Error('Gain moved paused playback');
    await player.seek(2);await player.setAudioGain(.25);
    const same=backend===player.current.backend&&worker===backend.worker&&remux===backend.remux&&gain===backend.gainNode&&context===(backend.gainContext||backend.audioContext);
    const afterDecoder=backend.diagnostics?.decoder;const packetOwnership=backend.diagnostics?.decoderStats;
    const effectiveFilter=player.settings.af;
    gain.disconnect(analyser);await player.open(source);
    const replacement=player.current.backend!==backend,oldState=context.state;
    await player.play();await player.setAudioGain(1);
    await player.destroy();
    return {half,quarter,zero,unity,muted,same,decoder,afterDecoder,packetOwnership,effectiveFilter,originalContextReused:mode==='native'||context===originalContext,replacement,oldState};
   },mode);
   const o=item.output;assert.ok(o.half>.003);assert.ok(Math.abs(o.quarter/o.half-.5)<.06);assert.ok(Math.abs(o.unity/o.half-2)<.12);assert.ok(o.zero<1e-5);assert.ok(o.muted<1e-5);assert.equal(o.same,true);assert.equal(o.originalContextReused,true);assert.equal(o.replacement,true);assert.equal(o.oldState,'closed');
   if(mode==='hybrid'){assert.equal(o.decoder,'webcodecs');assert.equal(o.afterDecoder,'webcodecs');assert.equal(o.effectiveFilter,'volume=0.5');assert.ok(o.packetOwnership.sharedPacketInputs>0||o.packetOwnership.sharedPacketFallbacks>0);}
   await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.passed=true;
  }catch(error){item.error=String(error.stack);process.exitCode=1;}finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(mode,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
 // A real suspended context plus an explicit resume barrier proves destroy
 // happens during an outstanding Native gain update, before graph allocation.
 const page=await browser.newPage(),item={mode:'native-destroy-resume-barrier'};result.cases.push(item);
 try{
  await page.goto(origin+'/examples/custom-controls.html');
  item.output=await page.evaluate(async()=>{
   await window.player?.destroy();const {NativePlayer}=await import('/web/generated/internal/native-player.js');
   const video=document.createElement('video');Object.defineProperty(video,'paused',{value:false});
   const backend=new NativePlayer(video),context=new AudioContext();await context.suspend();backend.gainContext=context;
   let release,entered;const barrier=new Promise(r=>entered=r);
   context.resume=()=>{entered();return new Promise(r=>release=r);};
   let settled=false;const operation=backend.gain(.5).then(()=>({accepted:true}),error=>({error:String(error)})).finally(()=>settled=true);
   await barrier;const outstanding=!settled;await backend.destroy();const outcome=await operation;release();await Promise.resolve();
   return {outstanding,outcome,allocated:!!backend.gainNode,state:context.state};
  });
  assert.equal(item.output.outstanding,true);assert.equal(item.output.allocated,false);assert.equal(item.output.state,'closed');assert.match(item.output.outcome.error,/destroyed/);item.passed=true;
 }catch(error){item.error=String(error.stack);process.exitCode=1;}finally{await page.close();console.log(item.mode,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}finally{await browser.close();server.kill();}
