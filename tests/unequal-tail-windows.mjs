// Qualification gate is overridden only in this harness. Production stays gated.
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
const family=process.env.BROWSER||'chrome',out=`results/optimization-final/tail-controller-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{server.on('error',j);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)r(m[0]);});});
const engine=process.env.ENGINE_BUILD||'build/adaptation-clean-01/'+(await readdir('build/adaptation-clean-01')).filter(n=>n.startsWith('engine-')).sort().at(-1);
for(const name of ['remux.mjs','remux.wasm']){const response=await fetch(origin+'/web/engine-adaptation/'+name);assert.equal(response.status,200);const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(engine+'/'+name)),'Served JS/Wasm must match the declared engine');}
const requests=[],files=new Map();
for(const name of ['audio-tail','video-tail','audio-tail-start2','video-tail-start2'])files.set('/'+name+'.mkv',await readFile('build/optimization-fixtures/'+name+'.mkv'));
const media=createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','authorization,range,if-range');res.setHeader('Access-Control-Expose-Headers','content-range,content-length,etag,accept-ranges');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 if(req.method==='OPTIONS'){res.end();return;}
 const bytes=files.get(req.url);if(!bytes){res.writeHead(404).end();return;}
 requests.push({path:req.url,range:req.headers.range,authorized:req.headers.authorization==='Bearer tail-fixture'});
 if(req.headers.authorization!=='Bearer tail-fixture'){res.writeHead(401).end();return;}
 res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"'+createHash('sha256').update(bytes).digest('hex')+'"');
 if(req.method==='HEAD'){res.setHeader('Content-Length',bytes.length);res.end();return;}
 const range=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'');if(!range){res.writeHead(400).end();return;}
 const a=+range[1],b=Math.min(+range[2],bytes.length-1);if(a>b){res.writeHead(416).end();return;}
 res.writeHead(206,{'Content-Range':`bytes ${a}-${b}/${bytes.length}`,'Content-Length':b-a+1});res.end(bytes.subarray(a,b+1));
});await new Promise(r=>media.listen(0,'127.0.0.1',r));const mediaOrigin=`http://127.0.0.1:${media.address().port}`;
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),engine,cases:[],unqualifiedOverride:process.env.REPRO_UNQUALIFIED==='1',scope:'Chrome Native long tails; Firefox rejects Native and retains Hybrid'};
try{for(const fixture of ['audio-tail','video-tail','audio-tail-start2','video-tail-start2'].filter(n=>!process.env.CASES||process.env.CASES.split(',').includes(n))){
 const page=await browser.newPage();const pixels=()=>page.evaluate(()=>{const v=player.surface,c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d');x.drawImage(v,0,0,64,36);const p=x.getImageData(0,0,64,36).data;return {image:c.toDataURL(),energy:p.reduce((sum,n,i)=>sum+(i%4===3?0:n),0),width:v.videoWidth};});const item={fixture};result.cases.push(item);
 try{

  if(process.env.REPRO_UNQUALIFIED==='1')await page.route('**/native-remux-player.js',async r=>r.fulfill({contentType:'text/javascript',body:(await readFile('web/native-remux-player.js','utf8')).replace('data.windowed&&!windowedBrowserSupported()','false /* retained Firefox seek reproducer */')}));

  await page.goto(origin+'/examples/custom-controls.html');
  await page.evaluate(async combination=>{
   await player.destroy();const {Player}=await import('/web/generated/index.js');window.pumpTrace=[];const {RemuxPlayer}=await import('/web/native-remux-player.js');const pump=RemuxPlayer.prototype.pump;RemuxPlayer.prototype.pump=function(){const row={time:this.video.currentTime,target:this.target,ready:this.targetReady,busy:this.busy,paused:this.video.paused,intent:this.recoveryPlaying,prime:this.primeVideo,sourceEnd:this.remuxStats?.adaptation?.sourceEnd};const last=pumpTrace.at(-1);if(!last||JSON.stringify(last)!==JSON.stringify(row)){pumpTrace.push(row);if(pumpTrace.length>160)pumpTrace.shift();}return pump.call(this);};window.captures=new Map();window.errors=[];window.ends=[];window.publicEnds=[];
   const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(bytes){if(!captures.has(this))captures.set(this,[]);captures.get(this).push(new Uint8Array(bytes).slice());return append.call(this,bytes)};
   window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalBufferedNativeSeeks:true,experimentalNativeASS:combination,audioGain:combination?.5:1});
   if(combination){const font=await(await fetch('/fixtures/DejaVuSans.ttf')).blob();await player.addFont(new File([font],'DejaVuSans.ttf'));}
   player.addEventListener('error',e=>errors.push(e.detail));player.addEventListener('ended',()=>publicEnds.push({t:player.state.currentTime,eof:player.current?.backend?.remux?.eof}));
   const file=document.createElement('input');file.id='file';file.type='file';document.body.append(file);
  },process.env.COMBINATION==='1');
  await page.locator('#file').setInputFiles('build/optimization-fixtures/'+fixture+'.mkv');await page.evaluate(remote=>{window.openInput=remote?{url:remote,headers:{Authorization:'Bearer tail-fixture'},allowedOrigins:[new URL(remote).origin],immutable:true}:document.querySelector('#file').files[0]},process.env.REMOTE==='1'?mediaOrigin+'/'+fixture+'.mkv':null);if(family==='firefox'&&process.env.REPRO_UNQUALIFIED!=='1'){
   item.rejection=await page.evaluate(()=>player.open(window.openInput).then(()=>null,e=>({code:e.code,message:e.message})));assert.equal(item.rejection.code,'UNSUPPORTED_TIMELINE');
   await page.evaluate(async combination=>{await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{automaticAudioAdaptation:'lossless',experimentalNativeASS:combination,audioGain:combination?.5:1});if(combination){const font=await(await fetch('/fixtures/DejaVuSans.ttf')).blob();await player.addFont(new File([font],'DejaVuSans.ttf'));}await player.open(window.openInput);if(combination){const sub=await(await fetch('/fixtures/qualification.ass')).blob();await player.addSubtitle(new File([sub],'qualification.ass'));}await player.play()},process.env.COMBINATION==='1');
   assert.equal(await page.evaluate(()=>player.mode),'hybrid');await page.waitForFunction(()=>player.state.currentTime>2);item.beforeTailSeek=await page.evaluate(()=>({sourceId:player.state.sourceId,diagnostics:player.diagnostics}));item.beforeTailPixels=await pixels();await page.evaluate(async()=>{await player.pause();await player.seek(24);});
   assert.ok(Math.abs(await page.evaluate(()=>player.state.currentTime)-24)<.15);assert.equal(await page.evaluate(()=>player.state.sourceId),item.beforeTailSeek.sourceId);assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);item.fallback=await page.evaluate(()=>player.diagnostics);
   const audioTail=fixture.startsWith('audio-tail');assert.equal(item.fallback.plan.video,audioTail?'ffmpeg':'webcodecs');if(audioTail)assert.ok(item.fallback.selection.attempts.some(a=>a.mode==='hybrid'&&a.outcome==='failed'&&a.reason.startsWith('Seek presentation failure:')));
   item.fallbackPixels=await pixels();assert.ok(item.fallbackPixels.energy>10000);if(audioTail){
    // Compare the recovered image with every real source frame. Backend subtitle
    // composition and scaler rounding make cross-backend PNG equality invalid.
    const actual=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d');x.drawImage(player.surface,0,0,64,36);return Array.from(x.getImageData(0,0,64,36).data).filter((_,i)=>i%4!==3)});
    const reference=execFileSync('ffmpeg',['-v','error','-i','build/optimization-fixtures/'+fixture+'.mkv','-an','-vf','scale=64:36:flags=area','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:32*1024*1024});
    const size=64*36*3,distances=Array.from({length:reference.length/size},(_,frame)=>actual.reduce((n,v,i)=>n+Math.abs(v-reference[frame*size+i]),0)/size);item.referenceFrames={distances,best:distances.indexOf(Math.min(...distances))};assert.equal(item.referenceFrames.best,distances.length-1);assert.ok(Math.min(...distances.slice(0,-1))-distances.at(-1)>1,'Final frame must be distinguishable from earlier source frames; this does not qualify cross-renderer color precision');
   }if(process.env.COMBINATION==='1')assert.equal(item.fallback.audioGain,.5);
   await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>24.5);if(process.env.COMBINATION==='1'){item.fallbackAudio=await page.evaluate(async()=>{const b=player.current.backend,a=b.audioContext.createAnalyser();a.fftSize=2048;b.gainNode.connect(a);await new Promise(r=>setTimeout(r,150));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);b.gainNode.disconnect(a);return Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);});if(audioTail)assert.ok(item.fallbackAudio>.03&&item.fallbackAudio<.06);else assert.ok(item.fallbackAudio<.0001);}item.passed=true;continue;
  }
  await page.evaluate(async()=>{await player.open(window.openInput);player.surface.addEventListener('ended',()=>ends.push({t:player.surface.currentTime,eof:player.current?.backend?.remux?.eof}));});
  if(process.env.COMBINATION==='1')await page.evaluate(async()=>{const data=await(await fetch('/fixtures/qualification.ass')).blob();await player.addSubtitle(new File([data],'qualification.ass'));});
  await page.waitForTimeout(1200);item.initial=await page.evaluate(()=>player.diagnostics);await page.waitForTimeout(600);item.idle=await page.evaluate(()=>player.diagnostics);
  item.publicRanges=await page.evaluate(()=>({buffered:player.state.buffered,seekable:player.state.seekable}));
  assert.ok(item.publicRanges.buffered?.length,'Windowed Native must expose public buffered ranges');
  assert.deepEqual(item.publicRanges.seekable,[{start:0,end:30}]);
  for(const range of item.publicRanges.buffered)assert.ok(Number.isFinite(range.start)&&range.start>=0&&range.end>range.start);
  assert.equal(item.idle.backend.remux.windowed,true);assert.equal(item.initial.backend.remux.remux.adaptation.audioSamplesDecoded,item.idle.backend.remux.remux.adaptation.audioSamplesDecoded);
  assert.ok(item.idle.backend.remux.remux.adaptation.sourceEnd<8);
  if(process.env.SEEKS_ONLY!=='1'){
  await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>3,null,{timeout:15000});
  item.crossed=await page.evaluate(()=>({diagnostics:player.diagnostics,duration:player.state.duration}));
  if(process.env.COMBINATION==='1'){
   item.tailAudio=await page.evaluate(async()=>{const b=player.current.backend,a=b.gainContext.createAnalyser();a.fftSize=2048;b.gainNode.connect(a);await new Promise(r=>setTimeout(r,200));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);b.gainNode.disconnect(a);return {rms:Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length),context:b.gainContext.state};});
   assert.equal(item.tailAudio.context,'running');if(fixture.startsWith('audio-tail'))assert.ok(item.tailAudio.rms>.03&&item.tailAudio.rms<.06);else assert.ok(item.tailAudio.rms<.0001);
  }
  item.crossedPixels=await pixels();assert.ok(item.crossedPixels.energy>10000);
  await page.evaluate(()=>player.pause());await page.waitForTimeout(300);const before=await page.evaluate(()=>player.diagnostics.backend.remux.remux.adaptation.audioSamplesDecoded);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>player.diagnostics.backend.remux.remux.adaptation.audioSamplesDecoded),before);
  await page.evaluate(async()=>{await player.setPlaybackRate(2);await player.play()});
  await page.waitForFunction(()=>player.properties.get('eof-reached'),null,{timeout:25000});
  item.final=await page.evaluate(()=>({diagnostics:player.diagnostics,errors,ends,publicEnds,time:player.state.currentTime,duration:player.state.duration}));assert.deepEqual(item.final.errors,[]);assert.ok(item.final.time>29);assert.equal(item.final.publicEnds.length,1);assert.ok(item.final.publicEnds.every(e=>e.eof));
  item.finalPixels=await pixels();assert.ok(item.finalPixels.energy>10000);if(fixture.startsWith('audio-tail'))assert.equal(item.finalPixels.image,item.crossedPixels.image);else assert.notEqual(item.finalPixels.image,item.crossedPixels.image);
  assert.ok(Math.abs(item.final.duration-30)<.1);assert.ok(Math.abs(item.crossed.duration-30)<.1);
  const lanes=await page.evaluate(()=>player.current.backend.remux.sbs.map(sb=>{const chunks=captures.get(sb),out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let at=0;for(const b of chunks){out.set(b,at);at+=b.length}return Array.from(out)}));assert.equal(lanes.length,2);
  for(let i=0;i<2;i++)await writeFile(`${out}/${fixture}-${i}.mp4`,Buffer.from(lanes[i]));
  const packets=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v','-show_packets','-show_data_hash','sha256','-of','json',file])).packets;
  const original=packets('build/optimization-fixtures/'+fixture+'.mkv'),copied=packets(`${out}/${fixture}-0.mp4`);assert.deepEqual(copied.map(p=>p.data_hash),original.map(p=>p.data_hash));
  const pcm=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:a','-c:a','pcm_s32le','-f','s32le','-'],{maxBuffer:32*1024*1024});assert.deepEqual(pcm(`${out}/${fixture}-1.mp4`),pcm('build/optimization-fixtures/'+fixture+'.mkv'));
  }
  if(process.env.SEEKS==='1'){
   await page.evaluate(()=>player.pause());
   item.seeks=[];
   for(const target of [24,1.05,.75,3,22,29.99]){
    await page.evaluate(t=>player.seek(t),target);await page.waitForTimeout(700);
    const state=await page.evaluate(()=>({diagnostics:player.diagnostics,trace:pumpTrace.slice(),time:player.state.currentTime,paused:player.properties.get('pause')}));item.seeks.push(state);
    assert.ok(Math.abs(state.time-target)<.15);assert.equal(state.paused,true);state.pixels=await pixels();assert.ok(state.pixels.energy>10000);if(fixture.startsWith('audio-tail')&&target>=1&&item.finalPixels)assert.equal(state.pixels.image,item.finalPixels.image);
    assert.ok(state.diagnostics.backend.remux.remux.adaptation.audioSamplesDecoded<48000*8);
    if(target===24||target===1.05){
     const encoded=await page.evaluate(()=>{const chunks=captures.get(player.current.backend.remux.sbs[1]),out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let at=0;for(const b of chunks){out.set(b,at);at+=b.length}return Array.from(out)});
     const file=`${out}/${fixture}-seek-${target}-audio.mp4`;await writeFile(file,Buffer.from(encoded));
     const pcm=f=>execFileSync('ffmpeg',['-v','error','-i',f,'-map','0:a','-c:a','pcm_s32le','-f','s32le','-'],{maxBuffer:32*1024*1024});
     const reference=pcm('build/optimization-fixtures/'+fixture+'.mkv'),decoded=pcm(file),frames=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a','-show_frames','-of','json',file])).frames;
     let cursor=0,segmentStart=0,previousEnd;const segments=[];
     for(const frame of frames){const time=Number(frame.pts_time)-1;if(previousEnd===undefined||Math.abs(time-previousEnd)>.0015){if(cursor>segmentStart)segments.at(-1).length=cursor-segmentStart;segments.push({time,offset:cursor});segmentStart=cursor;}cursor+=Number(frame.nb_samples)*4;previousEnd=time+Number(frame.nb_samples)/48000;}
     if(segments.length)segments.at(-1).length=cursor-segmentStart;assert.equal(cursor,decoded.length);
     for(const segment of segments){const expected=Math.round(segment.time*48000)*4,begin=Math.max(0,expected-48*4),end=Math.min(reference.length,expected+48*4+segment.length),part=decoded.subarray(segment.offset,segment.offset+segment.length),found=reference.subarray(begin,end).indexOf(part);assert.ok(found>=0,'Seek conversion changed samples or source-time alignment');segment.sourceSample=(begin+found)/4;}
     state.seekFidelity={samples:decoded.length/4,segments,sha256:createHash('sha256').update(decoded).digest('hex'),alignmentTolerance:'one input millisecond; exact sample bytes'};
    }
    if(process.env.COMBINATION==='1'&&target===3){
     state.components=await page.evaluate(()=>{const c=document.querySelector('.demuxe-native-ass'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let green=0;for(let i=0;i<p.length;i+=4)if(p[i+1]>150&&p[i]<50&&p[i+2]<50&&p[i+3]>200)green++;return {green,gain:player.current.backend.gainNode.gain.value,plan:player.diagnostics.plan.id};});
     assert.ok(state.components.green>200);assert.equal(state.components.gain,.5);assert.equal(state.components.plan,'native-flac-ass-gain');
    }
    await page.evaluate(()=>player.play());if(target>29.9)await page.waitForFunction(()=>player.properties.get('eof-reached'),null,{timeout:10000});else await page.waitForFunction(t=>player.state.currentTime>t+.5,target,{timeout:10000});
    if(process.env.COMBINATION==='1'&&target===24){state.audioRMS=await page.evaluate(async()=>{const b=player.current.backend,a=b.gainContext.createAnalyser();a.fftSize=2048;b.gainNode.connect(a);await new Promise(r=>setTimeout(r,100));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);b.gainNode.disconnect(a);return Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);});if(fixture.startsWith('audio-tail'))assert.ok(state.audioRMS>.03&&state.audioRMS<.06);else assert.ok(state.audioRMS<.0001);}
    await page.evaluate(()=>player.pause());
   }
   await page.evaluate(()=>Promise.all([player.seek(5),player.seek(20)]));assert.ok(Math.abs(await page.evaluate(()=>player.state.currentTime)-20)<.15);
  }
  item.destroyBarrier=await page.evaluate(async()=>{
   const append=SourceBuffer.prototype.appendBuffer;let outstanding=false;
   SourceBuffer.prototype.appendBuffer=function(bytes){const value=append.call(this,bytes);if(!outstanding&&this.updating){outstanding=true;window.destroying=player.destroy();}return value;};
   const error=await player.seek(1).then(()=>null,e=>e.code);await window.destroying;return {outstanding,error};
  });
  assert.equal(item.destroyBarrier.outstanding,true);assert.equal(item.destroyBarrier.error,'ABORTED');
  item.passed=true;
 }catch(e){item.error=String(e.stack);item.state=await page.evaluate(()=>({diagnostics:player.diagnostics,errors,ends})).catch(()=>null);process.exitCode=1;}
 finally{await page.evaluate(()=>player.destroy()).catch(()=>{});await page.waitForTimeout(100);item.requests=requests.filter(r=>r.path==='/'+fixture+'.mkv');if(process.env.REMOTE==='1'){assert.ok(item.requests.length>0);assert.ok(item.requests.every(r=>r.authorized));}item.workersAfterDestroy=page.workers().length;assert.equal(item.workersAfterDestroy,0);await page.close();console.log(fixture,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}}finally{await browser.close();media.closeAllConnections();await new Promise(r=>media.close(r));server.kill();console.log('Evidence:',out);}
