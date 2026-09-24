// SPDX-License-Identifier: Apache-2.0
// Whole-Chrome 4K HEVC screen; fresh Chrome process per arm, reversed second round.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const fixture=process.env.THREAD_FIXTURE;
if(!fixture)throw Error('Set THREAD_FIXTURE to a local 4K HEVC fixture');
const bytes=await readFile(fixture),sha256=createHash('sha256').update(bytes).digest('hex');
const out=`results/decode-policy/threads-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const result={fixture,sha256,started:new Date().toISOString(),arms:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
try{
 for(let round=0;round<2;round++)for(const threads of round?[4,2,1]:[1,2,4]){
  const arm={round,threads};result.arms.push(arm);
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  try{
   const page=await browser.newPage();page.setDefaultTimeout(120000);await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async({encoded,threads})=>{
    const {WasmPlayer}=await import('/web/generated/internal/wasm-player.js');
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.querySelector('#surface').replaceChildren(canvas);
    const player=window.threadPlayer=new WasmPlayer(canvas,{mode:'software',softwarePresenter:'auto'});
    await player.ready;await player.command('set','vd-lavc-threads',String(threads));
    const data=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
    await player.open(new File([data],'threads-hevc.mkv'));await player.play();
   },{encoded:bytes.toString('base64'),threads});
   await page.waitForFunction(()=>threadPlayer.diagnostics?.rendered>=30);
   await page.waitForTimeout(2000);
   const cdp=await browser.newBrowserCDPSession();
   const before=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const first=await page.evaluate(()=>({position:threadPlayer.properties.get('time-pos'),frames:threadPlayer.diagnostics.rendered,drops:threadPlayer.properties.get('decoder-frame-drop-count'),presenter:threadPlayer.diagnostics.softwarePresenter}));
   const started=Date.now();await page.waitForTimeout(5000);
   const after=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const last=await page.evaluate(()=>({position:threadPlayer.properties.get('time-pos'),frames:threadPlayer.diagnostics.rendered,drops:threadPlayer.properties.get('decoder-frame-drop-count'),presenter:threadPlayer.diagnostics.softwarePresenter}));
   const elapsed=(Date.now()-started)/1000;
   const parts=after.map(process=>({type:process.type,cpuSeconds:Math.max(0,process.cpuTime-(before.find(prior=>prior.id===process.id)?.cpuTime??process.cpuTime))}));
   arm.chromeCpuPercent=100*parts.reduce((sum,part)=>sum+part.cpuSeconds,0)/elapsed;
   arm.processCpuPercent=Object.fromEntries([...new Set(parts.map(part=>part.type))].map(type=>[type,100*parts.filter(part=>part.type===type).reduce((sum,part)=>sum+part.cpuSeconds,0)/elapsed]));
   arm.elapsed=elapsed;arm.positionAdvance=last.position-first.position;arm.frames=last.frames-first.frames;arm.decoderDrops=(last.drops??0)-(first.drops??0);arm.presenter=last.presenter;
   await page.evaluate(()=>threadPlayer.destroy());
   await page.waitForFunction(()=>document.querySelectorAll('iframe').length===0);
  }catch(error){arm.error=String(error.stack??error);process.exitCode=1;}
  finally{await browser.close();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');}
 }
}finally{server.kill();result.finished=new Date().toISOString();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(out,JSON.stringify(result.arms.map(({round,threads,chromeCpuPercent,positionAdvance,frames,decoderDrops,error})=>({round,threads,chromeCpuPercent,positionAdvance,frames,decoderDrops,error}))));}
