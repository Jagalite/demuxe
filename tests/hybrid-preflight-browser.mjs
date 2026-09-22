// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const dir=await mkdtemp(join(tmpdir(),'demuxe-startup-')),server=await serve();
try{
 const subtitle=join(dir,'caption.srt'),file=join(dir,'hevc-ass.mkv');
 await writeFile(subtitle,'1\n00:00:00,000 --> 00:00:02,000\nStartup regression\n');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=sample_rate=48000','-i',subtitle,'-map','0:v','-map','1:a','-map','2:s','-c:v','libx265','-preset','ultrafast','-pix_fmt','yuv420p10le','-x265-params','pools=1:frame-threads=1:log-level=error','-c:a','aac','-ac','2','-c:s','ass','-t','2',file]);
 for(const name of ['firefox','chrome']){
  const browser=await (name==='firefox'?firefox:chromium).launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});
  try{
   const page=await browser.newPage(),requests=[];
   page.on('request',r=>requests.push(r.url()));
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
   await page.locator('#file').setInputFiles(file);
   await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.play();});
   await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.1);
   const result=await page.evaluate(()=>({mode:player.mode,attempts:player.diagnostics.selection.attempts}));
   if(name==='firefox'){
    assert.equal(result.mode,'software');
    assert.ok(result.attempts.some(a=>a.mode==='hybrid'&&a.outcome==='skipped'&&a.reason.includes('browser configuration unsupported')));
    assert.ok(!requests.some(u=>u.includes('/engine-hybrid/')),'unsupported route must not load Hybrid');
   }else assert.equal(result.mode,'hybrid');
   await page.evaluate(()=>player.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);
   console.log('PASS',name,JSON.stringify(result));
  }finally{await browser.close();}
 }
}finally{await server.close();await rm(dir,{recursive:true,force:true});}
