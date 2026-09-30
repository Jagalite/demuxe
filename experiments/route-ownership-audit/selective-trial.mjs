// SPDX-License-Identifier: Apache-2.0
// Uses an isolated runtime copy with codec admission widened for a bounded proof.
import {chromium} from 'playwright';
import {writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root='build/head-to-head/assets-release-supplement-20260925-04/fixtures';
const cases=[['pcm24','build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv'],['pcm16',root+'/h264-pcm16/index.mkv'],['eac3-stereo','results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-eac3.mkv'],['eac3-51',root+'/h264-eac3/index.mkv']];
const server=await serve({assetRoot:'build/route-ownership-audit'});
const rows=[];
try{
 for(const [name,file] of cases){
  for(const arm of ['hybrid','selective']){
   const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
   const row={name,file,arm,browser:browser.version()};rows.push(row);
   try{
    const page=await browser.newPage({viewport:{width:960,height:540}});
    const media=await page.context().newCDPSession(page),events=[];media.on('Media.playerPropertiesChanged',e=>events.push(e));await media.send('Media.enable');
    await page.goto(server.origin+'/experiment/page.html');
    await page.evaluate(async arm=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540,...(arm==='hybrid'?{mode:'hybrid'}:{})});window.errors=[];player.addEventListener('error',e=>errors.push(String(e.detail?.message??e.detail)));const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);},arm);
    await page.locator('#source').setInputFiles(file);
    await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));await page.evaluate(()=>player.play());
    const state=async()=>page.evaluate(()=>({plan:player.diagnostics?.plan?.id,position:player.state.currentTime,backend:player.diagnostics?.backend,errors:errors.slice(),admission:player.diagnostics?.planAdmission?.find(x=>x.id==='native-video-mpv-audio')}));
    await page.waitForTimeout(1800);row.steady=await state();
    const cdp=await browser.newBrowserCDPSession();const snap=async()=>({at:performance.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await state()});
    const first=await snap();await page.waitForTimeout(9000);const last=await snap();
    const before=new Map(first.processes.map(x=>[x.id,x]));row.cpu={browser:0,renderer:0,gpu:0,audioService:0,other:0};row.stable=first.processes.length===last.processes.length;
    for(const p of last.processes){const old=before.get(p.id);if(!old){row.stable=false;continue;}const role=p.type==='browser'?'browser':p.type==='renderer'?'renderer':p.type==='GPU'?'gpu':p.type.includes('audio.mojom.AudioService')?'audioService':'other';row.cpu[role]+=100*(p.cpuTime-old.cpuTime)/((last.at-first.at)/1000);}
    row.cpu.whole=Object.values(row.cpu).reduce((a,b)=>a+b,0);row.cpu.progress=last.state.position-first.state.position;row.cpu.dropped=last.state.backend?.dropped;row.cpu.underruns=last.state.backend?.mpvAudio?.preEofUnderruns;
    await page.evaluate(()=>player.setPlaybackRate(1.5));await page.waitForTimeout(1100);row.rate=await state();
    await page.evaluate(()=>player.setPlaybackRate(1));await page.evaluate(()=>player.seek(6));await page.waitForTimeout(700);row.seek=await state();
    const props=events.flatMap(e=>e.properties??[]);row.decoder=props.find(p=>p.name==='kVideoDecoderName')?.value??null;row.platform=props.find(p=>p.name==='kIsPlatformVideoDecoder')?.value??null;
    row.passed=row.steady.plan===(arm==='hybrid'?'hybrid':'native-video-mpv-audio')&&row.cpu.progress>8.5&&!row.rate.errors.length&&!row.seek.errors.length&&row.seek.position>=6&&(!row.cpu.underruns);
    await page.evaluate(()=>player.destroy());await page.close();
   }catch(error){row.error=String(error?.stack??error);row.passed=false;}
   finally{console.log(JSON.stringify({name,arm,passed:row.passed,error:row.error,cpu:row.cpu,plan:row.steady?.plan,admission:row.steady?.admission?.reason,decoder:row.decoder}));await browser.close();}
  }
 }
}finally{await server.close();await mkdir('results/route-ownership-audit',{recursive:true});await writeFile('results/route-ownership-audit/selective-trial.json',JSON.stringify(rows,null,2)+'\n');}
