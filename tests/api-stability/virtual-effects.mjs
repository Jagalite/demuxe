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
    if(!Number.isFinite(time)||time<this.time)throw Error('Virtual time must be monotonic');
    let count=0;
    // Re-read after each callback: it may cancel another timer or install a
    // deadline inside this advance. Callbacks observe their actual deadline.
    while(true){
      const next=[...this.timers].filter(([,timer])=>timer.deadline<=time)
        .sort((a,b)=>a[1].deadline-b[1].deadline||a[0]-b[0])[0];
      if(!next)break;
      if(++count>10000)throw Error('Virtual timers did not quiesce');
      const [id,timer]=next;this.time=Math.max(this.time,timer.deadline);
      this.timers.delete(id);timer.finish();
    }
    this.time=time;
  }
}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export async function settle(){await Promise.resolve();await Promise.resolve();}
