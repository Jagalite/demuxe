// SPDX-License-Identifier: Apache-2.0
/** Data and host contracts only; safe for the reusable core package. */
export type DemuxeRuntimeOptions=Readonly<{
  assetBase?:string;
  maxCacheBytes?:number;
  /** Application-owned qualification registry, never read from a manifest.
   * Omitted uses the core build's reviewed identities. Existing capability
   * contracts and execution recipes still constrain provider admission. */
  qualifiedProviders?:Readonly<Record<string,string>>;
}>;
export type ProviderLoadOptions=Readonly<{signal?:AbortSignal;preload?:boolean}>;
export type ProviderCatalogSnapshot=Readonly<{revision:number;providers:readonly Readonly<{id:string;implementationIdentity:string}>[]}>;
/** Public shape of an application-owned DemuxeRuntime. Player construction
 * validates the runtime implementation; this contract carries no engine code. */
export interface DemuxeRuntimeHandle {
  readonly assetBase:string;
  readonly qualifiedProviders:Readonly<Record<string,string>>;
  readonly providers:Readonly<{
    load(manifest:string,options?:ProviderLoadOptions):Promise<ProviderCatalogSnapshot>;
    preload(ids?:readonly string[],options?:Pick<ProviderLoadOptions,'signal'>):Promise<void>;
    readonly snapshot:ProviderCatalogSnapshot;
  }>;
  readonly snapshot:ProviderCatalogSnapshot;
  readonly cacheStats:Readonly<{entries:number;reservedBytes:number;maxBytes:number}>;
  clearCache():void;
  subscribe(listener:()=>void):()=>void;
  destroy():Promise<void>;
}
