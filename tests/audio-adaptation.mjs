// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const profile=process.env.PROFILE||'flac';assert.ok(['flac','opus'].includes(profile));
const family=process.env.BROWSER||'chrome',out=`${process.env.RESULT_ROOT||(profile==='opus'?'results/optimization-completion/opus':'results/optimization-integration/stage2')}/adaptation-${profile}-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('server timeout')),10000);server.on('error',j);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);r(m[0])}})});
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const manifest=JSON.parse(await readFile('results/optimization-integration/fixture-manifest.json','utf8'));
const fixtures=manifest.map(f=>({name:f.name,file:'build/optimization-fixtures/'+f.name+'.mkv'}));fixtures.push({name:'original-edge',file:'results/optimization-integration/reference/web/edge.mkv'});
fixtures.push({name:'audio-offset',file:'build/optimization-fixtures/audio-offset.mkv'});
fixtures.push(profile==='flac'?{name:'multi-audio',file:'build/optimization-fixtures/multi-audio.mkv',audio:1,rate:44100}:{name:'opus-multi-audio',file:'build/optimization-fixtures/opus-multi-audio.mkv',audio:1,rate:48000});
if(process.env.CASES?.split(',').includes('long-pcm'))fixtures.push({name:'long-pcm',file:'build/optimization-fixtures/long-pcm.mkv'});
if(profile==='opus')fixtures.push({name:'opus-markers',file:'build/optimization-fixtures/opus-markers.mkv'});
const result={profile,browser:browser.version(),scope:'Real browser MSE playback and native offline decode-back; not physical A/V or performance qualification',cases:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
const packets=f=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-of','json',f])).packets;
const frames=f=>execFileSync('ffmpeg',['-v','error','-i',f,'-map','0:v:0','-an','-f','framemd5','-'],{encoding:'utf8',maxBuffer:4*1024*1024}).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());
const pcm=(f,index=0)=>execFileSync('ffmpeg',['-v','error','-i',f,'-map',`0:a:${index}`,'-c:a','pcm_s32le','-f','s32le','-'],{maxBuffer:32*1024*1024});
try{
 for(const fixture of fixtures.filter(f=>!process.env.CASES||process.env.CASES.split(',').includes(f.name))){
  const page=await browser.newPage();page.setDefaultTimeout(20000);const item={...fixture};result.cases.push(item);
  try{
   if(process.env.REMUX_WORKER)await page.route('**/native-remux-worker.js',async r=>r.fulfill({response:await r.fetch(),body:await readFile(process.env.REMUX_WORKER)}));
   if(process.env.ENGINE_BUILD)await page.route('**/engine-adaptation/remux.*',async r=>{const name=r.request().url().endsWith('.wasm')?'remux.wasm':'remux.mjs';await r.fulfill({contentType:name.endsWith('.wasm')?'application/wasm':'text/javascript',body:await readFile(process.env.ENGINE_BUILD+'/'+name)});});
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async profile=>{
    await window.player?.destroy();const {Player}=await import('/web/generated/index.js');
    window.errors=[];window.captures=new Map();const append=SourceBuffer.prototype.appendBuffer;
    SourceBuffer.prototype.appendBuffer=function(bytes){let chunks=captures.get(this);if(!chunks)captures.set(this,chunks=[]);chunks.push(new Uint8Array(bytes).slice());return append.call(this,bytes)};
    window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:profile,allowLossyAudio:profile==='opus',experimentalBufferedNativeSeeks:true});
    player.addEventListener('error',e=>errors.push(e.detail));
    const file=document.createElement('input');file.type='file';file.id='file';document.body.append(file);
   },profile);
   await page.locator('#file').setInputFiles(fixture.file);
   await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0])});
   if(fixture.audio){
    await page.evaluate(async()=>{await player.selectTrack('audio','3');await player.setAudioGain(.5)});
    item.selection=await page.evaluate(()=>player.diagnostics);
    assert.equal(item.selection.backend.remux.remux.adaptation.sampleRate,fixture.rate);
    assert.equal(item.selection.backend.remux.remux.adaptation.channels,1);
   }
   await page.evaluate(()=>player.play());
   if(process.env.EXPECT_PRECISION_REJECTION)throw Error('Expected injected precision rejection was not observed');
   await page.waitForFunction(()=>player.surface.ended,null,{timeout:fixture.name==='long-pcm'?45000:20000});
   item.diagnostics=await page.evaluate(()=>({d:player.diagnostics,errors,position:player.state.currentTime}));
   assert.deepEqual(item.diagnostics.errors,[]);assert.equal(item.diagnostics.d.plan.id,`native-${profile}${fixture.audio?'-gain':''}`);
   const data=await page.evaluate(()=>{const appended=captures.get(player.current.backend.remux.sb);let n=appended.reduce((n,b)=>n+b.length,0),b=new Uint8Array(n),at=0;for(const chunk of appended){b.set(chunk,at);at+=chunk.length}return Array.from(b)});
   const output=out+'/'+fixture.name+'.mp4';await writeFile(output,Buffer.from(data));
   const inputPackets=packets(fixture.file),outputPackets=packets(output);
   assert.equal(outputPackets.length,inputPackets.length);assert.deepEqual(outputPackets.map(p=>p.data_hash),inputPackets.map(p=>p.data_hash));
   const shift=Number(outputPackets[0].pts_time)-Number(inputPackets[0].pts_time);
   for(let i=0;i<outputPackets.length;i++){
    assert.ok(Math.abs(Number(outputPackets[i].pts_time)-Number(inputPackets[i].pts_time)-shift)<.0001,'PTS relative offsets changed');
    if(i)assert.ok(Number(outputPackets[i].dts_time)>Number(outputPackets[i-1].dts_time),'DTS not increasing');
   }
   const streams=f=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',f])).streams;
   const inputAudio=streams(fixture.file).filter(s=>s.codec_type==='audio')[fixture.audio||0],outputAudio=streams(output).find(s=>s.codec_type==='audio');
   if(profile==='flac')assert.ok(Math.abs(Number(outputAudio.start_time)-Number(inputAudio.start_time)-shift)<.0001,'Relative audio/video offset changed');
   const reference=pcm(fixture.file,fixture.audio||0),decoded=pcm(output);
   if(profile==='flac')assert.deepEqual(decoded,reference);
   else {
    const channels=inputAudio.channels,n=reference.length/4/channels,actual=decoded.length/4/channels;
    item.opus={referenceSamples:n,decodedSamples:actual,inputAudioStart:inputAudio.start_time,outputAudioStart:outputAudio.start_time};
    if(fixture.name==='opus-markers'){
     // Joint stereo chirps and markers remove the ambiguity of a single tone.
     // Correlate decoded output to the source; never trim to manufacture success.
     let best={lag:0,error:Infinity};
     for(let lag=-240;lag<=240;lag++){
      let error=0,count=0;for(let i=500;i<n-500;i+=17)for(let c=0;c<channels;c++){
       const a=reference.readInt32LE((i*channels+c)*4)/2147483648,b=decoded.readInt32LE(((i+lag)*channels+c)*4)/2147483648;error+=(a-b)**2;count++;
      }error/=count;if(error<best.error)best={lag,error};
     }item.opus.alignment=best;assert.ok(Math.abs(best.lag)<=1,'Opus marker alignment changed');
    }
    const aPackets=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_packets','-of','json',output])).packets;
    item.opus.firstPacket=aPackets[0];item.opus.lastPacket=aPackets.at(-1);item.opus.initialPadding=outputAudio.initial_padding;
    const stats=item.diagnostics.d.backend.remux.remux.adaptation;
    // Opus decoders emit coded frames, including declared padding. Account for
    // dOps preskip and the final MP4 sample duration independently; do not trim
    // PCM to fit the reference or call the lossy output sample-exact.
    const declared=aPackets.reduce((sum,p)=>sum+Number(p.duration),0)-outputAudio.initial_padding;
    item.opus.declaredValidSamples=declared;item.opus.decodedPadding=actual-n;
    assert.equal(declared,n,'Container valid-sample duration changed');
    assert.equal(actual-n,stats.discardPaddingSamples,'Unaccounted decoded padding');
    assert.equal(stats.audioSamplesDecoded,n);assert.equal(stats.audioSamplesEncoded,n);
    assert.equal(stats.encoderDelaySamples,outputAudio.initial_padding);
    assert.ok(Math.abs(Number(outputAudio.start_time)+outputAudio.initial_padding/48000-Number(inputAudio.start_time)-shift)<.0001,'Opus audible timeline offset changed');
   }
   if(fixture.name==='original-edge')assert.deepEqual(frames(output),frames(fixture.file));
   item.fidelity={videoPackets:inputPackets.length,ptsShift:shift,pcmBytes:reference.length,pcmSHA256:hash(reference),outputSHA256:hash(Buffer.from(data)),samplesExact:profile==='flac'};
   await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.passed=true;
  }catch(error){item.error=String(error.stack);item.state=await page.evaluate(()=>({d:player.diagnostics,errors})).catch(()=>null);
   if(process.env.EXPECT_PRECISION_REJECTION&&item.error.includes('Decoded samples exceed established 24-bit precision')){
    item.control='Injected nonzero S24 low bits rejected';
    item.publishedBoxes=await page.evaluate(()=>Array.from(captures.values()).flatMap(chunks=>chunks.flatMap(b=>{const boxes=[];for(let at=0;at+8<=b.length;){const size=new DataView(b.buffer,b.byteOffset+at,4).getUint32(0);if(size<8||at+size>b.length)throw Error('Invalid captured box');boxes.push(String.fromCharCode(...b.subarray(at+4,at+8)));at+=size;}return boxes;})));
    assert.ok(!item.publishedBoxes.includes('moof'),'Invalid samples reached media publication');await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.passed=true;
   }else process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(item.name,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();server.kill();}
console.log(out);
