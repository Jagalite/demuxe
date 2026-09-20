// SPDX-License-Identifier: Apache-2.0
// Bounded upstream/browser differential: no Demuxe Player, backend or adapter.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';
const repo=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/head-to-head/assets-shaka-production-01');
const out=path.resolve(process.env.OUT??`results/shaka/hevc-differential-${new Date().toISOString().replaceAll(':','-')}`);
await fs.mkdir(out,{recursive:true});
const server=await serve(assets,path.join(repo,'tests/head-to-head'),path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const result={scope:'Standalone Shaka/browser HEVC HLS differential; no Demuxe adapter, scheduler or networking policy. Diagnostic controls only, no performance claims.',browser:browser.version(),fixture:'hls-hevc/index.m3u8',arms:[],hashes:{}};
for(const name of ['demuxe/web/vendor/shaka-player.js','fixtures/hls-hevc/index.m3u8','fixtures/hls-hevc/init.mp4','fixtures/hls-hevc/index0.m4s','fixtures/hls-hevc/index1.m4s'])result.hashes[name]=createHash('sha256').update(await fs.readFile(path.join(assets,name))).digest('hex');
try{
  for(const arm of ['shaka-controls','native-controls','shaka-uninterrupted']){
    const page=await browser.newPage();const record={arm,console:[],mediaEvents:[],controls:[]};result.arms.push(record);
    page.on('console',message=>record.console.push(message.text()));
    const cdp=await page.context().newCDPSession(page);await cdp.send('Media.enable');
    for(const event of ['playerErrorsRaised','playerEventsAdded','playerPropertiesChanged'])cdp.on('Media.'+event,data=>record.mediaEvents.push({event,data}));
    const snapshot=()=>page.evaluate(()=>({position:v.currentTime,duration:v.duration,paused:v.paused,rate:v.playbackRate,ended:v.ended,readyState:v.readyState,quality:v.getVideoPlaybackQuality().toJSON?.()??{total:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames},errors:window.errors,shaka:window.engine?{version:shaka.Player.version,loadMode:engine.getLoadMode(),variants:engine.getVariantTracks()}:null}));
    try{
      await page.goto(server.origin+'/harness/harness.html');
      if(arm!=='native-controls')await page.addScriptTag({url:server.origin+'/demuxe/web/vendor/shaka-player.js'});
      await page.evaluate(async({url,useShaka})=>{
        window.errors=[];window.v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';v.style.width='640px';document.querySelector('#stage').append(v);
        v.addEventListener('error',()=>errors.push({kind:'media',position:v.currentTime,code:v.error?.code,message:v.error?.message}));
        if(useShaka){shaka.polyfill.installAll();window.engine=new shaka.Player();engine.addEventListener('error',event=>errors.push({kind:'shaka',position:v.currentTime,severity:event.detail.severity,category:event.detail.category,code:event.detail.code,data:event.detail.data}));engine.configure({streaming:{preferNativeHls:false,preferNativeDash:false,useNativeHlsForFairPlay:false},abr:{enabled:true},restrictions:{maxBandwidth:100000000}});await engine.attach(v);await engine.load(url,undefined,'application/x-mpegurl');}
        else {await new Promise((resolve,reject)=>{v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',reject,{once:true});v.src=url;v.load();});}
        window.audioContext=new AudioContext();const node=audioContext.createMediaElementSource(v);node.connect(audioContext.destination);await audioContext.resume();await v.play();
      },{url:server.origin+'/fixtures/hls-hevc/index.m3u8',useShaka:arm!=='native-controls'});
      await page.waitForFunction(()=>v.currentTime>.65||errors.length,undefined,{timeout:10000});record.initial=await snapshot();
      await page.locator('#stage').screenshot({path:path.join(out,`${arm}-initial.png`)});
      if(arm==='shaka-uninterrupted'){await page.waitForFunction(()=>v.currentTime>6||errors.length,undefined,{timeout:10000});record.final=await snapshot();}
      else {
        await page.waitForTimeout(600);await page.locator('#stage').screenshot({path:path.join(out,`${arm}-moving.png`)});
        await page.evaluate(()=>v.pause());record.controls.push({action:'pause',state:await snapshot()});await page.waitForTimeout(430);
        await page.evaluate(()=>v.play());await page.waitForTimeout(300);record.controls.push({action:'resume',state:await snapshot()});
        await page.evaluate(()=>v.playbackRate=1.25);await page.waitForTimeout(800);record.controls.push({action:'rate1.25',state:await snapshot()});await page.evaluate(()=>v.playbackRate=1);
        if(!(await snapshot()).errors.length)for(const target of [6,1,10]){await page.evaluate(t=>v.currentTime=t,target);await page.waitForFunction(t=>!v.seeking&&Math.abs(v.currentTime-t)<.8||errors.length,target,{timeout:8000});await page.waitForTimeout(180);record.controls.push({action:'seek',target,state:await snapshot()});if((await snapshot()).errors.length)break;}
        record.final=await snapshot();
      }
      record.passed=!record.final.errors.length&&(arm==='shaka-uninterrupted'?record.final.position>6:record.controls.some(c=>c.action==='seek'&&c.target===10));
    }catch(error){record.failure=String(error.stack);record.final=await snapshot().catch(()=>null);record.passed=false;}
    finally{await page.evaluate(async()=>{await window.engine?.destroy();if(window.v){v.pause();v.removeAttribute('src');v.load();v.remove();}await window.audioContext?.close();}).catch(()=>{});record.workersAfter=page.workers().length;await cdp.detach();await page.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
    console.log(arm,record.passed?'PASS':'FAILED',record.final?.position,record.final?.errors);
  }
}finally{await browser.close();await server.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(out);}
