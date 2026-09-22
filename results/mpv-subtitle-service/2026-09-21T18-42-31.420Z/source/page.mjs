// SPDX-License-Identifier: GPL-3.0-or-later
const stage=document.querySelector('#stage');
window.errors=[];let serial=0,pending=new Map(),worker,timer,busy=false,generation=0;
window.serviceStats={};
async function rpc(type,args={}){const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error(type+' deadline'));},20000);pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x);},reject});worker.postMessage({id,type,...args});});}
async function render(time){const g=generation;const r=await rpc('render',{time,width:1280,height:720});serviceStats={...r,bitmap:undefined};if(r.bitmap){if(g===generation){ctx.clearRect(0,0,1280,720);ctx.drawImage(r.bitmap,0,0);}r.bitmap.close();}return r.ready;}
window.start=async(mode)=>{
 window.mode=mode;const bytes=await(await fetch('/lab-build/fixtures/qualified.mkv')).arrayBuffer();const file=new File([bytes],'fixture.mkv');
 if(mode==='software'){const {Player}=await import('/web/generated/index.js');window.player=new Player(stage,{mode:'software',width:1280,height:720});await player.open(file);await player.selectTrack('sub','1');}
 else{
 const {NativePlayer}=await import('/web/generated/internal/native-player.js');window.video=document.createElement('video');video.style.cssText='width:1280px;height:720px';stage.append(video);window.native=new NativePlayer(video,'always',new URL('/',location.href),true);await native.ready;await native.open(file);
 window.canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.style.cssText='position:absolute;inset:0;pointer-events:none';stage.append(canvas);window.ctx=canvas.getContext('2d');
 worker=new Worker('/lab/worker.mjs',{type:'module'});worker.onmessage=({data:d})=>{const p=pending.get(d.id);if(!p)return;pending.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result);};worker.onerror=e=>errors.push(e.message);
 window.openStats=await rpc('open',{url:'/lab-build/fixtures/qualified.mkv'});
 await render(0);
 timer=setInterval(()=>{if(busy)return;busy=true;render(window.subtitleClockOverride??native.diagnostics.position).catch(e=>errors.push(String(e))).finally(()=>busy=false);},1000/24);
 }
};
window.play=()=>mode==='software'?player.play():native.play();
window.pause=()=>mode==='software'?player.pause():native.pause();
window.seek=async time=>{if(mode==='software')return player.seek(time);generation++;await native.pause();await rpc('seek',{time,epoch:generation});if(window.componentOnly)window.subtitleClockOverride=time;else await native.seek(time);for(let i=0;i<10;i++){await render(time);await new Promise(r=>setTimeout(r,30));}};
window.snapshot=()=>mode==='software'?{time:player.state.currentTime,diagnostics:player.diagnostics,errors}:{time:native.diagnostics.position,diagnostics:native.diagnostics,serviceStats,openStats,errors,quality:{total:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames}};
window.stop=async()=>{if(mode==='software'){await player.destroy();return;}clearInterval(timer);generation++;while(busy)await new Promise(r=>setTimeout(r,10));await rpc('close');worker.terminate();await native.destroy();canvas.remove();};
window.ready=true;
