// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'chrome';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
 browser=await(family==='firefox'?firefox:family==='webkit'?webkit:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{})});
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{
  window.element=document.querySelector('demuxe-player');await element.ready;
  await element.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'timeline.mp4'));await element.pause();
  window.actualSeek=element.seek.bind(element);window.seekRequests=[];element.seek=async time=>seekRequests.push(time);
  const canvas=new OffscreenCanvas(1,1);canvas.getContext('2d').fillRect(0,0,1,1);
  const image={blob:await canvas.convertToBlob()};
  // A resident thumbnail intentionally represents a different time from the pointer.
  element.hoverPreview.api=()=>({strategy:{type:'uniform',samples:48},getFrame:async request=>{
   window.hoverTarget=request.time;return {time:130,actualTime:130,temporalAccuracy:'approximate',width:1,height:1,image};
  }});
 });
 const timeline=page.locator('demuxe-player').first().locator('#timeline');
 let clicks=0;
 for(const forcedColors of ['none','active'])for(const width of [1200,480])for(const start of [0,1000]){
  await page.emulateMedia({forcedColors});
  await page.evaluate(({width,start})=>{element.style.width=width+'px';const t=element.shadowRoot.getElementById('timeline');t.min=String(start);t.max=String(start+1800);t.value=String(start);},{width,start});
  const box=await timeline.boundingBox();
  for(const fraction of [.075,.25,.5,.9]){
   const x=Math.round(box.x+box.width*fraction),y=box.y+box.height/2;
   await page.mouse.move(x,y);
   await page.waitForFunction(()=>!element.shadowRoot.getElementById('thumbnail-image').hidden);
   const before=await page.evaluate(()=>({time:hoverTarget,label:element.shadowRoot.getElementById('thumbnail-target').textContent,sample:element.shadowRoot.getElementById('thumbnail-time').textContent}));
   await page.mouse.click(x,y);
   const target=await page.evaluate(()=>seekRequests.at(-1));
   assert.ok(Math.abs(target-before.time)<=.11,JSON.stringify({family,forcedColors,width,start,fraction,target,hover:before.time}));
   assert.equal(before.sample,'≈ 2:10');
   const {formatTime}=await import('../web/generated/player/interaction.js');
   assert.equal(before.label,formatTime(target));
   clicks++;
  }
 }
 await page.emulateMedia({forcedColors:'none'});
 await page.evaluate(()=>{
  element.seek=actualSeek;
  const t=element.shadowRoot.getElementById('timeline');t.min='0';t.max=String(element.player.state.duration);t.value='0';
 });
 const box=await timeline.boundingBox(),x=Math.round(box.x+box.width*.4),y=box.y+box.height/2;
 await page.mouse.move(x,y);
 const {target,sourceId}=await page.evaluate(()=>({target:hoverTarget,sourceId:element.player.state.sourceId}));
 await page.mouse.click(x,y);
 await page.waitForFunction(target=>!element.player.state.pendingOperation&&Math.abs(element.player.state.currentTime-target)<.15,target);
 const observation=await page.evaluate(()=>{
  const player=element.player,backend=player.current.backend,surface=player.surface;
  // Remux uses a biased media timeline; controls and public state use source time.
  return {sourceId:player.state.sourceId,mode:player.state.activeMode,plan:backend.diagnostics.plan,sameSurface:backend.video===surface,raw:surface.currentTime,bias:backend.remux?.timelineBias??0};
 });
 assert.equal(observation.sourceId,sourceId);assert.equal(observation.mode,'native');assert.equal(observation.sameSurface,true);
 const actual=observation.raw-observation.bias;
 assert.ok(Number.isFinite(observation.bias)&&Number.isFinite(actual)&&Math.abs(actual-target)<.15,JSON.stringify({target,actual,...observation}));
 console.log('TIMELINE_POSITION',JSON.stringify({target,actual,...observation}));
 console.log(`PASS ${family} ${browser.version()}: ${clicks} timeline clicks match hover targets across widths, live windows and forced colors; cached sample time stays separate; real playback reaches the displayed target`);
}finally{await browser?.close();server.kill();}
