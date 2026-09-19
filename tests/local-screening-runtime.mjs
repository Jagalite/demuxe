// SPDX-License-Identifier: Apache-2.0
// Bounded real-path opportunity probes, not comparative performance qualification.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.env.RESULT_ROOT||`results/local-screening/runs/opportunities-${Date.now()}`;
await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const result={scope:'Current-path work counts and caption semantics; instrumented times are diagnostic only',cases:[],sources:{}};
const worker=await readFile(process.env.REMUX_WORKER||'web/native-remux-worker.js','utf8');result.sources.worker=sha(worker);
let instrumented=worker.replace('const stats={','const trace={emits:0,emittedBytes:0,gathers:0,gatheredBytes:0,maxPieces:0,firstEmit:null,lastEmit:null,publications:[]};const stats={trace,');
instrumented=instrumented.replace('const flush=()=>{','const flush=()=>{trace.gathers++;trace.gatheredBytes+=bytes;trace.maxPieces=Math.max(trace.maxPieces,chunks.length);trace.publications.push({at:performance.now(),bytes,pieces:chunks.length,firstEmit:trace.firstEmit,lastEmit:trace.lastEmit});trace.firstEmit=null;');
instrumented=instrumented.replace('engine.emit=b=>{','engine.emit=b=>{trace.emits++;trace.emittedBytes+=b.length;trace.firstEmit??=performance.now();trace.lastEmit=performance.now();');
assert.notEqual(instrumented,worker);result.sources.instrumentedWorker=sha(instrumented);
await writeFile(out+'/instrumented-worker.js',instrumented);
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.once('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});result.origin=origin;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const names=(process.env.CASES||'remux-work,caption-small,caption-large,fmp4-direct').split(',');
 for(const name of names){const page=await browser.newPage(),row={name};result.cases.push(row);page.setDefaultTimeout(25000);
  try{
   if(process.env.ENGINE_BUILD)await page.route('**/engine-remux/remux.*',async r=>r.fulfill({response:await r.fetch(),body:await readFile(process.env.ENGINE_BUILD+'/'+(r.request().url().endsWith('.wasm')?'remux.wasm':'remux.mjs'))}));
   if(name==='remux-work')await page.route('**/native-remux-worker.js',async r=>r.fulfill({response:await r.fetch(),body:instrumented}));
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async name=>{await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:name==='remux-work'?'always':'never'});window.errors=[];player.addEventListener('error',e=>errors.push(e.detail));window.appends=[];window.captures=[];const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(b){appends.push({bytes:b.byteLength,at:performance.now()});captures.push(new Uint8Array(b.buffer??b,b.byteOffset??0,b.byteLength).slice());return append.call(this,b);};const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);},name);
   const fixture=process.env.FIXTURE||(name==='fmp4-direct'?'build/local-screening/fragmented.mp4':name==='remux-work'?'build/optimization-fixtures/gain.mp4':'fixtures/example.mp4');row.fixture=fixture;row.fixtureSHA256=sha(await readFile(fixture));
   await page.locator('#file').setInputFiles(fixture);await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
   if(name==='caption-boundary'){
    row.captions=await page.evaluate(async()=>{
     const url=URL.createObjectURL(new Blob(['WEBVTT\n\nedge\n00:00:00.600 --> 00:00:02.100\nBoundary\n\nlong\n00:00:00.000 --> 00:00:11.900\nLong\n'],{type:'text/vtt'}));
     const video=document.createElement('video');video.muted=true;video.src=URL.createObjectURL(document.querySelector('#file').files[0]);document.body.append(video);await new Promise((r,j)=>{video.onloadedmetadata=r;video.onerror=j;});
     const el=document.createElement('track');el.src=url;el.default=true;video.append(el);el.track.mode='showing';await new Promise((r,j)=>{el.onload=r;el.onerror=j;});
     await player.addTextTrack({src:url,label:'Boundary',default:true});const track=player.surface.textTracks[0];track.mode='showing';const checks=[];
     for(const target of [.59999,.6,.60001,2.09999,2.1,2.100001,2.10001,2.101,7.3,2.1]){
      await player.seek(9);await player.seek(target);await new Promise(r=>{video.addEventListener('seeked',r,{once:true});video.currentTime=target;});await new Promise(r=>setTimeout(r,100));
      const snapshot=(v,t)=>({time:v.currentTime,active:Array.from(t.activeCues??[],c=>c.id).sort(),cues:Array.from(t.cues,c=>({id:c.id,start:c.startTime,end:c.endTime})),expected:Array.from(t.cues).filter(c=>c.startTime<=v.currentTime&&c.endTime>v.currentTime).map(c=>c.id).sort()});
      checks.push({target,demuxe:snapshot(player.surface,track),bare:snapshot(video,el.track)});
     }
     video.remove();URL.revokeObjectURL(video.src);URL.revokeObjectURL(url);return checks;
    });
    for(const c of row.captions){assert.equal(c.demuxe.time,c.bare.time);assert.deepEqual(c.demuxe.active,c.bare.active);}

   }else if(name.startsWith('caption')){
    row.captions=await page.evaluate(async count=>{const stamp=t=>`00:00:${t.toFixed(3).padStart(6,'0')}`;const cues=Array.from({length:count},(_,i)=>({id:String(i),start:(i%100)/10,end:Math.min(11.9,(i%100)/10+1.5)}));cues.push({id:'long',start:0,end:11.9});const vtt='WEBVTT\n\n'+cues.map(c=>`${c.id}\n${stamp(c.start)} --> ${stamp(c.end)}\nCue ${c.id}\n`).join('\n');const url=URL.createObjectURL(new Blob([vtt],{type:'text/vtt'}));try{const start=performance.now();await player.addTextTrack({src:url,label:'Screen',default:true});const loadMs=performance.now()-start,track=player.surface.textTracks[0];track.mode='showing';const checks=[];for(const target of [0.517,7.317,2.117,10.517]){await player.seek(target);await new Promise(r=>setTimeout(r,80));checks.push({target,observedTime:player.surface.currentTime,actual:Array.from(track.activeCues??[],c=>c.id).sort(),expected:cues.filter(c=>c.start<=target&&c.end>target).map(c=>c.id).sort()});}return {logical:cues.length,live:track.cues.length,loadMs,checks};}finally{URL.revokeObjectURL(url);}},name==='caption-small'?20:10000);
    assert.equal(row.captions.live,row.captions.logical);for(const c of row.captions.checks)assert.deepEqual(c.actual,c.expected);
   }else{
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.25);
    if(name==='remux-work')await page.waitForFunction(()=>{const r=player.current.backend.remux;return r.eof&&!r.pending&&!r.busy&&!r.sb.updating;},null,{timeout:60000});
    row.diagnostics=await page.evaluate(()=>player.diagnostics);row.appends=await page.evaluate(()=>appends);
    assert.equal(row.diagnostics.plan.id,name==='remux-work'?'native-remux':'native-direct');
    if(name==='remux-work'){
     const t=row.diagnostics.backend.remux.remux.trace;assert.ok(t.emits>0);assert.equal(t.emittedBytes,t.gatheredBytes);assert.equal(row.appends.reduce((n,b)=>n+b.bytes,0),t.gatheredBytes);
     const captured=await page.evaluate(()=>Array.from(captures.reduce((all,b)=>{all.set(b,all.at);all.at+=b.length;return all;},Object.assign(new Uint8Array(captures.reduce((n,b)=>n+b.length,0)),{at:0}))));
     const output=out+'/remux-capture.mp4';await writeFile(output,Buffer.from(captured));
     const packets=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_data_hash','sha256','-of','json',file],{maxBuffer:8*1024*1024})).packets;
     const inputPackets=packets(fixture),outputPackets=packets(output);row.packetOracle=[];
     for(const type of ['video','audio']){const a=inputPackets.filter(p=>p.codec_type===type),b=outputPackets.filter(p=>p.codec_type===type);assert.deepEqual(b.map(p=>p.data_hash),a.map(p=>p.data_hash));row.packetOracle.push({type,packets:a.length,exact:true});}
     row.outputSHA256=sha(Buffer.from(captured));
    }
    await page.evaluate(()=>player.seek(6));row.seek=await page.evaluate(()=>player.state.currentTime);assert.ok(Math.abs(row.seek-6)<.2);
   }
   assert.deepEqual(await page.evaluate(()=>errors),[]);await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);row.workersAfter=page.workers().length;assert.equal(row.workersAfter,0);row.passed=true;
  }catch(error){row.error=String(error.stack);row.failureState=await page.evaluate(()=>({diagnostics:player?.diagnostics,errors:window.errors})).catch(()=>null);process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(name,row.passed?'PASS':row.error);}
 }
}finally{await browser?.close();server.kill();}
