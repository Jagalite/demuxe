// SPDX-License-Identifier: Apache-2.0
import {initialExternalDecoder,externalDecoderCurrent,beginExternalDecoderConfiguration,acceptExternalDecoderConfiguration,retireExternalDecoder,externalDecoderSubmission} from './generated/internal/machine/external-video-decoder.js';
import {webCodecsDurationWorkaround} from './generated/internal/machine/browser-compatibility.js';
// Internal decoder service contract. PTS and duration are integer microseconds.
// The mpv mailbox owns packet bytes until submit returns. A backend owns every
// emitted frame until it transfers ownership to the retained-frame presenter.
// reset/destroy invalidate callbacks from older generations; drain is EOF only.
// submit returns false for bounded backpressure and throws for terminal failure.
// No backend here is a public playback mode or a capability advertisement.
// The mailbox services receive DecoderPacket. The WebCodecs service adapts
// those fields to EncodedVideoChunk before calling the browser API wrapper.
/**
 * @typedef {{bytes:Uint8Array,key:boolean,pts:number,duration:number,generation:number}} DecoderPacket
 * @typedef {{configure:(config:unknown)=>void|Promise<void>,submit:(packet:unknown)=>boolean|Promise<boolean>,
 *   drain:()=>Promise<void>,reset:()=>void|Promise<void>,destroy:()=>void|Promise<void>,
 *   queuedPackets:number}} ExternalVideoDecoder
 */
export function assertExternalVideoDecoder(backend){
  for(const method of ['configure','submit','drain','reset','destroy'])
    if(typeof backend?.[method]!=='function')throw Error(`External video decoder missing ${method}`);
  if(!Number.isInteger(backend.queuedPackets)||backend.queuedPackets<0)throw Error('External video decoder has invalid queue count');
  return backend;
}

const frameDurations=new WeakMap();
// Preserve the original browser frame (including its presentation timestamp).
export function externalFrameDuration(frame){return frameDurations.get(frame)??frame.duration??0;}

export class WebCodecsVideoDecoder {
  constructor({output,error,dequeue,Decoder=globalThis.VideoDecoder,Chunk=globalThis.EncodedVideoChunk,userAgent=globalThis.navigator?.userAgent??''}) {
    this.Decoder=Decoder;this.output=output;this.error=error;this.dequeue=dequeue;
    this.Chunk=Chunk;this.durationWorkaround=webCodecsDurationWorkaround(userAgent);
    this.machine=initialExternalDecoder();this.handles=new Map();this.durations=new Map();
  }
  get generation(){return this.machine.generation;}
  get decoder(){return this.machine.current?this.handles.get(this.machine.current.id)??null:null;}
  get queuedPackets(){return this.decoder?.decodeQueueSize??0;}
  closeHandle(id){
    const decoder=this.handles.get(id);this.handles.delete(id);this.durations.delete(id);
    if(decoder&&decoder.state!=='closed')decoder.close();
  }
  assertCurrent(lease){if(!externalDecoderCurrent(this.machine,lease))throw Error('Decoder configuration was retired');}
  configure(config){
    const decision=beginExternalDecoderConfiguration(this.machine);this.machine=decision.state;
    const lease=decision.lease;let acquired=null;
    const durations=[];this.durations.set(lease.id,durations);
    try{
      if(decision.close!==null)this.closeHandle(decision.close);
      this.assertCurrent(lease);
      const Decoder=this.Decoder;this.assertCurrent(lease);
      if(!Decoder)throw Error('VideoDecoder unavailable');
      acquired=new Decoder({
        output:frame=>{
          if(!externalDecoderCurrent(this.machine,lease)){frame.close();return;}
          let index=durations.findIndex(entry=>entry.timestamp===frame.timestamp);
          // WebKit may quantize a microsecond PTS through a floating-point clock.
          // Only use a nearby entry when the match is unambiguous.
          if(index===-1){const nearby=durations.map((entry,index)=>({entry,index})).filter(({entry})=>Math.abs(entry.timestamp-frame.timestamp)<=1);if(nearby.length===1)index=nearby[0].index;}
          if(index!==-1){const [entry]=durations.splice(index,1);frameDurations.set(frame,entry.duration);}
          if(externalDecoderCurrent(this.machine,lease))this.output(frame);else frame.close();
        },
        error:error=>{durations.length=0;if(externalDecoderCurrent(this.machine,lease))this.error(error);},
      });
      this.assertCurrent(lease);
      const decoder=acquired;this.handles.set(lease.id,decoder);acquired=null;
      const listen=decoder.addEventListener;this.assertCurrent(lease);
      listen.call(decoder,'dequeue',()=>{if(externalDecoderCurrent(this.machine,lease))this.dequeue?.();});
      this.assertCurrent(lease);const configure=decoder.configure;this.assertCurrent(lease);
      configure.call(decoder,config);this.assertCurrent(lease);
      this.machine=acceptExternalDecoderConfiguration(this.machine,lease);
    }catch(error){
      // A constructor may retire its lease before returning the raw handle.
      // A failed predecessor must never destroy a reentrant successor.
      const retirement=retireExternalDecoder(this.machine,lease);this.machine=retirement.state;
      const failures=[error];
      try{this.closeHandle(lease.id);}catch(cleanup){failures.push(cleanup);}
      try{if(acquired&&acquired.state!=='closed')acquired.close();}catch(cleanup){failures.push(cleanup);}
      if(failures.length>1)throw new AggregateError(failures,'Decoder configuration failed');throw error;
    }
  }
  submit(packet){
    const lease=this.machine.current,decoder=this.decoder,decode=decoder?.decode;
    const facts={present:!!decoder,closed:decoder?.state==='closed',queued:decoder?.decodeQueueSize??0};
    const decision=externalDecoderSubmission(this.machine,lease,facts);
    if(decision==='closed')throw Error('Decoder is closed');if(decision==='again')return false;
    const durations=this.durations.get(lease.id);let entry;
    if(this.durationWorkaround&&packet.duration!=null){
      // Older Safari races when decode() writes its native duration map. Omit
      // that optional field and restore it through externalFrameDuration in this thread.
      // Keep metadata bounded even if a codec drops input without output.
      if(durations.length>=256)throw Error('Decoder duration metadata limit');
      entry={timestamp:packet.timestamp,duration:packet.duration};
      const data=new Uint8Array(packet.byteLength);packet.copyTo(data);this.assertCurrent(lease);
      packet=new this.Chunk({type:packet.type,timestamp:entry.timestamp,data});this.assertCurrent(lease);
      durations.push(entry);
    }
    try{decode.call(decoder,packet);}catch(error){if(entry){const index=durations.indexOf(entry);if(index!==-1)durations.splice(index,1);}throw error;}
    return true;
  }
  drain(){const lease=this.machine.current,decoder=this.decoder,flush=decoder?.flush;if(!lease||!decoder||!externalDecoderCurrent(this.machine,lease))throw Error('Decoder is closed');const pending=flush.call(decoder);void Promise.resolve(pending).then(()=>{if(externalDecoderCurrent(this.machine,lease))this.durations.get(lease.id).length=0;},()=>{});return pending;}
  reset(){
    // Closing invalidates browser callbacks; the owner reconfigures after reset.
    this.destroy();
  }
  destroy(){
    const decision=retireExternalDecoder(this.machine);this.machine=decision.state;
    if(decision.close!==null)this.closeHandle(decision.close);
  }
}
