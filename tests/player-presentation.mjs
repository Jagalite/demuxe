// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const family=process.env.BROWSER||'chrome';
if(!['chrome','chromium','firefox','webkit'].includes(family))throw Error(`Unsupported BROWSER: ${family}`);
const out=`results/player-presentation/${family}-${new Date().toISOString().replaceAll(':','-')}`;console.log(out);await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
let browser;const checks=[];
try{
 browser=await(family==='firefox'?firefox:family==='webkit'?webkit:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
 const page=await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 const check=async(name,fn)=>{try{await fn();checks.push({name,passed:true});console.log('PASS',name);}catch(error){const diagnostic=await page.evaluate(()=>({host:document.querySelector('#viewer')?.outerHTML,shadow:document.querySelector('#viewer')?.shadowRoot?.innerHTML})).catch(()=>null);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});checks.push({name,passed:false,error:String(error.stack),pageErrors:[...errors],diagnostic});process.exitCode=1;}finally{await writeFile(`${out}/result.json`,JSON.stringify({browser:browser.version(),checks},null,2));}};
 await page.goto(origin+'/examples/player-presentation.html');
 await page.evaluate(async()=>{window.viewer=document.querySelector('demuxe-player');window.core=await viewer.ready;window.$=id=>viewer.shadowRoot.getElementById(id);});
 await check('independent defaults, validation and pre-upgrade attributes',async()=>{
  assert.deepEqual(await page.evaluate(async()=>{const plain=document.createElement('demuxe-player');document.body.append(plain);await plain.ready;const defaults=[plain.layout,plain.theme];await plain.destroy();plain.remove();let rejected=0;for(const [key,value] of [['layout','bad'],['theme','bad']])try{viewer[key]=value;}catch(error){if(error.code==='INVALID_ARGUMENT')rejected++;}return {defaults,rejected,configured:[viewer.layout,viewer.theme],parent:$('transport').parentElement.id};}),{defaults:['classic','demuxe'],rejected:2,configured:['modern','demuxe'],parent:'control-row'});
 });
 await check('empty modern player retains source, settings and diagnostics access',async()=>{
  await page.locator('#viewer #open-menu').click();
  assert.equal(await page.locator('#viewer #url').isVisible(),true);
  await page.keyboard.press('Escape');
  await page.locator('#viewer #settings-toggle').click();
  assert.equal(await page.locator('#viewer #speed').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>$('utility-actions').parentElement.id),'topbar');
 });
 await page.evaluate(async()=>{await viewer.open(location.origin+'/fixtures/example.mp4');await core.seek(3);await core.setVolume(.45);await core.setPlaybackRate(1.25);window.nodes=Object.fromEntries(['surface','play','timeline','settings','volume','utility-actions'].map(id=>[id,$(id)]));window.snapshot=core.state;window.opens=0;viewer.addEventListener('sourcechange',()=>opens++);});
 await check('switching preserves paused state, routing, tracks, source and every component node',async()=>{
  assert.deepEqual(await page.evaluate(()=>{window.snapshot=core.state;for(let n=0;n<12;n++){viewer.layout=['classic','modern','playground'][n%3];viewer.theme=n%3?'demuxe':'light';}const state=core.state;return {same:viewer.player===core,nodes:Object.entries(nodes).every(([id,node])=>$(id)===node),state:state===snapshot,opens,route:state.activeMode===snapshot.activeMode,source:state.sourceId===snapshot.sourceId};}),{same:true,nodes:true,state:true,opens:0,route:true,source:true});
 });
 await check('menu, focus, edited form and controls-off behavior survive reparenting',async()=>{
  assert.deepEqual(await page.evaluate(()=>{$('settings-toggle').click();$('speed').focus();viewer.layout='classic';viewer.theme='light';const menu=!$('settings').hidden,focus=viewer.shadowRoot.activeElement.id;$('settings-close').click();$('fullscreen').focus();viewer.layout='modern';const movedFocus=viewer.shadowRoot.activeElement.id;viewer.controls=false;const evacuated=viewer.shadowRoot.activeElement.id,hidden=$('controls').hidden;viewer.controls=true;return {menu,focus,movedFocus,evacuated,hidden};}),{menu:true,focus:'speed',movedFocus:'fullscreen',evacuated:'stage',hidden:true});
 });
 await check('theme changes do not recompose DOM; host tokens override both palettes',async()=>{
  assert.deepEqual(await page.evaluate(async()=>{let mutations=0;const observer=new MutationObserver(records=>{mutations+=records.filter(r=>r.type==='childList').length;});observer.observe(viewer.shadowRoot,{subtree:true,childList:true});viewer.theme='demuxe';viewer.theme='light';await Promise.resolve();observer.disconnect();viewer.style.setProperty('--demuxe-accent','rgb(120, 20, 70)');const color=getComputedStyle(viewer).getPropertyValue('--demuxe-accent');viewer.style.removeProperty('--demuxe-accent');return {mutations,color};}),{mutations:0,color:'rgb(120, 20, 70)'});
 });
 await check('appearance settings drive layout and theme independently without closing the panel',async()=>{
  await page.locator('#viewer #settings-toggle').click();
  await page.locator('#viewer #layout-select').selectOption('classic');
  await page.locator('#viewer #theme-select').selectOption('light');
  await page.locator('#viewer #layout-select').selectOption('modern');
  assert.deepEqual(await page.evaluate(()=>({layout:viewer.layout,theme:viewer.theme,open:!$('settings').hidden,same:viewer.player===core})),{layout:'modern',theme:'light',open:true,same:true});
  await page.keyboard.press('Escape');
 });
 await check('active playback continues across presentation switches without opening a source',async()=>{
  await page.evaluate(async()=>{await core.play();window.before=core.state.currentTime;viewer.layout='classic';viewer.theme='demuxe';viewer.layout='playground';viewer.layout='modern';});
  await page.waitForFunction(()=>core.state.currentTime>before+.2);
  assert.equal(await page.evaluate(()=>core.state.playbackIntent==='play'&&core.state.sourceId===snapshot.sourceId&&opens===0),true);
  await page.evaluate(()=>core.pause());
 });
 await check('same seek, volume, menu and keyboard actions in all compositions',async()=>{
  for(const layout of ['classic','modern','playground']){
   await page.evaluate(layout=>{viewer.layout=layout;$('stage').focus();},layout);
   await page.keyboard.press('m');await page.waitForFunction(()=>core.state.muted);
   await page.keyboard.press('m');await page.waitForFunction(()=>!core.state.muted);
   await page.keyboard.press('5');await page.waitForFunction(()=>!core.state.pendingOperation&&core.state.currentTime>5);
   await page.locator('#viewer #settings-toggle').click();await page.locator('#viewer #speed').selectOption('1.5');await page.waitForFunction(()=>core.state.playbackRate===1.5);
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>viewer.shadowRoot.activeElement.id),'settings-toggle');
   await page.evaluate(()=>{$('timeline').value='2';$('timeline').dispatchEvent(new Event('input'));$('timeline').dispatchEvent(new Event('change'));});
   await page.waitForFunction(()=>!core.state.pendingOperation&&Math.abs(core.state.currentTime-2)<.2);
  }
 });
 await check('layout and theme pairs fit desktop and 400px embeds with accessible controls',async()=>{
  for(const width of [1050,400])for(const layout of ['classic','modern','playground'])for(const theme of ['demuxe','light']){
   await page.evaluate(({width,layout,theme})=>{viewer.style.maxWidth=`${width}px`;viewer.layout=layout;viewer.theme=theme;$('stage').focus();}, {width,layout,theme});
   const bounds=await page.evaluate(()=>{const shell=$('shell').getBoundingClientRect();return ['play','timeline','mute','volume','settings-toggle','fullscreen','time','duration'].map(id=>{const r=$(id).getBoundingClientRect();return {id,inside:r.left>=shell.left&&r.right<=shell.right&&r.top>=shell.top&&r.bottom<=shell.bottom,width:r.width};});});
   assert.ok(bounds.every(b=>b.inside&&b.width>0),JSON.stringify({width,layout,theme,bounds}));
   const tree=await page.locator('#viewer').ariaSnapshot();assert.match(tree,/slider "Playback position"/);assert.match(tree,/button "Playback settings"/);
   await page.locator('#viewer').screenshot({path:`${out}/${layout}-${theme}-${width}.png`});
  }
 });
 await check('playground frames the stage and keeps controls usable during idle playback',async()=>{
  await page.locator('#viewer #settings-toggle').click();
  await page.locator('#viewer #layout-select').selectOption('playground');
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>{const stage=$('stage').getBoundingClientRect(),header=$('topbar').getBoundingClientRect(),controls=$('controls').getBoundingClientRect();$('shell').classList.add('idle');return {layout:viewer.layout,header:header.bottom<=stage.top,controls:controls.top>=stage.bottom,visible:getComputedStyle($('controls')).opacity,playVisible:getComputedStyle($('play')).opacity,interactive:getComputedStyle($('play')).pointerEvents,core:viewer.player===core};}),{layout:'playground',header:true,controls:true,visible:'1',playVisible:'1',interactive:'auto',core:true});
  await page.locator('#viewer #play').click();
  await page.waitForFunction(()=>core.state.playbackIntent==='play');
  await page.locator('#viewer #play').click();
  await page.waitForFunction(()=>core.state.playbackIntent==='pause'&&core.state.status==='paused');
  await page.mouse.move(0,0);
 });
 await check('narrow embeds keep all dock controls inside with long timing labels',async()=>{
  for(const layout of ['playground','modern'])for(const width of [320,360,400]){
   await page.evaluate(({width,layout})=>{viewer.layout=layout;viewer.style.maxWidth=`${width}px`;$('stage').focus();$('time').textContent='12:34:56';$('duration').textContent='23:59:59';},{width,layout});
   const overflow=await page.evaluate(()=>{const shell=$('shell').getBoundingClientRect();return ['back','play','forward','mute','volume','utility-actions','time','duration'].filter(id=>{const r=$(id).getBoundingClientRect();return r.left<shell.left||r.right>shell.right;});});
   assert.deepEqual(overflow,[],`overflow at ${width}px`);
   await page.locator("#viewer").screenshot({path:`${out}/${layout}-long-time-${width}.png`});
  }
  await page.evaluate(()=>{viewer.style.maxWidth='400px';viewer.update(core.state);});
 });
 await check('modern idle seeking reveals timing only; keyboard focus reveals chrome',async()=>{
  await page.evaluate(async()=>{viewer.layout='modern';viewer.theme='demuxe';await core.seek(2);$('stage').focus();});
  const stage=page.locator('#viewer #stage');
  await stage.dispatchEvent('pointermove',{pointerType:'mouse'});
  await stage.dispatchEvent('pointerdown',{pointerType:'touch'});await stage.dispatchEvent('click');
  assert.equal(await page.evaluate(()=>$('shell').classList.contains('idle')),true);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>!core.state.pendingOperation&&$('shell').classList.contains('seek-preview'));
  assert.equal(await page.evaluate(()=>getComputedStyle($('utility-actions')).opacity==='0'&&getComputedStyle($('controls')).opacity==='1'),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>$('shell').classList.contains('idle')),false);
 });
 await check('Tab can reveal hidden modern controls when the timeline is unavailable',async()=>{
  await page.evaluate(()=>{$('stage').focus();$('timeline').disabled=true;$('back').disabled=true;$('forward').disabled=true;});
  await page.locator('#viewer #stage').dispatchEvent('pointerdown',{pointerType:'touch'});
  await page.locator('#viewer #stage').dispatchEvent('click');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>$('shell').classList.contains('idle')),false);
  // macOS WebKit uses Option+Tab to include native buttons in keyboard navigation.
  const nextControl=family==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab';
  if(nextControl==='Alt+Tab'){await page.evaluate(()=>$('stage').focus());await page.keyboard.press(nextControl);}
  // Firefox can visit the native media surface before the shared controls.
  for(let n=0;n<3&&await page.evaluate(()=>viewer.shadowRoot.activeElement?.id!=='play');n++)await page.keyboard.press(nextControl);
  assert.equal(await page.evaluate(()=>viewer.shadowRoot.activeElement?.id),'play');
  await page.evaluate(()=>viewer.update(core.state));
 });
 await check('modern previews remain independent of playback and dismiss on layout changes',async()=>{
  await page.evaluate(()=>{viewer.update(core.state);$('stage').focus();window.previewPosition=core.state.currentTime;});
  const rect=await page.locator('#viewer #timeline').boundingBox();
  await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height/2);
  await page.locator('#viewer #thumbnail-preview').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>core.state.currentTime===previewPosition),true);
  assert.equal(await page.evaluate(()=>{viewer.layout='classic';return $('thumbnail-preview').hidden&&$('thumbnail-image').getAttribute('src')===null;}),true);
 });
 await check('queue navigation and locked selectors survive all layouts',async()=>{
  await page.evaluate(async()=>{const file=new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'queued.mp4');const transfer=new DataTransfer();transfer.items.add(file);transfer.items.add(file);$('file').files=transfer.files;$('file').dispatchEvent(new Event('change'));});
  assert.equal(await page.evaluate(()=>$('queue-count').textContent),'1 / 3');
  for(const layout of ['classic','modern','playground']){
   assert.deepEqual(await page.evaluate(layout=>{viewer.layout=layout;const state=core.state;viewer.update({...state,trackPolicy:{audio:{locked:true},subtitles:{locked:true}}});const disabled=$('audio').disabled&&$('subtitles').disabled&&$('subtitleFile').disabled;viewer.update(state);return {disabled,count:$('queue-count').textContent,next:$('next-file').disabled};},layout),{disabled:true,count:'1 / 3',next:false});
  }
  await page.locator('#viewer #next-file').click();await page.waitForFunction(()=>!core.state.pendingOperation&&$('queue-count').textContent==='2 / 3');
  assert.equal(await page.evaluate(()=>core.state.playbackIntent),'pause');
 });
 await check('fullscreen switch retains target and controls; diagnostic details remain available',async()=>{
  await page.locator('#viewer #fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===viewer);
  await page.evaluate(()=>{viewer.layout='classic';viewer.theme='demuxe';viewer.layout='modern';$('diagnostics-toggle').click();});
  assert.equal(await page.evaluate(()=>document.fullscreenElement===viewer&&!$('diagnostics-overlay').hidden&&$('diagnostics-overlay').textContent.includes('Engine')),true);
  await page.evaluate(()=>document.exitFullscreen());
 });
 await check('compact fullscreen does not inherit the embedded minimum stage height',async()=>{
  await page.setViewportSize({width:600,height:280});
  await page.locator('#viewer #fullscreen').click();
  await page.waitForFunction(()=>document.fullscreenElement===viewer);
  const sizes=await page.evaluate(()=>({stage:$('stage').getBoundingClientRect().height,shell:$('shell').getBoundingClientRect().height}));
  assert.ok(sizes.stage<=sizes.shell,JSON.stringify(sizes));
  await page.locator("#viewer").screenshot({path:`${out}/modern-compact-fullscreen.png`});
  await page.evaluate(()=>document.exitFullscreen());await page.setViewportSize({width:1200,height:1000});
 });
 await check('playground fullscreen reserves space for header and transport',async()=>{
  await page.evaluate(()=>{viewer.layout='playground';});
  await page.locator('#viewer #fullscreen').click();
  await page.waitForFunction(()=>document.fullscreenElement===viewer);
  assert.equal(await page.evaluate(()=>{const stage=$('stage').getBoundingClientRect(),bar=$('controls').getBoundingClientRect(),shell=$('shell').getBoundingClientRect();return stage.bottom<=bar.top&&bar.bottom<=shell.bottom&&stage.height>0;}),true);
  await page.locator('#viewer').screenshot({path:`${out}/playground-fullscreen.png`});
  await page.evaluate(async()=>{await document.exitFullscreen();viewer.layout='modern';});
 });
 await check('modern reduced-motion and forced-color controls retain native semantics',async()=>{
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>getComputedStyle($('play')).transitionDuration),'0s');
  assert.equal(await page.locator('#viewer #timeline').getAttribute('type'),'range');
  await page.locator('#viewer').screenshot({path:`${out}/modern-forced-colors.png`});
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
 });
 await check('touch embed keeps action targets usable and screen taps preserve playback intent',async()=>{
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,...(family==='chrome'?{isMobile:true}:{})});
  try{
   const mobile=await touch.newPage();await mobile.goto(origin+'/examples/player-presentation.html');
   await mobile.evaluate(async()=>{window.v=document.querySelector('demuxe-player');await v.ready;await v.open(location.origin+'/fixtures/example.mp4');});
   const targets=await mobile.evaluate(()=>['play','back','forward','mute','settings-toggle','fullscreen'].map(id=>{const r=v.shadowRoot.getElementById(id).getBoundingClientRect();return {id,width:r.width,height:r.height};}));
   assert.ok(targets.every(r=>r.width>=44&&r.height>=44),JSON.stringify(targets));
   const stage=mobile.locator('#viewer #stage');await stage.tap({position:{x:20,y:90}});
   assert.equal(await mobile.evaluate(()=>v.player.state.playbackIntent),'pause');
   await stage.tap({position:{x:20,y:90}});
   assert.equal(await mobile.evaluate(()=>v.shadowRoot.getElementById('shell').classList.contains('idle')),false);
   await mobile.evaluate(()=>v.destroy());
  }finally{await touch.close();}
 });
 await check('close restores empty-state utilities in modern',async()=>{
  await page.evaluate(async()=>{viewer.layout='modern';await viewer.close();});
  assert.equal(await page.locator('#viewer #open-menu').isVisible(),true);
  assert.equal(await page.evaluate(()=>$('utility-actions').parentElement.id),'topbar');
 });
 await check('invalid attributes use defaults and teardown releases playback',async()=>{
  assert.deepEqual(await page.evaluate(async()=>{viewer.setAttribute('layout','unknown');viewer.setAttribute('theme','unknown');const values=[viewer.layout,viewer.theme,$('shell').dataset.layout];await viewer.destroy();return {values,destroyed:core.isDestroyed};}),{values:['classic','demuxe','classic'],destroyed:true});
  assert.deepEqual(errors,[]);
 });
 await writeFile(`${out}/result.json`,JSON.stringify({browser:browser.version(),checks},null,2));
}finally{
 try{if(browser){const browserCleanup=await closeTestBrowser(browser,family);await writeFile(`${out}/result.json`,JSON.stringify({browser:browser.version(),runtimeRoot:process.env.DEMUXE_RUNTIME_ROOT??'.',checks,browserCleanup},null,2));}}
 finally{server.kill();}
}
