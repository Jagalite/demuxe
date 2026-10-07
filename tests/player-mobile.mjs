// SPDX-License-Identifier: Apache-2.0
import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {installLiveRuntime} from './api-stability/live-runtime.mjs';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';

const family=process.env.BROWSER??'chrome';
assert.ok(['chrome','webkit'].includes(family));
const out=`results/player-mobile/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
const report={passed:false,family,scope:process.env.BETA_ARCHIVE?'Installed-archive mobile player checks':'Workspace mobile player checks',testHarnessSHA256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex')};
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
  await viewer.open(location.origin+'/fixtures/example.mp4');await viewer.pause();
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
  await page.evaluate(async()=>{viewer.controlsAutoHideDelay=50;await viewer.play();viewer.revealControls();});
  await touch('touchStart',.7);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>viewer.dragging&&!$('shell').classList.contains('idle')),true);
  await touch('touchCancel');await page.evaluate(()=>viewer.pause());
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
 // Narrow embedded players also get a viewport-sized sheet, even below the fold.
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.viewer=document.querySelector('demuxe-player');await viewer.ready;window.$=id=>viewer.shadowRoot.getElementById(id);});
 await page.locator('demuxe-player').first().locator('#settings-toggle').click();
 assert.equal(await page.evaluate(()=>{const r=$('settings').getBoundingClientRect();return $('settings').matches(':modal')&&r.top>=0&&r.bottom<=innerHeight+1&&r.height>viewer.getBoundingClientRect().height;}),true);
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>$('settings').contains(viewer.shadowRoot.activeElement)),true);
 await page.evaluate(()=>viewer.destroy());
 assert.equal(await page.evaluate(()=>!document.querySelector(':modal')&&!$('settings').open),true);
 assert.deepEqual(errors,[]);
 console.log(`PASS ${family}: embedded modal focus and teardown; screenshots ${out}`);
 report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{
 try{if(browser)await closeTestBrowser(browser,family);}catch(error){report.passed=false;report.cleanupError=String(error.stack);process.exitCode=1;}
 finally{server?.kill();try{await installed?.cleanup();}catch(error){report.passed=false;report.cleanupError=String(error.stack);process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log('Mobile player report: '+out);}}
}
if(report.error)console.error(report.error);
