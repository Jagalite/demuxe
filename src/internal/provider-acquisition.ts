// SPDX-License-Identifier: Apache-2.0
import {PlayerError,isPlayerError} from './errors.js';
import {createAcquisition,admitAcquisition,admitAcquisitionOwner,finishAcquisitionOwner,admitAcquisitionAsset,observeAcquisitionAsset,retireAcquisition,acquisitionReleases,closeAcquisition} from './machine/provider-acquisition.js';
import type {AcquisitionState,AcquisitionDecision} from './machine/provider-acquisition.js';
import {withProviderAvailability} from './provider-catalog.js';
import type {DeployedProviderAsset, ParsedProviderDeployment} from './provider-catalog.js';
import {resolveProviderRecipe} from './provider-resolution.js';
import type {CompositionEvidence, ProviderCatalog, ProviderFact, RecipeResolution, ResolvableRecipe} from './provider-resolution.js';

export type ProviderPreparation =
  | Readonly<{state: 'ready'; dispose(): void | Promise<void>}>
  | Readonly<{state: 'unavailable'; reason: string}>;
export type ProviderOwner = Readonly<{
  id: string;
  implementationIdentity: string;
  /** Owner code is supplied by the application build, never evaluated from a
   * deployment manifest. It consumes verified bytes and owns runtime/ABI checks,
   * workers, instantiation and disposal. No recipe qualification is granted. */
  prepare(context: Readonly<{
    provider: ProviderFact;
    signal: AbortSignal;
    asset(id: string): Promise<ArrayBuffer>;
  }>): Promise<ProviderPreparation>;
}>;
export type ProviderAcquisitionOptions = Readonly<{
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxResidentBytes?: number;
}>;

/** One acquisition scope per attempted execution. Not a global engine cache.
 * Assets are fetched only when a selected owner requests them, shared by content
 * identity within this scope, and checked before any bytes reach owner code.
 * JSPI/Asyncify, compilation and native probes belong to the supplied owner.
 * A fresh scope is required for a different source/runtime qualification key.
 */
export class ProviderAcquisition {
  private state: AcquisitionState;
  private catalogCache?: {epoch:number;value:ProviderCatalog};
  private readonly failures = new Map<string,Error>();
  private readonly controller = new AbortController();
  private readonly owners = new Map<string, ProviderOwner>();
  private readonly assets = new Map<string, DeployedProviderAsset>();
  private readonly bytes = new Map<string, Promise<ArrayBuffer>>();
  private readonly preparations = new Map<string, Promise<void>>();
  private readonly releases = new Map<string,() => void | Promise<void>>();
  private readonly resolutions = new WeakMap<RecipeResolution, number>();
  private closePromise?: Promise<void>;
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxResidentBytes: number;

