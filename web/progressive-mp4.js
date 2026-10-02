// SPDX-License-Identifier: Apache-2.0
import {initialProgressiveMP4,appendProgressiveMP4,inspectProgressiveMP4,advanceProgressiveMP4,progressiveMP4BudgetError,copyProgressiveMP4,failProgressiveMP4,finishProgressiveMP4} from './generated/internal/machine/progressive-mp4.js';
export {fragmentSamples} from './generated/internal/machine/progressive-mp4.js';
// Bytes stay in this physical adapter. Admission, sample progress and accounting
// are committed by the machine before invoking the output callback.
export class ProgressiveMP4 {
 constructor(emit,{minimum=131072,batch=65536}={}){this.emit=emit;this.machine=initialProgressiveMP4(minimum,batch);this.chunks=[];this.failure=null;}
 get minimum(){return this.machine.minimum;}get batch(){return this.machine.batch;}
 get length(){return this.machine.length;}get received(){return this.machine.received;}
 get copiedBytes(){return this.machine.copiedBytes;}get emittedBytes(){return this.machine.emittedBytes;}get parts(){return this.machine.parts;}
 get active(){return this.machine.phase==='active';}get rejected(){return this.machine.phase==='rejected';}
 get total(){return this.machine.total??undefined;}get position(){return this.machine.position??undefined;}get ends(){return this.machine.ends;}
 peek(n){if(this.chunks[0]?.length>=n)return this.chunks[0].subarray(0,n);const b=new Uint8Array(n);let p=0;for(const c of this.chunks){const k=Math.min(c.length,n-p);b.set(c.subarray(0,k),p);p+=k;if(p===n)break;}return b;}
 takePhysical(n){const first=this.chunks[0];let b,copied=0;if(first.length===n){b=this.chunks.shift();}else{b=new Uint8Array(n);copied=n;let p=0;while(p<n){const c=this.chunks[0],k=Math.min(c.length,n-p);b.set(c.subarray(0,k),p);p+=k;if(k===c.length)this.chunks.shift();else this.chunks[0]=c.subarray(k);}}this.machine=copyProgressiveMP4(this.machine,copied);return b;}
 apply(decision){
  this.machine=decision.state;
  if(decision.emit)try{const bytes=this.takePhysical(decision.emit);this.emit(bytes);}catch(error){this.machine=failProgressiveMP4(this.machine);this.failure=error;throw error;}
 }
 push(bytes){
  if(this.machine.phase==='failed')throw this.failure;
  const length=bytes.length;this.machine=appendProgressiveMP4(this.machine,length);this.chunks.push(bytes);
  if(this.rejected)return;
  if(!this.active){let admission=inspectProgressiveMP4(this.machine,this.peek(Math.min(this.length,8)));if(admission.required)admission=inspectProgressiveMP4(this.machine,this.peek(admission.required));this.apply(admission);}
  this.apply(advanceProgressiveMP4(this.machine));
  const error=progressiveMP4BudgetError(this.machine);if(error)throw Error(error);
 }
 finish(){
  if(this.machine.phase==='failed')throw this.failure;
  const decision=finishProgressiveMP4(this.machine,this.active&&this.length?this.peek(this.length):new Uint8Array(0));this.apply(decision);return decision.active;
 }
}
