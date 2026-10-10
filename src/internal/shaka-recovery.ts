// SPDX-License-Identifier: Apache-2.0
import type {Shaka} from './shaka-api.js';
import {initialShakaRecovery,transitionShakaRecovery,shakaRecoverySnapshot,type ShakaRecoveryCommand} from './machine/shaka-recovery.js';

type Failure=Readonly<{id:number;error:unknown;aborted:boolean}>;
/** Observe one source's pinned Shaka networking engine without replacing its
 * scheduler, promises or abort operations. Only an actual retry event enters
 * recovery; settlement of the whole logical request leaves it, even in backoff.
 * URL/header/error payloads never cross the public recovery boundary. */
export class ShakaRecovery {
 private control=initialShakaRecovery();
 private ids=new WeakMap<Shaka.extern.Request,number>();
 private failures:Failure[]=[];
 private original:Shaka.extern.NetworkingEngine['request'];
 private forward:Shaka.extern.NetworkingEngine['request'];
 constructor(private player:EventTarget,private network:Shaka.extern.NetworkingEngine,private timeoutCode:number,private changed:()=>void){
  this.original=network.request;
  this.forward=(...args)=>{
   if(!this.control.active)return this.original.apply(network,args);
   this.move({type:'begin'});const id=this.control.serial,request=args[1];this.ids.set(request,id);
   const finish=()=>{if(this.ids.get(request)===id)this.ids.delete(request);this.move({type:'settle',id});};
   try{
    const operation=this.original.apply(network,args);
    // Keep the exact PendingRequest (including abort and progress accounting).
    void operation.promise.then(finish,finish);
    return operation;
   }catch(error){finish();throw error;}
  };
  try{
   network.request=this.forward;
   player.addEventListener('downloadfailed',this.failed);
   network.addEventListener('retry',this.retry);
  }catch(error){this.destroy();throw error;}
 }
 private move(command:ShakaRecoveryCommand){
  const before=this.control.retrying.length;this.control=transitionShakaRecovery(this.control,command);
  if(before!==this.control.retrying.length)try{this.changed();}catch{}
 }
 private readonly failed=(event:Event)=>{
  if(!this.control.active)return;
  const e=event as Event&{request:Shaka.extern.Request;error:unknown;aborted:boolean};
  const id=this.ids.get(e.request);if(id===undefined||!this.control.requests.includes(id))return;
  const failure:Failure={id,error:e.error,aborted:e.aborted===true};this.failures.push(failure);
  // In Shaka 5.2.11 downloadfailed and retry are dispatched in the same failure
  // handler. Do not let an unrelated later retry reuse an old failed download.
  queueMicrotask(()=>{this.failures=this.failures.filter(value=>value!==failure);});
 };
 private readonly retry=(event:Event)=>{
  const error=(event as Event&{error:unknown}).error;
  const code=(error as {code?:number}|null)?.code;
  // Connection/stall timeouts replace the plugin's error after downloadfailed.
  const failure=this.failures.slice().reverse().find(value=>value.error===error||value.aborted&&code===this.timeoutCode);
  if(!failure)return;this.failures=this.failures.filter(value=>value!==failure);
  // Later listeners may cancel the retry. Publish only after dispatch completes.
  queueMicrotask(()=>{if(!event.defaultPrevented)this.move({type:'retry',id:failure.id});});
 };
 get snapshot(){return shakaRecoverySnapshot(this.control);}
 destroy(){
  if(!this.control.active)return;
  // Revoke authority first. Pending promise handlers and queued events go inert.
  this.control=transitionShakaRecovery(this.control,{type:'retire'});this.failures=[];this.ids=new WeakMap();
  for(const release of [()=>this.player.removeEventListener('downloadfailed',this.failed),()=>this.network.removeEventListener('retry',this.retry),()=>{if(this.network.request===this.forward)this.network.request=this.original;}])try{release();}catch{}
 }
}
