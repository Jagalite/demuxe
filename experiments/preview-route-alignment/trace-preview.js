// SPDX-License-Identifier: Apache-2.0
import {NativePlayer} from '/web/generated/internal/native-player.js';
import {PreviewController} from '/web/generated/preview/controller.js';
export function tracePreview(events){
 const restores=[],owners=new Map();let serial=0;
 const record=(kind,data={})=>events.push({at:performance.now(),kind,...data});
 const identity=p=>{if(!owners.has(p))owners.set(p,++serial);return owners.get(p);};
 for(const method of ['openRemote','seek','verifyStartup','destroy']){
  const original=NativePlayer.prototype[method];
  NativePlayer.prototype[method]=function(...args){const id=identity(this);record(method+'-start',{id,arg:method==='seek'?args[0]:undefined});let work;try{work=original.apply(this,args);}catch(e){record(method+'-throw',{id,message:e.message});throw e;}
   return Promise.resolve(work).then(value=>{record(method+'-done',{id});return value;},e=>{record(method+'-error',{id,name:e.name,message:e.message});throw e;});};
  restores.push(()=>NativePlayer.prototype[method]=original);
 }
 for(const method of ['settle','cancelWork','cancelJob','clear','setSuspended']){
  const original=PreviewController.prototype[method];
  PreviewController.prototype[method]=function(...args){if(method!=='setSuspended'||this.state.suspended!==args[0])record(method,{value:method==='setSuspended'?args[0]:undefined,error:args[0]?.message,caller:this.state.caller,stack:new Error().stack});return original.apply(this,args);};
  restores.push(()=>PreviewController.prototype[method]=original);
 }
 const timer=setInterval(()=>{for(const [p,id] of owners){if(p.stopped)continue;try{record('native-sample',{id,diagnostics:p.diagnostics,video:{time:p.video.currentTime,seeking:p.video.seeking,paused:p.video.paused,readyState:p.video.readyState}});}catch(e){record('sample-error',{id,message:e.message});}}},250);
 return ()=>{clearInterval(timer);for(const restore of restores)restore();};
}
