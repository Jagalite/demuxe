// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'chrome';if(!['chrome','chromium','firefox','webkit'].includes(family))throw Error(`Unsupported BROWSER ${family}`);
const out=`results/player-keyboard-seek/${family}-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});console.log(out);
const keys=['ArrowLeft','ArrowRight','j','l','Home','End',...'0123456789'];
const cases=[...keys.map(key=>({key,kind:'playing'})),...keys.map(key=>({key,kind:'paused'})),{key:'ArrowRight',kind:'drag'},{key:'ArrowRight',kind:'volume'},{key:'ArrowRight',kind:'timeline'},{key:'ArrowRight',kind:'menu'}];
const result={family,checks:[],expectedCases:cases.length,passed:false,hashes:{}};let browser,server,complete=false;
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
try{
 for(const f of ['tests/player-keyboard-seek.mjs','src/player/index.ts','web/generated/player/index.js','fixtures/example.mp4'])result.hashes[f]=createHash('sha256').update(await readFile(f)).digest('hex');
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
 const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server startup timeout')),10000);server.once('error',e=>{clearTimeout(t);reject(e);});server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});
 browser=await(family==='firefox'?firefox:family==='webkit'?webkit:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});result.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/examples/player-element.html');
 await page.evaluate(async()=>{window.a=document.querySelector('demuxe-player');await a.ready;a.muted=true;a.seekStep=2;await a.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'keyboard.mp4'));});
 for(const entry of cases){const row={...entry,passed:false};result.checks.push(row);
  try{
   await page.evaluate(async({kind,key})=>{
    window.restoreSeek?.();a.settings(false,false);await a.pause();await a.seek(a.player.state.duration/2);
    if(kind==='playing'||kind==='drag')await a.play();
    a.shadowRoot.getElementById('stage').focus();a.revealControls();
    const core=a.player,original=core.seek;window.observation={calls:[],events:[]};
    const sample=()=>({at:performance.now(),idle:a.controlState.idle,preview:a.controlState.seekPreview,dragging:a.controlState.dragging,intent:core.state.playbackIntent,time:core.state.currentTime,surfaceTime:core.surface.currentTime,pending:core.state.pendingOperation});
    const seeking=()=>observation.events.push({type:'seeking',...sample()});core.addEventListener('seeking',seeking);
    core.seek=function(target,...args){const call={target,invoked:sample()};observation.calls.push(call);const promise=original.call(this,target,...args);promise.then(()=>{call.completed=sample();},error=>{call.error=String(error);});return promise;};
    window.restoreSeek=()=>{core.seek=original;core.removeEventListener('seeking',seeking);};
    if(kind==='drag'){const t=a.shadowRoot.getElementById('timeline');t.dispatchEvent(new Event('input'));}
    if(kind==='volume'||kind==='timeline'){const input=a.shadowRoot.getElementById(kind);if(kind==='volume')input.value='.5';input.focus();observation.inputBefore=Number(input.value);}
    if(kind==='menu'){a.settings(true,true);a.shadowRoot.getElementById('speed').focus();}
    observation.before=sample();observation.duration=core.state.duration;
   },entry);
   await page.keyboard.press(entry.key);
   if(['playing','paused','drag','timeline'].includes(entry.kind))await page.waitForFunction(()=>observation.calls.some(c=>c.completed||c.error));
   row.observation=await page.evaluate(({kind})=>({...observation,after:{idle:a.controlState.idle,menu:a.controlState.menuOpen,input:kind==='volume'||kind==='timeline'?Number(a.shadowRoot.getElementById(kind).value):null}}),entry);
   const o=row.observation;
   if(entry.kind==='volume'||entry.kind==='menu'){assert.equal(o.calls.length,0);assert.equal(o.after.idle,false);if(entry.kind==='volume')assert.ok(o.after.input>o.inputBefore);else assert.equal(o.after.menu,true);}
   else{
    assert.equal(o.calls.length,1);const c=o.calls[0];assert.equal(c.error,undefined);assert.ok(c.completed);assert.ok(Math.abs(c.completed.surfaceTime-c.target)<.35,JSON.stringify(c));
    assert.equal(c.invoked.idle,entry.kind==='playing','Only a playing stage shortcut should hide controls');
    if(entry.kind==='playing')assert.ok(o.events.some(e=>e.type==='seeking'&&e.idle&&e.preview),'Seek must show timeline-only feedback');
    if(entry.kind==='paused')assert.equal(o.after.idle,false);
    if(entry.kind==='drag')assert.equal(c.invoked.dragging,true);
    if(entry.kind==='timeline')assert.ok(Math.abs(c.target-o.inputBefore)<.3,'Native range key must move by range step, not global five seconds');
   }
   row.passed=true;
  }catch(error){row.error=String(error.stack??error);process.exitCode=1;}
  finally{await page.evaluate(async()=>{window.restoreSeek?.();await a.pause();}).catch(error=>{row.cleanupError=String(error);row.passed=false;});await save();console.log(row.passed?'PASS':'FAIL',entry.kind,entry.key);}
 }
 result.pageErrors=errors;assert.deepEqual(errors,[]);await page.evaluate(()=>a.destroy());await page.close();complete=true;
}catch(error){result.error=String(error.stack??error);process.exitCode=1;}
finally{try{await browser?.close();}catch(error){result.cleanupError=String(error);}
 finally{server?.kill();}result.passed=complete&&!result.error&&!result.cleanupError&&result.checks.length===cases.length&&result.checks.every(c=>c.passed);if(!result.passed)process.exitCode=1;await save();}
