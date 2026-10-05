// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {firefox} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

// Also runnable in the shared Chromium preview: no analyser or audio rerouting.
export async function recoveryProbe({kind='resume',rate=1,remote=false,pinned=false,remux=false,settled=false}={}){
 const {Player}=await import('/web/generated/index.js');
 const delay=ms=>new Promise(r=>setTimeout(r,ms)),host=document.createElement('div');host.style.cssText='width:640px;height:360px';document.body.append(host);
 const player=new Player(host,{preview:false,...(pinned?{mode:'native'}:{}),...(remux?{nativeRemux:'always'}:{})});
 const errors=[],switches=[],budgets=[],commands=[];player.addEventListener('error',e=>errors.push(String(e.detail?.message??e.detail)));
 const select=player.select,verify=player.playNativeVerified;
 player.select=async function(...args){switches.push({at:performance.now(),requirements:args[8]});return select.apply(this,args);};
 player.playNativeVerified=async function(...args){budgets.push(args[2]??2000);return verify.apply(this,args);};
 let result;
 try{
  const bytes=await(await fetch('/media/original')).arrayBuffer();
  const fixtureSHA256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  await player.open(remote?new URL('/media/original',location.href).href:new File([bytes],'example.mp4'));
  const initial=player.diagnostics.plan.id;await player.play();await player.setPlaybackRate(rate);
  switches.length=0;budgets.length=0;
  if(kind==='watchdog'){
   const video=player.surface,time=video.currentTime;
   Object.defineProperty(video,'currentTime',{configurable:true,get:()=>time});Object.defineProperty(video,'readyState',{configurable:true,get:()=>2});
   const began=performance.now();while((player.diagnostics.plan.id===initial||player.state.pendingOperation)&&performance.now()-began<5000)await delay(25);
   commands.push({kind,milliseconds:performance.now()-began,switchAfterMs:switches[0]?.at-began});
  }else{
   for(const target of (kind==='healthy'?[.5,1,5]:[1,5,9])){
    await player.pause();await player.seek(target);if(settled)await delay(250);
    const switchCount=switches.length,began=performance.now();let error;
    try{await player.play();}catch(e){error={code:e.code,message:e.message};}
    const acceptedAt=performance.now(),start=player.state.currentTime,v=player.surface,frames=v.getVideoPlaybackQuality().totalVideoFrames;
    // Poll observable output: Firefox can release play before its next audio-clock tick.
    for(let n=0;n<20&&!error&&!v.ended&&(player.state.currentTime<=start+.01||v.getVideoPlaybackQuality().totalVideoFrames<=frames);n++)await delay(25);
    commands.push({target,milliseconds:acceptedAt-began,switchAfterMs:switches[switchCount]?.at-began,error,plan:player.diagnostics.plan.id,position:player.state.currentTime,progress:!error&&(v.ended||player.state.currentTime>start+.01&&v.getVideoPlaybackQuality().totalVideoFrames>frames)});
    if(error)break;
   }
  }
  const start=player.state.currentTime;await delay(600);
  result={initial,final:player.diagnostics.plan.id,commands,budgets,errors,fixtureSHA256,progress:player.surface.ended||player.state.currentTime>start+.01,automatic:player.diagnostics.selection.automatic};
 }finally{await player.destroy();result&&(result.cleaned=host.querySelectorAll('video,canvas').length===0);host.remove();}
 return result;
}
export function validateRecovery(row,options){
 assert.equal(row.fixtureSHA256,'6c9cac6f4212f470d79a9f829f29ba459e6c3e401fab9feb6d757a10a507404c');
 assert.equal(row.initial,options.remux?'native-remux':'native-direct');assert.equal(row.cleaned,true);
 if(options.pinned){const failed=row.commands.find(c=>c.error);if(failed){assert.equal(failed.error.code,'NETWORK_TIMEOUT');assert.ok(failed.milliseconds<4000);}assert.equal(row.final,'native-direct');return;}
 assert.deepEqual(row.errors,[]);assert.equal(row.progress,true);
 for(const c of row.commands){assert.equal(c.error,undefined);if(c.kind!=='watchdog'){assert.equal(c.progress,true);assert.ok(c.position>=c.target-.05,'Recovery lost the source position');}if(Number.isFinite(c.switchAfterMs))assert.ok(c.switchAfterMs<2000,JSON.stringify(c));}
 if(options.remote||options.kind==='healthy'||options.settled||options.remux)assert.equal(row.final,row.initial);
 if(options.kind==='watchdog')assert.equal(row.final,'native-remux');
}
export const cases=[{name:'cold-1'},{name:'cold-2'},{name:'cold-3'},{name:'half-rate',rate:.5},{name:'double-rate',rate:2},{name:'healthy',kind:'healthy'},{name:'settled',settled:true},{name:'http',remote:true},{name:'already-remux',remux:true},{name:'pinned',pinned:true},{name:'buffered-wait-watchdog',kind:'watchdog'}];
if(process.argv[1]===import.meta.filename){
 const out=`results/firefox-fast-recovery/${Date.now()}`;await mkdir(out,{recursive:true});
 const server=await serve({mediaPaths:{original:'fixtures/example.mp4'}}),browser=await firefox.launch({headless:true,ignoreDefaultArgs:['--mute-audio'],firefoxUserPrefs:{'media.autoplay.default':0}});
 const report={browser:browser.version(),generatedSHA256:createHash('sha256').update(await readFile('web/generated/unified-player.js')).digest('hex'),cases:[]};
 try{for(const options of cases){const page=await browser.newPage();const row={options};report.cases.push(row);try{await page.goto(server.origin+'/experiment/page.html');row.result=await page.evaluate(recoveryProbe,options);validateRecovery(row.result,options);row.passed=true;}catch(e){row.error=String(e.stack);row.passed=false;process.exitCode=1;}finally{await page.close();await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(options.name,row.passed?'PASS':row.error);}}}
 finally{await browser.close();await server.close();console.log(out);}
}
