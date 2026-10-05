// SPDX-License-Identifier: Apache-2.0
import type {PreviewPregeneration} from '../../types.js';

export type PregenerationRequest=Readonly<{time:number;width:number;height:number}>;
export type CustomPregeneration={strategy:'custom';intervalMs?:number};
export type AdaptivePregeneration={strategy:'adaptive';samples:number;every:number;radius:number};
export type PregenerationOutcome='next'|'wait'|'stop';
type Configuration=Readonly<{
  custom?:boolean;intervalMs:number;bucket:number;width:number;height:number;limit:number;step:number;samples?:number;
  sampleOrder?:readonly number[];times?:readonly number[];adaptive?:Readonly<{every:number;radius:number}>;
}>;
type Run=Readonly<{id:number;epoch:number;broad:boolean;request:PregenerationRequest}>;
export type PregenerationState=Readonly<{
  config:Configuration;epoch:number;index:number;duration:number|null;enabled:boolean;finished:boolean;
  focus:number;visited:readonly number[];serial:number;timer:number|null;running:Run|null;
}>;
export type PregenerationEvent=
  |{kind:'duration';duration:number|null}|{kind:'enabled';enabled:boolean}|{kind:'focus';time:number;resident?:readonly number[]}
  |{kind:'reset'}|{kind:'stop'}|{kind:'timer';id:number;candidates?:readonly number[]}
  |{kind:'completed';id:number;outcome:PregenerationOutcome};
export type PregenerationEffect=
  |Readonly<{kind:'schedule';id:number;delayMs:number}>|Readonly<{kind:'cancel-timer';id:number}>
  |Readonly<{kind:'run';id:number;request:PregenerationRequest}>;
export type PregenerationTransition=Readonly<{state:PregenerationState;effects:readonly PregenerationEffect[]}>;

/** Config and scheduling are data; timers and provider promises remain in the shell. */
export function createPregeneration(config:PreviewPregeneration|AdaptivePregeneration|CustomPregeneration,bucket:number):PregenerationState {
  const custom='strategy' in config&&config.strategy==='custom';
  const intervalMs=custom?(config.intervalMs??500):500;
  if(!Number.isFinite(intervalMs)||intervalMs<100||intervalMs>10000)throw new RangeError('Invalid preview scheduler interval');
  const adaptive='strategy' in config&&config.strategy==='adaptive'?config:undefined;
  if(adaptive){
    const {every,radius}=adaptive;
    if(!Number.isFinite(every)||every<=0||!Number.isFinite(radius)||radius<0||radius>3600||radius/Math.max(every,bucket)>128)throw new RangeError('Invalid adaptive preview interval or radius');
  }
  const value=(custom?{timestamps:[]}:adaptive?{samples:adaptive.samples}:Array.isArray(config)?{timestamps:config}:config) as Exclude<PreviewPregeneration,readonly number[]>;
  if(!value||typeof value!=='object')throw new TypeError('Invalid preview pregeneration');
  const width=value.width??240,height=value.height??135,limit=value.count??Infinity;
  if((value.count!=null&&(!Number.isSafeInteger(limit)||limit<1))||![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=2048))throw new RangeError('Invalid preview pregeneration limits');
  let samples:number|undefined,sampleOrder:readonly number[]|undefined,times:readonly number[]|undefined,step=0;
  if('samples' in value){
    if('timestamps' in value||'every' in value||'unit' in value||!Number.isInteger(value.samples)||value.samples!<2||value.samples!>256)throw new RangeError('Invalid preview sample count');
    samples=value.samples;
    const reverse=(n:number)=>{let result=0;for(let bit=0;bit<8;bit++){result=result*2+n%2;n=Math.floor(n/2);}return result;};
    sampleOrder=Object.freeze(Array.from({length:samples!},(_,i)=>i).sort((a,b)=>reverse(a)-reverse(b)));
  }else if('timestamps' in value){
    if('every' in value||!Array.isArray(value.timestamps)||value.timestamps.length>10000||value.timestamps.some(n=>!Number.isFinite(n)||n<0))throw new RangeError('Invalid preview timestamps');
    // Keep original times after bucket deduplication: quantizing a boundary twice
    // can round down, for example 4.3 / 0.1.
    const seen=new Set<number>();
    times=Object.freeze([...value.timestamps].sort((a,b)=>a-b).filter(time=>{
      const key=bucket?Math.floor(time/bucket):time;if(seen.has(key))return false;seen.add(key);return true;
    }));
  }else{
    if(!['seconds','minutes'].includes(value.unit??'seconds'))throw new RangeError('Invalid preview interval unit');
    const interval=value.every*(value.unit==='minutes'?60:1);
    if(!Number.isFinite(interval)||interval<=0)throw new RangeError('Invalid preview interval');
    step=Math.max(interval,bucket);
  }
  return Object.freeze({config:Object.freeze({custom,intervalMs,bucket,width,height,limit,step,samples,sampleOrder,times,
    adaptive:adaptive?Object.freeze({every:Math.max(adaptive.every,bucket),radius:adaptive.radius}):undefined}),
    epoch:0,index:0,duration:null,enabled:true,finished:false,focus:0,visited:Object.freeze([]),serial:0,timer:null,running:null});
}

