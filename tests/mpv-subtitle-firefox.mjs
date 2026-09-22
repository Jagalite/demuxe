// SPDX-License-Identifier: Apache-2.0
// Installed Firefox, default codec policy. Only numeric caption/output checks.
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve(),profile=await mkdtemp(tmpdir()+'/demuxe-subtitle-firefox-');
await writeFile(profile+'/user.js','user_pref("media.autoplay.default", 0);\n');
const child=spawn('/Applications/Firefox.app/Contents/MacOS/firefox',['--no-remote','--profile',profile,'--remote-debugging-port','0','about:blank'],{stdio:['ignore','pipe','pipe']});
let socket,call;
try{
 const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('BiDi startup timeout')),20000);let log='';const read=b=>{log+=b;const m=log.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}};child.stdout.on('data',read);child.stderr.on('data',read);child.on('error',reject);});
 socket=new WebSocket(endpoint.endsWith('/session')?endpoint:endpoint+'/session');await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let serial=0;const pending=new Map();socket.onmessage=({data})=>{const r=JSON.parse(data),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.type==='error'?p.reject(Error(JSON.stringify(r))):p.resolve(r.result);}};
 call=(method,params)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},60000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const session=await call('session.new',{capabilities:{alwaysMatch:{}}});console.log('Firefox',session.capabilities.browserVersion);
 const {context}=await call('browsingContext.create',{type:'tab'});await call('browsingContext.navigate',{context,url:server.origin+'/experiment/page.html',wait:'complete'});
 const evaluate=async expression=>{const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true});if(r.type!=='success')throw Error(JSON.stringify(r));return r.result;};
 const element=await evaluate(`(()=>{const input=document.createElement('input');input.id='file';input.type='file';document.body.append(input);return input;})()`);
 await call('input.setFiles',{context,element:{sharedId:element.sharedId},files:[resolve(process.env.SOURCE??'build/mpv-subtitle-service/fixtures/rejected-bframes.mkv')]});
 const result=await evaluate(`(async()=>{
  const {NativePlayer}=await import('/web/generated/internal/native-player.js');const seek=NativePlayer.prototype.seek;NativePlayer.prototype.seek=async function(t){try{return await seek.call(this,t);}catch(e){window.seekFailure={time:t,error:String(e),diagnostics:this.diagnostics,seeking:this.video.seeking,currentTime:this.video.currentTime,ranges:Array.from({length:this.video.buffered.length},(_,i)=>[this.video.buffered.start(i),this.video.buffered.end(i)])};throw e;}};const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{experimentalMpvSubtitles:true,experimentalBufferedNativeSeeks:false});
  await player.open(document.querySelector('#file').files[0]);if(player.diagnostics.plan?.id!=='native-remux-mpv')throw Error(JSON.stringify(player.diagnostics.selection));await player.volume(0);await player.play();await new Promise(r=>setTimeout(r,1500));await player.pause();
  const frames=player.diagnostics.backend.rendered,trials=[];
  for(const time of ${JSON.stringify(process.env.SOURCE?[5,12,31,950,5]:[2,5,13,2,39])}){
   const began=performance.now();await player.seek(time);
   while(!(Math.abs(player.diagnostics.backend.mpvSubtitles?.position-time)<=.1)){if(performance.now()-began>15000)throw Error('Subtitle position deadline '+JSON.stringify(window.seekFailure??player.diagnostics.selection));await new Promise(r=>setTimeout(r,20));}
   const c=document.querySelector('.demuxe-native-ass');let alpha=0;const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i])alpha++;
   trials.push({time,alpha,milliseconds:performance.now()-began,diagnostics:player.diagnostics.backend.mpvSubtitles});
  }
  const plan=player.diagnostics.plan.id;await player.destroy();return JSON.stringify({plan,frames,trials,canvases:document.querySelectorAll('.demuxe-native-ass').length});
 })()`);
 const data=JSON.parse(result.value);assert.equal(data.plan,'native-remux-mpv');assert.ok(data.frames>=20);assert.equal(data.canvases,0);
 for(const t of data.trials){assert.equal(t.alpha>0,t.time!==(process.env.SOURCE?950:39));assert.equal(t.diagnostics.avChains,0);}
 console.log('PASS',JSON.stringify(data));await call('session.end',{});
}finally{socket?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(resolve,5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}await server.close();}
