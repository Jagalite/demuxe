// SPDX-License-Identifier: Apache-2.0
import {createResourceLedger,transitionResourceLedger,resourceMetadata,resourceAvailable,resourceScopeRetired,resourceLedgerDiagnostics,type ResourceLedgerState,type ResourceLedgerInput,type ResourceLedgerRejection,type ResourceLedgerDecision} from '../machine/resource-ledger.js';
export type ResourceRegistration<T> = Readonly<{id:string;scopeKey:string;kind:string;value:T}> & (
  | Readonly<{ownership:'owned';release:(value:T)=>void|Promise<void>}>
  | Readonly<{ownership:'borrowed';release?:never}>
);
export type ResourceRegistryOptions=Readonly<{
  store?:Readonly<{read:()=>ResourceLedgerState;dispatch:(input:ResourceLedgerInput)=>ResourceLedgerDecision}>;
  monotonic?:boolean;maxResources?:number;maxScopes?:number;failureLimit?:number;cleanupTimeoutMs?:number;
  scheduleCleanupTimeout?:(work:()=>void,delayMs:number)=>()=>void;
}>;
type Handle={value:unknown;release?: (value:unknown)=>void|Promise<void>};
type Acquisition={promise:Promise<Handle|null>;resolve:(handle:Handle|null)=>void};
function deferred(){
  let resolve!:()=>void,reject!:(error:unknown)=>void;
  const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});void promise.catch(()=>{});
  return {promise,resolve,reject};
}
function rejected(reason:ResourceLedgerRejection|undefined):Error {
  switch(reason){
    case 'invalid-id':return new TypeError('Resource ID must be a nonempty string of at most 256 characters');
    case 'invalid-scope':return new TypeError('Scope key must be a nonempty string of at most 256 characters');
    case 'invalid-kind':return new TypeError('Resource kind must be a nonempty string of at most 256 characters');
    case 'invalid-ownership':return new TypeError('Invalid resource ownership');
    case 'retired':return new Error('Resource acquisition scope is retired');
    case 'already-acquired':return new Error('Resource acquisition already completed');
    case 'duplicate':return new Error('Resource ID was already registered');
    case 'resource-capacity':return new RangeError('Resource registry lifetime resource capacity exceeded');
    case 'scope-capacity':return new RangeError('Resource registry lifetime scope capacity exceeded');
    default:return new Error('Resource is missing or belongs to another scope');
  }
}
/** Host handle interpreter. Pure resource-ledger owns admission, lifetime
 * retirement, cleanup phases, bounded tombstones and diagnostic accounting.
 * IDs and scopes cannot be reused within one owner lifetime. Rejected admission
 * leaves values caller-owned. Retirement covers resources present when it starts;
 * later registrations release immediately through their own completion promise.
 * Release callbacks must not await their own release or enclosing retirement.
 * A deadline detaches logical waiting; only a physical result proves release. */
