// SPDX-License-Identifier: Apache-2.0
import {chromium,webkit,testBrowserRuntime} from './browser-test-runtime.mjs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {installLiveRuntime} from './api-stability/live-runtime.mjs';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
import {deadline} from './api-stability/live-check-helpers.mjs';

const family=process.env.BROWSER??'chrome';
assert.ok(['chrome','webkit'].includes(family));
const out=`results/player-mobile/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
const report={passed:false,family,testBrowserRuntime,scope:process.env.BETA_ARCHIVE?'Installed-archive mobile player checks':'Workspace mobile player checks',testHarnessSHA256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex')};
let browser,server,installed;
try{
 if(process.env.BETA_ARCHIVE){installed=await installLiveRuntime(process.env.BETA_ARCHIVE);report.archiveSHA256=installed.archiveSHA256;report.runtimeFiles=installed.manifest.files;}
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,...installed?{DEMUXE_RUNTIME_ROOT:installed.runtimeRoot}:{},PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(Error('Mobile server exited before readiness: '+code)));server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
 browser=await(family==='webkit'?webkit:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{})});
 report.browserVersion=browser.version();
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(origin+'/');
 await page.evaluate(async()=>{
  window.viewer=document.querySelector('demuxe-player');await viewer.ready;
  window.$=id=>viewer.shadowRoot.getElementById(id);
  // Controls tests do not qualify audible output; mute before any startup recovery play.
  await viewer.setMuted(true);await viewer.open(location.origin+'/fixtures/example.mp4');await viewer.pause();
 });
 for(const [width,height] of [[320,568],[390,844],[667,375],[844,390]]){
  await page.setViewportSize({width,height});
  for(const layout of ['classic','cinema','rail','studio','focus','deck']){
   await page.evaluate(layout=>{viewer.layout=layout;viewer.revealControls();},layout);
   const result=await page.evaluate(()=>{
    const shell=$('shell').getBoundingClientRect();
    const controls=['back','play','forward','timeline','settings-toggle','fullscreen','mute','time','duration'].map(id=>{
     const rect=$(id).getBoundingClientRect();
     return {id,inside:rect.left>=shell.left-1&&rect.right<=shell.right+1&&rect.top>=shell.top-1&&rect.bottom<=shell.bottom+1,width:rect.width,height:rect.height};
    });
    const ids=controls.map(control=>control.id),overlaps=[];
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
     const a=$(ids[i]).getBoundingClientRect(),b=$(ids[j]).getBoundingClientRect();
     if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([ids[i],ids[j]]);
    }
    const stage=$('stage').getBoundingClientRect(),play=$('play').getBoundingClientRect();
    return {controls,overlaps,centerOffset:Math.abs(play.y+play.height/2-stage.y-stage.height/2),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(result.overflow,false,`${layout} ${width}: horizontal page overflow`);
   assert.ok(result.controls.every(control=>control.inside),JSON.stringify({layout,width,result}));
   assert.deepEqual(result.overlaps,[],`${layout} ${width}: overlapping controls`);
   if(layout==='classic'&&width<height)assert.ok(result.centerOffset<2,`portrait transport offset ${result.centerOffset}`);
   assert.ok(result.controls.filter(control=>!['time','duration'].includes(control.id)).every(control=>control.width>=44&&control.height>=44),JSON.stringify({layout,width,result}));
  }
  await page.locator('#viewer #settings-toggle').click();
  const sheet=await page.evaluate(()=>{const panel=$('settings'),rect=panel.getBoundingClientRect();return {modal:panel.matches(':modal'),inside:rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight+1,wide:rect.width>=Math.min(innerWidth,600)-2,scroll:panel.scrollHeight>panel.clientHeight};});
  assert.deepEqual(sheet,{modal:true,inside:true,wide:true,scroll:true});
  await page.locator('#viewer #speed').selectOption('1.25');
  assert.equal(await page.evaluate(()=>viewer.player.state.playbackRate),1.25);
  await page.locator('#viewer #settings-source').click();
  assert.equal(await page.locator('#viewer #url').isVisible(),true);
  await page.locator('#viewer #url').fill('https://example.test/movie.mp4');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>!$('settings').open&&$('settings').hidden&&viewer.shadowRoot.activeElement===$('settings-toggle')),true);
  await page.locator('#viewer #settings-toggle').click();
  await page.locator('#viewer #settings-diagnostics').click();
  assert.equal(await page.locator('#viewer #diagnostics-overlay').isVisible(),true);
  await page.evaluate(()=>viewer.setDiagnostics(false));
  await page.locator('#viewer #settings-toggle').click();
  await page.screenshot({path:`${out}/settings-${width}.png`});
  // A click on the native modal backdrop dismisses the sheet.
  await page.mouse.click(2,2);
  assert.equal(await page.evaluate(()=>$('settings').hidden),true);
  await page.evaluate(()=>{viewer.layout='classic';viewer.revealControls();});
  await page.screenshot({path:`${out}/classic-${width}.png`});
 }
 console.log('PASS phone portrait/landscape: six layouts, touch targets, modal bounds, source/settings actions, Escape, focus return and backdrop dismissal');

 // An open menu must follow tablet rotation without losing edited fields or focus.
 await page.setViewportSize({width:1024,height:768});
 await page.locator('#viewer #open-menu').click();
 await page.locator('#viewer #url').fill('https://example.test/keep-this-edit.mp4');
 await page.locator('#viewer #url').focus();
 await page.setViewportSize({width:768,height:1024});
 await page.waitForFunction(()=>$('settings').matches(':modal'));
 assert.equal(await page.locator('#viewer #url').inputValue(),'https://example.test/keep-this-edit.mp4');
 assert.equal(await page.evaluate(()=>viewer.shadowRoot.activeElement===$('url')),true);
 await page.setViewportSize({width:1024,height:768});
 await page.waitForFunction(()=>$('settings').open&&!$('settings').matches(':modal'));
 assert.equal(await page.locator('#viewer #url').inputValue(),'https://example.test/keep-this-edit.mp4');
 assert.equal(await page.evaluate(()=>viewer.shadowRoot.activeElement===$('url')),true);
 await page.keyboard.press('Escape');
 await page.locator('#viewer #settings-toggle').click();
 await page.setViewportSize({width:768,height:1024});
 await page.waitForFunction(()=>$('settings').matches(':modal'));
 await page.locator('#viewer #settings-source').click();
 assert.equal(await page.locator('#viewer #url').isVisible(),true);
 await page.keyboard.press('Escape');
 console.log('PASS open tablet menus follow rotation in both directions, retaining form edits, focus and media-opening controls');

 // Switching presentation must not strand keyboard focus on a hidden control.
 for(const [id,target] of [['open-menu','settings-toggle'],['diagnostics-toggle','settings-toggle'],['volume','mute']]){
  assert.equal(await page.evaluate(({id,target})=>{
   viewer.controlsMode='desktop';viewer.revealControls();$(id).focus();
   viewer.controlsMode='mobile';
   return viewer.shadowRoot.activeElement===$(target);
  },{id,target}),true,`mobile override restores focus from ${id} to ${target}`);
 }
 await page.evaluate(()=>viewer.controlsMode='auto');
 // Host overrides must control both CSS and dialog behavior across layouts/themes.
 for(const [width,height,mode] of [[1280,800,'mobile'],[800,1000,'mobile'],[390,844,'desktop'],[320,568,'desktop']]){
  await page.setViewportSize({width,height});
  for(const layout of ['classic','cinema','rail','studio','focus','deck'])for(const theme of ['demuxe','light']){
   const result=await page.evaluate(({mode,layout,theme})=>{
    viewer.controlsMode=mode;viewer.layout=layout;viewer.theme=theme;viewer.revealControls();
    const visible=id=>$(id).getClientRects().length>0&&getComputedStyle($(id)).visibility!=='hidden';
    return {mode:viewer.controlsMode,attribute:viewer.getAttribute('controls-mode'),folder:visible('open-menu'),volume:visible('volume'),layout:viewer.layout,theme:viewer.theme};
   },{mode,layout,theme});
   assert.deepEqual(result,{mode,attribute:mode,folder:mode==='desktop',volume:mode==='desktop',layout,theme});
   const bounds=await page.evaluate(()=>{
    const shell=$('shell').getBoundingClientRect();
    return ['play','back','forward','timeline','settings-toggle','fullscreen','mute','time','duration'].map(id=>{
     const r=$(id).getBoundingClientRect();return {id,inside:r.width>0&&r.height>0&&r.left>=shell.left-1&&r.right<=shell.right+1&&r.top>=shell.top-1&&r.bottom<=shell.bottom+1};
    });
   });
   assert.ok(bounds.every(control=>control.inside),JSON.stringify({mode,layout,theme,width,height,bounds}));
   await page.locator('#viewer #settings-toggle').click();
   assert.equal(await page.evaluate(()=>$('settings').matches(':modal')),mode==='mobile');
   assert.equal(await page.locator('#viewer #settings-source').isVisible(),mode==='mobile');
   await page.keyboard.press('Escape');
  }
 }
 // Live overrides preserve media, nodes, edited fields and keyboard focus.
 await page.evaluate(()=>{viewer.layout='classic';viewer.theme='demuxe';viewer.controlsMode='mobile';});
 await page.locator('#viewer #settings-toggle').click();
 await page.locator('#viewer #settings-source').click();
 await page.locator('#viewer #url').fill('https://example.test/override-edit.mp4');
 await page.locator('#viewer #url').focus();
 assert.equal(await page.evaluate(()=>{
  const core=viewer.player,node=$('url'),source=core.state.sourceId,time=core.state.currentTime;
  viewer.controlsMode='desktop';
  const desktop=!$('settings').matches(':modal')&&$('error').parentElement===$('shell');
  viewer.controlsMode='mobile';
  return desktop&&$('settings').matches(':modal')&&$('error').parentElement===$('settings')&&
   viewer.shadowRoot.activeElement===node&&node.value==='https://example.test/override-edit.mp4'&&
   viewer.player===core&&core.state.sourceId===source&&core.state.currentTime===time;
 }),true);
 await page.setViewportSize({width:1280,height:800});
 assert.equal(await page.evaluate(()=>$('settings').matches(':modal')),true,'forced mobile survives viewport changes');
 await page.evaluate(()=>viewer.controlsMode='auto');
 // WebKit delivers viewport media-query changes asynchronously.
 await page.waitForFunction(()=>!$('settings').matches(':modal'));
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>$('settings').matches(':modal'));
 await page.evaluate(()=>viewer.setAttribute('controls-mode','desktop'));
 assert.equal(await page.evaluate(()=>$('settings').matches(':modal')),false);
 await page.evaluate(()=>viewer.setAttribute('controls-mode','invalid'));
 assert.equal(await page.evaluate(()=>viewer.controlsMode==='auto'&&$('settings').matches(':modal')),true);
 await page.evaluate(()=>viewer.removeAttribute('controls-mode'));
 assert.equal(await page.evaluate(()=>viewer.controlsMode==='auto'&&$('settings').matches(':modal')),true);
 assert.equal(await page.evaluate(()=>{try{viewer.controlsMode='invalid';return false;}catch(error){return error.code==='INVALID_ARGUMENT'&&viewer.controlsMode==='auto';}}),true);
 await page.keyboard.press('Escape');
 await page.screenshot({path:`${out}/override-auto-restored.png`});
 // Properties assigned before custom-element registration must be upgraded too.
 assert.equal(await page.evaluate(async()=>{
  const {DemuxePlayerElement}=await import('/player.js');
  const host=document.createElement('override-test-player');host.controlsMode='mobile';host.setAttribute('controls','');
  document.body.append(host);customElements.define('override-test-player',class extends DemuxePlayerElement{});
  try{await host.ready;return host.controlsMode==='mobile'&&host.getAttribute('controls-mode')==='mobile'&&!Object.hasOwn(host,'controlsMode');}
  finally{await host.destroy();host.remove();}
 }),true);
 console.log('PASS controls-mode overrides across six layouts and both themes; runtime/attribute changes, auto restoration, validation and pre-registration properties');
 // The Appearance selector must preserve the active core and dialog focus.
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.appearanceCore=viewer.player;viewer.controlsMode='auto';viewer.revealControls();if(!$('settings').open)$('settings-toggle').click();});
 for(const mode of ['desktop','mobile','auto']){
  await page.locator('#viewer #controls-mode-select').focus();
  await page.locator('#viewer #controls-mode-select').selectOption(mode);
  assert.deepEqual(await page.evaluate(()=>({mode:viewer.controlsMode,value:$('controls-mode-select').value,modal:$('settings').matches(':modal'),sameCore:viewer.player===appearanceCore,focused:viewer.shadowRoot.activeElement===$('controls-mode-select')})),{mode,value:mode,modal:mode!=='desktop',sameCore:true,focused:true});
 }
 await page.evaluate(()=>{viewer.setAttribute('controls-mode','desktop');});
 assert.equal(await page.locator('#viewer #controls-mode-select').inputValue(),'desktop');
 await page.evaluate(()=>{viewer.removeAttribute('controls-mode');});
 assert.equal(await page.locator('#viewer #controls-mode-select').inputValue(),'auto');
 await page.locator('#viewer #settings-close').click();
 console.log('PASS Appearance controls selector updates presentation and follows host overrides without replacing the player');

 await page.setViewportSize({width:390,height:844});
 await page.locator('#viewer #settings-toggle').click();
 await page.evaluate(async()=>{
  const {PlayerError}=await import('/web/generated/internal/errors.js');
  window.originalRate=viewer.setPlaybackRate;
  viewer.setPlaybackRate=()=>Promise.reject(new PlayerError('DECODE_FAILED','Playback adjustment failed',null,null,'operation',true));
  window.retryCalls=0;window.originalOpen=viewer.player.open;
  viewer.player.open=function(...args){retryCalls++;return originalOpen.apply(this,args);};
 });
 await page.locator('#viewer #speed').selectOption('1.5');
 await page.waitForFunction(()=>!$('error').hidden);
 assert.equal(await page.evaluate(()=>$('settings').contains($('error'))&&$('settings').contains($('status'))),true);
 assert.match(await page.locator('#viewer #settings').ariaSnapshot(),/Playback adjustment failed/);
 await page.locator('#viewer #retry').click();
 await page.waitForFunction(()=>retryCalls===1&&!viewer.player.state.pendingOperation&&!viewer.queueOperation);
 assert.equal(await page.evaluate(()=>retryCalls),1);
 assert.equal(await page.evaluate(()=>$('error').hidden),true);
 await page.evaluate(async()=>{viewer.setPlaybackRate=originalRate;viewer.player.open=originalOpen;await viewer.pause();});
 await page.keyboard.press('Escape');
 await page.locator('#viewer #settings').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>$('error').parentElement===$('shell')&&$('status').parentElement===$('shell')),true);
 console.log('PASS rejected settings operations show an accessible message and clickable Retry inside the modal; closing restores overlay ownership');

 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{viewer.layout='classic';viewer.revealControls();});
 const timeline=page.locator('#viewer #timeline');
 await timeline.scrollIntoViewIfNeeded();
 if(family==='chrome'){
  const cdp=await page.context().newCDPSession(page);
  const box=await timeline.boundingBox(),y=box.y+box.height/2;
  const touch=(type,fraction)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x:box.x+box.width*fraction,y,id:1}]});
  await page.evaluate(()=>{window.realSeek=viewer.seek.bind(viewer);window.seeks=[];viewer.seek=time=>{seeks.push(time);return realSeek(time);};});
  await touch('touchStart',.2);await touch('touchMove',.7);
  const scrub=await page.evaluate(()=>({time:Number($('timeline').value),label:$('scrub-position').textContent,visible:!$('scrub-position').hidden,dragging:viewer.dragging,seeks:seeks.length}));
  assert.equal(scrub.visible,true);assert.equal(scrub.dragging,true);assert.equal(scrub.seeks,0);assert.ok(scrub.time>6);
  await page.screenshot({path:`${out}/touch-scrub.png`});
  await touch('touchEnd');
  await page.waitForFunction(time=>!viewer.player.state.pendingOperation&&Math.abs(viewer.player.state.currentTime-time)<.15,scrub.time);
  assert.equal(await page.evaluate(()=>seeks.length),1);
  assert.equal(await page.evaluate(()=>!viewer.dragging&&$('scrub-position').hidden),true);
  await touch('touchStart',.7);await touch('touchMove',.3);await touch('touchCancel');
  assert.equal(await page.evaluate(()=>seeks.length),1,'cancellation must not seek');
  assert.equal(await page.evaluate(()=>!viewer.dragging&&$('scrub-position').hidden&&Math.abs(Number($('timeline').value)-viewer.player.state.currentTime)<.15),true);
  // A stationary press still holds controls open; it need not change the range value.
  await page.evaluate(async()=>{window.originalAutoHideDelay=viewer.controlsAutoHideDelay;viewer.controlsAutoHideDelay=50;await viewer.play();viewer.revealControls();});
  await touch('touchStart',.7);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>viewer.dragging&&!$('shell').classList.contains('idle')),true);
  await touch('touchCancel');await page.evaluate(async()=>{await viewer.pause();viewer.controlsAutoHideDelay=originalAutoHideDelay;viewer.seek=realSeek;});
  await cdp.detach();
  console.log('PASS native Chromium touch: timestamp during drag, one seek on release, no seek on cancellation, stationary hold prevents auto-hide');
  await page.locator('#viewer #fullscreen').click();
  await page.waitForFunction(()=>document.fullscreenElement===viewer);
  assert.equal(await page.evaluate(()=>{const r=$('shell').getBoundingClientRect();return Math.abs(r.height-innerHeight)<2&&Math.abs(r.width-innerWidth)<2;}),true);
  await page.locator('#viewer #settings-toggle').click();
  assert.equal(await page.evaluate(()=>$('settings').matches(':modal')),true);
  await page.locator('#viewer #settings-close').click();
  await page.evaluate(()=>document.exitFullscreen());
  console.log('PASS phone fullscreen fills the viewport and retains modal settings');
 }
 // Double-tap seeking is touch-only and uses the configured seek step.
 await page.evaluate(async()=>{
  viewer.seekStep=2;await viewer.seek(6);viewer.revealControls();
  window.gestureSeeks=[];window.gestureSeek=viewer.seek.bind(viewer);
  viewer.seek=time=>{gestureSeeks.push(time);return gestureSeek(time);};
  window.stagePointer=(type,fraction,extra={})=>{const r=$('stage').getBoundingClientRect();$('stage').dispatchEvent(new PointerEvent(type,{bubbles:true,composed:true,pointerType:'touch',pointerId:91,isPrimary:true,button:0,clientX:r.left+r.width*fraction,clientY:r.top+r.height*.25,...extra}));};
  window.stageTap=fraction=>{stagePointer('pointerdown',fraction);stagePointer('pointerup',fraction);stagePointer('pointerleave',fraction);};
  stageTap(.9);stageTap(.9);
  $('stage').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  window.compatibilityClickKeptControls=!$('shell').classList.contains('idle');
  stageTap(.5);$('stage').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  window.freshCenterTapHidControls=$('shell').classList.contains('idle');
 });
 assert.deepEqual(await page.evaluate(()=>[compatibilityClickKeptControls,freshCenterTapHidControls]),[true,true]);
 await page.waitForFunction(()=>!viewer.player.state.pendingOperation&&Math.abs(viewer.player.state.currentTime-8)<.15);
 assert.deepEqual(await page.evaluate(()=>gestureSeeks),[8]);
 await page.evaluate(()=>{
  stageTap(.1);stageTap(.1);
  // A fresh press must also clear suppression if no compatibility click arrived.
  stageTap(.5);$('stage').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  window.freshTapWithoutCompatibilityClick=$('shell').classList.contains('idle');
 });
 assert.equal(await page.evaluate(()=>freshTapWithoutCompatibilityClick),true);
 await page.waitForFunction(()=>!viewer.player.state.pendingOperation&&Math.abs(viewer.player.state.currentTime-6)<.15);
 assert.deepEqual(await page.evaluate(()=>gestureSeeks),[8,6]);
 await page.evaluate(()=>{
  stageTap(.5);stageTap(.5);
  stageTap(.1);stagePointer('pointerdown',.1);stagePointer('pointermove',.3);stagePointer('pointerup',.1);
  stageTap(.9);stagePointer('pointerdown',.9);stagePointer('pointercancel',.9);stagePointer('pointerup',.9);
  $('stage').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 });
 assert.equal(await page.evaluate(()=>gestureSeeks.length===2&&!document.fullscreenElement&&!$('shell').hasAttribute('popover')&&viewer.player.state.playbackIntent==='pause'),true);
 if(family==='chrome'){
  await page.locator('#viewer #stage').scrollIntoViewIfNeeded();
  const cdp=await page.context().newCDPSession(page),box=await page.locator('#viewer #stage').boundingBox();
  for(let i=0;i<2;i++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.1,y:box.y+box.height*.25,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.waitForFunction(()=>!viewer.player.state.pendingOperation&&Math.abs(viewer.player.state.currentTime-4)<.15);
  assert.deepEqual(await page.evaluate(()=>gestureSeeks),[8,6,4]);
  assert.equal(await page.evaluate(()=>!document.fullscreenElement&&!$('shell').hasAttribute('popover')),true);
  await cdp.detach();
 }
 await page.waitForTimeout(750); // The touch compatibility-event suppression window has ended.
 const stageBox=await page.locator('#viewer #stage').boundingBox();
 await page.locator('#viewer #stage').dblclick({position:{x:stageBox.width*.1,y:stageBox.height*.25}});
 await page.waitForFunction(()=>document.fullscreenElement===viewer||$('shell').matches(':popover-open'));
 await page.locator('#viewer #fullscreen').click();
 await page.waitForFunction(()=>!document.fullscreenElement&&!$('shell').hasAttribute('popover'));
 await page.evaluate(()=>{viewer.seek=gestureSeek;viewer.seekStep=10;viewer.revealControls();});
 console.log('PASS touch double-tap seeking: directions, custom step, center/swipe/cancel rejection, no touch fullscreen');
 // Browser expansion uses the same composed shell when container fullscreen is absent.
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{
  window.expansionAutoHideDelay=viewer.controlsAutoHideDelay;viewer.controlsAutoHideDelay=0;viewer.revealControls();window.expansionCore=viewer.player;window.expansionSource=viewer.player.state.sourceId;
  window.originalFullscreen=Object.getOwnPropertyDescriptor(viewer,'requestFullscreen');Object.defineProperty(viewer,'requestFullscreen',{value:undefined,configurable:true});
  window.outside=document.createElement('button');outside.textContent='Outside player';document.body.append(outside);
  window.beforeExpansionOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='clip';window.originalOverflow=document.documentElement.style.overflow;
  window.subtitleLayer=document.createElement('canvas');subtitleLayer.dataset.testSubtitle='';subtitleLayer.style.position='absolute';$('surface').append(subtitleLayer);
 });
 // Observe continuity in the page, before slow automation round trips can outlast the fixture.
 report.phase='expanded playback';await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 const expansionPlayback=await deadline(page.evaluate(async()=>{
  window.mobileExpansionPhase='seek';await viewer.seek(0);
  window.mobileExpansionPhase='play';await viewer.play();viewer.revealControls();
  // Automatic playback selection may replace the video before expansion starts.
  window.expansionSurface=viewer.player.surface;
  window.mobileExpansionPhase='expand';
  const start=viewer.player.state.currentTime,deadline=performance.now()+5000;
  $('fullscreen').click();window.mobileExpansionPhase='progress';
  while(viewer.player.state.currentTime<=start+.2&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  return {sameCore:viewer.player===expansionCore,intent:viewer.player.state.playbackIntent,expanded:$('shell').matches(':popover-open'),advanced:viewer.player.state.currentTime>start+.2};
 }),20000);
 assert.deepEqual(expansionPlayback,{sameCore:true,intent:'play',expanded:true,advanced:true});
 await page.evaluate(async()=>{await viewer.pause();viewer.controlsAutoHideDelay=expansionAutoHideDelay;});
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>$('shell').contains(viewer.shadowRoot.activeElement)),true);}
 // An inert custom control subtree must not trap Tab on an unfocusable child.
 await page.evaluate(()=>{
  window.inertControls=document.createElement('div');inertControls.inert=true;
  inertControls.innerHTML='<button>Unavailable custom control</button>';
  $('fullscreen').after(inertControls);$('fullscreen').focus();
 });
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>viewer.shadowRoot.activeElement!==$('fullscreen')&&!inertControls.contains(viewer.shadowRoot.activeElement)),true);
 await page.evaluate(()=>inertControls.remove());
 for(const [width,height]of [[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  for(const layout of ['classic','cinema','rail','studio','focus','deck']){
   await page.evaluate(layout=>{viewer.layout=layout;viewer.revealControls();},layout);
   // Viewport units may settle after WebKit acknowledges the resize.
   await page.waitForFunction(()=>{const r=$('shell').getBoundingClientRect();window.expansionLayoutCheck={bounds:{left:r.left,top:r.top,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},expanded:$('shell').matches(':popover-open'),sameCore:viewer.player===expansionCore,sameSurface:viewer.player.surface===expansionSurface,sameSource:viewer.player.state.sourceId===expansionSource,subtitle:$('surface').contains(subtitleLayer),outsideInert:outside.inert};return Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2&&Math.abs(r.left)<2&&Math.abs(r.top)<2;},null,{timeout:5000});
   assert.equal(await page.evaluate(()=>{const r=$('shell').getBoundingClientRect();return $('shell').matches(':popover-open')&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2&&Math.abs(r.left)<2&&Math.abs(r.top)<2&&viewer.player===expansionCore&&viewer.player.surface===expansionSurface&&viewer.player.state.sourceId===expansionSource&&$('surface').contains(subtitleLayer)&&outside.inert;}),true,`Expanded ${layout} ${width}x${height}`);
   const controls=await page.evaluate(()=>['fullscreen','settings-toggle','play','timeline','mute'].map(id=>{const r=$(id).getBoundingClientRect();return {id,inside:r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};}));
   assert.deepEqual(controls.filter(c=>!c.inside),[],`Expanded controls ${layout} ${width}x${height}`);
  }
  await page.screenshot({path:`${out}/expanded-${width}x${height}.png`});
 }
 await page.evaluate(()=>{viewer.layout='classic';});
 await page.locator('#viewer #settings-toggle').click();
 assert.equal(await page.evaluate(()=>$('settings').matches(':modal')&&$('shell').matches(':popover-open')),true);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>!$('settings').open&&$('shell').matches(':popover-open')),true);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>!$('shell').hasAttribute('popover')&&!outside.inert&&document.documentElement.style.overflow===originalOverflow&&viewer.shadowRoot.activeElement===$('fullscreen')),true);
 // Reopening before the native toggle event must not snapshot our own page locks.
 await page.evaluate(()=>{$('fullscreen').click();$('shell').hidePopover();$('fullscreen').click();});
 assert.equal(await page.evaluate(()=>$('shell').matches(':popover-open')&&outside.inert),true);
 await page.locator('#viewer #fullscreen').click();
 assert.equal(await page.evaluate(()=>!outside.inert&&document.documentElement.style.overflow===originalOverflow),true);
 // Repeated taps cannot turn an in-flight request into a spurious fallback.
 await page.evaluate(()=>{window.nativeFullscreenCalls=0;Object.defineProperty(viewer,'requestFullscreen',{value:()=>{nativeFullscreenCalls++;return new Promise((_,reject)=>window.rejectFullscreen=reject);},configurable:true});});
 await page.locator('#viewer #fullscreen').click();await page.locator('#viewer #fullscreen').click();
 assert.equal(await page.evaluate(()=>nativeFullscreenCalls===1&&!$('shell').hasAttribute('popover')),true);
 await page.evaluate(()=>rejectFullscreen(new DOMException('Denied','NotAllowedError')));await page.waitForFunction(()=>$('shell').matches(':popover-open'));
 await page.locator('#viewer #fullscreen').click();
 assert.equal(await page.evaluate(()=>!$('shell').hasAttribute('popover')&&!outside.inert),true);
 await page.evaluate(()=>{Object.defineProperty(viewer,'requestFullscreen',{value:undefined,configurable:true});});
 await page.locator('#viewer #fullscreen').click();
 await page.evaluate(()=>viewer.controls=false);
 assert.equal(await page.evaluate(()=>!$('shell').hasAttribute('popover')&&!outside.inert&&document.documentElement.style.overflow===originalOverflow),true);
 await page.evaluate(()=>{viewer.controls=true;document.documentElement.style.overflow=beforeExpansionOverflow;});
 await page.evaluate(()=>{if(originalFullscreen)Object.defineProperty(viewer,'requestFullscreen',originalFullscreen);else delete viewer.requestFullscreen;outside.remove();subtitleLayer.remove();});
 console.log('PASS browser expansion: all layouts and rotation, composed surface preserved, modal settings, Escape, touch exit and native denial fallback');
 // Retire media/preparation work before navigating away from the first fixture.
 await page.evaluate(()=>viewer.destroy());
 // Narrow embedded players also get a viewport-sized sheet, even below the fold.
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.viewer=document.querySelector('demuxe-player');await viewer.ready;window.$=id=>viewer.shadowRoot.getElementById(id);});
 await page.locator('demuxe-player').first().locator('#settings-toggle').click();
 assert.equal(await page.evaluate(()=>{const r=$('settings').getBoundingClientRect();return $('settings').matches(':modal')&&r.top>=0&&r.bottom<=innerHeight+1&&r.height>viewer.getBoundingClientRect().height;}),true);
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>$('settings').contains(viewer.shadowRoot.activeElement)),true);
 await page.locator('demuxe-player').first().locator('#settings-close').click();
 await page.evaluate(()=>{Object.defineProperty(viewer,'requestFullscreen',{value:undefined,configurable:true});window.destroyOverflow=document.documentElement.style.overflow;});
 await page.locator('demuxe-player').first().locator('#fullscreen').click();
 assert.equal(await page.evaluate(()=>$('shell').matches(':popover-open')),true);
 await page.evaluate(()=>viewer.destroy());
 assert.equal(await page.evaluate(()=>!document.querySelector(':modal')&&!$('settings').open&&!$('shell').hasAttribute('popover')&&document.documentElement.style.overflow===destroyOverflow),true);
 // A transformed embedding ancestor cannot constrain the expanded top layer.
 assert.equal(await page.evaluate(async()=>{
  const holder=document.createElement('div');holder.style.cssText='transform:translate(17px,23px);width:240px;overflow:hidden';
  const host=document.createElement('demuxe-player');host.setAttribute('controls','');holder.append(host);document.body.append(holder);await host.ready;
  Object.defineProperty(host,'requestFullscreen',{value:undefined});const shell=host.shadowRoot.getElementById('shell'),button=host.shadowRoot.getElementById('fullscreen'),overflow=document.documentElement.style.overflow;
  button.click();const r=shell.getBoundingClientRect(),expanded=shell.matches(':popover-open')&&Math.abs(r.top)<2&&Math.abs(r.left)<2&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2;
  holder.remove();await host.destroy();return expanded&&!shell.hasAttribute('popover')&&document.documentElement.style.overflow===overflow;
 }),true);
 assert.deepEqual(errors,[]);
 console.log(`PASS ${family}: embedded modal focus, transformed embedding, disconnect and teardown; screenshots ${out}`);
 report.passed=true;
}catch(error){
 report.error=String(error.stack);process.exitCode=1;
 if(browser){
  const page=browser.contexts()[0]?.pages()[0];
  if(page)report.failureDiagnostics=await deadline(page.evaluate(()=>({phase:window.mobileExpansionPhase,layout:window.expansionLayoutCheck,state:window.viewer?.player?.state,video:window.viewer?.player?.surface instanceof HTMLVideoElement?{readyState:viewer.player.surface.readyState,networkState:viewer.player.surface.networkState,paused:viewer.player.surface.paused,currentTime:viewer.player.surface.currentTime,error:viewer.player.surface.error?.code}:null})),2000).catch(error=>({error:String(error)}));
 }
}
finally{
 try{if(browser)await closeTestBrowser(browser,family);}catch(error){report.passed=false;report.cleanupError=String(error.stack);process.exitCode=1;}
 finally{server?.kill();try{await installed?.cleanup();}catch(error){report.passed=false;report.cleanupError=String(error.stack);process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log('Mobile player report: '+out);}}
}
if(report.error)console.error(report.error);
