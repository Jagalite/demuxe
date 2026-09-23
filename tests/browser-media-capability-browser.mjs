// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const dir=await mkdtemp(join(tmpdir(),'demuxe-browser-capabilities-'));
const out=`results/browser-media-capability/run-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
const server=await serve(),results=[];
const ffmpeg=args=>execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y',...args],{timeout:30000});
async function audioEvidence(page){
 await page.waitForFunction(()=>{
  if(window.audioMeter){
   const samples=new Float32Array(audioMeter.fftSize);audioMeter.getFloatTimeDomainData(samples);
   const peak=samples.reduce((a,v)=>Math.max(a,Math.abs(v)),0);
   if(peak>.001){window.verifiedAudio={method:'media-element-pcm',peak,samples:samples.length};return true;}
  }else{
   const a=player.audioDiagnostics();
   if(a?.mediaFrames>6000&&a.rms>.001){window.verifiedAudio={method:'mpv-pcm-worklet',mediaFrames:a.mediaFrames,rms:a.rms};return true;}
  }
  return false;
 });
 return page.evaluate(()=>window.verifiedAudio);
}
try{
 for(const audio of ['aac','ac3']){
  ffmpeg(['-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','4','-c:v','libx264','-preset','ultrafast','-crf','35','-c:a',audio,'-ac','2',join(dir,`${audio}.mp4`)]);
  ffmpeg(['-i',join(dir,`${audio}.mp4`),'-c','copy',join(dir,`${audio}.mkv`)]);
 }
 ffmpeg(['-i',join(dir,'aac.mp4'),'-i',join(dir,'ac3.mp4'),'-map','0:v','-map','0:a','-map','1:a','-c','copy','-disposition:a:0','default','-disposition:a:1','0',join(dir,'mixed.mkv')]);
 ffmpeg(['-i',join(dir,'aac.mp4'),'-c:v','libvpx','-deadline','realtime','-c:a','libopus',join(dir,'opus.webm')]);
 ffmpeg(['-i',join(dir,'aac.mp4'),'-c:v','libx264','-pix_fmt','yuv420p10le','-preset','ultrafast','-c:a','copy',join(dir,'high10.mkv')]);
 ffmpeg(['-i',join(dir,'aac.mp4'),'-c:v','copy','-c:a','dca','-strict','-2',join(dir,'dts.mkv')]);
 for(const [codec,file] of [['flac','tone.flac'],['aac','tone.aac'],['pcm_s16le','tone.wav']])ffmpeg(['-i',join(dir,'aac.mp4'),'-vn','-c:a',codec,join(dir,file)]);
 ffmpeg(['-i',join(dir,'mixed.mkv'),'-map','0:v','-map','0:a:1','-map','0:a:0','-c','copy','-disposition:a:0','default','-disposition:a:1','0',join(dir,'ac3-first.mkv')]);
 const cases=[
  {file:'aac.mp4'},{file:'aac.mkv'},{file:'opus.webm'},
  {file:'ac3.mp4',unsupportedAudio:true},{file:'ac3.mkv',unsupportedAudio:true},
  {file:'mixed.mkv'},{file:'mixed.mkv',aid:'2',unsupportedAudio:true},
  {file:'ac3.mkv',aid:'no'},
  {file:'ac3.mkv',unsupportedAudio:true,pinned:true},
  {file:'high10.mkv',unsupportedVideo:true},
  {file:'dts.mkv',unsupportedAudio:true,codecQuery:'dts'},
  ...['tone.flac','tone.aac','tone.wav'].map(file=>({file,options:{mode:'native',nativeRemux:'never'},expectedPlan:'native-direct'})),
  {file:'ac3-first.mkv',unsupportedAudio:true,switchToAAC:true},
 ];
 if(process.env.REPRO_FILE)cases.push({file:process.env.REPRO_FILE,absolute:true,unsupportedAudio:true});
 for(const name of (process.env.BROWSERS??'chrome,firefox,webkit').split(',')){
  const type={chrome:chromium,firefox,webkit}[name];if(!type)throw Error(`Unknown browser ${name}`);
  const browser=await type.launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
  try{for(const scenario of cases){
   const result={browser:name,version:browser.version(),...scenario};results.push(result);
   const page=await browser.newPage();page.setDefaultTimeout(30000);
   try{
    await page.goto(server.origin+'/experiment/page.html');
    await page.evaluate(async({aid,pinned,options})=>{
     const {Player}=await import('/web/generated/index.js');
     const {NativePlayer}=await import('/web/generated/internal/native-player.js');
     window.nativeOpens=0;window.openedNativePlans=[];const open=NativePlayer.prototype.open;
     NativePlayer.prototype.open=function(...args){nativeOpens++;openedNativePlans.push(this.requestedPlan);return open.apply(this,args);};
     window.player=new Player(document.querySelector('#surface'),options??(pinned?{mode:'native'}:{}));
     if(aid)await player.selectTrack('audio',aid);
     const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);
    },scenario);
    await page.locator('#file').setInputFiles(scenario.absolute?scenario.file:join(dir,scenario.file));
    result.open=await page.evaluate(async()=>{
     let error;try{await player.open(document.querySelector('#file').files[0]);}catch(e){error=String(e);}
     return {error,mode:player.mode,nativeOpens,openedNativePlans,diagnostics:player.diagnostics};
    });
    const direct=result.open.diagnostics.planAdmission.find(p=>p.id==='native-direct');
    assert.ok(direct.browserCapability,'Every inspected file must have browser capability evidence');
    const unsupported=direct.browserCapability.status==='unsupported';
    const nativeEligible=result.open.diagnostics.planAdmission.some(p=>p.mode==='native'&&p.eligible);
    for(const plan of result.open.diagnostics.planAdmission.filter(p=>p.browserCapability?.status==='unsupported'))assert.ok(!result.open.openedNativePlans.includes(plan.id),`Rejected ${plan.id} must never open`);
    if(scenario.unsupportedAudio||scenario.unsupportedVideo){
     assert.ok(direct.browserCapability.queries.some(q=>scenario.unsupportedAudio?q.mime.includes(scenario.codecQuery??'ac-3'):q.mime.toLowerCase().includes('avc1.6e')),'The selected unsupported codec must be queried');
     if(unsupported&&!nativeEligible){
      assert.equal(result.open.nativeOpens,0,'Negative preflight must prevent Native backend.open, including remux');
      assert.ok(!result.open.diagnostics.selection.attempts.some(a=>a.mode==='native'&&a.outcome==='failed'));
      if(scenario.pinned){assert.ok(result.open.error);result.passed=true;continue;}
      const hybrid=result.open.diagnostics.planAdmission.find(p=>p.id==='hybrid');
      assert.equal(result.open.mode,hybrid.eligible?'hybrid':'software');
      if(scenario.unsupportedVideo)assert.ok(!result.open.diagnostics.selection.attempts.some(a=>a.mode==='hybrid'&&a.outcome==='failed'),'Unsupported WebCodecs configuration must be rejected before opening Hybrid');
     }
    }else{
     assert.equal(result.open.mode,nativeEligible?'native':'hybrid');
     if(scenario.aid==='no')assert.ok(direct.browserCapability.tracks.every(t=>t.type!=='audio'));
     if(scenario.file==='mixed.mkv')assert.ok(direct.browserCapability.tracks.every(t=>t.codec!=='ac3'),'Unselected AC3 must not reject selected AAC');
    }
    assert.equal(result.open.error,undefined);
    if(scenario.expectedPlan)assert.equal(result.open.diagnostics.plan.id,scenario.expectedPlan,'Known playable raw audio must retain Native direct');
    if(scenario.switchToAAC){
     assert.equal(result.open.mode,'hybrid');
     await page.evaluate(()=>player.selectTrack('audio','2'));
     await page.waitForFunction(()=>player.mode==='native'&&!player.state.pendingOperation);
     result.afterSwitch=await page.evaluate(()=>({plan:player.diagnostics.plan,admission:player.diagnostics.planAdmission,tracks:player.properties.get('track-list')}));
     assert.equal(result.afterSwitch.plan.id,'native-remux');
     assert.equal(result.afterSwitch.tracks.find(t=>t.type==='audio'&&t.selected)?.codec,'aac');
     const remux=result.afterSwitch.admission.find(p=>p.id==='native-remux');
     assert.equal(remux.eligible,true);assert.equal(remux.browserCapability.tracks.find(t=>t.type==='audio').codec,'aac');
    }
    const current=await page.evaluate(()=>({mode:player.mode,plan:player.diagnostics.backend?.plan}));
    // WebKit does not expose these Native samples through MediaElementAudioSource
    // in this harness (https://bugs.webkit.org/show_bug.cgi?id=266922). Keep the
    // route/playback assertion, but explicitly leave audio output unverified.
    const pcmUnavailable=name==='webkit'&&current.mode==='native'&&(current.plan.startsWith('remux')||scenario.file.endsWith('.webm'));
    if(pcmUnavailable&&scenario.aid!=='no')result.audioCheckSkipped='Native MSE/WebM PCM capture unavailable in WebKit; audible output unverified';
    if(current.mode==='native'&&scenario.aid!=='no'&&!pcmUnavailable)await page.evaluate(async()=>{
     window.audioContext=new AudioContext();window.audioMeter=audioContext.createAnalyser();
     audioContext.createMediaElementSource(player.surface).connect(audioMeter);audioMeter.connect(audioContext.destination);
     await audioContext.resume();
    });
    await page.evaluate(()=>player.play());
    if(scenario.aid!=='no'&&!pcmUnavailable)result.initialAudio=await audioEvidence(page);
    else await page.waitForFunction(()=>player.state.currentTime>.15);
    await page.evaluate(()=>player.pause());
    const pausedAt=await page.evaluate(()=>player.state.currentTime);
    await page.evaluate(()=>player.play());
    await page.waitForFunction(time=>player.state.currentTime>time+.2,pausedAt);
    if(scenario.aid!=='no'&&!pcmUnavailable)result.resumedAudio=await audioEvidence(page);
    result.passed=true;
   }catch(error){result.error=String(error.stack);process.exitCode=1;}
   finally{
    console.log(result.passed?'PASS':'FAIL',name,scenario.file,scenario.aid??'auto',scenario.pinned?'pinned':'',result.error??'');
    await page.evaluate(async()=>{await player.destroy();await window.audioContext?.close();}).catch(()=>{});await page.close();
    await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');
   }
  }}finally{await browser.close();}
 }
}finally{await server.close();await rm(dir,{recursive:true,force:true});}
