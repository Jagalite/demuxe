// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/selective-audio-scheduling/poll-margin-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const source=await readFile('web/filter-retained-engine-worker.js','utf8');
const server=await serve({mediaPaths:{movie:'build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv'}});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const [cadence,stall] of JSON.parse(process.env.CONFIGS??'[[40,0],[10,0],[40,60],[10,60]]')){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  let code=source.replace('let activePumpMs=10;',`let activePumpMs=10;globalThis.pollProbe={rows:[],delays:[],stall:0,next:Infinity};function injectedDelay(){const p=globalThis.pollProbe;if(performance.now()<p.next)return 0;p.next+=2000;p.delays.push(performance.now());return p.stall;}`)
   .replace('Math.min(40,CAPACITY*250/data.sampleRate)',`Math.min(${cadence},CAPACITY*250/data.sampleRate)`)
   .replace('  },delay);','  },delay+injectedDelay());')
   .replace('    pumpAudio();',`    if(audioOnly&&pollProbe.rows.length<2500){const at=nativeAudio>>>2,h=engine.HEAPU32;pollProbe.rows.push({t:performance.now(),write:Atomics.load(audio,0),read:Atomics.load(audio,1),nativeWrite:Atomics.load(h,at),nativeRead:Atomics.load(h,at+1),epoch:Atomics.load(audio,3),run:Atomics.load(audio,2),gate:Atomics.load(audio,12),underruns:Atomics.load(audio,8)});}pumpAudio();`);
  try{
   await context.route('**/web/filter-retained-engine-worker.js*',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'},body:code}));
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));await player.open({url:'/media/movie',format:'file'});await player.play();});
   await page.waitForTimeout(3000);
   const worker=page.workers().find(w=>w.url().includes('filter-retained-engine-worker'));if(!worker)throw Error('Audio worker unavailable');
   await worker.evaluate(stall=>{pollProbe.rows=[];pollProbe.stall=stall;pollProbe.next=performance.now()+1500;},stall);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,v=b.video,q=v.getVideoPlaybackQuality();return {time:player.state.currentTime,plan:player.diagnostics.plan.id,frames:q.totalVideoFrames,drops:q.droppedVideoFrames,audio:a.diagnostics,failures,visible:document.visibilityState,focused:document.hasFocus()};});
   const before=await snapshot();await page.waitForTimeout(10000);const after=await snapshot();const probe=await worker.evaluate(()=>pollProbe);
   const result={cadence,stall,before,after,probe,errors};results.push(result);console.log(JSON.stringify({cadence,stall,underruns:after.audio.preEofUnderruns-before.audio.preEofUnderruns,drops:after.drops-before.drops,maxGap:Math.max(...probe.rows.slice(1).map((r,i)=>r.t-probe.rows[i].t)),minQueue:Math.min(...probe.rows.filter(r=>r.run&&r.gate).map(r=>r.write-r.read))}));
  }catch(error){results.push({cadence,stall,error:String(error.stack)});console.error(error);}
  finally{await writeFile(out+'/result.json',JSON.stringify(results,null,2));await context.close();}
 }
}finally{await browser.close();await server.close();}
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));console.log(out);
