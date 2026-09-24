// SPDX-License-Identifier: Apache-2.0
// A cheap 120 fps source at 2x can exceed display cadence without decoder lag.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

const source=process.env.DISPLAY_DROP_SOURCE;
if(!source)throw Error('Set DISPLAY_DROP_SOURCE to a 60 fps H.264 fixture');
const fixture='results/decode-policy/fixtures/h264-120-small.mp4';
await mkdir('results/decode-policy/fixtures',{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t','32','-vf','fps=120,scale=160:90','-c:v','libx264','-preset','ultrafast','-crf','28','-c:a','copy',fixture]);
const encoded=(await readFile(fixture)).toString('base64');
const output=`results/decode-policy/display-drops-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const result={source,fixture,samples:[],started:new Date().toISOString()};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',error=>(result.errors??=[]).push(String(error)));
 await page.goto(origin+'/examples/custom-controls.html');
 await page.evaluate(async encoded=>{
  const {Player}=await import('/web/generated/index.js');
  window.player=new Player(document.querySelector('#surface'),{mode:'software',decodeQuality:'exact',adaptiveFrameDrop:true,width:640,height:360});
  const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
  await player.open(new File([bytes],'h264-120-small.mp4'));await player.setPlaybackRate(2);await player.play();
 },encoded);
 for(let second=0;second<13;second++){
  result.samples.push(await page.evaluate(()=>({position:player.state.currentTime,state:player.diagnostics.backend?.decodePolicy?.adaptiveState,reason:player.diagnostics.backend?.adaptiveReason,decoderDrops:player.current.backend.properties.get('decoder-frame-drop-count'),presentationDrops:player.current.backend.properties.get('frame-drop-count'),avsync:player.current.backend.properties.get('avsync')})));
  await page.waitForTimeout(1000);
 }
 result.normal=result.samples.every(sample=>sample.state==='normal');
 result.presentationDropped=Number(result.samples.at(-1).presentationDrops)-Number(result.samples[0].presentationDrops)>=100;
 result.realtime=result.samples.at(-1).position-result.samples[0].position>=22;
 result.decoderDrops=result.samples.at(-1).decoderDrops;
 result.maxAbsAvsync=Math.max(...result.samples.map(sample=>Math.abs(Number(sample.avsync??0))));
 await page.evaluate(()=>player.destroy());
 result.cleaned=await page.evaluate(()=>document.querySelectorAll('iframe').length===0);
 if(!result.normal||!result.presentationDropped||!result.realtime||Number(result.decoderDrops)!==0||result.maxAbsAvsync>.2||!result.cleaned||result.errors?.length)process.exitCode=1;
}catch(error){result.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();server.kill();result.finished=new Date().toISOString();await writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(output,JSON.stringify({normal:result.normal,presentationDropped:result.presentationDropped,realtime:result.realtime,decoderDrops:result.decoderDrops,maxAbsAvsync:result.maxAbsAvsync,cleaned:result.cleaned,error:result.error}));}
