// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {basename} from 'node:path';
const fixture=await mkdtemp('build/preview-shaka-');
execFileSync('ffmpeg',['-nostdin','-v','error','-i','fixtures/example.mp4','-map','0:v:0','-c','copy','-an','-f','dash','-seg_duration','2',fixture+'/main.mpd']);
execFileSync('ffmpeg',['-nostdin','-v','error','-i','fixtures/example.mp4','-frames:v','1','-vf','scale=160:90',fixture+'/sprite.jpg']);
const mpd=await readFile(fixture+'/main.mpd','utf8');
await writeFile(fixture+'/main.mpd',mpd.replace('</Period>',`<AdaptationSet id="99" contentType="image" mimeType="image/jpeg"><Representation id="thumb" bandwidth="1000" width="160" height="90"><EssentialProperty schemeIdUri="http://dashif.org/guidelines/thumbnail_tile" value="1x1"/><SegmentTemplate timescale="1" duration="2" media="sprite.jpg" startNumber="1"/></Representation></AdaptationSet></Period>`));
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(m)resolve(m[0]);});});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage();await page.route('**/fixtures/preview-test/**',async route=>{const name=basename(new URL(route.request().url()).pathname);await route.fulfill({body:await readFile(fixture+'/'+name),contentType:name.endsWith('.mpd')?'application/dash+xml':name.endsWith('.jpg')?'image/jpeg':'video/mp4'});});await page.goto(origin+'/examples/custom-controls.html');await page.waitForFunction(()=>window.player);
 const result=await page.evaluate(async path=>{
  await window.player.destroy();const {ShakaBackend}=await import('/web/generated/internal/shaka-backend.js');const {PreviewController}=await import('/web/generated/preview/controller.js');
  const v=document.createElement('video');document.body.append(v);const backend=new ShakaBackend(v,new URL('/',location.href));
  const preview=new PreviewController([{id:'shaka',priority:20,canHandle:()=>true,getFrame:r=>backend.previewFrame(r)}],{debounceMs:0});
  try{await backend.openRemote({url:new URL(path,location.origin).href,format:'dash'});await backend.seek(1);const before=v.currentTime;
   const frame=await preview.getFrame({time:2.4,width:120});const indexed=backend.player.getManifest().imageStreams.map(s=>!!s.segmentIndex);
   return {before,after:v.currentTime,paused:v.paused,indexed,frame:frame?{actualTime:frame.actualTime,width:frame.width,height:frame.height,path:frame.path,size:frame.image.blob?.size}:null,diagnostics:preview.diagnostics};
  }finally{preview.destroy();await backend.destroy();v.remove();}
 },'/fixtures/preview-test/main.mpd');
 assert.ok(result.frame,JSON.stringify(result));assert.equal(result.before,result.after);assert.equal(result.paused,true);assert.equal(result.frame.actualTime,2);assert.equal(result.frame.width,120);assert.equal(result.frame.path,'shaka-image-track');assert.ok(result.frame.size>0);console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();server.kill();}
