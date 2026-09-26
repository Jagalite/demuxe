// SPDX-License-Identifier: Apache-2.0
// Short unequal tails must retain real audio preroll on a fresh remux seek.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,delay} from './head-to-head/benchmark-browser.mjs';

const out=process.env.OUT;assert.ok(out,'Set OUT to a fresh result directory');
await mkdir(out,{recursive:false});
const files={},result={runtime:{},trials:[]};
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
for(const codec of ['ac3','truehd']){
 const file=files[codec]=`${out}/${codec}.mkv`;
 const args=['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=6','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=5.2','-map','0:v','-map','1:a','-c:v','libx264','-preset','ultrafast','-g','15','-bf','0','-c:a',codec,'-strict','-2','-ac','2',file];
 const made=spawnSync('ffmpeg',args,{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
 result[codec]={command:['ffmpeg',...args],sha256:await hash(file)};
}
for(const file of ['web/native-remux-worker.js','web/generated/unified-player.js','web/engine-adaptation/remux.wasm'])result.runtime[file]=await hash(file);
const server=await serve({pagePath:'experiments/ac3-transcode/page.html',mediaPaths:files});let browser;
try{
 const launch=await launchBenchmarkChrome({headless:false,startupGate:false});browser=launch.browser;result.browser=launch.identity;
 for(const [codec,input] of [['ac3','url'],['ac3','file'],['truehd','url']]){
  const trial={codec,input,phases:[],pageErrors:[]};result.trials.push(trial);
  const context=await browser.newContext(),page=await context.newPage();
  page.on('pageerror',error=>trial.pageErrors.push(String(error)));
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async({codec,input})=>{
    const {Player}=await import('/web/generated/index.js');
    window.failures=[];window.player=new Player(document.querySelector('#surface'),{nativeRemux:'always'});
    player.addEventListener('error',event=>failures.push(event.detail));
    const source=input==='file'?new File([await (await fetch('/media/'+codec)).arrayBuffer()],'tail.mkv'):{url:'/media/'+codec,format:'file'};
    await player.open(source);await player.play();await player.pause();
   },{codec,input});
   const phase=async label=>{
    const state=await page.evaluate(()=>({plan:player.diagnostics.plan.id,time:player.state.currentTime,status:player.state.status,failures,errors:player.diagnostics.backend.remux?.stats?.errors,selection:player.diagnostics.selection}));
    trial.phases.push({label,...state});assert.equal(state.plan,'native-transcode');assert.deepEqual(state.failures,[]);assert.deepEqual(state.errors,[]);return state;
   };
   await phase('start');
   for(const target of [5.8,2,5.4]){
    await page.evaluate(target=>player.seek(target),target);
    const state=await phase('paused-seek-'+target);assert.ok(Math.abs(state.time-target)<.1);assert.equal(state.status,'paused');
   }
   await page.evaluate(()=>player.play());
   await page.waitForFunction(()=>player.state.status==='ended',undefined,{timeout:10000});await phase('EOF');
   await page.evaluate(async()=>{await player.seek(2);await player.play();});
   await page.waitForFunction(()=>player.state.currentTime>2.2);await phase('replay');
   await page.evaluate(()=>player.destroy());await delay(250);
   assert.equal(page.workers().length,0);assert.deepEqual(trial.pageErrors,[]);trial.accepted=true;
   console.log('PASS',codec,input);
  }catch(error){trial.error=String(error.stack);trial.failure=await page.evaluate(()=>({state:player.state,diagnostics:player.diagnostics})).catch(()=>null);console.log('FAIL',codec,input,trial.error);}
  finally{await context.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser?.close();await server.close();}
assert.ok(result.trials.length===3&&result.trials.every(trial=>trial.accepted),'Tail regression failed; see '+out+'/result.json');
