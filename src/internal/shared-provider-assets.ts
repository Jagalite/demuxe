// SPDX-License-Identifier: Apache-2.0
import {ProviderAcquisition} from './provider-acquisition.js';
import type {DeployedProviderAsset,ParsedProviderDeployment} from './provider-catalog.js';
import {initialSharedAssets,transitionSharedAssets,reservedAssetBytes,type SharedAssetsCommand,type SharedAssetsState} from './machine/shared-assets.js';
import {PlayerError} from './errors.js';

type Entry={id:number;value:Promise<ArrayBuffer>;module?:Promise<WebAssembly.Module>};
/** Runtime-owned immutable assets. Consumer cancellation never cancels a shared
 * request; disposal of the runtime does. Eviction drops cache ownership only. */
export class SharedProviderAssets {
  private entries=new Map<number,Entry>();
  private acquisitions=new Set<ProviderAcquisition>();
  private control:SharedAssetsState;
  private get destroyed(){return this.control.retired;}
  private destruction?:Promise<void>;
  constructor(private maxBytes=256*1024*1024){
    if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>512*1024*1024)throw new PlayerError('INVALID_ARGUMENT','Invalid runtime asset cache budget');
    this.control=initialSharedAssets(maxBytes);
  }
  get stats(){return Object.freeze({entries:this.control.entries.length,reservedBytes:reservedAssetBytes(this.control),maxBytes:this.maxBytes});}
  private transition(command:SharedAssetsCommand){
    const decision=transitionSharedAssets(this.control,command);this.control=decision.state;
    for(const id of this.entries.keys())if(!this.control.entries.some(entry=>entry.id===id))this.entries.delete(id);
    return decision;
  }
  private entry(deployment:ParsedProviderDeployment,providerId:string,asset:DeployedProviderAsset):Entry{
    const decision=this.transition({type:'reserve',key:JSON.stringify([asset.url,asset.sha256,asset.bytes]),bytes:asset.bytes});
    if(decision.error)throw new PlayerError(decision.error==='retired'?'ABORTED':'ASSET_LOAD_FAILED',decision.error==='retired'?'Demuxe runtime is destroyed':decision.error==='size'?'Provider asset exceeds runtime cache budget':'Concurrent provider assets exceed runtime cache budget');
    const id=decision.id!,cached=this.entries.get(id);if(cached)return cached;
    const acquisition=new ProviderAcquisition(deployment,[],{maxResidentBytes:this.maxBytes});
    this.acquisitions.add(acquisition);
    const provider=deployment.catalog.providers.find(provider=>provider.id===providerId)!;
    const entry:Entry={id,value:Promise.resolve(new ArrayBuffer(0))};
    // Reserve before acquisition. The acquisition validates declaration, size,
    // digest, redirect policy and deadline before returning any bytes.
    this.entries.set(id,entry);
    entry.value=Promise.resolve().then(()=>acquisition.readAsset(providerId,provider.implementationIdentity,asset.id)).then(bytes=>{
      if(this.destroyed)throw new PlayerError('ABORTED','Demuxe runtime is destroyed');
      this.transition({type:'ready',id});return bytes;
    }).catch(error=>{
      this.transition({type:'failed',id});throw error;
    }).finally(async()=>{await acquisition.dispose();this.acquisitions.delete(acquisition);});
    return entry;
  }
  async bytes(deployment:ParsedProviderDeployment,providerId:string,asset:DeployedProviderAsset):Promise<ArrayBuffer>{
    const bytes=await this.entry(deployment,providerId,asset).value;
    if(this.destroyed)throw new PlayerError('ABORTED','Demuxe runtime is destroyed');
    return bytes.slice(0);
  }
  async module(deployment:ParsedProviderDeployment,providerId:string,asset:DeployedProviderAsset):Promise<WebAssembly.Module>{
    const entry=this.entry(deployment,providerId,asset);
    return entry.module??=entry.value.then(async bytes=>{
      const module=await WebAssembly.compile(bytes);
      if(this.destroyed)throw new PlayerError('ABORTED','Demuxe runtime is destroyed');
      return module;
    }).catch(error=>{entry.module=undefined;throw error instanceof PlayerError?error:new PlayerError('ASSET_LOAD_FAILED','Qualified provider engine could not compile in this runtime');});
  }
  clear():void{this.transition({type:'clear'});}
  destroy():Promise<void>{
    if(this.destruction)return this.destruction;
    this.transition({type:'retire'});
    this.destruction=Promise.resolve().then(async()=>{await Promise.all([...this.acquisitions].map(acquisition=>acquisition.dispose()));this.entries.clear();});
    return this.destruction;
  }
}