export function transitionPregeneration(previous:PregenerationState,event:PregenerationEvent):PregenerationTransition {
  let state=previous;
  const effects:PregenerationEffect[]=[];
  const cancelTimer=()=>{if(state.timer!==null){effects.push(Object.freeze({kind:'cancel-timer',id:state.timer}));state={...state,timer:null};}};
  const key=(time:number)=>state.config.bucket?Math.floor(time/state.config.bucket):time;
  switch(event.kind){
    case 'duration':{
      const duration=event.duration!==null&&Number.isFinite(event.duration)&&event.duration>0?event.duration:null;
      state={...state,duration};if(duration===null)cancelTimer();break;
    }
    case 'enabled':state={...state,enabled:event.enabled};if(!event.enabled)cancelTimer();break;
    case 'focus':if((state.config.adaptive||state.config.custom)&&Number.isFinite(event.time)&&event.time>=0)state={...state,focus:event.time,visited:event.time!==state.focus&&event.resident?Object.freeze(state.visited.filter(value=>event.resident!.some(time=>key(time)===value))):state.visited};else return Object.freeze({state,effects:Object.freeze([])});break;
    case 'reset':state={...state,epoch:state.epoch+1,index:0,focus:0,visited:Object.freeze([]),finished:false};cancelTimer();break;
    case 'stop':state={...state,epoch:state.epoch+1,finished:true};cancelTimer();break;
    case 'timer':{
      if(event.id!==state.timer)return Object.freeze({state,effects:Object.freeze([])});
      state={...state,timer:null};
      if(state.running||!state.enabled||state.finished||state.duration===null)break;
      const {samples,limit,times,sampleOrder,step,adaptive,width,height}=state.config;
      const broad=state.index<Math.min(limit,samples??Infinity);
      let time=times?times[state.index]:samples?(sampleOrder![state.index]+.5)*state.duration/samples:state.index*step;
      if(state.config.custom){
        time=event.candidates?.[0]??NaN;if(!Number.isFinite(time))break;
      }else if(adaptive&&!broad){
        const {every,radius}=adaptive,center=Math.floor(Math.min(state.focus,state.duration)/every)*every;
        time=NaN;
        for(let i=0;i<=Math.ceil(radius/every)*2;i++){
          const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1),candidate=center+offset*every;
          if(candidate<0||candidate>=state.duration||Math.abs(candidate-state.focus)>radius||state.visited.includes(key(candidate)))continue;
          time=candidate;break;
        }
        if(!Number.isFinite(time))break;
      }else if(!broad||time===undefined||time>=state.duration){state={...state,finished:true};break;}
      if(adaptive&&state.visited.includes(key(time))){if(broad)state={...state,index:state.index+1};break;}
      const request=Object.freeze({time,width,height}),id=state.serial+1;
      state={...state,serial:id,running:Object.freeze({id,epoch:state.epoch,broad,request})};
      effects.push(Object.freeze({kind:'run',id,request}));break;
    }
    case 'completed':{
      const run=state.running;if(!run||run.id!==event.id)return Object.freeze({state,effects:Object.freeze([])});
      state={...state,running:null};
      if(run.epoch!==state.epoch)break;
      if(event.outcome==='stop')state={...state,finished:true};
      else if(event.outcome==='next'){
        const visited=state.config.adaptive?Object.freeze([...state.visited,key(run.request.time)].slice(-512)):state.visited;
        state={...state,visited,index:state.index+(!state.config.custom&&(!state.config.adaptive||run.broad)?1:0)};
      }
      break;
    }
  }
  if(state.timer===null&&!state.running&&state.enabled&&!state.finished&&state.duration!==null){
    const id=state.serial+1;state={...state,serial:id,timer:id};effects.push(Object.freeze({kind:'schedule',id,delayMs:state.config.intervalMs}));
  }
  return Object.freeze({state:Object.freeze({...state}),effects:Object.freeze(effects)});
}
