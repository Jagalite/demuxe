// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../pipeline-qualification/server.mjs';
import {CpuBrowserBlocks,collectCpuWindow,summarizeCpu} from '../../tests/head-to-head/benchmark-browser.mjs';
const fixture=process.env.PCM_FIXTURE??'build/head-to-head/assets-release-supplement-20260925-04/fixtures/pcm.mkv';
const mode=process.argv[2]??'correctness',out='results/pcm24-routing/'+(process.env.RESULT_SUFFIX??mode)+'.json';
const server=await serve({assetRoot:mode==='fidelity'?'build/pcm24-fidelity':'build/pcm24-routing',mediaPaths:{pcm:fixture}});
const noDrawServer=mode==='cpu'?await serve({assetRoot:'build/pcm24-no-draw',mediaPaths:{pcm:fixture}}):null;
const rows=[];const save=()=>writeFile(out,JSON.stringify(rows,null,2)+'\n');
const expected={auto:'hybrid',hybrid:'hybrid',selective:'native-video-mpv-audio',flac:'native-flac',direct:'direct','hybrid-no-draw':'hybrid','hybrid-no-audio':'hybrid'};
async function start(browser,arm){
 console.log('START',arm);
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1}),page=await context.newPage();
 await page.goto((arm==='hybrid-no-draw'?noDrawServer:server).origin+'/experiment/page.html');await page.bringToFront();
 const media=await context.newCDPSession(page),events=[];media.on('Media.playerPropertiesChanged',e=>events.push(e));await media.send('Media.enable');
 // Revert both qualification edits for unmodified Auto and FLAC tests.
 if(['auto','flac'].includes(arm))await page.route('**/web/generated/unified-player.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("['ac3', 'dts', 'pcm_s24le'].includes(selectiveAudio.codec)","['ac3', 'dts'].includes(selectiveAudio.codec)").replace("['ac3', 'dts', 'pcm_s24le'].includes(t.codec)","['ac3', 'dts'].includes(t.codec)")});});

 await page.evaluate(async arm=>{
  window.errors=[];
  if(arm==='direct'){const v=document.createElement('video');v.width=960;v.height=540;v.src='/media/pcm';document.querySelector('#surface').append(v);window.video=v;return;}
  const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{width:960,height:540,...(arm.startsWith('hybrid')?{mode:'hybrid'}:{}),...(arm==='flac'?{automaticAudioAdaptation:'lossless'}:{})});
  player.addEventListener('error',e=>errors.push(String(e.detail?.message??e.detail)));
  const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
 },arm);
 if(arm!=='direct'){await page.locator('#source').setInputFiles(fixture);await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));if(arm==='hybrid-no-audio')await page.evaluate(()=>player.current.backend.command('set','aid','no'));}
 const command=async(method,arg)=>{console.log('COMMAND',arm,method,arg);return Promise.race([page.evaluate(async({method,arg})=>{if(window.player)return player[method](...(arg===undefined?[]:[arg]));if(method==='seek'){video.currentTime=arg;await new Promise(r=>video.addEventListener('seeked',r,{once:true}));}else if(method==='setPlaybackRate')video.playbackRate=arg;else if(method==='destroy'){video.pause();video.removeAttribute('src');video.load();}else return video[method]();},{method,arg}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Command timeout '+method)),20000);t.unref();})]);};
 if(mode==='fidelity')await page.evaluate(()=>{window.captures=[];player.current.backend.mpvAudio.engine.addEventListener('output',e=>{if(e.detail.kind==='capture')captures.push(e.detail);});});
 await command('play');
 const state=()=>page.evaluate(()=>({plan:window.player?player.diagnostics.plan?.id:'direct',position:window.player?player.state.currentTime:video.currentTime,paused:window.player?player.state.status==='paused':video.paused,ended:window.player?player.state.status==='ended':video.ended,backend:window.player?player.diagnostics.backend:{rendered:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames,audioDecodedBytes:video.webkitAudioDecodedByteCount},audio:window.player?player.current.backend.audioDiagnostics?.():null,admission:window.player?player.diagnostics.planAdmission:null,errors,visible:document.visibilityState,focused:document.hasFocus()}));
 return {context,page,command,state,events};
}
try{
 if(mode==='fidelity'){
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 try{const run=await start(browser,'selective');await run.page.waitForTimeout(2500);rows.push({fixture,state:await run.state(),captures:await run.page.evaluate(()=>captures)});await run.command('destroy');await run.context.close();}finally{await browser.close();}
 }else if(mode==='correctness'){
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 try{for(const arm of (process.env.ARMS?.split(',')??['auto','hybrid','selective','flac','direct'])){
 const row={arm,browser:browser.version(),fixture,sha256:createHash('sha256').update(await readFile(fixture)).digest('hex'),phases:[]};rows.push(row);let run;
 try{run=await start(browser,arm);const {page,command,state}=run;
 const sample=async(name,ms=800)=>{await page.waitForTimeout(ms);const s=await state();row.phases.push({name,...s});console.log('PHASE',arm,name,s.position);await save();return s;};
 await sample('steady',3000);
 row.rates=[];for(const rate of [0.5,1.5,2,1]){await command('setPlaybackRate',rate);await page.waitForTimeout(700);const a=await state(),t=performance.now();const b=await sample('rate '+rate,3000);row.rates.push({rate,observed:(b.position-a.position)/((performance.now()-t)/1000)});}
 await command('pause');const paused=await sample('pause',200);const later=await sample('long pause',2200);row.pauseDelta=later.position-paused.position;
 await command('seek',8);const ps=await sample('paused seek',200);row.pausedSeekOK=ps.paused&&Math.abs(ps.position-8)<.15;
 await command('play');await sample('resume');row.seeks=[];for(const target of [24,4,18]){await command('seek',target);const s=await sample('seek '+target,700);row.seeks.push({target,position:s.position,ok:Math.abs(s.position-target-.7)<.3});}
 await command('seek',34);await sample('EOF',3500);await command('seek',4);await command('play');await sample('replay',1200);
 const props=run.events.flatMap(e=>e.properties??[]);row.media=props;
 await command('destroy');await page.waitForTimeout(300);row.workersAfterDestroy=page.workers().length;
 row.passed=row.phases.every(p=>p.plan===expected[arm]&&!p.errors.length)&&row.rates.every(r=>Math.abs(r.observed-r.rate)<.12)&&Math.abs(row.pauseDelta)<.03&&row.pausedSeekOK&&row.seeks.every(s=>s.ok)&&row.workersAfterDestroy===0;
 if(arm==='selective')row.passed&&=row.phases.every(p=>p.backend.mpvAudio?.preEofUnderruns===0)&&row.phases.filter(p=>p.name==='steady'||p.name==='replay').every(p=>Math.abs(p.backend.mpvAudio.errorMs)<50);
 }catch(e){row.error=String(e.stack??e);row.passed=false;}finally{await run?.context.close();await save();console.log(JSON.stringify({arm,passed:row.passed,error:row.error,rates:row.rates,plan:row.phases[0]?.plan,mpv:row.phases[0]?.backend?.mpvAudio?.errorMs}));}
 }}finally{await browser.close();}
 }else{
 const correctness=JSON.parse(await readFile('results/pcm24-routing/correctness.json'));
 const flacRecheck=JSON.parse(await readFile('results/pcm24-routing/flac-recheck.json'));correctness[correctness.findIndex(r=>r.arm==='flac')]=flacRecheck[0];
 for(const arm of ['hybrid','selective','flac','direct'])if(!correctness.find(r=>r.arm===arm)?.passed)throw Error('Correctness gate failed: '+arm);
 const blocks=new CpuBrowserBlocks();
 try{for(let round=1;round<=3;round++)for(const arm of (round%2?['hybrid','selective','flac','direct','hybrid-no-draw','hybrid-no-audio']:['hybrid-no-audio','hybrid-no-draw','direct','flac','selective','hybrid'])){
 // One launch across the bounded campaign avoids repeated hardware-key startup work.
 const launched=await blocks.acquire('pcm24-campaign');const row={round,arm,browserLaunch:launched.identity,idle:launched.idle};rows.push(row);let run;
 try{run=await start(launched.browser,arm);await run.page.waitForTimeout(5000);const cdp=await launched.browser.newBrowserCDPSession();row.samples=await collectCpuWindow(cdp,run.state);await cdp.detach();row.cpu=summarizeCpu(row.samples);const first=row.samples[0].state,last=row.samples.at(-1).state;row.advance=last.position-first.position;row.accepted=row.cpu.processIdsStable&&Math.abs(row.advance-row.cpu.wallSeconds)<.5&&row.samples.every(s=>s.state.plan===expected[arm]&&!s.state.errors.length&&s.state.visible==='visible'&&s.state.focused)&&!(last.backend.mpvAudio?.preEofUnderruns);await run.command('destroy');}catch(e){row.error=String(e.stack??e);row.accepted=false;}finally{await run?.context.close();await save();console.log(JSON.stringify({round,arm,accepted:row.accepted,cpu:row.cpu?.oneCorePercent,roles:row.cpu?.roles,error:row.error}));}
 }}finally{await blocks.close();await writeFile('results/pcm24-routing/browser-blocks.json',JSON.stringify(blocks.records,null,2));}
 }
}finally{await save();await server.close();await noDrawServer?.close();}
