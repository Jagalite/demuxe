// SPDX-License-Identifier: MIT
import {videoCodecConfig,vp9PacketConfig} from '../video-codec-config.js';
import {WebCodecsVideoDecoder} from '../external-video-decoder.js';
import {initialRetainedDecoder,retainedDecoderCurrent,retireRetainedDecoder,resetRetainedDecoder,pendingRetainedConfiguration,checkRetainedConfiguration,activateRetainedDecoder,retainedSourcePolicy,acceptRetainedDecoderFrame,closeRetainedDecoderFrame,failRetainedDecoder,retainedPacketPolicy,submittedRetainedPacket,drainRetainedDecoder,flushedRetainedDecoder,releaseRetainedDecoderCapacity,receiveRetainedDecoderFrame,retainedOutputValid,deliveredRetainedFrame} from '../generated/internal/machine/private-retained-decoder.js';
const AGAIN=-6;
const color={bt709:1,bt470bg:5,smpte170m:6,bt2020:9,'bt2020-ncl':9,smpte2084:16,'iec61966-2-1':13};
// Browser callbacks keep physical frames in this registry. The immutable policy
// owns their queue positions until the native continuation transfers ownership.
export class PrivateRetainedDecoder {
  constructor({Decoder=globalThis.VideoDecoder,Chunk=globalThis.EncodedVideoChunk,wakeup=()=>{},canReceive=()=>true,maxPixels=3840*2160}={}) {
    if(!Number.isInteger(maxPixels)||maxPixels<1||maxPixels>3840*2160)throw Error('Invalid retained decode pixel limit');
    this.Decoder=Decoder;this.Chunk=Chunk;this.wakeup=wakeup;this.maxPixels=maxPixels;this.canReceive=canReceive;
    this.machine=initialRetainedDecoder();this.frames=new Map();this.decoder=null;this.capacityWait=null;
    this.configuration=null;this.pendingSource=null;this.prefix=null;this.failureError=null;
  }
  get generation(){return this.machine.generation;}
  get queue(){return this.machine.frames.map(id=>this.frames.get(id));}
  get stats(){return this.machine.stats;}
  get pending(){return this.machine.pending?this.pendingSource:null;}
  get failure(){return this.machine.failed?this.failureError:null;}
  get draining(){return this.machine.draining;}get flushed(){return this.machine.flushed;}get needsKey(){return this.machine.needsKey;}
  current(scope){return retainedDecoderCurrent(this.machine,scope);}
  assertGeneration(generation){if(this.machine.generation!==generation)throw Error('Decoder generation replaced');}
  closeFrame(frame){frame.close();this.machine=closeRetainedDecoderFrame(this.machine);}
  settleCapacity(error,wait=this.capacityWait){
    if(!wait||this.capacityWait!==wait)return;
    this.capacityWait=null;this.machine=releaseRetainedDecoderCapacity(this.machine,wait.id);wait.signal.removeEventListener('abort',wait.aborted);error?wait.reject(error):wait.resolve();
  }
  capacityChanged(){
    const wait=this.capacityWait;if(!wait)return;
    try{
      if(this.machine.wait?.id!==wait.id||wait.generation!==this.generation)this.settleCapacity(Error('Decoder generation replaced'),wait);
      else if(this.failure)this.settleCapacity(this.failure,wait);
      else{const frame=this.frames.get(this.machine.frames[0]);if(!frame||this.canReceive(frame,this.generation))this.settleCapacity(undefined,wait);}
    }catch(error){this.settleCapacity(error,wait);}
  }
  waitForCapacity(signal,generation,id){
    if(this.capacityWait)throw Error('Retained receive already waiting');
    try{signal.throwIfAborted();this.assertGeneration(generation);}
    catch(error){this.machine=releaseRetainedDecoderCapacity(this.machine,id);throw error;}
    return new Promise((resolve,reject)=>{
      const wait={id,signal,generation,resolve,reject,aborted:()=>this.settleCapacity(signal.reason??Error('Retained receive aborted'),wait)};
      this.capacityWait=wait;signal.addEventListener('abort',wait.aborted,{once:true});if(signal.aborted)wait.aborted();else this.capacityChanged();
    });
  }
  retire(clearConfiguration=false){
    const decision=retireRetainedDecoder(this.machine,clearConfiguration),decoder=this.decoder,frames=this.frames,wait=this.capacityWait;
    this.machine=decision.state;this.decoder=null;this.frames=new Map();this.failureError=null;this.capacityWait=null;
    if(clearConfiguration){this.configuration=null;this.pendingSource=null;this.prefix=null;}
    const errors=[],cleanup=action=>{try{action();}catch(error){errors.push(error);}};
    // Detach every old handle before a browser close callback may configure a successor.
    if(wait){cleanup(()=>wait.signal.removeEventListener('abort',wait.aborted));wait.reject(Error('Decoder generation replaced'));}
    cleanup(()=>decoder?.destroy());for(const id of decision.close){const frame=frames.get(id);frames.delete(id);if(frame)cleanup(()=>this.closeFrame(frame));}
    if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Retained decoder cleanup failed');
    return decision.state.generation;
  }
  cancel(){this.retire();}
  failed(scope,error){
    if(!this.current(scope))return;this.machine=failRetainedDecoder(this.machine,scope);this.failureError=error;this.settleCapacity(error);this.wakeup();
  }
  configure(generation,check,configuration=this.configuration){
    const activated=activateRetainedDecoder(this.machine,generation,check);this.machine=activated.state;const scope=activated.scope;if(!scope)throw Error('Decoder generation replaced');
    const decoder=new WebCodecsVideoDecoder({Decoder:this.Decoder,
      output:frame=>{
        const admitted=acceptRetainedDecoderFrame(this.machine,scope);this.machine=admitted.state;
        if(admitted.id!==null)this.frames.set(admitted.id,frame);
        else{
          if(admitted.overflow)this.failureError=Error('Retained frame queue limit');
          this.closeFrame(frame);
          if(admitted.overflow&&this.current(scope))this.settleCapacity(this.failure);
        }
        if(this.current(scope))this.wakeup();
      },error:error=>this.failed(scope,error),dequeue:()=>{if(this.current(scope))this.wakeup();}});
    this.decoder=decoder;decoder.configure(configuration);
    if(!this.current(scope)){decoder.destroy();throw Error('Decoder generation replaced');}
    this.pendingSource=null;return scope;
  }
  async check(signal,generation,id,configuration){
    if(!this.Decoder)throw Error('VideoDecoder unavailable');
    const support=await this.Decoder.isConfigSupported(configuration);
    signal.throwIfAborted();this.assertGeneration(generation);if(this.machine.check!==id)throw Error('Decoder generation replaced');
    if(!support.supported)throw Error('Unsupported retained browser configuration: '+configuration.codec);
  }
  async prepare(adapted,signal,generation){
    this.assertGeneration(generation);const decision=checkRetainedConfiguration(this.machine,generation);this.machine=decision.state;
    this.configuration=adapted.configuration;this.prefix=adapted.prefix;
    await this.check(signal,generation,decision.id,adapted.configuration);this.configure(generation,decision.id,adapted.configuration);
  }
  async execute(input,signal){
    signal.throwIfAborted();const {operation,fields,bytes,timestamp,duration}=input;
    if(operation===1){
      const generation=this.retire(true);this.assertGeneration(generation);
      const source={kind:fields[13]||1,width:fields[5],height:fields[6],depth:fields[8],profile:fields[14],level:fields[15],description:bytes.slice()};
      const policy=retainedSourcePolicy({...source,inBandHEVC:bytes.length>=23&&bytes[0]===1&&bytes[22]===0},this.maxPixels);if(policy.error)throw Error(policy.error);
      if(policy.pending){this.machine=pendingRetainedConfiguration(this.machine,generation);this.pendingSource=source;return {result:0};}
      await this.prepare(videoCodecConfig({...source,depth:source.depth||8}),signal,generation);return {result:0};
    }
    if(operation===5){this.retire(true);return {result:0};}
    if(operation===6){const configuration=this.configuration,generation=this.retire();if(configuration)this.configure(generation,undefined,configuration);this.assertGeneration(generation);this.machine=resetRetainedDecoder(this.machine,generation);return {result:0};}
    if(this.failure)throw this.failure;
    if(this.machine.decoder===null&&this.machine.pending){
      if(operation===4)return {result:AGAIN};
      if(operation!==2)throw Error('VP9 source ended before initialization');
      const generation=this.generation;await this.prepare(videoCodecConfig({...this.pendingSource,...vp9PacketConfig(bytes)}),signal,generation);
    }
    const decoder=this.decoder,scope={generation:this.generation,decoder:this.machine.decoder};if(scope.decoder===null||!decoder)throw Error('Retained decoder is closed');
    if(operation===2){
      const policy=retainedPacketPolicy(this.machine,{queuedPackets:decoder.queuedPackets,size:bytes.length,timestamp,duration});
      if(policy==='again')return {result:AGAIN};if(policy==='invalid')throw Error('Invalid retained packet');
      let data=bytes;
      if(this.machine.needsKey&&fields[7]&&this.prefix?.length){data=new Uint8Array(this.prefix.length+bytes.length);data.set(this.prefix);data.set(bytes,this.prefix.length);}
      const chunk=new this.Chunk({type:fields[7]?'key':'delta',timestamp,...(duration?{duration}:{}),data});
      if(!this.current(scope))throw Error('Decoder generation replaced');if(!decoder.submit(chunk))return {result:AGAIN};
      if(!this.current(scope))throw Error('Decoder generation replaced');this.machine=submittedRetainedPacket(this.machine,scope);return {result:0};
    }
    if(operation===3){
      const decision=drainRetainedDecoder(this.machine);this.machine=decision.state;
      if(decision.scope)decoder.drain().then(()=>{if(this.current(decision.scope)){this.machine=flushedRetainedDecoder(this.machine,decision.scope);this.wakeup();}},error=>this.failed(decision.scope,error));
      return {result:0};
    }
    if(operation===4){
      let received;
      for(;;){
        signal.throwIfAborted();if(!this.current(scope))throw Error('Decoder generation replaced');if(this.failure)throw this.failure;
        const first=this.frames.get(this.machine.frames[0]),capacity=!first||this.canReceive(first,scope.generation);
        if(!this.current(scope))throw Error('Decoder generation replaced');
        received=receiveRetainedDecoderFrame(this.machine,decoder.queuedPackets,capacity);this.machine=received.state;
        if(received.wait===null)break;
        // The mailbox parks this native continuation until actual ownership is
        // available. Returning native result0 here would cause a busy retry loop.
        await this.waitForCapacity(signal,scope.generation,received.wait);
      }
      if(received.id===null)return {result:received.result};const frame=this.frames.get(received.id);this.frames.delete(received.id);
      try{
        const {width,height}=frame.visibleRect,timestamp=frame.timestamp,duration=frame.duration??0;
        if(!retainedOutputValid({width,height,timestamp,duration},this.maxPixels))throw Error('Invalid retained output frame');
        const space=frame.colorSpace;if(!this.current(scope))throw Error('Decoder generation replaced');
        this.machine=deliveredRetainedFrame(this.machine,scope,received.resumed);
        return {result:1,frame,generation:scope.generation,frameId:received.id,fields:[2,2,0,color[space.primaries]??2,color[space.transfer]??2,color[space.matrix]??2,+!!space.fullRange,0],timestamp,duration,pixels:new Uint8Array([16,16,16,16,128,128])};
      }catch(error){this.closeFrame(frame);throw error;}
    }
    throw Error('Unknown retained decoder operation');
  }
  snapshot(){return {...this.machine.stats,queued:this.machine.frames.length,outstanding:this.decoder?.queuedPackets??0,active:this.machine.decoder!==null,generation:this.machine.generation};}
}
