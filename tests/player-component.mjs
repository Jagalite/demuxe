import {chromium,firefox} from 'playwright';import {spawn} from 'node:child_process';import {mkdir,writeFile,readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const family=process.env.BROWSER||'chrome',out=`results/player-component/${family}-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});console.log(out);
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',d=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(d));if(m)resolve(m[0]);});});
const browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const result={family,browser:browser.version(),checks:[],hashes:{},screenReader:'Semantic accessibility tree and keyboard checks; no physical screen-reader session'};for(const p of ['src/player/index.ts','src/player/styles.ts','src/unified-player.ts','tests/player-component.mjs'])result.hashes[p]=createHash('sha256').update(await readFile(p)).digest('hex');
async function check(name,fn){try{await fn();result.checks.push({name,passed:true});console.log('PASS',name);}catch(e){result.checks.push({name,passed:false,error:String(e.stack)});console.log('FAIL',name,String(e));process.exitCode=1;}await writeFile(out+'/result.json',JSON.stringify(result,null,2));}
try{await page.goto(origin+'/examples/player-element.html');await page.evaluate(async()=>{window.a=document.querySelectorAll('deplexr-player')[0];window.b=document.querySelectorAll('deplexr-player')[1];await Promise.all([a.ready,b.ready]);});
await check('two idle instances, lazy engines and idempotent registration',async()=>{const d=await page.evaluate(async()=>{const m=await import('/web/generated/player/index.js');m.definePlayerElement();m.definePlayerElement();return {same:a.player===await a.ready,different:a.player!==b.player,requests:performance.getEntriesByType('resource').filter(e=>/\.wasm|engine-worker/.test(e.name)).length,shadow:a.shadowRoot.mode};});assert.deepEqual(d,{same:true,different:true,requests:0,shadow:'open'});assert.equal(page.workers().length,0);});
await check('custom titles update live as plain text with explicit policies',async()=>{
 const data=await page.evaluate(()=>{
   const title=a.shadowRoot.getElementById('title');
   a.setAttribute('title','Movie Night <b>🎬</b>');const attribute=title.textContent;
   a.title='A different movie — 日本語';const property=title.textContent;
   a.titleMode='none';const hidden=title.hidden;
   a.titleMode='custom';const custom=title.textContent;
   a.title='';const empty=title.hidden;
   a.titleMode='auto';
   return {attribute,property,hidden,custom,empty,children:title.children.length,mode:a.titleMode};
 });
 assert.deepEqual(data,{attribute:'Movie Night <b>🎬</b>',property:'A different movie — 日本語',hidden:true,custom:'A different movie — 日本語',empty:true,children:0,mode:'auto'});
});
await check('source titles use filenames, redact URL metadata and honor custom precedence',async()=>{
 await page.route('**/movies/**',route=>route.continue({url:origin+'/fixtures/example.mp4'}));
 const data=await page.evaluate(async()=>{
   const title=()=>a.shadowRoot.getElementById('title').textContent;
   await a.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'Local movie 🎬.mp4'));const file=title();
   a.title='My Movie';const precedence=title();a.titleMode='source';const source=title();
   await a.open(location.origin+'/movies/My%20Movie.mp4?token=SECRET#PRIVATE');const url=title();
   await a.open(new URL(location.origin+'/movies/object.mp4?auth=SECRET#PRIVATE'));const urlObject=title();
   await a.open({url:location.origin+'/movies/descriptor.mp4?token=SECRET'});const descriptor=title();
   await a.open(location.origin+'/movies/');const directory=title();
   a.titleMode='custom';const custom=title();a.title='';a.titleMode='auto';
   await a.close();return {file,precedence,source,url,urlObject,descriptor,directory,custom,closed:title()};
 });assert.deepEqual(data,{file:'Local movie 🎬.mp4',precedence:'My Movie',source:'Local movie 🎬.mp4',url:'My Movie.mp4',urlObject:'object.mp4',descriptor:'descriptor.mp4',directory:'',custom:'My Movie',closed:''});
 await page.unroute('**/movies/**');
});
await check('unnamed and opaque sources do not expose a generated or stale title',async()=>{
 const data=await page.evaluate(async()=>{
   const bytes=await(await fetch('/fixtures/example.mp4')).arrayBuffer();
   await a.open(bytes);const buffer=a.shadowRoot.getElementById('title').textContent;
   const url=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));
   try{await a.open(url).catch(()=>{});return {buffer,blob:a.shadowRoot.getElementById('title').textContent};}
   finally{await a.close();URL.revokeObjectURL(url);}
 });assert.deepEqual(data,{buffer:'',blob:''});
});
await check('source picker describes accepted media independently of the native file input',async()=>{
 const v=page.locator('deplexr-player').first();
 await page.evaluate(async()=>{await a.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'Loaded movie.mp4'));a.title='Custom title';a.titleMode='none';});
 await v.locator('#open-menu').click();
 assert.equal(await v.locator('#current-source').textContent(),'Loaded movie.mp4');
 assert.equal(await v.locator('#file').inputValue(),'');
 assert.ok(await v.locator('#file').evaluate(el=>el.hidden));
 const chooser=page.waitForEvent('filechooser');await v.locator('#choose-file').click();await(await chooser).setFiles('fixtures/example.mp4');
 await page.waitForFunction(()=>a.shadowRoot.getElementById('queue-count').textContent==='1 / 2');
 assert.equal(await v.locator('#current-source').textContent(),'Loaded movie.mp4');
 await v.locator('#open-menu').click();
 const again=page.waitForEvent('filechooser');await v.locator('#choose-file').click();await(await again).setFiles('fixtures/example.mp4');
 await page.waitForFunction(()=>a.shadowRoot.getElementById('queue-count').textContent==='1 / 3');
 await v.locator('#open-menu').click();await v.locator('.queue-item').last().click();
 await page.waitForFunction(()=>a.shadowRoot.getElementById('current-source').textContent==='example.mp4'&&!a.queueOperation);
 await page.evaluate(async()=>{await a.close();a.title='';a.titleMode='auto';});
 assert.equal(await v.locator('#current-source').textContent(),'No media loaded');
});
await check('disabled source controls close their menu, block handlers and allow programmatic open',async()=>{
 const data=await page.evaluate(async()=>{
   const $=id=>a.shadowRoot.getElementById(id);
   $('open-menu').click();$('url').focus();a.showSourceControls=false;
   const disabled=['open-menu','open','choose-file','file','subtitleFile','url','format','live','url-submit'].every(id=>$(id).disabled);
   const closed=$('settings').hidden,focus=a.shadowRoot.activeElement.id;
   let calls=0;const open=a.open,subtitle=a.addSubtitle;
   a.open=async()=>{calls++;};a.addSubtitle=async()=>{calls++;};
   try {
     $('open-menu').dispatchEvent(new MouseEvent('click'));
     $('remote').dispatchEvent(new Event('submit',{cancelable:true}));
     const transfer=new DataTransfer();transfer.items.add(new File(['data'],'ignored.mp4'));
     for(const id of ['file','subtitleFile']){$(id).files=transfer.files;$(id).dispatchEvent(new Event('change'));}
   }finally{a.open=open;a.addSubtitle=subtitle;}
   await a.open(location.origin+'/fixtures/example.mp4');
   const result={disabled,closed,focus,calls,menu:$('settings').hidden,folder:$('open-menu').hidden,empty:$('empty').hidden,opened:!!a.player.state.sourceId,transport:!$('transport').hidden};
   a.showSourceControls=true;await a.close();return result;
 });assert.deepEqual(data,{disabled:true,closed:true,focus:'stage',calls:0,menu:true,folder:true,empty:true,opened:true,transport:true});
});
await check('disabled diagnostics close the overlay and restore focus without disabling core diagnostics',async()=>{
 const data=await page.evaluate(()=>{
   const $=id=>a.shadowRoot.getElementById(id);$('diagnostics-toggle').click();$('diagnostics-overlay').focus();a.showDiagnostics=false;
   const focus=a.shadowRoot.activeElement.id;$('diagnostics-toggle').dispatchEvent(new MouseEvent('click'));
   const result={focus,hidden:$('diagnostics-toggle').hidden,disabled:$('diagnostics-toggle').disabled,overlay:$('diagnostics-overlay').hidden,core:!!a.player.diagnostics};
   a.showDiagnostics=true;return result;
 });assert.deepEqual(data,{focus:'stage',hidden:true,disabled:true,overlay:true,core:true});
});
await check('file drop opt-out preserves browser defaults and is independent of source controls',async()=>{
 const data=await page.evaluate(async()=>{
   const dt=new DataTransfer();dt.items.add(new File(['data'],'drop.mp4'));let calls=0;const add=a.addFiles;
   a.addFiles=()=>{calls++;};a.allowFileDrop=false;
   const send=type=>{const event=new DragEvent(type,{dataTransfer:dt,bubbles:true,cancelable:true});a.dispatchEvent(event);return event.defaultPrevented;};
   try {const disabled=[send('dragover'),send('drop'),calls];a.allowFileDrop=true;a.showSourceControls=false;const enabled=[send('dragover'),send('drop'),calls];return {disabled,enabled};}
   finally {a.addFiles=add;a.showSourceControls=true;a.allowFileDrop=true;}
 });assert.deepEqual(data,{disabled:[false,false,0],enabled:[true,true,1]});
});
await check('custom seek step changes actual seeking, labels and numerals',async()=>{
 await page.evaluate(async()=>{await a.open(location.origin+'/fixtures/example.mp4');a.seekStep=2.5;});
 const v=page.locator('deplexr-player').first();
 assert.equal(await v.locator('#forward').getAttribute('aria-label'),'Seek forward 2.5 seconds');
 assert.equal(await v.locator('#back text').textContent(),'2.5');
 await v.locator('#forward').click();await page.waitForFunction(()=>!a.player.state.pendingOperation&&Math.abs(a.player.state.currentTime-2.5)<.2);
 await v.locator('#back').click();await page.waitForFunction(()=>!a.player.state.pendingOperation&&a.player.state.currentTime<.2);
 await page.evaluate(()=>{a.seekStep=10;});
});
await check('live seek and label updates preserve the active menu and its accessible name',async()=>{
 const v=page.locator('deplexr-player').first();
 for(const [trigger,section,label] of [['open-menu','source-options','Open media'],['settings-toggle','playback-options','Playback settings']]){
   await v.locator('#'+trigger).click();
   await v.locator('#settings-close').focus();
   await v.evaluate(el=>{el.seekStep=5;});
   assert.equal(await v.locator('#settings-title').textContent(),label);
   assert.ok(await v.locator('#'+section).isVisible());
   assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'settings-close');
   assert.equal(await v.locator('#'+trigger).getAttribute('aria-expanded'),'true');
   await v.evaluate(el=>{el.labels={open:'Choose media',settings:'Playback options'};});
   assert.equal(await v.locator('#settings-title').textContent(),trigger==='open-menu'?'Choose media':'Playback options');
   await page.keyboard.press('Escape');
   assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),trigger);
   await v.evaluate(el=>{el.labels={};el.seekStep=10;});
 }
});
await check('configuration updates cannot revive a terminally destroyed player',async()=>{
 const data=await page.evaluate(async()=>{
   const el=document.createElement('deplexr-player');el.controls=true;document.body.append(el);await el.ready;
   await el.destroy();
   const hidden=()=>['empty','topbar','controls','transport','settings','diagnostics-overlay'].every(id=>el.shadowRoot.getElementById(id).hidden);
   const states=[hidden()];
   for(const value of [false,true]){
     el.showDiagnostics=value;states.push(hidden());
     el.showSourceControls=value;states.push(hidden());
     el.controls=value;el.title='Updated';el.titleMode='source';states.push(hidden());
   }
   const code=await el.open(location.origin+'/fixtures/example.mp4').catch(error=>error.code);
   el.remove();document.body.append(el);await new Promise(resolve=>setTimeout(resolve,0));
   const result={states,code,core:!!el.player,hidden:hidden()};el.remove();return result;
 });
 assert.ok(data.states.every(Boolean));assert.equal(data.code,'ABORTED');assert.equal(data.core,false);assert.ok(data.hidden);
});
await check('custom auto-hide delay and zero opt-out apply live',async()=>{
 await page.evaluate(async()=>{a.controlsAutoHideDelay=180;await a.play();a.shadowRoot.activeElement?.blur();a.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse'}));});
 await page.waitForFunction(()=>a.shadowRoot.getElementById('shell').classList.contains('idle'),null,{timeout:1500});
 await page.evaluate(()=>{a.controlsAutoHideDelay=0;});
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>a.shadowRoot.getElementById('shell').classList.contains('idle')),false);
 await page.evaluate(async()=>{await a.pause();a.controlsAutoHideDelay=2800;await a.close();});
});
await check('stable parts, light theme and long titles preserve embedded layout',async()=>{
 const data=await page.evaluate(()=>{
   const parts=[...a.shadowRoot.querySelectorAll('[part]')].flatMap(el=>el.part.value.split(' '));
   a.style.cssText='width:320px;--deplexr-background:#ffffff;--deplexr-stage-background:#eeeeee;--deplexr-foreground:#111111;--deplexr-muted-foreground:#555555;--deplexr-panel-background:#fafafa;--deplexr-control-background:#dddddd;--deplexr-overlay-background:#ffffffcc;color-scheme:light';
   a.title='Very long custom title '.repeat(40);
   const $=id=>a.shadowRoot.getElementById(id);$('settings-toggle').click();
   const style=getComputedStyle($('settings')),stage=getComputedStyle($('stage'));
   const title=$('title').getBoundingClientRect(),folder=$('diagnostics-toggle').getBoundingClientRect();
   const result={parts,background:style.backgroundColor,color:style.color,stage:stage.backgroundColor,bounded:title.right<=folder.left,overflow:a.scrollWidth>a.clientWidth};
   $('settings-close').click();a.title='';a.removeAttribute('style');return result;
 });
 for(const part of ['container','stage','controls','settings','error','status','title','topbar','transport','timeline','volume'])assert.ok(data.parts.includes(part),part);
 assert.equal(data.background,'rgb(250, 250, 250)');assert.equal(data.color,'rgb(17, 17, 17)');assert.equal(data.stage,'rgb(238, 238, 238)');assert.ok(data.bounded);assert.equal(data.overflow,false);
});
await check('same public core and independent playback',async()=>{await page.evaluate(async()=>{const file=new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'example.mp4');await a.open(file);await b.open(file);window.events=[];a.addEventListener('sourcechange',e=>events.push(e.detail));});await page.locator('deplexr-player').first().getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>a.player.state.status==='playing'&&a.player.state.currentTime>.3);assert.equal(await page.evaluate(()=>b.player.state.status),'paused');await page.evaluate(()=>a.pause());});
await check('keyboard shortcuts scoped and focused controls retain native behavior',async()=>{const a=page.locator('deplexr-player').first();await a.locator('#stage').focus();await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.playbackIntent==='play');assert.equal(await page.evaluate(()=>b.player.state.playbackIntent),'pause');await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='paused');await a.locator('#timeline').focus();const before=await page.evaluate(()=>a.player.state.currentTime);await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);assert.ok((await page.evaluate(()=>a.player.state.currentTime))-before<1);});
await check('hidden controls retain shortcuts and button focus allows playback keys',async()=>{
 const v=page.locator('deplexr-player').first();await v.locator('#stage').click({position:{x:30,y:100}});assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')));
 await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='playing');await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='paused');assert.equal(await page.evaluate(()=>b.player.state.status),'paused');
 await v.locator('#play').click();await page.waitForFunction(()=>a.player.state.status==='playing');await page.keyboard.press('m');await page.waitForFunction(()=>a.player.state.muted);await page.keyboard.press('m');await page.waitForFunction(()=>!a.player.state.muted);
 await page.evaluate(()=>a.pause());await v.locator('#stage').click({position:{x:30,y:100}});await v.dispatchEvent('pointermove',{pointerType:'mouse'});await v.locator('#play').click();await page.waitForFunction(()=>a.player.state.status==='playing');await page.waitForTimeout(3100);assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')),JSON.stringify(await v.evaluate(el=>({status:el.player.state.status,focus:el.shadowRoot.activeElement?.id,visible:el.shadowRoot.activeElement?.matches(':focus-visible')}))));assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');await page.keyboard.press('Space');await page.waitForFunction(()=>a.player.state.status==='paused');
 await v.locator('#open-menu').click();await v.locator('#url').fill('https://example.com/');await page.keyboard.type('km');assert.equal(await v.locator('#url').inputValue(),'https://example.com/km');assert.equal(await page.evaluate(()=>a.player.state.status),'paused');await page.keyboard.press('Escape');
});
await check('mouse exit hides controls only while playing without stealing outside focus',async()=>{
 const v=page.locator('deplexr-player').first(),idle=()=>v.locator('#shell').evaluate(el=>el.classList.contains('idle'));
 await page.evaluate(()=>a.pause());
 for(const playing of [false,true]){
   if(playing)await page.evaluate(()=>a.play());
   await v.dispatchEvent('pointermove',{pointerType:'mouse'});
   await v.evaluate(el=>el.shadowRoot.activeElement?.blur());
   await v.dispatchEvent('pointerleave',{pointerType:'mouse'});
   assert.equal(await idle(),playing);
   await page.locator('body').evaluate(el=>{el.tabIndex=-1;el.focus();});
   assert.equal(await idle(),playing);
   await v.dispatchEvent('pointermove',{pointerType:'mouse'});assert.equal(await idle(),false);
 }
 await page.evaluate(()=>a.pause());
 await v.locator('#open-menu').click();await v.dispatchEvent('pointerleave',{pointerType:'mouse'});assert.equal(await idle(),false);
 await page.keyboard.press('Escape');await v.locator('#stage').focus();await page.keyboard.press('Tab');
 await v.dispatchEvent('pointerleave',{pointerType:'mouse'});assert.equal(await idle(),false);
 await v.evaluate(el=>el.shadowRoot.activeElement?.blur());
 await v.dispatchEvent('pointerleave',{pointerType:'touch'});assert.equal(await idle(),false);
});
await check('paused screen and gaps between transport buttons toggle the UI',async()=>{
 const v=page.locator('deplexr-player').first();await page.evaluate(()=>a.pause());await v.dispatchEvent('pointermove',{pointerType:'mouse'});
 const transport=await v.locator('#transport').boundingBox(),back=await v.locator('#back').boundingBox(),play=await v.locator('#play').boundingBox();await page.mouse.click((back.x+back.width+play.x)/2,transport.y+transport.height/2);assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')));await page.waitForTimeout(350);assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).opacity),'0');assert.equal(await page.evaluate(()=>a.player.state.status),'paused');
 await v.locator('#stage').dispatchEvent('pointerdown',{pointerType:'touch'});await v.locator('#stage').dispatchEvent('click');assert.equal(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')),false);
 await v.locator('#stage').dispatchEvent('pointerdown',{pointerType:'touch'});await v.locator('#stage').dispatchEvent('click');assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')));await page.keyboard.press('Tab');assert.equal(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')),false);
});
await check('Play hides controls immediately for click, K and Space',async()=>{
 const v=page.locator('deplexr-player').first();for(const key of [null,'k','Space']){await v.locator('#stage').focus();await v.dispatchEvent('pointermove',{pointerType:'mouse'});if(key)await page.keyboard.press(key);else await v.locator('#play').click();await page.waitForFunction(()=>a.player.state.status==='playing'&&a.shadowRoot.getElementById('shell').classList.contains('idle'),{},{timeout:1500});await page.waitForTimeout(350);assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).opacity),'0');assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='paused');assert.equal(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')),false);}
});
await check('late playback updates and held play keys do not reopen controls',async()=>{
 const v=page.locator('deplexr-player').first();await v.locator('#stage').focus();await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='playing'&&a.shadowRoot.getElementById('shell').classList.contains('idle'));
 // Inject notification orderings at the component boundary; the backend keeps playing.
 await v.evaluate(el=>{const state=el.player.state;el.update({...state,status:'buffering'});el.update({...state,status:'playing'});});assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')));
 await v.locator('#stage').dispatchEvent('keydown',{key:'k',repeat:true,bubbles:true,composed:true});assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')));await page.waitForTimeout(400);assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).opacity),'0');await page.keyboard.press('k');await page.waitForFunction(()=>a.player.state.status==='paused');assert.equal(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')),false);
});
await check('hidden seeking briefly reveals only the timeline without a pill',async()=>{
 const v=page.locator('deplexr-player').first();await v.dispatchEvent('pointermove',{pointerType:'mouse'});await v.locator('#stage').click({position:{x:30,y:100}});
 for(const key of ['ArrowRight','ArrowLeft']){await page.keyboard.press(key);await page.waitForFunction(()=>a.player.state.pendingOperation===null);await page.waitForTimeout(300);assert.ok(await v.locator('#shell').evaluate(el=>el.classList.contains('idle')&&el.classList.contains('seek-preview')));await v.locator('#busy').waitFor({state:'hidden',timeout:1000});assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).opacity),'1');assert.equal(await v.locator('.row').evaluate(el=>getComputedStyle(el).visibility),'hidden');assert.equal(await v.locator('#transport').evaluate(el=>getComputedStyle(el).opacity),'0');assert.match(await v.locator('#time').textContent(),/\d+:\d{2}/);}
 await page.waitForFunction(()=>!a.shadowRoot.getElementById('shell').classList.contains('seek-preview'));await page.waitForTimeout(300);assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).opacity),'0');
});
await check('buffering indicator and truthful disjoint timeline ranges',async()=>{
 const v=page.locator('deplexr-player').first();await v.evaluate(el=>{const state=el.player.state;el.update({...state,status:'buffering',playbackIntent:'play',pendingOperation:null,seekable:[{start:10,end:110}],buffered:[{start:10,end:30},{start:60,end:80}]});el.shadowRoot.getElementById('shell').classList.add('idle');});
 assert.ok(await v.locator('#buffering-indicator').isVisible());await v.locator('#busy').waitFor({state:'hidden'});assert.equal(await v.locator('#buffering-indicator').evaluate(el=>getComputedStyle(el).pointerEvents),'none');const gradient=await v.locator('#timeline').evaluate(el=>el.style.getPropertyValue('--buffered'));assert.ok(gradient.includes('0% 20%'));assert.ok(gradient.includes('50% 70%'));
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await v.locator('#buffering-indicator span').evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
 await v.evaluate(el=>el.update({...el.player.state,buffered:null}));await v.locator('#buffering-indicator').waitFor({state:'hidden'});assert.equal(await v.locator('#timeline').evaluate(el=>el.style.getPropertyValue('--buffered')),'linear-gradient(transparent,transparent)');
 await v.evaluate(el=>el.update({...el.player.state,status:'buffering',playbackIntent:'play',pendingOperation:{id:999,kind:'seeking'}}));await v.locator('#buffering-indicator').waitFor({state:'hidden'});await v.locator('#busy').waitFor({state:'hidden'});await v.evaluate(el=>el.update(el.player.state));
});
await check('volume, rate, subtitle and percentage shortcuts use public state',async()=>{const first=page.locator('deplexr-player').first();await first.locator('#stage').focus();await page.keyboard.press('ArrowDown');await page.waitForFunction(()=>a.player.state.volume===.95);await page.keyboard.press('m');await page.waitForFunction(()=>a.player.state.muted);await page.keyboard.press('m');await page.waitForFunction(()=>!a.player.state.muted);await page.keyboard.press(']');await page.waitForFunction(()=>a.player.state.playbackRate===1.25);await page.keyboard.press('c');await page.waitForFunction(()=>!a.player.state.subtitlesVisible);await page.keyboard.press('c');await page.waitForFunction(()=>a.player.state.subtitlesVisible);await page.keyboard.press('5');await page.waitForFunction(()=>a.player.state.pendingOperation===null&&a.player.state.currentTime>5);await page.keyboard.press('Home');await page.waitForFunction(()=>a.player.state.pendingOperation===null&&a.player.state.currentTime<.15);});
await check('timeline previews locally and commits once',async()=>{const d=await page.evaluate(async()=>{let count=0;a.addEventListener('seeking',()=>count++);const input=a.shadowRoot.getElementById('timeline');const before=a.player.state.currentTime;for(const n of [1,2,3]){input.value=String(n);input.dispatchEvent(new Event('input'));}const during=a.player.state.currentTime;input.dispatchEvent(new Event('change'));await new Promise(r=>a.addEventListener('seeked',r,{once:true}));return {count,before,during,time:a.player.state.currentTime};});assert.equal(d.before,d.during);assert.equal(d.count,1);assert.ok(Math.abs(d.time-3)<.15);});
await check('settings focus restoration and accessible controls',async()=>{const a=page.locator('deplexr-player').first();await a.getByRole('button',{name:'Playback settings',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>a.shadowRoot.activeElement.id),'settings-toggle');const tree=await a.ariaSnapshot();assert.match(tree,/button "Play"/);assert.match(tree,/slider "Playback position"/);assert.match(tree,/slider "Volume"/);result.accessibility=tree;});
await check('fullscreen contains controls and keeps settings inside',async()=>{const a=page.locator('deplexr-player').first();await a.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement===a);await a.getByRole('button',{name:'Playback settings',exact:true}).click();assert.ok(await a.locator('#settings').isVisible());await page.keyboard.press('Escape');await page.evaluate(()=>document.fullscreenElement?document.exitFullscreen():undefined);});
await check('synchronous DOM moves keep the same core',async()=>{const d=await page.evaluate(()=>{const core=a.player;a.remove();document.body.append(a);return a.player===core;});assert.ok(d);});
await check('removal releases resources and reconnect waits for cleanup',async()=>{await page.evaluate(async()=>{window.old=a.player;a.remove();await new Promise(r=>setTimeout(r,1));document.body.append(a);await a.ready;});assert.ok(await page.evaluate(()=>a.player!==old));assert.equal(await page.evaluate(()=>a.player.state.status),'idle');assert.equal(await page.evaluate(()=>old.state.status),'idle');assert.equal(await page.evaluate(()=>a.lastSource),undefined);assert.equal(await page.evaluate(()=>a.shadowRoot.getElementById('title').textContent),'');});
await check('src changes cancel stale opens; property reflection and pre-upgrade properties',async()=>{await page.route('**/hung.mp4',()=>{});await page.evaluate(async()=>{a.src=location.origin+'/hung.mp4';await new Promise(r=>setTimeout(r,40));a.src=location.origin+'/fixtures/example.mp4';});await page.waitForFunction(()=>a.player.state.sourceId!==null&&a.player.state.pendingOperation===null);await page.unroute('**/hung.mp4');await page.waitForFunction(()=>a.shadowRoot.getElementById('title').textContent==='example.mp4');await page.evaluate(async()=>{a.muted=true;await new Promise(r=>setTimeout(r,20));});assert.equal(await page.evaluate(()=>a.player.state.muted),true);
 const d=await page.evaluate(async()=>{const m=await import('/web/generated/player/index.js');const pre=document.createElement('future-deplexr');pre.muted=true;pre.controls=true;document.body.append(pre);class Other extends m.DeplexrPlayerElement {}customElements.define('future-deplexr',Other);await pre.ready;const data={muted:pre.player.state.muted,controls:pre.controls};await pre.destroy();pre.remove();return data;});assert.deepEqual(d,{muted:true,controls:true});});
await check('close cancels an open waiting for initial connection',async()=>{const code=await page.evaluate(async()=>{const x=document.createElement('deplexr-player');const pending=x.open(location.origin+'/fixtures/example.mp4').catch(e=>e.code);await x.close();const code=await pending;await x.destroy();return code;});assert.equal(code,'ABORTED');});
await check('terminal destruction before connection settles ready',async()=>{await page.evaluate(()=>b.destroy());assert.equal(await page.evaluate(()=>b.lastSource),undefined);const d=await page.evaluate(async()=>{const x=document.createElement('deplexr-player');const ready=x.ready.catch(e=>e.code);const first=x.destroy(),second=x.destroy();await first;document.body.append(x);return {same:first===second,ready:await ready,core:!!x.player,sourceRetained:x.lastSource!==undefined};});assert.deepEqual(d,{same:true,ready:'ABORTED',core:false,sourceRetained:false});});
await check('mobile, reduced motion, high contrast and no uncaught errors',async()=>{await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.screenshot({path:out+'/mobile-high-contrast.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);});
await check('overlay controls, URL opening, idle reveal and close stay in the component',async()=>{
 await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'none'});await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/');await page.waitForFunction(()=>window.player);
 const viewer=page.locator('deplexr-player');await viewer.locator('#open-menu').click();await page.keyboard.press('Escape');assert.equal(await viewer.evaluate(el=>el.shadowRoot.activeElement.id),'open-menu');
 await viewer.locator('#open-menu').click();await viewer.locator('#url').fill(origin+'/fixtures/example.mp4');await viewer.locator('#url-submit').click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);
 const bounds=await viewer.evaluate(el=>{const r=id=>{const b=el.shadowRoot.getElementById(id).getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right};};return {stage:r('stage'),controls:r('controls'),top:r('topbar')};});assert.ok(bounds.controls.bottom<=bounds.stage.bottom+1&&bounds.controls.top>=bounds.stage.top);assert.ok(bounds.top.top>=bounds.stage.top);
 await page.screenshot({path:out+'/overlay-desktop.png',fullPage:true});
 await viewer.locator('#play').click();await page.evaluate(()=>{document.querySelector('deplexr-player').shadowRoot.activeElement?.blur();});await page.waitForFunction(()=>document.querySelector('deplexr-player').shadowRoot.getElementById('shell').classList.contains('idle'));
 await viewer.dispatchEvent('pointermove');assert.equal(await viewer.locator('#shell').evaluate(el=>el.classList.contains('idle')),false);await page.evaluate(()=>player.pause());
 await page.setViewportSize({width:390,height:844});await viewer.locator('#stage').hover({position:{x:15,y:90}});await viewer.locator('#settings-toggle').click();const menu=await viewer.locator('#settings').boundingBox(),stage=await viewer.locator('#stage').boundingBox();assert.ok(menu.x>=stage.x&&menu.y>=stage.y&&menu.x+menu.width<=stage.x+stage.width+1&&menu.y+menu.height<=stage.y+stage.height+1);await page.screenshot({path:out+'/overlay-mobile-menu.png',fullPage:true});await page.keyboard.press('Escape');
 assert.equal(await viewer.locator('#close-media').count(),0);await viewer.evaluate(el=>el.close());await page.waitForFunction(()=>!player.state.sourceId);assert.ok(await viewer.locator('#empty').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
await check('outside clicks dismiss menus and screen taps toggle controls',async()=>{
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/');await page.waitForFunction(()=>window.player);await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);
 const v=page.locator('deplexr-player'),stage=v.locator('#stage'),menu=v.locator('#settings'),shell=v.locator('#shell');
 await v.locator('#settings-toggle').click();await v.locator('#speed').selectOption('1.25');assert.ok(await menu.isVisible());await page.locator('h1').evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,composed:true})));await menu.waitFor({state:'hidden',timeout:1000});
 await v.locator('#open-menu').click();await stage.click({position:{x:30,y:100}});await menu.waitFor({state:'hidden',timeout:1000});assert.ok(await shell.evaluate(el=>el.classList.contains('idle')));assert.equal(await v.locator('#controls').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 await stage.dispatchEvent('pointerdown',{pointerType:'touch'});await stage.dispatchEvent('pointermove',{pointerType:'touch'});await stage.dispatchEvent('click');assert.equal(await shell.evaluate(el=>el.classList.contains('idle')),false);
 await stage.dispatchEvent('pointerdown',{pointerType:'touch'});await stage.dispatchEvent('click');assert.ok(await shell.evaluate(el=>el.classList.contains('idle')));await stage.focus();await page.keyboard.press('Tab');assert.equal(await shell.evaluate(el=>el.classList.contains('idle')),false);
});
await check('Center transport and bounded ten-second seeks',async()=>{
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/');await page.waitForFunction(()=>window.player);await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);
 const v=page.locator('deplexr-player');const stage=await v.locator('#stage').boundingBox(),play=await v.locator('#play').boundingBox();assert.ok(Math.abs(play.x+play.width/2-stage.x-stage.width/2)<2&&Math.abs(play.y+play.height/2-stage.y-stage.height/2)<2);assert.ok(play.width>=80);
 await page.evaluate(()=>player.seek(3));await v.getByRole('button',{name:'Seek forward 10 seconds',exact:true}).click();await page.waitForFunction(()=>player.state.pendingOperation===null&&player.state.currentTime>10);assert.ok(await page.evaluate(()=>player.state.currentTime<=player.state.duration));
 await v.getByRole('button',{name:'Seek backward 10 seconds',exact:true}).click();await page.waitForFunction(()=>player.state.pendingOperation===null&&player.state.currentTime<3);await v.getByRole('button',{name:'Seek backward 10 seconds',exact:true}).click();await page.waitForFunction(()=>player.state.pendingOperation===null&&player.state.currentTime<.2);
 await v.locator('#settings-toggle').click();assert.ok(await v.locator('#playback-options').isVisible());await v.locator('#source-options').waitFor({state:'hidden',timeout:1000});await v.locator('#speed').selectOption('1.25');await page.waitForFunction(()=>player.state.playbackRate===1.25);await page.screenshot({path:out+'/halo-desktop-menu.png',fullPage:true});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/halo-mobile.png',fullPage:true});await v.locator('#play').click();await page.waitForFunction(()=>document.querySelector('deplexr-player').shadowRoot.getElementById('shell').classList.contains('idle'));await v.dispatchEvent('pointermove');await page.evaluate(()=>player.pause());
});
await check('overlay scales to its embed width independently of the viewport',async()=>{
 await page.setViewportSize({width:1400,height:1000});await page.goto(origin+'/');await page.waitForFunction(()=>window.player);await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);const v=page.locator('deplexr-player');const sizes=[];
 for(const width of [1200,720,360]){await v.evaluate((el,w)=>el.style.width=w+'px',width);const stage=await v.locator('#stage').boundingBox(),play=await v.locator('#play').boundingBox(),transport=await v.locator('#transport').boundingBox(),timeline=await v.locator('#timeline').boundingBox();sizes.push(play.width);assert.ok(transport.width<stage.width*.6);assert.ok(transport.y+transport.height<timeline.y);await v.locator('#settings-toggle').click();const menu=await v.locator('#settings').boundingBox();assert.ok(menu.x>=stage.x&&menu.y>=stage.y&&menu.y+menu.height<=stage.y+stage.height);await page.keyboard.press('Escape');}
 assert.ok(sizes[0]>sizes[1]&&sizes[1]>sizes[2]);await page.screenshot({path:out+'/compact-embed-wide-viewport.png',fullPage:true});await v.evaluate(el=>el.style.removeProperty('width'));
});
await check('height-limited video fills and centers within the player width',async()=>{
 await page.setViewportSize({width:1400,height:600});await page.goto(origin+'/');await page.waitForFunction(()=>window.player);await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&!player.state.pendingOperation);
 const v=page.locator('deplexr-player');for(const mode of ['native','software','hybrid']){await page.evaluate(m=>player.setMode(m),mode);const rects=await v.evaluate(el=>{const s=el.shadowRoot;return ['#shell','#stage','#surface','.deplexr-player','video,canvas'].map(selector=>{const r=s.querySelector(selector).getBoundingClientRect();return {x:r.x,width:r.width};});});for(const r of rects.slice(1)){assert.ok(Math.abs(r.width-(rects[0].width-2))<2,mode+' fills available width');assert.ok(Math.abs(r.x+r.width/2-rects[0].x-rects[0].width/2)<1,mode+' centered');}}
 await page.screenshot({path:out+'/height-limited-centered.png',fullPage:true});
});
await check('Space on top-right icons controls playback without activating icons',async()=>{
 await page.goto(origin+'/');await page.waitForFunction(()=>window.player);await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);const v=page.locator('deplexr-player');await v.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('deplexr-player'));
 for(const id of ['fullscreen','settings-toggle','open-menu']){await v.locator('#'+id).focus();await page.keyboard.press('Space');await page.waitForFunction(()=>player.state.status==='playing');assert.ok(await page.evaluate(()=>!!document.fullscreenElement));await v.locator('#settings').waitFor({state:'hidden',timeout:1000});await page.keyboard.press('Space');await page.waitForFunction(()=>player.state.status==='paused');assert.ok(await page.evaluate(()=>!!document.fullscreenElement));}
 await page.evaluate(()=>document.exitFullscreen());await v.locator('#settings-toggle').focus();await page.keyboard.press('Enter');assert.ok(await v.locator('#settings').isVisible());await page.keyboard.press('Escape');
});
await check('file and URL selection leave Space focused on playback',async()=>{
 for(const source of ['file','url']){await page.goto(origin+'/');await page.waitForFunction(()=>window.player);const v=page.locator('deplexr-player');if(source==='file'){const chooser=page.waitForEvent('filechooser');await v.locator('#open').click();await(await chooser).setFiles('fixtures/example.mp4');}else{await v.locator('#open-menu').click();await v.locator('#url').fill(origin+'/fixtures/example.mp4');await v.locator('#url-submit').click();}await page.waitForFunction(()=>player.state.sourceId&&player.state.pendingOperation===null);assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');await page.keyboard.press('Space');await page.waitForFunction(()=>player.state.status==='playing');await v.locator('#settings').waitFor({state:'hidden',timeout:1000});await page.keyboard.press('Space');await page.waitForFunction(()=>player.state.status==='paused');}
});
await check('migrated playground uses the shipped component and core',async()=>{await page.goto(origin+'/');await page.waitForFunction(()=>window.player);assert.ok(await page.evaluate(()=>document.querySelector('deplexr-player').player===window.player));await page.locator('deplexr-player').locator('#open-menu').click();await page.getByRole('button',{name:'Try an example'}).click();await page.waitForFunction(()=>player.state.sourceId!==null&&player.state.pendingOperation===null);assert.equal(await page.getByRole('button',{name:'Developer settings',exact:true}).count(),0);assert.equal(await page.evaluate(()=>player.state.automaticSelection),true);await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>player.state.status==='playing');await page.locator('deplexr-player').evaluate(el=>el.close());await page.waitForFunction(()=>player.state.status==='idle');});
await check('multiple selected files form one ordered queue and reuse the same core',async()=>{
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{
   window.q=document.querySelector('deplexr-player');await q.ready;
   window.queueCore=q.player;window.queueBytes=await(await fetch('/fixtures/example.mp4')).arrayBuffer();
   window.addQueueFiles=(names,drop=false)=>{
     const transfer=new DataTransfer();for(const name of names)transfer.items.add(new File([queueBytes],name,{type:'video/mp4'}));
     if(drop)q.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,cancelable:true}));
     else {const input=q.shadowRoot.getElementById('file');input.files=transfer.files;input.dispatchEvent(new Event('change'));}
   };
   addQueueFiles(['First.mp4','Second.mp4','Third.mp4']);
 });
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='First.mp4'&&!q.player.state.pendingOperation&&!q.queueOperation);
 const v=page.locator('deplexr-player').first();
 assert.ok(await v.locator('#file').evaluate(el=>el.multiple));
 assert.deepEqual(await v.locator('.queue-item').allTextContents(),['First.mp4','Second.mp4','Third.mp4']);
 assert.equal(await v.locator('#queue-count').textContent(),'1 / 3');
 assert.ok(await page.evaluate(()=>q.player===queueCore));assert.equal(await page.evaluate(()=>q.player.state.status),'paused');
 assert.ok(await v.locator('#previous-file').isDisabled());assert.equal(await v.locator('#next-file').isDisabled(),false);
});
await check('dropping more files appends without interrupting the active source',async()=>{
 const before=await page.evaluate(async()=>{await q.seek(2);return q.player.state.sourceId;});
 await page.evaluate(()=>addQueueFiles(['Fourth.mp4','Fourth.mp4'],true));
 assert.equal(await page.evaluate(()=>q.player.state.sourceId),before);
 assert.ok(await page.evaluate(()=>q.player.state.currentTime>=1.9));
 assert.equal(await page.locator('deplexr-player').first().locator('#queue-count').textContent(),'1 / 5');
});
await check('queue previous, next and item selection preserve paused playback and menu focus',async()=>{
 const v=page.locator('deplexr-player').first();
 await v.locator('#next-file').click();await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Second.mp4'&&!q.queueOperation);
 assert.equal(await page.evaluate(()=>q.player.state.status),'paused');
 await v.locator('#previous-file').click();await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='First.mp4'&&!q.queueOperation);
 await v.locator('#open-menu').click();await v.locator('.queue-item').nth(2).click();
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Third.mp4'&&!q.queueOperation);
 assert.ok(await v.locator('#settings').evaluate(el=>el.hidden));assert.equal(await v.evaluate(el=>el.shadowRoot.activeElement.id),'stage');
 assert.equal(await v.locator('.queue-item[aria-current=true]').textContent(),'Third.mp4');
 await v.locator('#open-menu').click();const source=await page.evaluate(()=>q.player.state.sourceId);
 await v.locator('.queue-remove').first().click();
 assert.equal(await page.evaluate(()=>q.player.state.sourceId),source);
 assert.equal(await v.locator('#queue-count').textContent(),'2 / 4');
 await page.keyboard.press('Escape');
});
await check('queue advances once on real playback end and stops at the final item',async()=>{
 await page.evaluate(async()=>{await q.close();addQueueFiles(['Ending.mp4','Last.mp4']);});
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Ending.mp4'&&!q.queueOperation);
 await page.evaluate(async()=>{await q.seek(q.player.state.duration-.25);await q.play();});
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Last.mp4'&&q.player.state.status==='playing'&&!q.queueOperation);
 assert.equal(await page.locator('deplexr-player').first().locator('#queue-count').textContent(),'2 / 2');
 const source=await page.evaluate(()=>q.player.state.sourceId);
 await page.evaluate(()=>q.seek(q.player.state.duration-.25));
 await page.waitForFunction(()=>q.player.state.status==='ended');
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>q.player.state.sourceId),source);
 assert.ok(await page.locator('deplexr-player').first().locator('#next-file').isDisabled());
});
await check('a failed queued open stops without skipping and a later selection can recover',async()=>{
 await page.evaluate(async()=>{
   await q.close();addQueueFiles(['Before.mp4','Broken.mp4','After.mp4']);
 });
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Before.mp4'&&!q.queueOperation);
 await page.evaluate(async()=>{
   window.originalQueueOpen=q.player.open;
   q.player.open=function(source,options){if(source instanceof File&&source.name==='Broken.mp4')return Promise.reject(new Error('Injected queue opening failure'));return originalQueueOpen.call(this,source,options);};
   await q.seek(q.player.state.duration-.2);await q.play();
 });
 await page.waitForFunction(()=>!q.shadowRoot.getElementById('error').hidden&&!q.queueOperation);
 assert.equal(await page.locator('deplexr-player').first().locator('#queue-count').textContent(),'2 / 3');
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>q.shadowRoot.getElementById('current-source').textContent),'Before.mp4');
 await page.evaluate(()=>{q.player.open=originalQueueOpen;q.shadowRoot.getElementById('next-file').click();});
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='After.mp4'&&!q.queueOperation);
 assert.ok(await page.locator('deplexr-player').first().locator('#error').evaluate(el=>el.hidden));
 // Restore the two-item setup used by removal checks.
 await page.evaluate(async()=>{await q.close();addQueueFiles(['Ending.mp4','Last.mp4']);});
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Ending.mp4'&&!q.queueOperation);
 await page.evaluate(()=>q.shadowRoot.getElementById('next-file').click());
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Last.mp4'&&!q.queueOperation);
});
await check('removing the current item opens its neighbor; clearing the queue releases files',async()=>{
 const v=page.locator('deplexr-player').first();
 await page.evaluate(()=>q.pause());await v.dispatchEvent('pointermove',{pointerType:'mouse'});
 await v.locator('#open-menu').click();await v.locator('.queue-remove').last().click();
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Ending.mp4'&&!q.queueOperation);
 assert.equal(await v.locator('#queue-count').textContent(),'1 / 1');
 await v.locator('#open-menu').click();await v.locator('#clear-queue').click();await page.waitForFunction(()=>!q.player.state.sourceId);
 assert.equal(await v.locator('.queue-item').count(),0);
 assert.ok(await v.locator('#queue-navigation').evaluate(el=>el.hidden));
 assert.ok(await page.evaluate(()=>q.queueItems.length===0&&q.lastSource===undefined));
});
await check('pause during a delayed queue switch overrides its original playing intent',async()=>{
 await page.evaluate(async()=>{await q.close();addQueueFiles(['Pause before.mp4','Pause after.mp4']);});
 await page.waitForFunction(()=>q.player.state.sourceId&&!q.queueOperation);
 await page.evaluate(async()=>{
   await q.play();window.originalQueueOpen=q.player.open;
   q.player.open=async function(...args){await new Promise(resolve=>window.releaseQueueOpen=resolve);return originalQueueOpen.apply(this,args);};
   q.shadowRoot.getElementById('next-file').click();
   await q.pause();
 });
 assert.equal(await page.evaluate(()=>q.player.state.playbackIntent),'pause');
 await page.evaluate(()=>releaseQueueOpen());
 try {
   await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Pause after.mp4'&&!q.queueOperation);
   assert.equal(await page.evaluate(()=>q.player.state.playbackIntent),'pause');
   assert.equal(await page.evaluate(()=>q.player.state.status),'paused');
 }finally{await page.evaluate(async()=>{q.player.open=originalQueueOpen;await q.close();});}
});
await check('failed replacement after current-item removal closes removed media and retains retryable queue',async()=>{
 await page.evaluate(()=>addQueueFiles(['Removed.mp4','Replacement.mp4','Later.mp4']));
 await page.waitForFunction(()=>q.player.state.sourceId&&!q.queueOperation);
 await page.evaluate(async()=>{
   await q.play();window.originalQueueOpen=q.player.open;
   q.player.open=()=>Promise.reject(new Error('Injected removal replacement failure'));
   q.shadowRoot.querySelector('.queue-remove').click();
 });
 try {
   await page.waitForFunction(()=>!q.queueOperation&&!q.shadowRoot.getElementById('error').hidden);
   assert.deepEqual(await page.evaluate(()=>({source:q.player.state.sourceId,intent:q.player.state.playbackIntent,names:q.queueItems.map(x=>x.name),index:q.queueIndex,title:q.shadowRoot.getElementById('title').textContent})),{source:null,intent:'pause',names:['Replacement.mp4','Later.mp4'],index:0,title:''});
   await page.evaluate(()=>{q.player.open=originalQueueOpen;q.shadowRoot.getElementById('retry').click();});
   await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Replacement.mp4'&&!q.queueOperation);
   assert.equal(await page.evaluate(()=>q.queueItems.length),2);
   assert.ok(await page.evaluate(()=>q.shadowRoot.getElementById('error').hidden));
 }finally{await page.evaluate(async()=>{q.player.open=originalQueueOpen;await q.close();});}
});
await check('programmatic replacement and disconnect cancel the queue rather than advancing stale sources',async()=>{
 await page.evaluate(()=>addQueueFiles(['Old.mp4','Queued.mp4']));
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Old.mp4'&&!q.queueOperation);
 await page.evaluate(async()=>{q.shadowRoot.getElementById('next-file').click();await q.open(location.origin+'/fixtures/example.mp4?token=hidden#private');});
 assert.deepEqual(await page.locator('deplexr-player').first().locator('.queue-item').allTextContents(),['example.mp4']);
 assert.equal(await page.evaluate(()=>q.queueItems.length),1);
 await page.evaluate(async()=>{q.remove();await new Promise(resolve=>setTimeout(resolve,30));});
 assert.ok(await page.evaluate(()=>q.queueItems.length===0&&q.lastSource===undefined));
 await page.evaluate(async()=>{document.body.append(q);await q.ready;});
 assert.equal(await page.evaluate(()=>q.player.state.status),'idle');
});
await check('queue navigation remains inside a small player and source ownership controls are respected',async()=>{
 await page.evaluate(()=>{q.style.width='320px';addQueueFiles(['Small.mp4','Next.mp4']);});
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Small.mp4'&&!q.queueOperation);
 const bounds=await page.evaluate(()=>{const root=q.shadowRoot,stage=root.getElementById('stage').getBoundingClientRect();return [...root.querySelectorAll('#previous-file,#next-file,#duration')].every(el=>{const r=el.getBoundingClientRect();return r.left>=stage.left&&r.right<=stage.right;});});assert.ok(bounds);
 await page.evaluate(()=>{q.showSourceControls=false;q.shadowRoot.querySelectorAll('.queue-item')[1].dispatchEvent(new MouseEvent('click'));});
 assert.equal(await page.evaluate(()=>q.shadowRoot.getElementById('current-source').textContent),'Small.mp4');
 await page.evaluate(()=>q.shadowRoot.getElementById('next-file').click());
 await page.waitForFunction(()=>q.shadowRoot.getElementById('current-source').textContent==='Next.mp4'&&!q.queueOperation);
 await page.evaluate(async()=>{q.showSourceControls=true;await q.destroy();});
 assert.equal(await page.evaluate(()=>q.queueItems.length),0);
});
await page.emulateMedia({forcedColors:'none'});await page.waitForTimeout(150);await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:out+'/desktop.png',fullPage:true});
}finally{await page.evaluate(()=>Promise.all([...document.querySelectorAll('deplexr-player')].map(p=>p.destroy()))).catch(()=>{});await browser.close();server.kill();result.passed=result.checks.every(c=>c.passed);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
