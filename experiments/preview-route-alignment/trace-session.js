// SPDX-License-Identifier: Apache-2.0
// Diagnostic instrumentation only; no timing, policy, or lifecycle changes.
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
export function tracePreviewSessions(){
 const trace=[];let serial=0;
 const original=PrivateSoftwarePlayer.prototype.createPreviewSession;
 PrivateSoftwarePlayer.prototype.createPreviewSession=function(...args){
  const session=original.apply(this,args),id=++serial;
  for(const method of ['open','frame','destroy']){
   const invoke=session[method];session[method]=async function(...args){
    const start=performance.now();trace.push({id,method,event:'start',at:start});
    try{const result=await invoke.apply(this,args);trace.push({id,method,event:'done',at:performance.now(),elapsed:performance.now()-start});return result;}
    catch(error){trace.push({id,method,event:'error',at:performance.now(),elapsed:performance.now()-start,name:error.name,message:error.message});throw error;}
   };
  }
  return session;
 };
 return trace;
}
