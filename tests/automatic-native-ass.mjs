// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const family=process.env.BROWSER??'chrome',out=`results/automatic-native-ass/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.on('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)resolve(m[0]);});});
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const [name,options,expected] of [['automatic',{},'native'],['missing-renderer',{},'hybrid'],['denied-renderer',{},'rejected'],['opt-out',{experimentalNativeASS:false},'hybrid'],['explicit-native',{mode:'native'},'rejected']]){
  const page=await browser.newPage();page.setDefaultTimeout(30000);
  if(name==='missing-renderer'||name==='denied-renderer')await page.route('**/engine-ass/subtitles.mjs',route=>route.fulfill({status:name==='missing-renderer'?404:403,body:''}));
  await page.goto(origin+'/examples/custom-controls.html');
  const result=await page.evaluate(async({options})=>{
   await player.destroy();const {Player}=await import('/web/generated/index.js');
   window.player=new Player(document.querySelector('#surface'),options);
   await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));
   let error;
   try{await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'captions.ass'));await player.seek(2.25);}catch(e){error=String(e);}
   return {mode:player.mode,plan:player.diagnostics.plan?.id,error};
  },{options});
  if(expected==='rejected')assert.match(result.error,name==='denied-renderer'?/403/:/subtitle|plan/i);
  else{assert.equal(result.error,undefined);assert.equal(result.mode,expected);}
  if(name==='automatic'){
   assert.equal(result.plan,'native-direct-ass');
   await page.waitForFunction(()=>{const c=document.querySelector('.demuxe-native-ass');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});
   await page.evaluate(()=>player.subtitleVisible(false));assert.equal(await page.locator('.demuxe-native-ass').isVisible(),false);
   await page.evaluate(()=>player.subtitleVisible(true));assert.equal(await page.locator('.demuxe-native-ass').isVisible(),true);
   await page.evaluate(()=>player.play());await page.waitForTimeout(250);
   const before=await page.evaluate(()=>({renders:player.current.backend.ass.stats.renders,frames:player.current.backend.video.getVideoPlaybackQuality().totalVideoFrames}));
   await page.waitForTimeout(1000);
   const after=await page.evaluate(()=>({renders:player.current.backend.ass.stats.renders,frames:player.current.backend.video.getVideoPlaybackQuality().totalVideoFrames}));
   assert.ok(after.renders>before.renders);
   assert.ok(after.renders-before.renders<=after.frames-before.frames+5,'Subtitle work follows video cadence rather than display refresh');
   result.cadence={before,after};
  }
  await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  results.push({name,...result,passed:true});await page.close();
 }
}finally{await browser.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS automatic external ASS admission, opt-out, explicit mode and cleanup',out);
