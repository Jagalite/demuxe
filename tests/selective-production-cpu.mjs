// SPDX-License-Identifier: Apache-2.0
// Fresh, counterbalanced, production-route CPU windows after correctness gates.
import {collectCpuWindow,summarizeCpu,benchmarkPolicy,CpuBrowserBlocks} from './head-to-head/benchmark-browser.mjs';
import {CampaignProgress} from './head-to-head/campaign-progress.mjs';
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
const progress=new CampaignProgress({total:names.length*6,output:out+'/progress.json',estimateSeconds:45});
const blocks=new CpuBrowserBlocks({progress});

try{
 for(const name of names){
  if(!cases[name])throw Error('Unknown case '+name);
  for(const {round,arm} of Array.from({length:3},(_,i)=>(i%2?['selective','hybrid']:['hybrid','selective']).map(arm=>({round:i+1,arm}))).flat()){
   progress.start(name+' '+arm+' round '+round);
   const launched=await blocks.acquire(name+':'+round),browser=launched.browser;
   const row={name,round,arm,browserBlock:launched.blockId,blockArm:launched.armIndex,idleBeforeArm:launched.idle,browserLaunch:launched.identity,benchmarkPolicy,browser:browser.version(),fixture:cases[name]};rows.push(row);
   let context;
   try{
    context=await browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
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
    progress.phase('warmup',5,23);await page.waitForTimeout(5000);progress.phase('measurement',20,3);
    const cdp=await browser.newBrowserCDPSession();
    try{row.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>({plan:player.diagnostics.plan?.id,position:player.state.currentTime,backend:player.diagnostics.backend,errors,visible:document.visibilityState==='visible',focused:document.hasFocus()})));}finally{await cdp.detach();}
    const first=row.samples[0],last=row.samples.at(-1),measurement=summarizeCpu(row.samples);
    const elapsed=measurement.wallSeconds,stable=measurement.processIdsStable,roles=measurement.roles;
    row.measurement=measurement;row.elapsed=elapsed;row.stable=stable;row.roles=roles?{browser:roles.browser,renderer:roles.renderer,gpu:roles.gpu,audioService:roles.audio,other:roles.utility+roles.other}:null;row.whole=measurement.oneCorePercent;
    row.rssMiB=measurement.peakSummedRssKiB/1024;
    row.first={plan:first.state.plan,position:first.state.position,errors:first.state.errors};
    row.last={plan:last.state.plan,position:last.state.position,errors:last.state.errors,
      mpvAudio:last.state.backend?.mpvAudio,
      remux:last.state.backend?.remux,
      presentation:last.state.backend?.presentation,
      dropped:last.state.backend?.dropped};
    row.accepted=stable&&row.samples.every(s=>!s.state.errors.length&&s.state.visible&&s.state.focused)&&Math.abs(last.state.position-first.state.position-elapsed)<1&&
      last.state.plan===(arm==='hybrid'?'hybrid':'native-video-mpv-audio')&&
      (arm==='hybrid'||last.state.backend?.mpvAudio?.preEofUnderruns===0);
    console.log(JSON.stringify({name,round,arm,accepted:row.accepted,whole:row.whole,...roles,startupMs:row.startupMs,rssMiB:row.rssMiB}));
    await page.evaluate(()=>player.destroy());await page.close();
   }catch(error){row.accepted=false;row.error=String(error?.stack??error);console.error(name,round,arm,row.error);}
   finally{try{await context?.close();}catch(error){row.accepted=false;row.cleanupError=String(error);await blocks.invalidate(error);}await writeFile(out+'/result.json',JSON.stringify(rows,null,2)+'\n');progress.finish(row.accepted?'passed':'failed');}

  }
 }
}finally{progress.close();await blocks.close();for(const row of rows)if(blocks.records.find(b=>b.id===row.browserBlock)?.status==='failed'){row.accepted=false;row.blockError='Comparison block failed cleanup';}await writeFile(out+'/result.json',JSON.stringify(rows,null,2)+'\n');await writeFile(out+'/browser-blocks.json',JSON.stringify(blocks.records,null,2)+'\n');await server.close();}
console.log(out);