export class ResourceRegistry {
  private localLedger?:ResourceLedgerState;
  private readonly store:ResourceRegistryOptions['store'];
  private get ledger(){return this.store?this.store.read():this.localLedger!;}
  private readonly handles=new Map<string,Handle>();
  private readonly acquisitions=new Map<string,Acquisition>();
  private readonly completions=new Map<string,Promise<void>>();
  private readonly scopes=new Map<string,Promise<void>>();
  private disposal?:Promise<void>;
  private readonly scheduleCleanupTimeout:(work:()=>void,delayMs:number)=>()=>void;
  constructor(options:ResourceRegistryOptions={}){
    this.store=options.store;
    if(!this.store)this.localLedger=createResourceLedger({monotonic:options.monotonic,maxResources:options.maxResources,maxScopes:options.maxScopes,failureLimit:options.failureLimit,cleanupTimeoutMs:options.cleanupTimeoutMs});
    this.scheduleCleanupTimeout=options.scheduleCleanupTimeout??((work,delayMs)=>{const timer=setTimeout(work,delayMs);return()=>clearTimeout(timer);});
  }
  private transition(input:ResourceLedgerInput){if(this.store)return this.store.dispatch(input);const result=transitionResourceLedger(this.ledger,input);this.localLedger=result.state;return result;}
  /** Reserve bounded metadata before constructing the physical owner. A late
   * acquisition remains attached to its original cleanup continuation/deadline. */
  reserve(registration:Readonly<{id:string;scopeKey:string;kind:string}>):void{
    const {id,scopeKey,kind}=registration,input={type:'reserve' as const,id,scopeKey,kind},checked=transitionResourceLedger(this.ledger,input);if(!checked.accepted)throw rejected(checked.reason);
    let resolve!:(handle:Handle|null)=>void;const promise=new Promise<Handle|null>(yes=>{resolve=yes;}),acquisition={promise,resolve};this.acquisitions.set(id,acquisition);
    try{const result=this.transition(input);if(!result.accepted)throw rejected(result.reason);}catch(error){
      if(resourceMetadata(this.ledger,id)?.acquired===false){try{void this.abandon(id,scopeKey).catch(()=>{});}catch{/* Preserve the original store failure. */}}
      else if(this.acquisitions.get(id)===acquisition)this.acquisitions.delete(id);
      throw error;
    }
  }
  acquire<T>(registration:ResourceRegistration<T>&Readonly<{ownership:'owned'}>):Promise<void>{
    const {id,scopeKey,value}=registration,release=registration.release;
    if(typeof release!=='function')throw new TypeError('Owned resources require a release callback');
    const input={type:'acquire' as const,id,expectedScopeKey:scopeKey},checked=transitionResourceLedger(this.ledger,input);if(!checked.accepted)throw rejected(checked.reason);
    const acquisition=this.acquisitions.get(id)!,handle={value,release:release as (value:unknown)=>void|Promise<void>};
    // Publish the physical lookup before a composed transition can expose active
    // metadata to callbacks. A release during commit still joins acquisition.
    if(resourceMetadata(this.ledger,id)?.state==='reserved')this.handles.set(id,handle);
    try{const result=this.transition(input);if(!result.accepted)throw rejected(result.reason);}
    catch(error){
      if(resourceMetadata(this.ledger,id)?.acquired){this.acquisitions.delete(id);acquisition.resolve(handle);void this.release(id,scopeKey).catch(()=>{});}
      else if(this.handles.get(id)===handle)this.handles.delete(id);
      throw error;
    }
    this.acquisitions.delete(id);acquisition.resolve(handle);
    return resourceScopeRetired(this.ledger,scopeKey)||resourceMetadata(this.ledger,id)?.state!=='active'?this.release(id,scopeKey):Promise.resolve();
  }
  abandon(id:string,expectedScopeKey?:string):Promise<void>{
    // Use the same publication/retirement fences as a real acquisition. The
    // empty handle still has to exist before store observers see active state.
    const scopeKey=expectedScopeKey??resourceMetadata(this.ledger,id)?.scopeKey;
    if(scopeKey===undefined)throw rejected('missing');
    const completion=this.acquire({id,scopeKey,kind:'abandoned',ownership:'owned',value:undefined,release:()=>{}});
    return completion.then(()=>resourceMetadata(this.ledger,id)?this.release(id,scopeKey):undefined);
  }

