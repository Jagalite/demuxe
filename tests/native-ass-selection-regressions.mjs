// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
const family=process.env.BROWSER||'chrome',out=`results/optimization-ass-fixes/selection-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise(r=>server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)r(m[0])}));
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={browser:browser.version()};
try{
const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
await page.evaluate(async()=>{await player.destroy();window.Player=(await import('/web/generated/index.js')).Player;window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));});
results.workerConstructor=await page.evaluate(async()=>{
 const Original=window.Worker;window.Worker=class extends Original{constructor(url,options){if(String(url).includes('native-ass-worker'))throw new DOMException('Blocked worker','SecurityError');super(url,options)}};
 const attempts=[];
 try{for(let i=0;i<3;i++){let error;try{await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'a.ass'))}catch(e){error=String(e)}attempts.push({error,canvases:document.querySelectorAll('.demuxe-native-ass').length})}await player.destroy();return {attempts,afterDestroy:document.querySelectorAll('.demuxe-native-ass').length};}finally{window.Worker=Original}
});
if(family==='chrome'){
await page.route('**/engine-ass/subtitles.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export default async()=>({_subtitle_api_version:()=>1});'}));
results.interfaceMismatch=await page.evaluate(async()=>{
 window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});
 await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));
 const backend=player.current.backend;let error;
 try{await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'a.ass'))}catch(e){error=String(e)}
 const result={error,sameBackend:backend===player.current.backend,canvases:document.querySelectorAll('.demuxe-native-ass').length};await player.destroy();return result;
});
assert.match(results.interfaceMismatch.error,/interface mismatch/);assert.equal(results.interfaceMismatch.sameBackend,true);assert.equal(results.interfaceMismatch.canvases,0);
await page.unroute('**/engine-ass/subtitles.mjs');
}else results.interfaceMismatch={skipped:'Firefox worker module imports bypass this Playwright interception; mismatch exercised in Chrome'};
await page.evaluate(async()=>{window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'good.ass'));await player.seek(2.25);});
await page.waitForFunction(()=>player.current.backend.ass.stats.renders>0);
results.hiddenSelection=await page.evaluate(async()=>{const before=player.state.subtitleTracks;await player.subtitleVisible(false);const hidden=player.state.subtitleTracks;await player.subtitleVisible(true);return {before,hidden,restored:player.state.subtitleTracks}});
results.invalidSelection=await page.evaluate(async()=>{
 await player.addSubtitle(new File(['this is not ASS'],'bad.ass'),{select:false});
 const bad=player.state.subtitleTracks.find(t=>t.label==='bad.ass');
 const before={tracks:player.state.subtitleTracks,visibility:player.current.backend.ass.canvas.style.display};
 let error;try{await player.selectSubtitleTrack(bad.id)}catch(e){error=String(e)}
 await new Promise(r=>setTimeout(r,150));
 return {before,error,after:{tracks:player.state.subtitleTracks,visibility:player.current.backend.ass.canvas.style.display,selected:player.current.backend.assIndex}};
});
assert.ok(results.workerConstructor.attempts.every(t=>t.error&&t.canvases===0));
assert.equal(results.workerConstructor.afterDestroy,0);
assert.deepEqual(results.hiddenSelection.hidden,results.hiddenSelection.before);
assert.deepEqual(results.hiddenSelection.restored,results.hiddenSelection.before);
assert.match(results.invalidSelection.error,/Invalid ASS/);
assert.equal(results.invalidSelection.after.visibility,'block');
assert.deepEqual(results.invalidSelection.after.tracks,results.invalidSelection.before.tracks);
results.recovery=await page.evaluate(async()=>{
 const ass=player.current.backend.ass,before=ass.stats.renders;
 await player.subtitleVisible(false);await player.subtitleVisible(true);await player.seek(2.75);
 const deadline=performance.now()+3000;
 while(ass.stats.renders<=before){if(performance.now()>deadline)throw Error('Old track failed to render after rejected selection');await new Promise(r=>setTimeout(r,20));}
 const c=ass.canvas,pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 return {visible:c.style.display,nonempty:pixels.some((v,i)=>i%4===3&&v>0),same:ass===player.current.backend.ass};
});
assert.deepEqual(results.recovery,{visible:'block',nonempty:true,same:true});
await playerCleanup(page);await page.waitForTimeout(100);assert.equal(page.workers().length,0);results.passed=true;await page.close();
}finally{await browser.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2))}
async function playerCleanup(page){await page.evaluate(()=>player.destroy())}
