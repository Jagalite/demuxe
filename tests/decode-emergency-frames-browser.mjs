// SPDX-License-Identifier: Apache-2.0
// Frame-cadence and retained-picture screen for FFmpeg skip_frame=noref.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const out=`results/decode-policy/retained-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
await mkdir('results/decode-policy/fixtures',{recursive:true});
for(const [name,encoder,extra] of [['h264-b.mkv','libx264',['-preset','fast','-crf','20','-bf','3']],['mpeg1-b.mpg','mpeg1video',['-q:v','4','-bf','2']],['mpeg2-b.mkv','mpeg2video',['-q:v','4','-bf','2']],['mpeg4-b.avi','mpeg4',['-q:v','4','-bf','2']]]){
 const target=`results/decode-policy/fixtures/${name}`;
 try{await readFile(target);}catch{execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','build/fixtures/software-full/h264-aac.mp4','-t','4','-an','-c:v',encoder,...extra,target],{stdio:'ignore'});}
}
const allCases=[['h264','results/decode-policy/fixtures/h264-b.mkv',.625],['hevc','build/fixtures/software-full/hevc-ac3.mkv',.667],['mpeg1video','results/decode-policy/fixtures/mpeg1-b.mpg',.667],['mpeg2video','results/decode-policy/fixtures/mpeg2-b.mkv',.625],['mpeg4','results/decode-policy/fixtures/mpeg4-b.avi',.667]];
const cases=process.env.ONLY_CODEC?allCases.filter(([codec])=>codec===process.env.ONLY_CODEC):allCases;
const result={started:new Date().toISOString(),arms:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 for(const [codec,path,referenceTime] of cases){
  const bytes=await readFile(path),encoded=bytes.toString('base64'),sha256=createHash('sha256').update(bytes).digest('hex');
  for(const emergency of [false,true]){
   const arm={codec,path,sha256,referenceTime,emergency};result.arms.push(arm);
   const page=await browser.newPage();page.setDefaultTimeout(60000);
   try{
    await page.goto(origin+'/examples/custom-controls.html');
    await page.evaluate(async({encoded,emergency})=>{
     const {WasmPlayer}=await import('/web/generated/internal/wasm-player.js');
     const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;document.querySelector('#surface').replaceChildren(canvas);
     const player=window.emergencyPlayer=new WasmPlayer(canvas,{mode:'software'});
     await player.ready;
     if(emergency)await player.command('set','vd-lavc-o','max_pixels=8294400,skip_frame=noref');
     const data=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
     await player.open(new File([data],'b-pictures.mkv'));await player.play();
    },{encoded,emergency});
    await page.waitForFunction(()=>emergencyPlayer.diagnostics?.rendered>=5);
    const first=await page.evaluate(()=>({frames:emergencyPlayer.diagnostics.rendered,position:emergencyPlayer.properties.get('time-pos')}));
    await page.waitForTimeout(1300);
    const last=await page.evaluate(()=>({frames:emergencyPlayer.diagnostics.rendered,position:emergencyPlayer.properties.get('time-pos')}));
    arm.frames=last.frames-first.frames;arm.positionAdvance=last.position-first.position;
    await page.evaluate(()=>emergencyPlayer.pause());
    await page.evaluate(time=>emergencyPlayer.seek(time),referenceTime);
    await page.waitForFunction(time=>Math.abs((emergencyPlayer.properties.get('time-pos')??0)-time)<.07&&!emergencyPlayer.diagnostics?.seeking,referenceTime,{timeout:8000});
    await page.locator('#surface canvas').screenshot({path:`${out}/${codec}-${emergency?'emergency':'exact'}.png`});
    arm.seekPosition=await page.evaluate(()=>emergencyPlayer.properties.get('time-pos'));
    await page.evaluate(()=>emergencyPlayer.destroy());
    await page.waitForFunction(()=>document.querySelectorAll('iframe').length===0);
    arm.cleaned=true;
   }catch(error){arm.error=String(error.stack??error);arm.failureState=await page.evaluate(()=>({properties:Object.fromEntries(emergencyPlayer?.properties??[]),diagnostics:emergencyPlayer?.diagnostics})).catch(()=>null);process.exitCode=1;}
   finally{await page.close();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');}
  }
 }
}finally{await browser.close();server.kill();result.finished=new Date().toISOString();await writeFile(`${out}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(out,JSON.stringify(result.arms.map(({codec,emergency,frames,positionAdvance,seekPosition,error})=>({codec,emergency,frames,positionAdvance,seekPosition,error}))));}
