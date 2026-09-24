// SPDX-License-Identifier: Apache-2.0
// Matched Software exact/balanced/performance CPU screen on one frozen fixture.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const fixture=process.env.DECODE_CPU_FIXTURE;
if(!fixture)throw Error('Set DECODE_CPU_FIXTURE to a local video fixture');
const windowSeconds=Number(process.env.WINDOW_SECONDS??15);
const rounds=Number(process.env.ROUNDS??3);
const expectedFps=Number(process.env.EXPECTED_FPS??24);
const expectedCodec=process.env.EXPECTED_CODEC;
const qualities=(process.env.DECODE_CPU_QUALITIES??'exact,balanced,performance').split(',');
const encoded=(await readFile(fixture)).toString('base64');
const sha256=createHash('sha256').update(Buffer.from(encoded,'base64')).digest('hex');
const output=`results/decode-policy/cpu-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});
const result={fixture,sha256,windowSeconds,rounds,expectedFps,expectedCodec,qualities,started:new Date().toISOString(),arms:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
try{
 for(let round=0;round<rounds;round++)for(let order=0;order<qualities.length;order++){
  const quality=qualities[(round+order)%qualities.length];
  const arm={round:round+1,order:order+1,quality,errors:[]};result.arms.push(arm);
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  try{
   const page=await browser.newPage();page.setDefaultTimeout(90000);
   page.on('pageerror',error=>arm.errors.push(String(error)));
   await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async({encoded,quality,name})=>{
    const {Player}=await import('/web/generated/index.js');
    window.player=new Player(document.querySelector('#surface'),{mode:'software',decodeQuality:quality,width:1280,height:720,softwarePresenter:'auto'});
    const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
    await player.open(new File([bytes],name));await player.play();
   },{encoded,quality,name:fixture.split('/').at(-1)});
   await page.waitForFunction(()=>player.diagnostics.backend?.rendered>=80);
   const cdp=await browser.newBrowserCDPSession();
   const firstProcesses=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const first=await page.evaluate(()=>({position:player.state.currentTime,frames:player.diagnostics.backend.rendered,drops:Number(player.current.backend.properties.get('decoder-frame-drop-count')??0),presentationDrops:Number(player.current.backend.properties.get('frame-drop-count')??0),policy:player.diagnostics.backend.decodePolicy,presenter:player.diagnostics.backend.softwarePresenter,dimensions:player.current.backend.properties.get('video-params')}));
   const start=performance.now();await page.waitForTimeout(windowSeconds*1000);const elapsed=(performance.now()-start)/1000;
   const last=await page.evaluate(()=>({position:player.state.currentTime,frames:player.diagnostics.backend.rendered,drops:Number(player.current.backend.properties.get('decoder-frame-drop-count')??0),presentationDrops:Number(player.current.backend.properties.get('frame-drop-count')??0),policy:player.diagnostics.backend.decodePolicy}));
   const lastProcesses=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
   const processes=lastProcesses.map(process=>({type:process.type,cpuSeconds:Math.max(0,process.cpuTime-(firstProcesses.find(previous=>previous.id===process.id)?.cpuTime??process.cpuTime))}));
   Object.assign(arm,{elapsed,first,last,processes,chromeCpuPercent:100*processes.reduce((sum,process)=>sum+process.cpuSeconds,0)/elapsed,positionAdvance:last.position-first.position,frames:last.frames-first.frames,decoderDrops:last.drops-first.drops,presentationDrops:last.presentationDrops-first.presentationDrops});
   arm.accepted=arm.errors.length===0&&first.policy?.requested===quality&&last.policy?.requested===quality&&(!expectedCodec||last.policy?.codec===expectedCodec)&&arm.positionAdvance>=elapsed*.9&&arm.positionAdvance<=elapsed*1.1&&arm.frames>=elapsed*expectedFps*.75&&arm.decoderDrops===0;
   await page.evaluate(async()=>{await player.pause();await player.seek(6);await player.seek(2);await player.destroy();});
   arm.cleaned=await page.evaluate(()=>document.querySelectorAll('iframe').length===0);
  }catch(error){arm.error=String(error.stack??error);process.exitCode=1;}
  finally{await browser.close();await writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');}
 }
}finally{server.kill();result.finished=new Date().toISOString();await writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');}
if(result.arms.some(arm=>!arm.accepted||!arm.cleaned))process.exitCode=1;
console.log(output,JSON.stringify(result.arms.map(({round,quality,chromeCpuPercent,accepted,error})=>({round,quality,chromeCpuPercent,accepted,error}))));
