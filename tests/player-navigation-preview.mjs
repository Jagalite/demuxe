// SPDX-License-Identifier: Apache-2.0
// Actual player-element integration: native 600-second media, public range API,
// trusted mouse/touch input, and deterministic buffering observations at the
// element's update boundary. These are not network-outage/performance tests.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const repo=path.resolve(import.meta.dirname,'..');
const family=process.env.BROWSER??'chrome';
if(!['chrome','chromium'].includes(family))throw Error('This trusted-touch suite uses Chromium CDP; run BROWSER=chrome or chromium.');
const out=path.resolve(process.env.OUT??`results/api-stability/excerpt-preview/${family}-${Date.now()}`);
await mkdir(out,{recursive:true});await mkdir(path.join(repo,'fixtures'),{recursive:true});
const fixture=await mkdtemp(path.join(repo,'fixtures/excerpt-preview-'));
const file=path.join(fixture,'ten-minutes.mp4');
let browser,server;const checks=[];
try{
 execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x90:rate=2','-t','600','-an','-c:v','libx264','-preset','ultrafast','-g','2','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:'pipe',timeout:60000});
 server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:repo,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise((resolve,reject)=>{
  let output='';const timer=setTimeout(()=>reject(Error('Player test server did not start')),15000);
  server.once('error',error=>{clearTimeout(timer);reject(error);});
  server.once('exit',code=>{clearTimeout(timer);reject(Error(`Player test server exited: ${code}`));});
  server.stdout.on('data',data=>{output+=String(data);const match=/http:\/\/127\.0\.0\.1:\d+/.exec(output);if(match){clearTimeout(timer);resolve(match[0]);}});
 });
 browser=await chromium.launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{}),args:['--autoplay-policy=no-user-gesture-required']});
 const mediaURL=origin+'/'+path.relative(repo,file).split(path.sep).join('/');
 async function check(name,run){
  const context=await browser.newContext({viewport:{width:1200,height:800},hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  try{
   await page.goto(origin+'/examples/player-element.html');
   await page.evaluate(async mediaURL=>{
    window.element=document.querySelector('demuxe-player');await element.ready;
    element.controls=true;element.controlsAutoHideDelay=0;
    element.player.preview.setStrategy({type:'on-demand'});element.player.preview.enabled=false;
    await element.player.setMode('native');
    window.movie=new File([await(await fetch(mediaURL)).arrayBuffer()],'ten-minutes.mp4',{type:'video/mp4'});
    await element.open(movie);await element.pause();
    window.realSeek=element.seek.bind(element);window.seekRequests=[];
    element.seek=seconds=>{seekRequests.push(seconds);return realSeek(seconds);};
   },mediaURL);
   await page.waitForFunction(()=>!element.player.state.pendingOperation&&element.player.state.seekable?.length);
   const evidence=await run(page);
   assert.deepEqual(errors,[],'No uncaught browser errors');
   checks.push({name,passed:true,evidence});console.log('PASS',name);
  }catch(error){checks.push({name,passed:false,error:String(error.stack),pageErrors:errors});process.exitCode=1;console.error('FAIL',name,error);}
  finally{
   await page.evaluate(()=>window.element?.destroy()).catch(()=>{});await context.close();
   await writeFile(path.join(out,'result.json'),JSON.stringify({browser:browser.version(),scope:'Actual DemuxePlayerElement; synthetic native media and explicit UI-state fault injection',checks},null,2)+'\n');
  }
 }
 const timeline=page=>page.locator('demuxe-player').first().locator('#timeline');
 const previewVisible=page=>page.waitForFunction(()=>{
  const root=element.shadowRoot,image=root.getElementById('thumbnail-image');
  return !root.getElementById('thumbnail-preview').hidden&&!image.hidden&&image.naturalWidth>0&&!!image.getAttribute('src');
 });
 async function point(page,fraction){
  return timeline(page).evaluate((input,fraction)=>{
   const rect=input.getBoundingClientRect(),style=getComputedStyle(input),scale=rect.width/parseFloat(style.width);
   const thumb=Math.max(0,Math.min(rect.width,(parseFloat(style.getPropertyValue('--timeline-thumb-size'))||0)*scale));
   return {x:rect.left+thumb/2+(rect.width-thumb)*fraction,y:rect.top+rect.height/2};
  },fraction);
 }
 async function keys(page,expected){
  for(const [key,time] of expected){
   await page.locator('demuxe-player').first().locator('#stage').focus();await page.keyboard.press(key);
   await page.waitForFunction(time=>!element.player.state.pendingOperation&&Math.abs(element.player.state.currentTime-time)<.2,time);
   assert.ok(Math.abs(await page.evaluate(()=>seekRequests.at(-1))-time)<.01,`key ${key} targets ${time}`);
  }
 }
 async function installPreview(page){
  await page.evaluate(async()=>{
   const canvas=new OffscreenCanvas(4,4);canvas.getContext('2d').fillRect(0,0,4,4);
   const image={blob:await canvas.convertToBlob()};
   window.previewCalls=[];window.held=[];window.holdPreviews=false;
   window.previewResult=request=>({time:request.time,actualTime:request.time,temporalAccuracy:'approximate',width:4,height:4,image});
   const preview={strategy:{type:'on-demand'},getFrame:async request=>{
    if(request.cacheOnly)return null;
    previewCalls.push(request);
    if(holdPreviews)return new Promise(resolve=>held.push({request,resolve}));
    return previewResult(request);
   }};
   element.hoverPreview.api=()=>preview;
   // Exercise actual element.update -> hoverPreview.observe wiring. Preserve
   // pending operations and source identities emitted by the real core.
   const original=element.update.bind(element);window.bufferingInjected=false;
   element.update=state=>original(bufferingInjected?{...state,status:'buffering',playbackIntent:'play'}:state);
   window.injectBuffering=value=>{bufferingInjected=value;element.update(element.player.state);};
  });
 }
 await check('excerpt shortcuts, mouse dragging and range clearing share bounds',async page=>{
  await page.evaluate(()=>element.player.setPlaybackRange({start:120,end:180}));
  await page.waitForFunction(()=>!element.player.state.pendingOperation);
  assert.deepEqual(await timeline(page).evaluate(input=>[Number(input.min),Number(input.max)]),[120,180]);
  await keys(page,[['0',120],['5',150],['9',174]]);
  // End the drag at a different value so the native input emits change.
  await page.evaluate(()=>element.seek(150));
  await page.waitForFunction(()=>!element.player.state.pendingOperation);
  await page.evaluate(()=>{seekRequests.length=0;});
  const start=await point(page,.1),middle=await point(page,.5),end=await point(page,.9);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(middle.x,middle.y,{steps:4});await page.mouse.move(end.x,end.y,{steps:4});
  assert.equal(await page.evaluate(()=>seekRequests.length),0,'Dragging must not seek on input');
  await page.mouse.up();await page.waitForFunction(()=>seekRequests.length===1&&!element.player.state.pendingOperation);
  assert.ok(Math.abs(await page.evaluate(()=>element.player.state.currentTime)-174)<.2);
  await page.evaluate(()=>element.player.setPlaybackRange(null));
  await page.waitForFunction(()=>!element.player.state.pendingOperation);
  assert.deepEqual(await timeline(page).evaluate(input=>[Number(input.min),Number(input.max)]),[0,600]);
  await keys(page,[['0',0],['5',300],['9',540]]);
  return {excerpt:[120,180],excerptKeys:[120,150,174],clearedKeys:[0,300,540],dragSeeks:1};
 });
 await check('stationary hover resumes once through actual element buffering updates',async page=>{
  await installPreview(page);await page.evaluate(()=>{holdPreviews=true;});
  const at=await point(page,.4);await page.mouse.move(at.x,at.y);
  await page.waitForFunction(()=>held.length===1);
  await page.evaluate(()=>injectBuffering(true));assert.equal(await page.evaluate(()=>held[0].request.signal.aborted),true);
  await page.evaluate(()=>{held[0].resolve(previewResult(held[0].request));holdPreviews=false;injectBuffering(false);});
  await previewVisible(page);assert.equal(await page.evaluate(()=>previewCalls.length),2);
  await page.evaluate(()=>element.update(element.player.state));await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>previewCalls.length),2,'Repeated eligible updates must not generate more previews');
  return {providerRequests:2,recoveryWithoutPointerMovement:true};
 });
 await check('pointer leave clears stationary hover recovery through the element',async page=>{
  await installPreview(page);await page.evaluate(()=>{holdPreviews=true;});
  const at=await point(page,.4);await page.mouse.move(at.x,at.y);await page.waitForFunction(()=>held.length===1);
  await page.evaluate(()=>injectBuffering(true));await page.mouse.move(0,0);
  await page.evaluate(()=>{held[0].resolve(previewResult(held[0].request));holdPreviews=false;injectBuffering(false);});
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>previewCalls.length),1);
  assert.equal(await page.evaluate(()=>element.shadowRoot.getElementById('thumbnail-preview').hidden),true);
  return {providerRequests:1,lateResultRejected:true};
 });
 await check('actual source replacement cannot resurrect prior hover intent',async page=>{
  await installPreview(page);await page.evaluate(()=>{holdPreviews=true;});
  const at=await point(page,.4);await page.mouse.move(at.x,at.y);await page.waitForFunction(()=>held.length===1);
  const old=await page.evaluate(()=>element.player.state.sourceId);await page.evaluate(()=>injectBuffering(true));
  await page.evaluate(async()=>{holdPreviews=false;await element.open(new File([movie],'replacement.mp4',{type:'video/mp4'}));injectBuffering(false);held[0].resolve(previewResult(held[0].request));});
  await page.waitForTimeout(300);
  assert.notEqual(await page.evaluate(()=>element.player.state.sourceId),old);
  assert.equal(await page.evaluate(()=>previewCalls.length),1);
  assert.equal(await page.evaluate(()=>element.shadowRoot.getElementById('thumbnail-preview').hidden),true);
  return {replacementIsNewSource:true,providerRequests:1,lateResultRejected:true};
 });
 await check('trusted touch shows thumbnails and performs only the final seek',async page=>{
  await installPreview(page);await page.evaluate(()=>element.player.setPlaybackRange({start:120,end:180}));
  await page.waitForFunction(()=>!element.player.state.pendingOperation);await page.evaluate(()=>{seekRequests.length=0;});
  const session=await page.context().newCDPSession(page);
  for(const [type,fraction] of [['touchStart',.1],['touchMove',.5],['touchMove',.9]]){
   const at=await point(page,fraction);await session.send('Input.dispatchTouchEvent',{type,touchPoints:[{...at,id:1}]});
   await previewVisible(page);assert.equal(await page.evaluate(()=>seekRequests.length),0,'Touch movement must not issue playback seeks');
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>seekRequests.length===1&&!element.player.state.pendingOperation);
  assert.ok(Math.abs(await page.evaluate(()=>element.player.state.currentTime)-174)<.2);
  assert.equal(await page.evaluate(()=>element.shadowRoot.getElementById('thumbnail-preview').hidden),true);
  await page.evaluate(()=>{seekRequests.length=0;});
  const at=await point(page,.2);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...at,id:2}]});await previewVisible(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>seekRequests.length),0,'Cancelled touch must not commit a seek');
  assert.equal(await page.evaluate(()=>element.shadowRoot.getElementById('thumbnail-preview').hidden),true);
  await session.detach();return {finalSeeks:1,cancelledSeeks:0,previewRequests:await page.evaluate(()=>previewCalls.length)};
 });
}finally{
 await browser?.close();server?.kill();await rm(fixture,{recursive:true,force:true});
}
