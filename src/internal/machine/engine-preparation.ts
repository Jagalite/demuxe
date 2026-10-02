// SPDX-License-Identifier: Apache-2.0
import type {PreparationAsset,PreparationComponent,PreparationProgress} from '../../types.js';
export type PreparationName=PreparationComponent|'font';
export type PreparationEnvironment=Readonly<{software:string;runtime:'pthread'|'jspi'|'asyncify';isolated:boolean;providerAssets:boolean;privatePlayback:boolean}>;
export type PreparationJob=Readonly<{name:PreparationName;engine:string;path:string;isolated:boolean;providerAssets:boolean;limit:number;bytes:number;started:number;deadline:number;cancelled:boolean;status:'pending'|'ready'|'failed'|'aborted';finished?:number;error?:string;phase:PreparationProgress['status']}>;
export type PreparationState=Readonly<{retired:boolean;jobs:readonly PreparationJob[]}>;
export type PreparationAdmission=Readonly<{state:PreparationState;names:readonly PreparationName[];start:readonly PreparationName[];aborted:readonly PreparationAsset[]|null}>;
export function createPreparation():PreparationState{return Object.freeze({retired:false,jobs:Object.freeze([])});}
export function preparationEngine(name:string,environment:PreparationEnvironment):string{
  const cooperative=environment.runtime!=='pthread'&&(!environment.providerAssets||environment.privatePlayback);
  const software=cooperative?'engine-mpv-playback-'+environment.runtime:environment.software;
  return name==='inspector'||name==='engine-remux'?'engine-remux'+(environment.runtime==='pthread'?'':'-'+environment.runtime)
    :name==='hybrid'||name==='engine-hybrid'?cooperative?software:'engine-hybrid'
    :name==='software'||name==='font'||name==='engine-software-full'||name==='engine-software-yuv'?software:name;
}
export function admitPreparation(state:PreparationState,components:readonly PreparationComponent[],environment:PreparationEnvironment,now:number):PreparationAdmission{
  const names:PreparationName[]=[...new Set(components)];if(names.some(name=>name==='hybrid'||name==='software'))names.push('font');
  if(state.retired)return Object.freeze({state,names:Object.freeze(names),start:Object.freeze([]),aborted:Object.freeze(names.map(name=>Object.freeze({name,status:'aborted' as const,bytes:0,milliseconds:0})))});
  const start=names.filter(name=>!state.jobs.some(job=>job.name===name));
  const jobs=start.map(name=>{
    const engine=preparationEngine(name,environment),cooperative=environment.runtime!=='pthread'&&(!environment.providerAssets||environment.privatePlayback);
    return Object.freeze({name,engine,path:name==='font'?'fixtures/DejaVuSans.ttf':`web/${engine}/${name==='inspector'?'remux':'player'}.wasm`,
      isolated:environment.isolated||(name==='inspector'?environment.runtime!=='pthread':cooperative),providerAssets:environment.providerAssets,
      limit:(name==='font'?8:32)*1024*1024,bytes:0,started:now,deadline:now+15000,cancelled:state.retired,status:'pending' as const,phase:'queued' as const});
  });
  return Object.freeze({state:Object.freeze({...state,jobs:Object.freeze([...state.jobs,...jobs])}),names:Object.freeze(names),start:Object.freeze(start),aborted:null});
}
export type PreparationEvent=Readonly<{kind:'phase';phase:'loading'|'compiling'}|{kind:'bytes';bytes:number;declared?:boolean}|{kind:'deadline';now:number}>;
export type PreparationStep=Readonly<{state:PreparationState;effect:'ignore'|'notify'|'accepted'|'abort'|'overflow'}>;
export function stepPreparation(state:PreparationState,name:PreparationName,event:PreparationEvent):PreparationStep{
  const job=state.jobs.find(job=>job.name===name);
  const done=(next:PreparationState,effect:PreparationStep['effect']):PreparationStep=>Object.freeze({state:next,effect});
  if(!job||job.status!=='pending')return done(state,'ignore');
  if(event.kind==='deadline'&&(job.cancelled||state.retired||event.now<job.deadline))return done(state,'ignore');
  if(event.kind==='phase'&&state.retired)return done(state,'ignore');
  const bytes=event.kind==='bytes'?(event.declared?event.bytes:job.bytes+event.bytes):job.bytes;
  if(event.kind==='bytes'&&!job.providerAssets&&bytes>job.limit)return done(event.declared?state:Object.freeze({...state,jobs:Object.freeze(state.jobs.map(item=>item.name===name?Object.freeze({...item,bytes}):item))}),'overflow');
  const next=Object.freeze({...state,jobs:Object.freeze(state.jobs.map(item=>item.name===name?Object.freeze({...item,
    bytes:event.kind==='bytes'&&!event.declared?bytes:item.bytes,cancelled:event.kind==='deadline'||item.cancelled,
    phase:event.kind==='phase'?event.phase:item.phase}):item))});
  return done(next,event.kind==='phase'?'notify':event.kind==='deadline'?'abort':'accepted');
}
export function completePreparation(state:PreparationState,name:PreparationName,now:number,error?:string):Readonly<{state:PreparationState;asset:PreparationAsset;publish:boolean;notify:boolean}>{
  const job=state.jobs.find(job=>job.name===name)!;
  if(job.status!=='pending')return Object.freeze({state,asset:preparationAsset(state,name),publish:false,notify:false});
  const status=state.retired||job.cancelled?'aborted':error===undefined?'ready':'failed';
  const next=Object.freeze({...state,jobs:Object.freeze(state.jobs.map(item=>item.name===name?Object.freeze({...item,status,finished:now,error,phase:state.retired?item.phase:status}):item))});
  return Object.freeze({state:next,asset:preparationAsset(next,name),publish:status==='ready',notify:!state.retired});
}
export function preparationAsset(state:PreparationState,name:PreparationName):PreparationAsset{
  const job=state.jobs.find(job=>job.name===name)!;
  return Object.freeze({name,status:state.retired||job.cancelled?'aborted':job.status==='pending'?'aborted':job.status,bytes:job.bytes,milliseconds:(job.finished??job.started)-job.started,...(job.error===undefined?{}:{error:job.error})});
}
export function retirePreparation(state:PreparationState):PreparationState{return state.retired?state:Object.freeze({...state,retired:true});}
export function preparationProgress(state:PreparationState):PreparationProgress[]{return state.jobs.map(job=>({name:job.name,status:job.phase}));}
