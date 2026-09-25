// SPDX-License-Identifier: Apache-2.0
// Test-only Chrome trace for the established SRT subtitle CPU case.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';

const fixture='build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv';
const lane=process.env.LANE??'on',cadence=process.env.CADENCE??'60hz';
const seconds=Number(process.env.SECONDS??6),out=resolve(process.env.OUT??`results/subtitle-root-cause/trace-${new Date().toISOString().replaceAll(':','-')}-${lane}-${cadence}`);
await mkdir(out,{recursive:true});
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 if(cadence==='10hz')await page.route('**/web/generated/internal/native-mpv-subtitles.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const before='if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = requestAnimationFrame(() => this.tick());';
  if(!source.includes(before))throw Error('Cadence target drift');
  source=source.replace(before,'if (!this.video.paused || this.busy || this.last !== key)\n            this.frame = setTimeout(() => this.tick(), 100);');
  await route.fulfill({response,body:source});
 });
 await page.route('**/web/mpv-subtitle-worker.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  const marker="setInterval(()=>performance.mark('DEMUXE_SUBTITLE_WORKER'),1000);\n";
  source=marker+source;
  await route.fulfill({response,body:source});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const i=document.createElement('input');i.type='file';i.id='media';document.body.append(i);});
 await page.locator('#media').setInputFiles(fixture);
 await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
 if(lane==='off')await page.evaluate(()=>player.selectSubtitleTrack(null));
 await page.evaluate(()=>player.play());
 await page.waitForFunction(()=>player.state.currentTime>.5,null,{timeout:15000});
 await page.waitForTimeout(3000);
 const cdp=await browser.newBrowserCDPSession();
 const before=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
 const categories=['toplevel','blink','blink.user_timing','devtools.timeline','disabled-by-default-devtools.timeline','v8','disabled-by-default-v8.cpu_profiler','cc','gpu','renderer.scheduler','sequence_manager'].join(',');
 await cdp.send('Tracing.start',{categories,options:'record-as-much-as-possible',transferMode:'ReturnAsStream'});
 await page.waitForTimeout(seconds*1000);
 const state=await page.evaluate(()=>({time:player.state.currentTime,plan:player.diagnostics.plan,backend:player.diagnostics.backend.mpvSubtitles,video:(()=>{const v=player.current.backend.video,q=v.getVideoPlaybackQuality();return {frames:q.totalVideoFrames,dropped:q.droppedVideoFrames,audioBytes:v.webkitAudioDecodedByteCount??null};})()}));
 const after=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
 const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
 await cdp.send('Tracing.end');
 const {stream}=await complete;
 const chunks=[];let eof=false;
 while(!eof){const result=await cdp.send('IO.read',{handle:stream,size:1024*1024});chunks.push(result.base64Encoded?Buffer.from(result.data,'base64'):Buffer.from(result.data));eof=result.eof;}
 await cdp.send('IO.close',{handle:stream});
 const raw=Buffer.concat(chunks);
 await writeFile(resolve(out,'trace.json.gz'),gzipSync(raw));
 const meta={createdAt:new Date().toISOString(),lane,cadence,seconds,chrome:browser.version(),fixture:{path:fixture,sha256:createHash('sha256').update(await readFile(fixture)).digest('hex')},route:state.plan,subtitle:state.backend,video:state.video,traceBytes:raw.length,processes:after.map(p=>({id:p.id,type:p.type,cpuSeconds:p.cpuTime-before.find(q=>q.id===p.id)?.cpuTime}))};
 await writeFile(resolve(out,'meta.json'),JSON.stringify(meta,null,2)+'\n');
 await page.evaluate(()=>player.destroy());
 console.log(out,raw.length);
}finally{await browser.close();await server.close();}
