// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=`results/decode-policy/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
await mkdir('results/decode-policy/fixtures',{recursive:true});
for(const [name,encoder,extra] of [['av1-grain.mkv','libsvtav1',['-preset','10','-crf','42','-svtav1-params','film-grain=8:film-grain-denoise=0']],['mpeg2.mkv','mpeg2video',['-q:v','5']],['mjpeg.avi','mjpeg',['-q:v','5']]]){
 const target=`results/decode-policy/fixtures/${name}`;
 try{await readFile(target);}catch{execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','build/fixtures/software-full/h264-aac.mp4','-t','4','-an','-c:v',encoder,...extra,target],{stdio:'ignore'});}
}
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={started:new Date().toISOString(),browser:browser.version(),arms:[]};
try {
 const cases=[['h264','build/fixtures/software-full/h264-aac.mp4'],['hevc','build/fixtures/software-full/hevc-ac3.mkv'],['av1','results/decode-policy/fixtures/av1-grain.mkv'],['mpeg4','build/fixtures/software-full/mpeg4-mp3.avi'],['mpeg2video','results/decode-policy/fixtures/mpeg2.mkv'],['mjpeg','results/decode-policy/fixtures/mjpeg.avi']];
 for(const [codec,file] of cases.filter(([codec])=>!process.env.ONLY_CODEC||codec===process.env.ONLY_CODEC)){
  const bytes=(await readFile(file)).toString('base64');
  for(const quality of ['exact','balanced','performance']){
   const page=await browser.newPage();page.setDefaultTimeout(60000);
   const arm={codec,quality,errors:[]};result.arms.push(arm);
   page.on('pageerror',error=>arm.errors.push(String(error)));
   try {
    await page.goto(origin+'/examples/custom-controls.html');
    await page.evaluate(async({bytes,quality,file})=>{
      const {Player}=await import('/web/generated/index.js');
      window.player=new Player(document.querySelector('#surface'),{mode:'software',decodeQuality:quality,adaptiveFrameDrop:false,softwarePresenter:'auto',width:640,height:360});
      const data=Uint8Array.from(atob(bytes),char=>char.charCodeAt(0));
      await player.open(new File([data],file));await player.play();
    },{bytes,quality,file:file.split('/').at(-1)});
    await page.waitForFunction(()=>window.player?.diagnostics.backend?.rendered>=20);
    const cdp=await browser.newBrowserCDPSession();
    const before=await cdp.send('SystemInfo.getProcessInfo');
    const started=Date.now();
    const first=await page.evaluate(()=>({position:player.state.currentTime,d:player.diagnostics.backend,params:player.state.mediaInfo}));
    await page.waitForTimeout(1500);
    const last=await page.evaluate(()=>({position:player.state.currentTime,d:player.diagnostics.backend,drops:player.current?.backend.properties.get('decoder-frame-drop-count')}));
    const after=await cdp.send('SystemInfo.getProcessInfo');
    const elapsed=(Date.now()-started)/1000;
    const parts=after.processInfo.map(process=>({type:process.type,cpuSeconds:Math.max(0,process.cpuTime-(before.processInfo.find(prior=>prior.id===process.id)?.cpuTime??process.cpuTime))}));
    arm.chromeCpuPercent=100*parts.reduce((sum,part)=>sum+part.cpuSeconds,0)/elapsed;
    arm.processCpuPercent=Object.fromEntries([...new Set(parts.map(part=>part.type))].map(type=>[type,100*parts.filter(part=>part.type===type).reduce((sum,part)=>sum+part.cpuSeconds,0)/elapsed]));
    arm.positionAdvance=last.position-first.position;
    arm.frames=last.d.rendered-first.d.rendered;
    arm.policy=last.d.decodePolicy;
    arm.presenter=last.d.softwarePresenter;
    arm.drops=last.drops;
    arm.videoParams=await page.evaluate(()=>player.current?.backend.properties.get('video-params'));
    assert.equal(arm.policy.codec,codec);
    assert.equal(arm.policy.requested,quality);
    assert.ok(arm.positionAdvance>1);
    assert.ok(arm.frames>10);
    await page.evaluate(()=>player.pause());
    await page.evaluate(()=>player.seek(2));
    await page.evaluate(()=>player.seek(0.5));
    await page.locator('#surface canvas').screenshot({path:`${out}/${codec}-${quality}.png`});
    await page.evaluate(async()=>{await player.setPlaybackRate(1.5);await player.play();});
    const rateStart=await page.evaluate(()=>player.state.currentTime);
    await page.waitForTimeout(700);
    arm.rateAdvance=(await page.evaluate(()=>player.state.currentTime))-rateStart;
    assert.ok(arm.rateAdvance>.75);
    await page.evaluate(async()=>{await player.setPlaybackRate(1);await player.seek(3);await player.play();});
    await page.waitForFunction(()=>player.state.status==='ended',null,{timeout:12000});
    arm.eof=true;
    await page.evaluate(()=>player.destroy());
    await page.waitForFunction(()=>document.querySelectorAll('iframe').length===0);
    arm.cleaned=true;
   }catch(error){arm.error=String(error.stack??error);}
   finally{await page.close();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');}
  }
 }
}finally{await browser.close();server.kill();result.finished=new Date().toISOString();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');}
if(result.arms.some(arm=>arm.error||arm.errors.length))process.exitCode=1;
console.log(out,JSON.stringify(result.arms.map(({codec,quality,error,frames,positionAdvance,policy})=>({codec,quality,error,frames,positionAdvance,shortcuts:policy?.shortcuts}))));
