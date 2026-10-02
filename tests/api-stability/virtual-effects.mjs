// SPDX-License-Identifier: Apache-2.0
/** Test-only clock/executor. Never uses browser objects, real clocks or timers. */
export class VirtualEffects {
  time=0;scheduled=[];timers=new Map();serial=0;
  now=()=>this.time;
  schedule=work=>{this.scheduled.push(work);return()=>{const index=this.scheduled.indexOf(work);if(index>=0)this.scheduled.splice(index,1);};};
  scheduleDeadline=(work,delayMs)=>{const id=++this.serial;this.timers.set(id,{deadline:this.time+delayMs,finish:work});return()=>this.timers.delete(id);};
  flush(){let count=0;while(this.scheduled.length){if(++count>10000)throw Error('Scheduled work did not quiesce');this.scheduled.shift()();}}
  waitUntil=(deadline,signal)=>new Promise((resolve,reject)=>{
    if(signal.aborted){reject(signal.reason);return;}
    if(deadline<=this.time){resolve();return;}
    const id=++this.serial;
    const abort=()=>{this.timers.delete(id);signal.removeEventListener('abort',abort);reject(signal.reason);};
    this.timers.set(id,{deadline,finish:()=>{signal.removeEventListener('abort',abort);resolve();}});
    signal.addEventListener('abort',abort,{once:true});
  });
  advanceTo(time){
    if(!Number.isFinite(time)||time<this.time)throw Error('Virtual time must be monotonic');this.time=time;
    for(const [id,timer] of [...this.timers].sort((a,b)=>a[1].deadline-b[1].deadline||a[0]-b[0])){
      if(timer.deadline>time)continue;this.timers.delete(id);timer.finish();
    }
  }
}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export async function settle(){await Promise.resolve();await Promise.resolve();}
