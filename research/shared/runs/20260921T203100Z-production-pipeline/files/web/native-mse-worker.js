// SPDX-License-Identifier: GPL-3.0-or-later
import {RemuxPlayer} from './native-remux-player.js';
// Reuse the maintained scheduler, eviction rules and generation owner. FFmpeg
// and source I/O remain in separate child workers; neither blocks this loop.
let owner,refreshSequence=0;
const refreshes=new Map(),elementRequests=new Map();let elementSequence=0;
const ranges=values=>({length:values.length,start:i=>values[i][0],end:i=>values[i][1]});
class ElementState {
 constructor(){this.position=0;this.paused=true;this.playbackRate=1;this.readyState=0;this.buffered=ranges([]);}
 get currentTime(){return this.position;}
 set currentTime(value){this.position=value;postMessage({type:'element',operation:'seek',value});}
 pause(){this.paused=true;postMessage({type:'element',operation:'pause'});}
 play(){return new Promise((resolve,reject)=>{const id=++elementSequence,timer=setTimeout(()=>{elementRequests.delete(id);reject(Error('Element play timed out'));},10000);elementRequests.set(id,{resolve,reject,timer});postMessage({type:'element',operation:'play',id});});}
 removeAttribute(){}
 load(){postMessage({type:'element',operation:'reset'});}
 getVideoPlaybackQuality(){return this.quality??{};}
 update(state){const {currentTime,ranges:values,...rest}=state;Object.assign(this,rest);this.position=currentTime;this.buffered=ranges(values);}
}
const video=new ElementState();
const state=()=>({duration:owner?.duration,tracks:owner?.tracks,generation:owner?.generation,eof:owner?.eof,muxedFrames:owner?.muxedFrames,frames:owner?.muxedFrames?owner.frames:undefined,waitingForMedia:owner?.waitingForMedia,snapshot:owner?.snapshot()});
self.onmessage=async({data})=>{
 if(data.type==='shutdown'){await owner?.destroy();for(const p of elementRequests.values()){clearTimeout(p.timer);p.reject(new DOMException('Destroyed','AbortError'));}elementRequests.clear();for(const p of refreshes.values()){clearTimeout(p.timer);p.reject(new DOMException('Destroyed','AbortError'));}refreshes.clear();postMessage({type:'closed'});close();return;}
 if(data.type==='element-result'){const p=elementRequests.get(data.id);if(p){elementRequests.delete(data.id);clearTimeout(p.timer);data.error?p.reject(Error(data.error)):p.resolve();}return;}
 if(data.type==='element-state'){video.update(data.state);return;}
 if(data.type==='refreshed'){const p=refreshes.get(data.id);if(p){refreshes.delete(data.id);clearTimeout(p.timer);data.error?p.reject(Error(data.error)):p.resolve(data.update);}return;}
 if(data.type!=='call')return;
 try{
  let value;
  if(data.method==='boot'){
   if(!globalThis.MediaSource?.canConstructInDedicatedWorker)throw Error('Worker MSE unavailable');
   const test=new MediaSource();if(!test.handle)throw Error('MediaSourceHandle unavailable');
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker MSE attachment timed out')),3000);test.addEventListener('sourceopen',()=>{clearTimeout(timer);resolve();},{once:true});postMessage({type:'element',operation:'attach',handle:test.handle},[test.handle]);});
   owner=new RemuxPlayer(video,{...data.value,bufferedSeeks:false,mseOwner:'window',attachMedia:media=>postMessage({type:'element',operation:'attach',handle:media.handle},[media.handle])});
   owner.onError=message=>postMessage({type:'error',message});
  }else if(data.method==='open'){
   const {source,target,refresh}=data.value;
   if(refresh)source.refreshAuthorization=resource=>new Promise((resolve,reject)=>{const id=++refreshSequence,timer=setTimeout(()=>{refreshes.delete(id);reject(Error('Authorization refresh timed out'));},5000);refreshes.set(id,{resolve,reject,timer});postMessage({type:'refresh',id,resource});});
   value=await owner.open(source,target);
  }else if(data.method==='seek')value=await owner.seek(data.value);
  else throw Error('Unknown MSE owner operation');
  postMessage({type:'reply',id:data.id,value,state:state()});
 }catch(error){postMessage({type:'reply',id:data.id,error:String(error),state:owner?state():undefined});}
};
setInterval(()=>{if(owner)postMessage({type:'state',state:state()});},100);
