// SPDX-License-Identifier: Apache-2.0
// Fresh, counterbalanced, production-route CPU windows after correctness gates.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const cases={
  ac3:'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-ac3.mkv',
  dts:'results/unsupported-audio-cpu/20260924-codec-variants/fixtures/h264-1080p60-dts.mkv',
  hevc:'results/unsupported-audio-cpu/20260924-hevc-qualified/fixtures/hevc-main10-1080p30-ac3.mkv',
};
const names=process.argv.slice(2).length?process.argv.slice(2):Object.keys(cases);
const out='results/selective-production/cpu-'+Date.now();await mkdir(out,{recursive:true});
const server=await serve(),rows=[];
const rssMiB=pid=>{try{return Number(execFileSync('ps',['-o','rss=','-p',String(pid)],{encoding:'utf8'}).trim())/1024;}catch{return null;}};
try{
 for(const name of names){
  if(!cases[name])throw Error('Unknown case '+name);
  for(const [round,arm] of ['hybrid','selective','selective','hybrid'].entries()){
   const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
   const row={name,round,arm,browser:browser.version(),fixture:cases[name]};rows.push(row);
   try{
    const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
    await page.goto(server.origin+'/experiment/page.html');
    await page.evaluate(async arm=>{
      const {Player}=await import('/web/generated/index.js');
      window.player=new Player(document.querySelector('#surface'),{width:960,height:540,...(arm==='hybrid'?{mode:'hybrid'}:{})});
      window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail?.message??event.detail)));
      const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
    },arm);
    await page.locator('#source').setInputFiles(cases[name]);
    const begun=performance.now();await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));await page.evaluate(()=>player.play());
    await page.waitForFunction(()=>player.state.currentTime>.2,undefined,{timeout:15000});
    row.startupMs=performance.now()-begun;
    await page.waitForTimeout(4000);
    const cdp=await browser.newBrowserCDPSession();
    const snap=async()=>({at:performance.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,
      state:await page.evaluate(()=>({plan:player.diagnostics.plan?.id,position:player.state.currentTime,backend:player.diagnostics.backend,errors}))});
    const first=await snap();await page.waitForTimeout(20000);const last=await snap();
    const elapsed=(last.at-first.at)/1000,prior=new Map(first.processes.map(p=>[p.id,p]));
    const roles={browser:0,renderer:0,gpu:0,audioService:0,other:0};let stable=first.processes.length===last.processes.length;
    for(const p of last.processes){const before=prior.get(p.id);if(!before){stable=false;continue;}
      const role=p.type==='browser'?'browser':p.type==='renderer'?'renderer':p.type==='GPU'?'gpu':p.type.includes('audio.mojom.AudioService')?'audioService':'other';
      roles[role]+=100*(p.cpuTime-before.cpuTime)/elapsed;
    }
    row.elapsed=elapsed;row.stable=stable;row.roles=roles;row.whole=Object.values(roles).reduce((a,b)=>a+b,0);
    row.rssMiB=last.processes.map(p=>rssMiB(p.id)).filter(x=>x!==null).reduce((a,b)=>a+b,0);
    row.first={plan:first.state.plan,position:first.state.position,errors:first.state.errors};
    row.last={plan:last.state.plan,position:last.state.position,errors:last.state.errors,
      mpvAudio:last.state.backend?.mpvAudio,
      remux:last.state.backend?.remux,
      presentation:last.state.backend?.presentation,
      dropped:last.state.backend?.dropped};
    row.accepted=stable&&!last.state.errors.length&&last.state.position-first.state.position>=19&&
      last.state.plan===(arm==='hybrid'?'hybrid':'native-video-mpv-audio')&&
      (arm==='hybrid'||last.state.backend?.mpvAudio?.preEofUnderruns===0);
    console.log(JSON.stringify({name,round,arm,accepted:row.accepted,whole:row.whole,...roles,startupMs:row.startupMs,rssMiB:row.rssMiB}));
    await page.evaluate(()=>player.destroy());await page.close();
   }catch(error){row.error=String(error?.stack??error);console.error(name,round,arm,row.error);}
   finally{await writeFile(out+'/result.json',JSON.stringify(rows,null,2)+'\n');await browser.close();}
  }
 }
}finally{await server.close();}
console.log(out);
