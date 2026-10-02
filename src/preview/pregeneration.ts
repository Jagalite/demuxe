// SPDX-License-Identifier: Apache-2.0
import type {PreviewPregeneration} from '../types.js';
export type PregenerationRequest={time:number;width:number;height:number};
export type AdaptivePregeneration={strategy:'adaptive';samples:number;every:number;radius:number};
/** One lazy candidate at a time; never allocates a duration-sized work queue. */
export class PreviewPregenerator {
  private timer?:ReturnType<typeof setTimeout>;
  private epoch=0;private index=0;private duration:number|null=null;private enabled=true;private finished=false;private running=false;
  private readonly samples?:number;private readonly sampleOrder?:number[];private readonly times?:number[];private readonly step:number;private readonly limit:number;
  private readonly width:number;private readonly height:number;
  private adaptive?:{every:number;radius:number};private focus=0;
  private visited=new Set<number>();
  constructor(config:PreviewPregeneration|AdaptivePregeneration,private bucket:number,private run:(request:PregenerationRequest)=>Promise<'next'|'wait'|'stop'>){
    const adaptive='strategy' in config&&config.strategy==='adaptive'?config:undefined;
    if(adaptive){
      const {every,radius}=adaptive;
      if(!Number.isFinite(every)||every<=0||!Number.isFinite(radius)||radius<0||radius>3600||radius/Math.max(every,bucket)>128)throw new RangeError('Invalid adaptive preview interval or radius');
      this.adaptive={every:Math.max(every,bucket),radius};
    }
    const value=(adaptive?{samples:adaptive.samples}:Array.isArray(config)?{timestamps:config}:config) as Exclude<PreviewPregeneration,readonly number[]>;
    if(!value||typeof value!=='object')throw new TypeError('Invalid preview pregeneration');
    this.width=value.width??240;this.height=value.height??135;
    const max=value.count??Infinity;
    if((value.count!=null&&(!Number.isSafeInteger(max)||max<1))||![this.width,this.height].every(n=>Number.isInteger(n)&&n>0&&n<=2048))throw new RangeError('Invalid preview pregeneration limits');
    this.limit=max;
    if('samples' in value){
      if('timestamps' in value||'every' in value||'unit' in value||!Number.isInteger(value.samples)||value.samples!<2||value.samples!>256)throw new RangeError('Invalid preview sample count');
      this.samples=value.samples;this.step=0;
      // Spread early work across the whole timeline before filling the gaps.
      const reverse=(n:number)=>{let result=0;for(let bit=0;bit<8;bit++){result=result*2+n%2;n=Math.floor(n/2);}return result;};
      this.sampleOrder=Array.from({length:this.samples!},(_,i)=>i).sort((a,b)=>reverse(a)-reverse(b));
    }else if('timestamps' in value){
      if('every' in value||!Array.isArray(value.timestamps)||value.timestamps.length>10000||value.timestamps.some(n=>!Number.isFinite(n)||n<0))throw new RangeError('Invalid preview timestamps');
      // Deduplicate by bucket, but keep an original timestamp for the controller.
      // Quantizing the bucket boundary again can round down (e.g. 4.3 / 0.1).
      const seen=new Set<number>();
      this.times=[...value.timestamps].sort((a,b)=>a-b).filter(time=>{
        const key=bucket?Math.floor(time/bucket):time;
        if(seen.has(key))return false;seen.add(key);return true;
      });this.step=0;
    }else{
      if(!['seconds','minutes'].includes(value.unit??'seconds'))throw new RangeError('Invalid preview interval unit');
      const step=value.every*(value.unit==='minutes'?60:1);
      if(!Number.isFinite(step)||step<=0)throw new RangeError('Invalid preview interval');
      this.step=Math.max(step,bucket);
    }
  }
  setDuration(duration:number|null){this.duration=duration!==null&&Number.isFinite(duration)&&duration>0?duration:null;if(this.duration===null)this.cancelTimer();else this.schedule();}
  setEnabled(value:boolean){this.enabled=value;if(value)this.schedule();else this.cancelTimer();}
  setFocus(time:number){if(!this.adaptive||!Number.isFinite(time)||time<0)return;this.focus=time;this.schedule();}
  reset(){this.epoch++;this.index=0;this.focus=0;this.visited.clear();this.finished=false;this.cancelTimer();this.schedule();}
  stop(){this.epoch++;this.finished=true;this.cancelTimer();}
  private cancelTimer(){clearTimeout(this.timer);this.timer=undefined;}
  private schedule(){if(this.timer===undefined&&!this.running&&this.enabled&&!this.finished&&this.duration!==null)this.timer=setTimeout(()=>{this.timer=undefined;void this.tick();},500);}
  private async tick(){
    if(this.running||!this.enabled||this.finished||this.duration===null)return;
    this.running=true;const epoch=this.epoch;
    try{
      const broad=this.index<Math.min(this.limit,this.samples??Infinity);
      let time=this.times?this.times[this.index]:this.samples?(this.sampleOrder![this.index]+.5)*this.duration/this.samples:this.index*this.step;
      if(this.adaptive&&!broad){
        const {every,radius}=this.adaptive,center=Math.floor(Math.min(this.focus,this.duration)/every)*every;
        time=NaN;
        for(let i=0;i<=Math.ceil(radius/every)*2;i++){
          const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1),candidate=center+offset*every;
          if(candidate<0||candidate>=this.duration||Math.abs(candidate-this.focus)>radius||this.visited.has(this.key(candidate)))continue;
          time=candidate;break;
        }
        if(!Number.isFinite(time))return;
      }else if(!broad||time===undefined||time>=this.duration){this.finished=true;return;}
      if(this.adaptive&&this.visited.has(this.key(time))){if(broad)this.index++;return;}
      let outcome:'next'|'wait'|'stop';try{outcome=await this.run({time,width:this.width,height:this.height});}catch{outcome='next';}
      if(epoch!==this.epoch)return;
      if(outcome==='stop')this.finished=true;else if(outcome==='next'){
        if(this.adaptive){this.visited.add(this.key(time));if(this.visited.size>512)this.visited.delete(this.visited.values().next().value!);}
        if(!this.adaptive||broad)this.index++;
      }
    }finally{this.running=false;this.schedule();}
  }
  private key(time:number){return this.bucket?Math.floor(time/this.bucket):time;}
}
