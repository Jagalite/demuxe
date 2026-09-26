// SPDX-License-Identifier: Apache-2.0
// Correctness-only, isolated multi-format FLAC24 preparation. No Auto admission edits.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,delay} from '../../tests/head-to-head/benchmark-browser.mjs';
import {installAudioProbe} from '../../tests/native-url-audio-probe.mjs';
import {markedImage} from '../../tests/head-to-head/checks.mjs';
const out=process.env.OUT;assert.ok(out);await mkdir(out,{recursive:false});
const engines=JSON.parse(await readFile(process.env.ENGINES??'build/audio-transcode-formats-01/engines.json'));
const manifest=JSON.parse(await readFile(process.env.FIXTURES??'build/audio-transcode-formats-fixtures-03/manifest.json'));
const cases=manifest.cases.filter(c=>c.returnCode===0&&(!process.env.CASES||process.env.CASES.split(',').includes(c.id)));
assert.ok(cases.length);const sha=b=>createHash('sha256').update(b).digest('hex');
const result={scope:'Experimental FLAC24 conversion; correctness only; no production routing or CPU qualification',fixtureManifest:manifest,engine:{dir:engines.flac24,sha256:sha(await readFile(engines.flac24+'/remux.wasm')),manifest:JSON.parse(await readFile(engines.flac24+'/manifest.json'))},runtime:{},trials:[]};
for(const f of ['web/native-remux-player.js','web/native-remux-worker.js','web/native-remux-source-worker.js'])result.runtime[f]=sha(await readFile(f));
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await save();await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:Object.fromEntries(cases.map(c=>[c.id,c.file]))});let browser;
try{
 const launch=await launchBenchmarkChrome({headless:false,startupGate:false});browser=launch.browser;result.browser=launch.identity;await save();
 for(const fixture of cases){
  const trial={id:fixture.id,fixture:fixture.file,sha256:fixture.sha256,errors:[],phases:[],media:[]};result.trials.push(trial);
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>trial.errors.push(String(e)));console.log('START',fixture.id);
  try{
   await context.route('**/engine-adaptation/remux.*',async route=>{const ext=new URL(route.request().url()).pathname.endsWith('.wasm')?'wasm':'mjs';await route.fulfill({contentType:ext==='wasm'?'application/wasm':'text/javascript',headers:{'Cross-Origin-Resource-Policy':'same-origin'},body:await readFile(engines.flac24+'/remux.'+ext)});});
   await page.addInitScript('('+installAudioProbe.toString().replace('createChannelSplitter(2)','createChannelSplitter(8)').replace('channel<2','channel<8')+')()');
   await page.addInitScript(()=>{window.appended=[];const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(bytes){appended.push(new Uint8Array(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength).slice());return append.call(this,bytes);};});
   const media=await context.newCDPSession(page);await media.send('Media.enable');for(const name of ['playerPropertiesChanged','playerErrorsRaised'])media.on('Media.'+name,e=>trial.media.push({name,...e}));
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   trial.startup=await page.evaluate(async fixture=>{
    window.fixture=fixture;window.failures=[];const {RemuxPlayer}=await import('/web/native-remux-player.js');window.video=document.createElement('video');video.playsInline=true;document.querySelector('#surface').append(video);
    window.player=new RemuxPlayer(video,{audioAdaptation:'flac',bufferedSeeks:true,mseOwner:'window'});player.onError=e=>failures.push(String(e));window.position=()=>Math.max(0,video.currentTime-player.timelineBias);
    const start=performance.now();await player.open({options:{url:location.origin+'/media/'+fixture.id,format:'file'}});await player.play();await urlAudioProbe.observeVideo(video);return {openMs:performance.now()-start};
   },fixture);
   const snapshot=()=>page.evaluate(()=>({time:position(),duration:player.duration,videoTime:video.currentTime,bias:player.timelineBias,paused:video.paused,ended:video.ended,rate:video.playbackRate,videoError:video.error?.message,failures:[...failures,...player.stats.errors],adaptation:player.remuxStats.adaptation,range:player.ranges(),eof:player.eof,frames:video.getVideoPlaybackQuality()}));
   const phase=async label=>{const state=await snapshot();trial.phases.push({label,state});assert.deepEqual(state.failures,[]);assert.ok(!state.videoError);assert.equal(state.adaptation.codec,'flac');assert.equal(state.adaptation.videoFramesDecoded,0);assert.equal(state.adaptation.videoFramesEncoded,0);assert.equal(state.adaptation.channels,fixture.channels);assert.equal(state.adaptation.sampleRate,fixture.sampleRate);assert.equal(state.adaptation.clippedSamples,0);return state;};
   const tones=async label=>{
    let observation,ok=false;
    for(let attempt=0;attempt<3;attempt++){
     await delay(250);observation=await page.evaluate(()=>({time:position(),rate:video.playbackRate,audio:urlAudioProbe.sample()}));
     const offsets=new Set([Math.max(0,observation.time-.35*observation.rate),observation.time+.1].map(t=>t<4?0:t<8?110:220));
     ok=fixture.frequencies.every((hz,channel)=>observation.audio.some(a=>a.channel===channel&&a.rms>.01&&[...offsets].some(offset=>Math.abs(a.hz-hz-(channel===3?0:offset))<30)));
     trial.phases.push({label:'audio-'+label,attempt,accepted:ok,...observation});if(ok)break;
    }
    assert.ok(ok,'Channel/time marker mismatch: '+JSON.stringify(observation));
   };
   await page.waitForFunction(()=>position()>1);await tones('steady');await phase('steady');
   await page.evaluate(()=>player.pause());const paused=await phase('pause');await delay(350);assert.ok(Math.abs((await snapshot()).time-paused.time)<.08);await page.evaluate(()=>player.play());await tones('resume');
   for(const rate of [.5,2,1]){await page.evaluate(rate=>video.playbackRate=rate,rate);await delay(450);await tones('rate-'+rate);assert.equal((await phase('rate-'+rate)).rate,rate);}
   const bytes=await page.evaluate(()=>{const n=appended.reduce((n,b)=>n+b.length,0),all=new Uint8Array(n);let at=0;for(const b of appended){all.set(b,at);at+=b.length;}let binary='';for(let i=0;i<all.length;i+=16384)binary+=String.fromCharCode(...all.subarray(i,i+16384));return btoa(binary);});await writeFile(out+'/'+fixture.id+'-prefix.mp4',Buffer.from(bytes,'base64'));
   for(const t of [12,2]){await page.evaluate(async t=>{await player.seek(t);await player.play();},t);await page.waitForFunction(t=>position()>t+.3,t);await tones('seek-'+t);await phase('seek-'+t);}
   await page.evaluate(async()=>{await player.pause();await player.seek(3);});await page.waitForFunction(()=>!video.seeking);await delay(150);const png=await page.locator('#surface').screenshot();await writeFile(out+'/'+fixture.id+'-paused-seek.png',png);assert.ok(markedImage(png,3).markerCorrect);await phase('paused-seek');
   await page.evaluate(async()=>{await player.seek(player.duration-1.2);await player.play();});await page.waitForFunction(()=>video.ended,undefined,{timeout:12000});const end=await phase('EOF');assert.equal(end.adaptation.audioSamplesDecoded,end.adaptation.audioSamplesEncoded);
   await page.evaluate(async()=>{await player.seek(2);await player.play();});await page.waitForFunction(()=>position()>2.3);await tones('replay');await phase('replay');
   trial.workerURLs=page.workers().map(w=>w.url());assert.ok(trial.workerURLs.every(u=>!u.includes('engine-selective')&&!u.includes('mpv')));
   await page.evaluate(async()=>{await player.destroy();await urlAudioProbe.close();});await delay(250);assert.equal(page.workers().length,0);assert.deepEqual(trial.errors,[]);trial.accepted=true;console.log(fixture.id,'PASS');
  }catch(error){trial.error=String(error.stack);trial.failure=await page.evaluate(()=>({failures:window.failures,video:window.video?{time:video.currentTime,error:video.error?.message,paused:video.paused}:null,remux:window.player?.snapshot()})).catch(()=>null);console.log(fixture.id,'FAIL',trial.error);}
  finally{await save();await context.close();}
 }
}finally{await browser?.close();await server.close();await save();}
assert.ok(result.trials.every(t=>t.accepted),'Retained failed cases: '+out);console.log('EVIDENCE',out);
