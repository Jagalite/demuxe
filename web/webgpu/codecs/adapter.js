// SPDX-License-Identifier: Apache-2.0
// Internal codec adapter contract. The adapter and its GPU surfaces live in the
// playback worker on the runtime's device. queuedPackets includes asynchronous
// GPU work, so the shared runtime can enforce packet backpressure. Adapters
// keep their own output queue within maxRetainedFrames and call
// notifyFrameAvailable when receiveFrame can make progress.
//
// configure(config): Promise<void>
// submitPacket({bytes,key,pts,duration,generation,sequence}): Promise<void>
// receiveFrame(): GPUDecodedFrame | null
// flush(): Promise<void>; reset(): Promise<void>; destroy(): Promise<void>
// GPUDecodedFrame = {pts,duration,generation,surface,width,height,pixelFormat,
//   color,close()}. surface is device-local and opaque outside the presenter.
/**
 * @typedef {{pts:number,duration:number,generation:number,surface:unknown,width:number,height:number,
 *   pixelFormat:string,color:{matrix:string,fullRange:boolean,chromaOffset?:[number,number]},
 *   close:()=>void}} GPUDecodedFrame
 */
export function assertWebGPUCodecAdapter(adapter,codec){
  if(!adapter||adapter.codec!==codec)throw Error('WebGPU codec adapter identity mismatch');
  if(!Number.isInteger(adapter.queuedPackets)||adapter.queuedPackets<0)throw Error('WebGPU codec adapter must report queuedPackets');
  for(const method of ['configure','submitPacket','receiveFrame','flush','reset','destroy'])
    if(typeof adapter[method]!=='function')throw Error(`WebGPU codec adapter missing ${method}`);
  return adapter;
}
