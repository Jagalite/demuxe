// SPDX-License-Identifier: Apache-2.0
export function webgpuDiagnostics(runtime){
  return runtime?.diagnostics??{available:!!globalThis.navigator?.gpu,selected:false,codec:null,decodeIntent:null,
    queuedPackets:0,retainedFrames:0,liveSurfaces:0,surfaceBytes:0,pooledBufferBytes:0,pipelineCount:0,
    submissions:0,deviceLost:false};
}
