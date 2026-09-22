// SPDX-License-Identifier: Apache-2.0
// Installed Firefox, default codec policy. Only numeric caption/output checks.
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out='/Volumes/seed2/Projects/demuxe/results/startup-timeout/'+new Date().toISOString().replaceAll(':','-');await mkdir(out,{recursive:true});
const serve=async()=>({origin:'http://127.0.0.1:4179',close:async()=>{}});
const server=await serve(),profile=await mkdtemp(tmpdir()+'/demuxe-subtitle-firefox-');
await writeFile(profile+'/user.js','user_pref("media.autoplay.default", 0);\n');
const child=spawn('/Applications/Firefox.app/Contents/MacOS/firefox',['--no-remote','--profile',profile,'--remote-debugging-port','0','--headless','about:blank'],{stdio:['ignore','pipe','pipe']});
let socket,call;
try{
 const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('BiDi startup timeout')),20000);let log='';const read=b=>{log+=b;const m=log.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}};child.stdout.on('data',read);child.stderr.on('data',read);child.on('error',reject);});
 socket=new WebSocket(endpoint.endsWith('/session')?endpoint:endpoint+'/session');await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let serial=0;const pending=new Map();socket.onmessage=({data})=>{const r=JSON.parse(data),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.type==='error'?p.reject(Error(JSON.stringify(r))):p.resolve(r.result);}};
 call=(method,params)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},60000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const session=await call('session.new',{capabilities:{alwaysMatch:{}}});console.log('Firefox',session.capabilities.browserVersion);
 const {context}=await call('browsingContext.create',{type:'tab'});await call('browsingContext.navigate',{context,url:server.origin+'/',wait:'complete'});
 const evaluate=async expression=>{const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true});if(r.type!=='success')throw Error(JSON.stringify(r));return r.result;};
 const element=await evaluate(`(()=>{const input=document.createElement('input');input.id='file';input.type='file';document.body.append(input);return input;})()`);
 await call('input.setFiles',{context,element:{sharedId:element.sharedId},files:['/Volumes/seed2/Projects/startup-repro/stuck.mkv']});
 const result=await evaluate(`(async()=>{
 const {NativePlayer}=await import('/web/generated/internal/native-player.js');
 const load=NativePlayer.prototype.load;const events=[];
 NativePlayer.prototype.load=async function(url){
  if(${JSON.stringify(process.env.BASELINE==='1')})this.loadTimeoutMs=25000;
  for(const e of ['loadstart','loadedmetadata','loadeddata','canplay','suspend','stalled','error'])this.video.addEventListener(e,()=>events.push({event:e,at:performance.now(),ready:this.video.readyState,network:this.video.networkState,error:this.video.error?.message}));
  try{return await load.call(this,url);}finally{events.push({event:'load-finished',ready:this.video.readyState,network:this.video.networkState,error:this.video.error?.message});}
 };
 const v=document.querySelector('#viewer');await v.ready;if(${JSON.stringify(process.env.REMUX==='1')})player.nativeRemux='always';const start=performance.now();let error;let playback;let openMs,playMs;
 try{await v.open(document.querySelector('#file').files[0]);openMs=performance.now()-start;await player.volume(0);await player.play();playMs=performance.now()-start;await new Promise(r=>setTimeout(r,1200));await player.pause();playback={time:player.state.currentTime,frames:player.diagnostics.backend.rendered};await player.seek(120);playback.seek=player.state.currentTime;}catch(e){error=String(e);}
 const result={ms:performance.now()-start,error,openMs,playMs,events,playback,state:player.state,diagnostics:player.diagnostics};
 await player.destroy();return JSON.stringify(result);
 })()`);
 const data=JSON.parse(result.value);data.variant=process.env.BASELINE==='1'?'25-second-direct-trial':'1.5-second-matroska-trial';await writeFile(out+'/result.json',JSON.stringify(data,null,2));console.log(JSON.stringify({out,variant:data.variant,ms:data.ms,openMs:data.openMs,playMs:data.playMs,error:data.error,events:data.events,playback:data.playback,selection:data.diagnostics.selection,plan:data.diagnostics.plan?.id}));
 await call('session.end',{});
}finally{socket?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(resolve,5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}await server.close();}
