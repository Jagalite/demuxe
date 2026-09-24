// SPDX-License-Identifier: Apache-2.0
// Internal codec adapter contract. The adapter and its GPU surfaces live in the
// playback worker on the runtime's device. queuedPackets includes asynchronous
// GPU work, so the shared runtime can enforce packet backpressure. Adapters
// keep their own output queue within maxRetainedFrames and call
// notifyFrameAvailable when receiveFrame can make progress.
//
// configure({...codec parameters,decodeIntent}): Promise<void>. The intent is
// exact/full-resolution by default. Nondefault intent requires an optional
// supportsDecodeIntent(intent) method returning true; exact-only adapters keep
// their old behavior and cannot silently accept reduced or target requests.
// submitPacket({bytes,key,pts,duration,generation,sequence}): Promise<void>
// receiveFrame(): GPUDecodedFrame | null
// flush(): Promise<void>; reset(): Promise<void>; destroy(): Promise<void>
// GPUDecodedFrame = {pts,duration,generation,surface,width,height,pixelFormat,
//   color,close()}. surface is device-local and opaque outside the presenter.
/**
 * @typedef {{targetWidth:number|null,targetHeight:number|null,qualityMode:'exact'|'reduced',
 *   allowApproximation:boolean}} WebGPUDecodeIntent
 * @typedef {{pts:number,duration:number,generation:number,surface:unknown,width:number,height:number,
 *   pixelFormat:string,color:{matrix:string,fullRange:boolean,chromaOffset?:[number,number]},
 *   close:()=>void}} GPUDecodedFrame
 */
import {normalizeExternalDecodeIntent} from '../../generated/internal/external-decoder-selection.js';
export async function configureWebGPUCodecAdapter(adapter,config){
  const normalized={...config,decodeIntent:normalizeExternalDecodeIntent(config.decodeIntent)};
  const intent=normalized.decodeIntent;
  const defaultIntent=intent.targetWidth===null&&intent.targetHeight===null&&
    intent.qualityMode==='exact'&&!intent.allowApproximation;
  if((!defaultIntent||typeof adapter.supportsDecodeIntent==='function')&&
    (typeof adapter.supportsDecodeIntent!=='function'||await adapter.supportsDecodeIntent(intent)!==true))
    throw Error('WebGPU codec adapter does not support requested decode intent');
  await adapter.configure(normalized);
  return normalized;
}
export function assertWebGPUCodecAdapter(adapter,codec){
  if(!adapter||adapter.codec!==codec)throw Error('WebGPU codec adapter identity mismatch');
  if(!Number.isInteger(adapter.queuedPackets)||adapter.queuedPackets<0)throw Error('WebGPU codec adapter must report queuedPackets');
  for(const method of ['configure','submitPacket','receiveFrame','flush','reset','destroy'])
    if(typeof adapter[method]!=='function')throw Error(`WebGPU codec adapter missing ${method}`);
  return adapter;
}
