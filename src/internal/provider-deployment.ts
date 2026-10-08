// SPDX-License-Identifier: Apache-2.0
import type {ParsedProviderDeployment} from './provider-catalog.js';
import type {RuntimeProvider} from './machine/provider-runtime.js';

/** Observe the declared asset closure independently of qualification. */
export async function identifyDeployment(deployment:ParsedProviderDeployment,base:URL):Promise<readonly RuntimeProvider[]>{
  return Promise.all(deployment.catalog.providers.map(async provider=>{
    const ids=deployment.providerAssets[provider.id];let matches=!ids.length;
    if(ids.length){
      const entries=ids.map(id=>{const asset=deployment.assets.find(asset=>asset.id===id)!;return ['runtime/'+asset.url.slice(base.href.length),asset.sha256] as const;}).sort(([a],[b])=>a<b?-1:a>b?1:0);
      const artifacts=Object.fromEntries(entries),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(artifacts,null,2)+'\n'));
      const identity='sha256:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      matches=Object.keys(artifacts).length===ids.length&&identity===provider.implementationIdentity;
    }
    return Object.freeze({id:provider.id,implementationIdentity:provider.implementationIdentity,manifestMatches:matches,assets:ids,profiles:Object.freeze(provider.offers.map(offer=>offer.profile))});
  }));
}

/** Additive publication: no active session can observe an asset or ABI replaced
 * underneath it. Different deployments can reuse identical declarations. */
export function mergeDeployments(current:ParsedProviderDeployment,incoming:ParsedProviderDeployment,revision:string):ParsedProviderDeployment{
  const assets=new Map(current.assets.map(asset=>[asset.id,asset]));
  const urls=new Map(current.assets.map(asset=>[asset.url,asset]));
  for(const asset of incoming.assets){
    const old=assets.get(asset.id),atURL=urls.get(asset.url);
    if(old&&JSON.stringify(old)!==JSON.stringify(asset)||atURL&&(atURL.sha256!==asset.sha256||atURL.bytes!==asset.bytes))throw Error('Conflicting runtime provider asset: '+asset.id);
    assets.set(asset.id,asset);urls.set(asset.url,asset);
  }
  const providers=new Map(current.catalog.providers.map(provider=>[provider.id,provider]));
  const providerAssets={...current.providerAssets};
  for(const provider of incoming.catalog.providers){
    const old=providers.get(provider.id);
    if(old&&(JSON.stringify(old)!==JSON.stringify(provider)||JSON.stringify(providerAssets[provider.id])!==JSON.stringify(incoming.providerAssets[provider.id])))throw Error('Conflicting runtime provider: '+provider.id);
    providers.set(provider.id,provider);providerAssets[provider.id]=incoming.providerAssets[provider.id];
  }
  if(providers.size>256||assets.size>512)throw Error('Runtime provider catalog budget exceeded');
  return Object.freeze({catalog:Object.freeze({revision,providers:Object.freeze([...providers.values()])}),assets:Object.freeze([...assets.values()]),providerAssets:Object.freeze(providerAssets)});
}
