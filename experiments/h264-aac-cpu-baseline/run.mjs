// SPDX-License-Identifier: Apache-2.0
// One-fixture diagnostic only. This does not change player routing or production code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const assets=path.join(root,'build/head-to-head/assets-release-supplement-20260925-04');
const harness=path.join(root,'tests/head-to-head');
const out=path.resolve(process.argv[2]??path.join(root,'results/head-to-head/h264-aac-cpu-baseline-20260925'));
await fs.mkdir(out,{recursive:true});
const media=await fs.readFile(path.join(assets,'fixtures/aac.mp4'));
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json'));
const fixture={file:'aac.mp4',frameRate:30,video:true,audio:true};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const orders=[['idle','plain','auto'],['auto','plain','idle'],['plain','idle','auto'],['idle','auto','plain'],['plain','auto','idle']];
const result={startedAt:new Date().toISOString(),assets,fixtureSHA256:createHash('sha256').update(media).digest('hex'),
  manifestSHA256:createHash('sha256').update(manifestBytes).digest('hex'),
  browserConfig:{channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required'],viewport:{width:960,height:540},deviceScaleFactor:1,profile:'fresh Playwright default per arm',warmupSeconds:5,measurementSeconds:20,sampleIntervalSeconds:2},
  orders,arms:[]};
const write=()=>fs.writeFile(path.join(out,'raw.json'),JSON.stringify(result,null,2)+'\n');
await write();
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
function groups(p,commands){const t=p.type??'',command=commands[p.id]??'';if(t==='browser')return 'browser';if(t==='renderer')return 'renderer';if(t==='GPU')return 'gpu';if(t==='audio.mojom.AudioService'||/audio\.mojom\.AudioService/.test(command))return 'audio';if(t==='utility'||t.includes('.mojom.'))return 'utility';return 'other';}
function cpuByGroup(a,b,wall,commands){const x={browser:0,renderer:0,gpu:0,audio:0,utility:0,other:0};const before=new Map(a.map(p=>[p.id,p]));for(const p of b){const old=before.get(p.id);if(old)x[groups(p,commands)]+=100*(p.cpuTime-old.cpuTime)/wall;}return x;}
async function runArm(round,arm,sequence=false,browserOverride=null){
  let browser=browserOverride,page,context,cdp,mediaSession;
  const rec={round,arm,sequence,startedAt:new Date().toISOString(),errors:[],mediaEvents:[]};result.arms.push(rec);await write();
  try{
    if(!browser)browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required'],timeout:20000});
    rec.chromeVersion=browser.version();
    context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
    page=await context.newPage();page.setDefaultTimeout(10000);
    page.on('pageerror',e=>rec.errors.push(String(e)));
    page.on('requestfailed',r=>rec.errors.push('request: '+r.url()+' '+r.failure()));
    if(arm!=='idle'){
      mediaSession=await context.newCDPSession(page);
      mediaSession.on('Media.playerPropertiesChanged',e=>{if(rec.mediaEvents.length<100)rec.mediaEvents.push(e);});
      mediaSession.on('Media.playerErrorsRaised',e=>rec.errors.push(JSON.stringify(e)));
      await mediaSession.send('Media.enable');
      await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
      await page.waitForFunction(()=>window.api);
      await page.evaluate(c=>api.start(c),{...fixture,id:arm,fixture:'aac-mp4',player:arm==='plain'?'video':'demuxe',lane:arm==='plain'?'default':'auto'});
      await page.waitForFunction(()=>api.snapshot().position>.25);
    }else{await page.goto('about:blank');await page.bringToFront();}
    await delay(5000);
    cdp=await browser.newBrowserCDPSession();
    const samples=[];
    for(let tick=0;tick<=20;tick+=2){
      const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
      const state=arm==='idle'?null:await page.evaluate(()=>api.snapshot());
      let rssKiB=null;try{rssKiB=execFileSync('ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).reduce((s,n)=>s+Number(n),0);}catch{}
      samples.push({at:Date.now(),processes,rssKiB,state});
      if(tick<20)await delay(2000);
    }
    rec.samples=samples;
    const first=samples[0],last=samples.at(-1),wall=(last.at-first.at)/1000;
    const commandLines=execFileSync('ps',['-p',first.processes.map(p=>p.id).join(','),'-o','pid=,command='],{encoding:'utf8'}).trim().split('\n');
    rec.processCommands=Object.fromEntries(commandLines.map(line=>{const m=/^\s*(\d+)\s+(.*)$/.exec(line);return m?[m[1],m[2]]:null;}).filter(Boolean));
    const firstIds=first.processes.map(p=>p.id).sort().join(',');
    rec.stableProcesses=samples.every(s=>s.processes.map(p=>p.id).sort().join(',')===firstIds);
    rec.wallSeconds=wall;
    rec.cpu=cpuByGroup(first.processes,last.processes,wall,rec.processCommands);
    rec.whole=Object.values(rec.cpu).reduce((a,b)=>a+b,0);
    rec.peakSummedRssKiB=Math.max(...samples.map(s=>s.rssKiB??0));
    if(arm!=='idle'){
      rec.route=last.state.route;
      rec.progressSeconds=last.state.position-first.state.position;
      rec.mediaTime={first:first.state.position,last:last.state.position};
      rec.frames={presented:last.state.video?.total-first.state.video?.total,dropped:last.state.video?.dropped-first.state.video?.dropped};
      rec.playerErrors=samples.flatMap(s=>s.state?.errors??[]);
      rec.visible=samples.every(s=>s.state?.visible&&s.state?.focused);
      rec.diagnostics=arm==='auto'?last.state.diagnostics:null;
      if(Math.abs(rec.progressSeconds-wall)>1||rec.frames.presented<wall*30-20||rec.frames.dropped>Math.max(2,wall*.3)||!rec.visible||rec.playerErrors.length||rec.route!=='native-direct')rec.errors.push('playback/route acceptance failed');
    }
    if(!rec.stableProcesses)rec.errors.push('process turnover');
    rec.accepted=rec.errors.length===0;
  }catch(e){rec.errors.push(String(e.stack??e));rec.accepted=false;}
  finally{
    try{if(arm!=='idle'&&page)await page.evaluate(()=>api.stop());}catch(e){rec.errors.push('stop: '+String(e));}
    try{await mediaSession?.detach();}catch{}
    try{await cdp?.detach();}catch{}
    try{await context?.close();}catch{}
    if(!browserOverride)try{await browser?.close();}catch(e){rec.errors.push('close: '+String(e));}
    rec.finishedAt=new Date().toISOString();await write();
    console.log(round,arm,rec.accepted,rec.whole?.toFixed(1),rec.cpu?.browser?.toFixed(1),rec.errors[0]??'');
  }
}
try{
  for(let i=0;i<orders.length;i++)for(const arm of orders[i])await runArm(i+1,arm);
  // Same launch, new page/context per arm; kept distinct from the primary fresh-launch rounds.
  const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required'],timeout:20000});
  try{for(const arm of ['idle','plain','auto'])await runArm(6,arm,true,browser);}finally{await browser.close();}
}finally{await server.close();result.finishedAt=new Date().toISOString();await write();}
