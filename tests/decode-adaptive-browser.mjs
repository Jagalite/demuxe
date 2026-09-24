// SPDX-License-Identifier: Apache-2.0
// Focused overload trial. ADAPTIVE_FIXTURE must be a 4K HEVC file with B pictures.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const fixture=process.env.ADAPTIVE_FIXTURE;
const stressRate=Number(process.env.STRESS_RATE??2);
const recoveryRate=Number(process.env.RECOVERY_RATE??1);
const stressSeconds=Number(process.env.STRESS_SECONDS??22),recoverySeconds=Number(process.env.RECOVERY_SECONDS??24);
if(!fixture)throw Error('Set ADAPTIVE_FIXTURE to a local 4K HEVC fixture');
const bytes=await readFile(fixture),sha256=createHash('sha256').update(bytes).digest('hex');
const out=`results/decode-policy/adaptive-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const result={fixture,sha256,bytes:bytes.length,stressRate,recoveryRate,stressSeconds,recoverySeconds,forceProbeFailure:!!process.env.FORCE_PROBE_FAILURE,started:new Date().toISOString(),samples:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',error=>(result.errors??=[]).push(String(error)));
 if(process.env.FORCE_PROBE_FAILURE)await page.route('**/web/source-probe.js',route=>route.abort());
 await page.goto(origin+'/examples/custom-controls.html');
 await page.evaluate(async({encoded,stressRate})=>{
  const {Player}=await import('/web/generated/index.js');
  window.player=new Player(document.querySelector('#surface'),{mode:'software',decodeQuality:'exact',adaptiveFrameDrop:true,width:1280,height:720});
  const data=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
  await player.open(new File([data],'adaptive-hevc.mkv'));
  await player.current.backend.command('set','loop-file','inf');
  await player.setPlaybackRate(2);
  if(stressRate!==2)await player.current.backend.command('set','speed',String(stressRate));
  await player.play();
 },{encoded:bytes.toString('base64'),stressRate});
 result.sourceInspected=await page.evaluate(()=>!!player.sourceInspection);
 if(result.forceProbeFailure&&result.sourceInspected)throw Error('Probe failure control did not take effect');
 const cdp=await browser.newBrowserCDPSession();
 for(let second=0;second<stressSeconds+recoverySeconds;second++){
  if(second===stressSeconds)await page.evaluate(rate=>player.setPlaybackRate(rate),recoveryRate);
  const procs=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
  const state=await page.evaluate(()=>({status:player.state.status,position:player.state.currentTime,rate:player.state.playbackRate,policy:player.diagnostics.backend?.decodePolicy,reason:player.diagnostics.backend?.adaptiveReason,switching:player.diagnostics.backend?.adaptiveSwitching,drops:player.current.backend.properties.get('decoder-frame-drop-count'),frameDrops:player.current.backend.properties.get('frame-drop-count'),avsync:player.current.backend.properties.get('avsync')}));
  result.samples.push({second,state,procs});
  if(second%5===0)await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');
  await page.waitForTimeout(1000);
 }
 result.states=[...new Set(result.samples.map(sample=>sample.state.policy?.adaptiveState))];
 await page.evaluate(()=>player.destroy());
 await page.waitForFunction(()=>document.querySelectorAll('iframe').length===0);
 result.cleaned=true;
}catch(error){result.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();server.kill();result.finished=new Date().toISOString();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(out,JSON.stringify({states:result.states,error:result.error,cleaned:result.cleaned}));}
