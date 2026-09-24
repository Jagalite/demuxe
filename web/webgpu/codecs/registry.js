// SPDX-License-Identifier: Apache-2.0
// Only explicitly implemented and qualified adapters may be registered here.
// Empty by design: no codec is currently eligible for production routing.
import {qualifiedWebGPUCodecs,webgpuDecoderSupported} from '../../generated/internal/webgpu-codecs.js';
export {webgpuDecoderSupported};
export function webgpuRequiredFeatures(codec){return qualifiedWebGPUCodecs[codec]?.requiredFeatures??[];}
export async function createWebGPUCodecAdapter(codec,context){
  const entry=qualifiedWebGPUCodecs[codec];
  if(!entry)return null;
  let create;
  try{({createWebGPUCodecAdapter:create}=await import(new URL(entry.module,import.meta.url).href));}
  catch(error){const failure=Error('Qualified WebGPU adapter asset failed to load: '+String(error));failure.assetFailure=true;throw failure;}
  if(typeof create!=='function'){const failure=Error('Qualified WebGPU adapter factory missing');failure.assetFailure=true;throw failure;}
  return create(context);
}
export function webgpuSupportedCodecs(){return Object.keys(qualifiedWebGPUCodecs);}
