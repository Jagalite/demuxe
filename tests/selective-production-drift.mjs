// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const fixture='build/selective-production/h264-ac3-long.mkv';
const server=await serve(),browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const result={fixture,browser:browser.version(),samples:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 page.on('pageerror',error=>result.errors.push(String(error)));
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540});window.errors=[];player.addEventListener('error',event=>errors.push(event.detail));const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);});
 await page.locator('#source').setInputFiles(fixture);
 await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
 await page.evaluate(()=>player.play());
 for(let i=0;i<125;i++){
  await page.waitForTimeout(1000);
  const sample=await page.evaluate(()=>({position:player.state.currentTime,plan:player.diagnostics.plan?.id,errorMs:player.diagnostics.backend?.mpvAudio?.errorMs,underruns:player.diagnostics.backend?.mpvAudio?.preEofUnderruns,soft:player.diagnostics.backend?.mpvAudio?.softCorrections,errors}));
  result.samples.push(sample);
  if(i%25===24)console.log('drift',i+1,JSON.stringify(sample));
 }
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);result.workersAfterDestroy=page.workers().length;
}finally{await browser.close();await server.close();}
const errors=result.samples.map(x=>Math.abs(x.errorMs)).filter(Number.isFinite).sort((a,b)=>a-b);
result.absErrorMs={p50:errors[Math.floor(errors.length*.5)],p95:errors[Math.floor(errors.length*.95)],p99:errors[Math.floor(errors.length*.99)],max:errors.at(-1)};
result.passed=result.samples.length===125&&result.samples.every(x=>x.plan==='native-video-mpv-audio'&&x.underruns===0&&!x.errors.length)&&result.samples.at(-1).position>120&&result.absErrorMs.p95<50&&result.workersAfterDestroy===0&&!result.errors.length;
await mkdir('results/selective-production',{recursive:true});await writeFile('results/selective-production/drift.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,stats:result.absErrorMs,last:result.samples.at(-1),workers:result.workersAfterDestroy,errors:result.errors}));
assert.equal(result.passed,true);
