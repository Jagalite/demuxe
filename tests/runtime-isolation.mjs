// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/runtime-isolation/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const fixtureDir='build/remux-fixtures-v1';await mkdir(fixtureDir,{recursive:true});
try{await access(fixtureDir+'/avc-aac.ts');}catch{execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-g','24','-bf','2','-c:a','aac','-b:a','96k','-f','mpegts',fixtureDir+'/avc-aac.ts']);}
try{await access(fixtureDir+'/avc-aac.mp4');}catch{execFileSync('ffmpeg',['-v','error','-i',fixtureDir+'/avc-aac.ts','-c','copy',fixtureDir+'/avc-aac.mp4']);}
const server=await serve({isolated:false,mediaPaths:{movie:'build/remux-fixtures-v1/avc-aac.mp4',ts:'build/remux-fixtures-v1/avc-aac.ts'}});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const requests=[],result={cases:[]};
try{
 const page=await browser.newPage();page.on('request',r=>requests.push(r.url()));await page.goto(server.origin+'/experiment/page.html');
 const native=await page.evaluate(async url=>{
  const {Player}=await import('/web/generated/index.js');window.Player=Player;
  window.player=new Player(document.querySelector('#surface'),{prepare:'all'});
  const preparation=await player.prepare('all');await player.openRemote({url});await player.play();
  return {isolated:crossOriginIsolated,preparation,plan:player.diagnostics.plan?.id,width:player.surface.videoWidth};
 },server.origin+'/media/movie');
 assert.equal(native.isolated,false);assert.equal(native.plan,'native-direct');assert.ok(native.width>0);
 assert.ok(native.preparation.assets.every(a=>a.status==='failed'&&a.error.includes('cross-origin isolation')));
 await page.waitForFunction(()=>player.properties.get('time-pos')>.25);
 result.cases.push({name:'non-isolated Native playback and optional preparation',passed:true,...native});
 await page.route('**/stream.m3u8',route=>route.fulfill({contentType:'application/vnd.apple.mpegurl',body:'#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:5\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:4.1,\n/media/ts\n#EXT-X-ENDLIST\n'}));
 const streaming=await page.evaluate(async url=>{await player.openRemote({url,format:'hls',streaming:{maxBandwidth:2000000}});await player.play();return {plan:player.diagnostics.plan?.id,width:player.surface.videoWidth};},server.origin+'/stream.m3u8');
 assert.equal(streaming.plan,'shaka-mse');assert.ok(streaming.width>0);
 await page.waitForFunction(()=>player.properties.get('time-pos')>.25);
 result.cases.push({name:'non-isolated HLS falls through to Shaka playback',passed:true,...streaming});
 const rejected=await page.evaluate(async url=>{
  const surface=player.surface;const container=document.createElement('div');document.body.append(container);
  const required=new Player(container,{mode:'native',nativeRemux:'always'});
  try{await required.openRemote({url});return {accepted:true};}catch(e){return {code:e.code,error:String(e),preserved:surface===player.surface};}finally{await required.destroy();}
 },server.origin+'/media/ts');
 assert.equal(rejected.code,'ISOLATION_REQUIRED');assert.equal(rejected.preserved,true);
 result.cases.push({name:'pthread-only route rejects qualification cleanly',passed:true,...rejected});
 const internal=await page.evaluate(async url=>{const {RemuxPlayer}=await import('/web/native-remux-player.js');const r=new RemuxPlayer(document.createElement('video'));try{await r.open({options:{url}});return null;}catch(e){return String(e);}finally{await r.destroy();}},server.origin+'/media/ts');
 assert.match(internal,/cross-origin isolation/);
 await page.evaluate(()=>player.destroy());assert.equal(page.workers().length,0);
 assert.ok(!requests.some(url=>/\/web\/engine-|\.wasm(?:\?|$)|source-probe|native-remux-worker/.test(url)),JSON.stringify(requests));
 result.cases.push({name:'no Wasm assets or producers requested without isolation',passed:true});
 await page.close();result.passed=true;
}finally{await browser.close();await server.close();await writeFile(out+'/result.json',JSON.stringify({...result,requests},null,2)+'\n');console.log(out);}
