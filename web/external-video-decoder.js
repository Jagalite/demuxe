// SPDX-License-Identifier: Apache-2.0
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

export class WebCodecsVideoDecoder {
  constructor({output,error,dequeue,Decoder=globalThis.VideoDecoder}) {
    this.Decoder=Decoder;this.output=output;this.error=error;this.dequeue=dequeue;
    this.decoder=null;this.generation=0;
  }
  get queuedPackets(){return this.decoder?.decodeQueueSize??0;}
  configure(config){
    this.destroy();
    if(!this.Decoder)throw Error('VideoDecoder unavailable');
    const generation=++this.generation;
    const decoder=new this.Decoder({
      output:frame=>{if(generation===this.generation)this.output(frame);else frame.close();},
      error:error=>{if(generation===this.generation)this.error(error);},
    });
    this.decoder=decoder;
    decoder.addEventListener('dequeue',()=>{if(generation===this.generation)this.dequeue?.();});
    try{decoder.configure(config);}catch(error){this.destroy();throw error;}
  }
  submit(packet){
    if(!this.decoder||this.decoder.state==='closed')throw Error('Decoder is closed');
    if(this.queuedPackets>=8)return false;
    this.decoder.decode(packet);
    return true;
  }
  drain(){if(!this.decoder)throw Error('Decoder is closed');return this.decoder.flush();}
  reset(){
    // The mailbox worker reconfigures after reset. Closing, rather than reusing
    // VideoDecoder.reset(), also invalidates asynchronous output callbacks.
    this.destroy();
  }
  destroy(){
    this.generation++;
    if(this.decoder?.state!=='closed')this.decoder?.close();
    this.decoder=null;
  }
}
