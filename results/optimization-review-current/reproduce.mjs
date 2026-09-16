import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise(r=>server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)r(m[0])}));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={browser:browser.version()};
try{
const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
await page.evaluate(async()=>{await player.destroy();window.Player=(await import('/web/generated/index.js')).Player;window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));});
results.workerConstructor=await page.evaluate(async()=>{
 const Original=window.Worker;window.Worker=class extends Original{constructor(url,options){if(String(url).includes('native-ass-worker'))throw new DOMException('Blocked worker','SecurityError');super(url,options)}};
 const attempts=[];
 try{for(let i=0;i<3;i++){let error;try{await player.addSubtitle(new File([await(await fetch('/fixtures/qualification.ass')).arrayBuffer()],'a.ass'))}catch(e){error=String(e)}attempts.push({error,canvases:document.querySelectorAll('.demuxe-native-ass').length})}await player.destroy();return {attempts,afterDestroy:document.querySelectorAll('.demuxe-native-ass').length};}finally{window.Worker=Original}
});
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
await playerCleanup(page);await page.close();
}finally{await browser.close();server.kill();await writeFile('results/optimization-review-current/result.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2))}
async function playerCleanup(page){await page.evaluate(()=>player.destroy())}
