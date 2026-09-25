// SPDX-License-Identifier: Apache-2.0
// Installed Safari qualification, separate from Playwright WebKit.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const directory=await mkdtemp(join(tmpdir(),'demuxe-safari-'));
const output=`results/browser-media-capability/safari-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(output,{recursive:true});console.log(output);
const result={browser:'installed Safari',version:execFileSync('safaridriver',['--version'],{encoding:'utf8'}).trim(),cases:[]};
const ffmpeg=args=>execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y',...args],{timeout:30000});
const portServer=net.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
const driver=spawn('safaridriver',['-p',String(port)],{stdio:'ignore'});
let server,session;
async function request(path,body,method=body===undefined?'GET':'POST'){
 const response=await fetch(`http://127.0.0.1:${port}${path}`,{method,...(body===undefined?{}:{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}),signal:AbortSignal.timeout(65000)});
 const data=await response.json();if(data.value?.error)throw Error(`${data.value.error}: ${data.value.message}`);return data.value;
}
async function execute(fn,...args){return request(`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];Promise.resolve((${fn.toString()})(...Array.from(arguments).slice(0,-1))).then(value=>done({value}),error=>done({failure:String(error.stack||error)}));`,args}).then(r=>{if(r.failure)throw Error(r.failure);return r.value;});}
try{
 ffmpeg(['-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-crf','35','-c:a','aac','-ac','2',join(directory,'aac.mp4')]);
 for(const [name,codec] of [['aac','copy'],['pcm24','pcm_s24le'],['ac3','ac3']])ffmpeg(['-i',join(directory,'aac.mp4'),'-c:v','copy','-c:a',codec,join(directory,`${name}.mkv`)]);
 const files=['aac.mp4','aac.mkv','pcm24.mkv','ac3.mkv'];
 server=await serve({mediaPaths:Object.fromEntries(files.map(file=>[file,join(directory,file)]))});
 for(let i=0;i<30;i++){try{await request('/status');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const created=await request('/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});session=created.sessionId;result.capabilities=created.capabilities;
 await request(`/session/${session}/timeouts`,{script:60000,pageLoad:30000});
 for(const file of files){
  const row={file,sha256:createHash('sha256').update(await readFile(join(directory,file))).digest('hex')};result.cases.push(row);
  try{
   await request(`/session/${session}/url`,{url:server.origin+'/experiment/page.html'});
   row.open=await execute(async file=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));
    const data=await (await fetch('/media/'+file)).blob();await player.open(new File([data],file));
    const button=document.createElement('button');button.id='play';button.textContent='Play';document.body.append(button);
    window.audioContext=undefined;window.audioMeter=undefined;
    if(player.mode==='native'&&!player.current?.backend?.mpvAudio){
     window.audioContext=new AudioContext();window.audioMeter=audioContext.createAnalyser();audioContext.createMediaElementSource(player.surface).connect(audioMeter);audioMeter.connect(audioContext.destination);
    }
    window.playback={pending:true};button.onclick=()=>{const resume=window.audioContext?.resume();const playing=player.play();Promise.all([resume,playing]).then(()=>window.playback={ok:true},e=>window.playback={error:String(e),code:e.code});};
    return player.diagnostics;
   },file);
   const button=await request(`/session/${session}/element`,{using:'css selector',value:'#play'});
   await request(`/session/${session}/element/${button['element-6066-11e4-a52e-4f735466cecf']}/click`,{});
   row.play=await execute(async()=>{
    const deadline=performance.now()+45000;while(playback.pending&&performance.now()<deadline)await new Promise(r=>setTimeout(r,50));
    return {playback,state:player.state,diagnostics:player.diagnostics};
   });
   assert.equal(row.play.playback.ok,true,JSON.stringify(row.play.playback));
   row.audio=await execute(async()=>{
    const deadline=performance.now()+1500;let peak=0;
    while(performance.now()<deadline){
     const software=player.current?.backend?.mpvAudio?.engine.audioDiagnostics()??player.audioDiagnostics();
     if(software?.mediaFrames>6000&&software.rms>.001)return {method:'pcm-worklet',mediaFrames:software.mediaFrames,rms:software.rms,observed:true};
     if(window.audioMeter){const samples=new Float32Array(audioMeter.fftSize);audioMeter.getFloatTimeDomainData(samples);peak=Math.max(peak,...samples.map(Math.abs));if(peak>.001)return {method:'media-element-pcm',peak,observed:true};}
     await new Promise(r=>setTimeout(r,25));
    }
    return {observed:false,peak,reason:'Independent PCM output not observable in this browser/route; presence evidence is not sample proof'};
   });
   if(row.play.diagnostics.plan.id==='native-direct')assert.equal(row.audio.observed,true,'Direct playback must produce independently observed audio');
   row.lifecycle=await execute(async()=>{
    await player.pause();await player.seek(1);await player.setPlaybackRate(1.25);await player.play();
    await new Promise(r=>setTimeout(r,1000));const start=player.state.currentTime,wallStart=performance.now();await new Promise(r=>setTimeout(r,2000));const end=player.state.currentTime,elapsed=(performance.now()-wallStart)/1000;await player.pause();
    return {start,end,elapsed,measuredRate:(end-start)/elapsed,rate:player.state.playbackRate,evidence:player.diagnostics.backend?.capability};
   });
   assert.ok(row.lifecycle.end>row.lifecycle.start);assert.equal(row.lifecycle.rate,1.25);assert.ok(Math.abs(row.lifecycle.measuredRate-1.25)<.2,JSON.stringify(row.lifecycle));
   row.passed=true;
  }catch(error){row.error=String(error.stack);process.exitCode=1;}
  finally{await execute(async()=>{await window.player?.destroy();await window.audioContext?.close();}).catch(()=>{});await writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(row.passed?'PASS':'FAIL',file,row.error??'');}
 }
}catch(error){result.error=String(error.stack);process.exitCode=1;console.log(result.error);}
finally{if(session)await request(`/session/${session}`,undefined,'DELETE').catch(()=>{});driver.kill();await server?.close();await rm(directory,{recursive:true,force:true});await writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n');}