  register<T>(registration:ResourceRegistration<T>):Promise<void>{
    // Read each host field before admission so reentrant getters cannot overwrite
    // a newer metadata state. Host resources themselves never enter the reducer.
    const {id,scopeKey,kind,ownership,value}=registration,release=registration.release;
    const input={type:'register' as const,id,scopeKey,kind,ownership};
    const checked=transitionResourceLedger(this.ledger,input);if(!checked.accepted)throw rejected(checked.reason);
    if(ownership==='owned'&&typeof release!=='function')throw new TypeError('Owned resources require a release callback');
    if(ownership==='borrowed'&&release!==undefined)throw new TypeError('Borrowed resources cannot have a release callback');
    const handle={value,release:release as ((value:unknown)=>void|Promise<void>)|undefined};this.handles.set(id,handle);
    try{const committed=this.transition(input);if(!committed.accepted)throw rejected(committed.reason);}
    catch(error){if(resourceMetadata(this.ledger,id)){void this.release(id,scopeKey).catch(()=>{});}else if(this.handles.get(id)===handle)this.handles.delete(id);throw error;}
    return resourceScopeRetired(this.ledger,scopeKey)&&resourceMetadata(this.ledger,id)?this.release(id):Promise.resolve();
  }
  get<T=unknown>(id:string,expectedScopeKey?:string):T{
    const entry=resourceMetadata(this.ledger,id);
    if(!entry||expectedScopeKey!==undefined&&entry.scopeKey!==expectedScopeKey)throw rejected('missing');
    if(!resourceAvailable(this.ledger,id))throw new Error('Resource is retired or released');
    return this.handles.get(id)!.value as T;
  }
  isScopeRetired(scopeKey:string):boolean{return resourceScopeRetired(this.ledger,scopeKey);}
  release(id:string,expectedScopeKey?:string):Promise<void>{
    const result=this.transition({type:'release',id,expectedScopeKey});
    if(!result.accepted)return Promise.reject(rejected(result.reason));
    if(!result.start)return this.completions.get(id)!;
    const completion=deferred();this.completions.set(id,completion.promise);
    const metadata=resourceMetadata(this.ledger,id)!,handle=this.handles.get(id),acquisition=this.acquisitions.get(id);this.handles.delete(id);
    if(metadata.ownership==='borrowed'){
      this.transition({type:'physical-result',id,success:true});if(this.ledger.monotonic)this.completions.delete(id);completion.resolve();return completion.promise;
    }
    let cancelDeadline:(()=>void)|undefined;
    const cancel=()=>{const callback=cancelDeadline;cancelDeadline=undefined;try{callback?.();}catch{/* Cancellation cannot change the committed phase. */}};
    const detach=(reason:'timeout'|'scheduler')=>{
      const result=this.transition({type:'deadline',id,reason});if(!result.start)return;
      cancel();const error=new Error(reason==='timeout'?'Resource cleanup exceeded its deadline':'Resource cleanup deadline could not be scheduled');
      error.name=reason==='timeout'?'CleanupTimeoutError':'CleanupSchedulerError';completion.reject(error);
    };
    const finish=(success:boolean,error?:unknown)=>{
      const result=this.transition({type:'physical-result',id,success});cancel();if(this.ledger.monotonic&&!resourceMetadata(this.ledger,id))this.completions.delete(id);if(!result.start||result.late)return;
      if(success)completion.resolve();else completion.reject(error);
    };
    try{
      const cancellation=this.scheduleCleanupTimeout(()=>detach('timeout'),this.ledger.limits.cleanupTimeoutMs);
      if(typeof cancellation!=='function')throw new Error('Invalid cleanup scheduler');
      cancelDeadline=cancellation;if(resourceMetadata(this.ledger,id)?.state!=='releasing')cancel();
    }catch{detach('scheduler');}
    const release=(owned:Handle|null)=>{if(!owned){finish(true);return;}try{Promise.resolve(owned.release!(owned.value)).then(()=>finish(true),error=>finish(false,error));}catch(error){finish(false,error);}};
    if(acquisition)void acquisition.promise.then(release);else release(handle!);
    return completion.promise;
  }
  retireScope(scopeKey:string):Promise<void>{
    const previous=this.scopes.get(scopeKey);if(previous)return previous;
    const result=this.transition({type:'retire-scope',scopeKey});if(!result.accepted)throw rejected(result.reason);
    const completion=deferred();this.scopes.set(scopeKey,completion.promise);
    void this.releaseEntries(result.ids!).then(completion.resolve,completion.reject).finally(()=>{if(this.ledger.monotonic)this.scopes.delete(scopeKey);});return completion.promise;
  }
  dispose():Promise<void>{
    if(this.disposal)return this.disposal;
    const result=this.transition({type:'dispose'}),completion=deferred();this.disposal=completion.promise;
    void(async()=>{const errors:unknown[]=[];for(const key of result.scopeKeys!){try{await this.retireScope(key);}catch(error){errors.push(error);}}if(errors.length)throw new AggregateError(errors,'Resource registry cleanup failed');})().then(completion.resolve,completion.reject);
    return completion.promise;
  }
  get diagnostics(){return resourceLedgerDiagnostics(this.ledger);}
  private async releaseEntries(ids:readonly string[]){
    const errors:unknown[]=[];for(const id of ids){try{await this.release(id);}catch(error){errors.push(error);}}
    if(errors.length)throw new AggregateError(errors,'Resource scope cleanup failed');
  }
}
