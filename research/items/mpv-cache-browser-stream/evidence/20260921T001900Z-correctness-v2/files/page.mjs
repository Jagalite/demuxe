// SPDX-License-Identifier: Apache-2.0
import {WasmPlayer} from '/web/generated/internal/wasm-player.js';
import {NativePlayer} from '/web/generated/internal/native-player.js';
let p,video,canvas,config,start,firstFrame=null,opened=null,ready=null,playing=null;
let events=[],errors=[],samples=[],phase='init',timer,audioRms=[];
let nativeAudio,nativeAnalyser;
const plain=v=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?String(x):x));
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
const optionNames=['mpv-version','cache','cache-secs','demuxer-readahead-secs','demuxer-hysteresis-secs','demuxer-max-bytes','demuxer-max-back-bytes','demuxer-seekable-cache','cache-pause','cache-pause-wait','cache-pause-initial','demuxer-thread','cache-on-disk','audio-buffer','vd-lavc-threads','ad-lavc-threads','stream-buffer-size'];
function snapshot(){
 const props=p?Object.fromEntries(p.properties):{};
 const d=p?.diagnostics;
 if(firstFrame===null&&(video?video.getVideoPlaybackQuality().totalVideoFrames>0:(d?.presentation?.drawn??d?.rendered??0)>0))firstFrame=performance.now()-start;
 return plain({at:performance.now()-start,wall:Date.now(),phase,position:video?.currentTime??props['time-pos']??0,paused:video?.paused??props.pause,firstFrame,opened,ready,playing,props,diagnostics:d,
  video:video?{buffered:ranges(video.buffered),seekable:ranges(video.seekable),readyState:video.readyState,networkState:video.networkState,quality:video.getVideoPlaybackQuality(),rate:video.playbackRate}:null,
  visible:document.visibilityState,focused:document.hasFocus()});
}
async function options(){const r={};if(!video)for(const name of optionNames)try{r[name]=await p.command('expand-text','${'+name+'}');}catch(e){r[name]={error:String(e)}}return r;}
async function startPlayer(c){
 config=c;start=performance.now();phase='startup';
 if(c.mode==='native'){video=document.createElement('video');document.querySelector('#stage').append(video);p=new NativePlayer(video,'never',new URL('/',location));video.requestVideoFrameCallback(()=>{firstFrame=performance.now()-start;});for(const type of ['waiting','playing','stalled','seeking','seeked','ended'])video.addEventListener(type,()=>events.push({at:performance.now()-start,wall:Date.now(),type,position:video.currentTime,phase}));}
 else{canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;document.querySelector('#stage').append(canvas);p=new WasmPlayer(canvas,{mode:c.mode,assetBase:new URL('/',location),measureOutput:c.correctness});}
 window.backend=p;
 p.addEventListener('mpv',e=>events.push({at:performance.now()-start,wall:Date.now(),phase,...plain(e.detail)}));
 p.addEventListener('error',e=>errors.push({at:performance.now()-start,error:plain(e.detail)}));
 p.addEventListener('output',e=>audioRms.push(plain(e.detail)));
 timer=setInterval(()=>samples.push(snapshot()),100);
 await p.ready;ready=performance.now()-start;
 if(!video)for(const [k,v] of Object.entries(c.options??{}))await p.command('set',k,String(v));
 const effective=await options();
 await p.openRemote({url:new URL('/media/'+c.fixture+'.mp4?trial='+c.id,location).href});opened=performance.now()-start;
 if(c.rate!==1)await p.rate(c.rate);
 await p.play();playing=performance.now()-start;phase='playback';
 return {effective,state:snapshot()};
}
async function seek(target){phase='seek';const at=performance.now(),before=snapshot();await p.seek(target);return {target,latencyMs:performance.now()-at,before,after:snapshot()};}
async function audio(){
 if(video&&!nativeAnalyser){nativeAudio=new AudioContext();nativeAnalyser=nativeAudio.createAnalyser();nativeAudio.createMediaElementSource(video).connect(nativeAnalyser);nativeAnalyser.connect(nativeAudio.destination);await nativeAudio.resume();}
 const analyser=video?nativeAnalyser:p.analyser,values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);return {rms:Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length),contextState:analyser.context.state};
}
async function stop(){phase='destroy';clearInterval(timer);const at=performance.now();await p.destroy();await nativeAudio?.close();video?.remove();canvas?.remove();return {latencyMs:performance.now()-at,surfaces:document.querySelectorAll('video,canvas,iframe').length,diagnostics:plain(p.diagnostics??{})};}
window.api={start:startPlayer,snapshot,options,audio,seek,pause:()=>p.pause(),play:()=>p.play(),rate:r=>p.rate(r),phase:v=>phase=v,stop,data:()=>plain({samples,events,errors,audioRms,firstFrame,opened,ready,playing})};