  constructor(private readonly deployment: ParsedProviderDeployment, owners: readonly ProviderOwner[], options: ProviderAcquisitionOptions = {}) {
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxResidentBytes = options.maxResidentBytes ?? 256 * 1024 * 1024;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 300_000
      || !Number.isSafeInteger(this.maxResidentBytes) || this.maxResidentBytes < 1 || this.maxResidentBytes > 512 * 1024 * 1024) throw Error('Invalid provider acquisition limits');
    for (const owner of owners) {
      if (this.owners.has(owner.id)) throw Error('Duplicate provider acquisition owner');
      const fact = deployment.catalog.providers.find(p => p.id === owner.id);
      if (!fact || fact.implementationIdentity !== owner.implementationIdentity) throw Error('Provider owner does not match deployment');
      this.owners.set(owner.id, owner);
    }
    for (const asset of deployment.assets) this.assets.set(asset.id, asset);
    // An installed package without its configured owner cannot execute. This is
    // deployment absence, unlike a failed fetch of a declared deployed asset.
    this.state=createAcquisition({timeoutMs:this.timeoutMs,maxResidentBytes:this.maxResidentBytes,owners:deployment.catalog.providers.map(provider=>{
      if(provider.availability.state==='failed')this.failures.set(provider.id,provider.availability.error);
      const availability=!this.owners.has(provider.id)?{state:'absent' as const,reason:'No configured implementation owner'}:provider.availability.state==='failed'?{state:'failed' as const,failureId:provider.id}:provider.availability;
      return {id:provider.id,availability};
    })});
  }

  get catalog(): ProviderCatalog {
    if(this.catalogCache?.epoch===this.state.catalogEpoch)return this.catalogCache.value;
    const value=withProviderAvailability(this.deployment.catalog,this.deployment.catalog.revision,this.state.owners.map(owner=>({
      id:owner.id,implementationIdentity:this.deployment.catalog.providers.find(provider=>provider.id===owner.id)!.implementationIdentity,
      availability:owner.availability.state==='failed'?{state:'failed' as const,error:this.failures.get(owner.availability.failureId!)!}:owner.availability as Exclude<ProviderFact['availability'],{state:'failed'}>
    })));
    this.catalogCache={epoch:this.state.catalogEpoch,value};return value;
  }
  private reject(effect:AcquisitionDecision,id=''):void{
    if(effect.kind!=='reject')return;
    if(effect.reason==='retired')throw this.controller.signal.reason??new DOMException('Provider acquisition disposed','AbortError');
    if(effect.reason==='failed')throw this.failures.get(effect.failureId!)!;
    if(effect.reason==='stale')throw Error('Stale provider acquisition scope');
    if(effect.reason==='unresolved')throw Error('Cannot acquire an unresolved provider binding');
    if(effect.reason==='absent')throw new PlayerError('DEPLOYMENT_UNAVAILABLE',`No configured provider owner: ${id}`);
    const message={budget:'Provider acquisition byte budget exceeded',overflow:'Provider asset exceeds declared size',size:'Provider asset size mismatch',integrity:'Provider asset integrity mismatch'}[effect.reason];
    throw new PlayerError('ASSET_LOAD_FAILED',message);
  }

  /** Read immutable bytes for explicit inspection/preparation without claiming
   * that an execution composition is qualified or marking an owner ready. */
  readAsset(providerId: string, implementationIdentity: string, assetId: string): Promise<ArrayBuffer> {
    this.controller.signal.throwIfAborted();
    const provider = this.deployment.catalog.providers.find(p => p.id === providerId && p.implementationIdentity === implementationIdentity);
    if (!provider || !this.deployment.providerAssets[providerId]?.includes(assetId)) throw new PlayerError('DEPLOYMENT_UNAVAILABLE', 'No matching deployed provider asset');
    return this.load(this.assets.get(assetId)!);
  }


  resolve(recipe: ResolvableRecipe, evidence: readonly CompositionEvidence[], scopeKey: string): RecipeResolution {
    this.controller.signal.throwIfAborted();
    const resolution = resolveProviderRecipe(recipe, this.catalog, evidence, scopeKey);
    for (const binding of resolution.bindings) {
      if (binding.state === 'pending' || binding.state === 'available') Object.freeze(binding.providerIds);
      Object.freeze(binding);
    }
    Object.freeze(resolution.bindings); Object.freeze(resolution);
    this.resolutions.set(resolution, this.state.catalogEpoch);
    return resolution;
  }

  /** Resolution must be produced against this exact catalog snapshot. Accept
   * one explicitly selected binding; never guess order among alternatives. */
  async acquire(resolution: RecipeResolution, bindingId: string): Promise<void> {
    this.controller.signal.throwIfAborted();
    const binding = resolution.bindings.find(b => b.bindingId === bindingId);
    const admitted=admitAcquisition(this.state,{ticketEpoch:this.resolutions.get(resolution)??null,revisionMatches:resolution.deploymentRevision===this.catalog.revision,
      scopeKey:resolution.scopeKey,resolved:resolution.state!=='failed'&&!!binding&&(binding.state==='available'||binding.state==='pending')});
    this.state=admitted.state;this.reject(admitted.effect);
    if(!binding||(binding.state!=='available'&&binding.state!=='pending'))return;
    for (const id of binding.providerIds) {
      const admission=admitAcquisitionOwner(this.state,id);this.state=admission.state;this.reject(admission.effect,id);
      let pending=this.preparations.get(id);
      if(admission.effect.kind==='start'){
        // Publish both reservation and shared completion before invoking owner code.
        let resolve!:()=>void,reject!:(error:unknown)=>void;
        pending=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});this.preparations.set(id,pending);
        void this.prepare(this.catalog.providers.find(provider=>provider.id===id)!).then(resolve,reject);
      }
      await pending;
      if(this.state.owners.find(owner=>owner.id===id)?.availability.state==='absent')return;
    }
  }

  private async prepare(provider: ProviderFact): Promise<void> {
    try {
      const allowed = new Set(this.deployment.providerAssets[provider.id]);
      const result = await this.owners.get(provider.id)!.prepare({provider, signal: this.controller.signal,
        asset: async id => {
          this.controller.signal.throwIfAborted();
          if (!allowed.has(id)) throw new PlayerError('ASSET_LOAD_FAILED', `Provider ${provider.id} requested an undeclared asset`);
          return this.load(this.assets.get(id)!);
        }});
      const completion=finishAcquisitionOwner(this.state,provider.id,result.state==='ready'?{kind:'ready'}:{kind:'unavailable',reason:result.reason});
      this.state=completion.state;
      if(result.state==='ready'){
        if(completion.effect.kind==='release')await result.dispose();
        else if(completion.effect.kind==='published')this.releases.set(provider.id,()=>result.dispose());
      }
      this.controller.signal.throwIfAborted();
    } catch (error) {
      if (this.controller.signal.aborted) {this.state=finishAcquisitionOwner(this.state,provider.id,{kind:'failed'}).state;throw this.controller.signal.reason;}
      const failure = error instanceof Error ? error : new PlayerError('ASSET_LOAD_FAILED', 'Provider initialization failed');
      this.failures.set(provider.id,failure);this.state=finishAcquisitionOwner(this.state,provider.id,{kind:'failed'}).state;
      throw failure;
    }
  }

  private async load(asset: DeployedProviderAsset): Promise<ArrayBuffer> {
    const identity = JSON.stringify([asset.url, asset.sha256, asset.bytes]);
    const admission=admitAcquisitionAsset(this.state,identity,asset.bytes,performance.now());this.state=admission.state;this.reject(admission.effect);
    let pending=this.bytes.get(identity);
    if(admission.effect.kind==='start'){
      let resolve!:(bytes:ArrayBuffer)=>void,reject!:(error:unknown)=>void;
      pending=new Promise<ArrayBuffer>((yes,no)=>{resolve=yes;reject=no;});this.bytes.set(identity,pending);
      void this.fetchAsset(asset,identity).then(resolve,reject);
    }
    // Cached ownership never escapes; callers can transfer or mutate their copy.
    return (await pending!).slice(0);
  }

  private async fetchAsset(asset: DeployedProviderAsset,identity:string): Promise<ArrayBuffer> {
    const deadline = new AbortController();
    const abort = () => deadline.abort(this.controller.signal.reason);
    this.controller.signal.addEventListener('abort', abort, {once: true});
    const due=this.state.assets.find(asset=>asset.identity===identity)!.deadline;
    let timer:ReturnType<typeof setTimeout>;
    const expire=()=>{
      const result=observeAcquisitionAsset(this.state,identity,{kind:'deadline',now:performance.now()});this.state=result.state;
      if(result.effect.kind==='accepted')deadline.abort(new PlayerError('ASSET_LOAD_FAILED', 'Provider asset deadline exceeded'));
      else if(!deadline.signal.aborted)timer=setTimeout(expire,Math.max(0,due-performance.now()));
    };
    timer=setTimeout(expire,Math.max(0,due-performance.now()));
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await this.request(asset.url, {signal: deadline.signal, credentials: 'same-origin', redirect: 'error'});
      if (!response.ok || !response.body) throw new PlayerError('ASSET_LOAD_FAILED', `Deployed provider asset could not be read (${response.status})`);
      const result = new Uint8Array(asset.bytes);
      reader = response.body.getReader();
      let offset = 0;
      for (;;) {
        deadline.signal.throwIfAborted();
        const {done, value} = await reader.read();
        if (done) break;
        deadline.signal.throwIfAborted();
        const chunk=observeAcquisitionAsset(this.state,identity,{kind:'chunk',bytes:value.byteLength});this.state=chunk.state;this.reject(chunk.effect);
        result.set(value, offset); offset += value.byteLength;
      }
      deadline.signal.throwIfAborted();
      const body=observeAcquisitionAsset(this.state,identity,{kind:'body'});this.state=body.state;this.reject(body.effect);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', result)), n => n.toString(16).padStart(2, '0')).join('');
      deadline.signal.throwIfAborted();
      const verified=observeAcquisitionAsset(this.state,identity,{kind:'digest',matches:digest===asset.sha256});this.state=verified.state;this.reject(verified.effect);
      return result.buffer;
    } catch (error) {
      this.state=observeAcquisitionAsset(this.state,identity,{kind:'failed'}).state;
      if (deadline.signal.aborted) throw deadline.signal.reason;
      if (isPlayerError(error)) throw error;
      throw new PlayerError('ASSET_LOAD_FAILED', 'Deployed provider asset acquisition failed');
    } finally {
      clearTimeout(timer);
      this.controller.signal.removeEventListener('abort', abort);
      if (reader) { try { await reader.cancel(); } catch {} reader.releaseLock(); }
    }
  }

  /** Aborts in-flight acquisition, waits for owner cleanup, then releases ready
   * owners in reverse order. Repeated calls share the same completion/error. */
  dispose(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = Promise.resolve().then(async () => {
        await Promise.allSettled(this.preparations.values());
        await Promise.allSettled(this.bytes.values());
        const errors: unknown[] = [];
        for (const id of acquisitionReleases(this.state)) { try { await this.releases.get(id)?.(); } catch (error) { errors.push(error); } }
        this.releases.clear();this.bytes.clear();this.state=closeAcquisition(this.state);
        if (errors.length) throw new AggregateError(errors, 'Provider cleanup failed');
      });
      // Publish completion before dispatching synchronous abort listeners.
      this.state=retireAcquisition(this.state).state;
      this.controller.abort(new DOMException('Provider acquisition disposed', 'AbortError'));
    }
    return this.closePromise;
  }
}
