// Bounded extension of tests/playback-performance.mjs: same CDP whole-browser
// CPU counters and ps RSS accounting, now covering open through destroy.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=`results/optimization-integration/stage2/cost-${Date.now()}`;await mkdir(out,{recursive:true});
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),10000);app.on('error',reject);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0])}})});
const fixture='build/optimization-fixtures/long-pcm.mkv';
const result={scope:'Tiny 160x90 local PCM fixture; short headless Chrome cost screen. CDP browser processes only; external OS services excluded. New processes include their observed lifetime CPU; any disappearing process invalidates the run. Cold means fresh browser, not flushed OS cache. Warm means one preceding open/play/destroy. No sustained or universal ranking claim.',fixture,fixtureSHA256:createHash('sha256').update(await readFile(fixture)).digest('hex'),trials:[]};
try{
 for(const [condition,mode] of [['cold','native'],['cold','hybrid'],['warm','hybrid'],['warm','native'],['cold','hybrid'],['cold','native'],['warm','native'],['warm','hybrid']]){
  const browser=await chromium.launch({channel:'chrome',headless:true,ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage(),cdp=await browser.newBrowserCDPSession();const item={condition,mode,browser:browser.version(),samples:[]};result.trials.push(item);
  try{
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async()=>{await player.destroy();window.PlayerClass=(await import('/web/generated/index.js')).Player;const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f)});await page.locator('#file').setInputFiles(fixture);
   async function open(){return page.evaluate(async mode=>{window.errors=[];window.player=new PlayerClass(document.querySelector('#surface'),{mode,nativeRemux:'always',experimentalAudioAdaptation:'flac'});player.addEventListener('error',e=>errors.push(e.detail));const start=performance.now();await player.open(document.querySelector('#file').files[0]);const opened=performance.now();await player.play();return {start,openMs:opened-start}},mode)}
   if(condition==='warm'){await open();await page.waitForFunction(()=>player.state.currentTime>.5);await page.evaluate(()=>player.destroy());for(let i=0;i<20&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0)}
   async function sample(){const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;const rss=execFileSync('/bin/ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).map(Number).reduce((a,b)=>a+b,0)*1024;item.samples.push({at:Date.now(),processes,rss})}
   await sample();item.startup=await open();
   await page.waitForFunction(()=>player.state.currentTime>.15);item.startup.progressMs=await page.evaluate(start=>performance.now()-start,item.startup.start);await sample();
   const deadline=Date.now()+10000;
   while(Date.now()<deadline){await page.waitForTimeout(500);await sample()}
   item.final=await page.evaluate(()=>({diagnostics:player.diagnostics,position:player.state.currentTime,errors}));assert.deepEqual(item.final.errors,[]);assert.ok(item.final.position>=9.5);
   const destroyAt=Date.now();await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);item.destroyMs=Date.now()-destroyAt;await sample();
   let cpu=0;const churn=[];
   for(let i=1;i<item.samples.length;i++){const previous=new Map(item.samples[i-1].processes.map(p=>[p.id,p.cpuTime])),present=new Set(item.samples[i].processes.map(p=>p.id));for(const id of previous.keys())if(!present.has(id))churn.push({removed:id});for(const p of item.samples[i].processes){if(previous.has(p.id))cpu+=p.cpuTime-previous.get(p.id);else {cpu+=p.cpuTime;churn.push({added:p.id,type:p.type,countedLifetimeCPU:p.cpuTime})}}}
   item.summary={cpuSeconds:cpu,elapsedSeconds:(item.samples.at(-1).at-item.samples[0].at)/1000,peakRSS:Math.max(...item.samples.map(s=>s.rss)),churn};assert.equal(churn.some(p=>'removed' in p),false,'A disappeared process prevents complete interval CPU');item.passed=true;
  }catch(error){item.error=String(error.stack);process.exitCode=1}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(condition,mode,item.passed?'PASS':item.error)}
 }
}finally{app.kill()}
console.log(out);
