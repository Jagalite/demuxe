// SPDX-License-Identifier: MIT
import {videoCodecConfig,vp9PacketConfig} from '../video-codec-config.js';
import {WebCodecsVideoDecoder} from '../external-video-decoder.js';
const AGAIN=-6,EOF=-541478725;
const color={bt709:1,bt470bg:5,smpte170m:6,bt2020:9,'bt2020-ncl':9,smpte2084:16,'iec61966-2-1':13};
// The cooperative mailbox transfers frame ownership on its native task's
// resume. Decode callbacks only touch this bounded JS queue.
export class PrivateRetainedDecoder {
  constructor({Decoder=globalThis.VideoDecoder,Chunk=globalThis.EncodedVideoChunk,wakeup=()=>{},canReceive=()=>true,maxPixels=3840*2160}={}) {
    if(!Number.isInteger(maxPixels)||maxPixels<1||maxPixels>3840*2160)throw Error('Invalid retained decode pixel limit');
    this.Decoder=Decoder;this.Chunk=Chunk;this.wakeup=wakeup;this.queue=[];this.generation=0;
    this.maxPixels=maxPixels;this.canReceive=canReceive;this.blockedReceiveStreak=0;
    this.stats={submitted:0,received:0,delivered:0,closed:0,peakFrames:0,resets:0,blockedReceives:0,maxConsecutiveBlockedReceives:0,capacityResumes:0};
  }
  closeFrame(frame){frame.close();this.stats.closed++;}
  cancel(){
    this.generation++;this.decoder?.destroy();this.decoder=null;
    for(const frame of this.queue)this.closeFrame(frame);this.queue=[];
    this.draining=false;this.flushed=false;this.failure=null;this.blockedReceiveStreak=0;
  }
  configure(){
    const epoch=this.generation;
    this.decoder=new WebCodecsVideoDecoder({Decoder:this.Decoder,
      output:frame=>{
        this.stats.received++;
        if(epoch!==this.generation){this.closeFrame(frame);return;}
        if(this.queue.length>=32){this.closeFrame(frame);this.failure=Error('Retained frame queue limit');}
        else{this.queue.push(frame);this.stats.peakFrames=Math.max(this.stats.peakFrames,this.queue.length);}
        this.wakeup();
      },error:error=>{if(epoch===this.generation){this.failure=error;this.wakeup();}},dequeue:()=>{if(epoch===this.generation)this.wakeup();}});
    this.decoder.configure(this.configuration);this.needsKey=true;
  }
  async check(signal,epoch){
    if(!this.Decoder)throw Error('VideoDecoder unavailable');
    const support=await this.Decoder.isConfigSupported(this.configuration);
    signal.throwIfAborted();if(epoch!==this.generation)throw Error('Decoder generation replaced');
    if(!support.supported)throw Error('Unsupported retained browser configuration: '+this.configuration.codec);
  }
  async execute(input,signal){
    signal.throwIfAborted();const {operation,fields,bytes,timestamp,duration}=input;
    if(operation===1){
      this.cancel();this.pending=null;this.configuration=null;
      const source={kind:fields[13]||1,width:fields[5],height:fields[6],depth:fields[8],profile:fields[14],level:fields[15],description:bytes};
      if(source.width<1||source.height<1||source.width>8192||source.height>8192||source.width*source.height>this.maxPixels)throw Error('Retained source dimensions exceed the decoder limit');
      if(source.kind===2&&bytes.length>=23&&bytes[0]===1&&bytes[22]===0)throw Error('Retained HEVC in-band configuration requires Software');
      if(source.kind===4&&(source.profile<0||!source.depth)){this.pending=source;return {result:0};}
      const adapted=videoCodecConfig({...source,depth:source.depth||8});this.configuration=adapted.configuration;this.prefix=adapted.prefix;
      await this.check(signal,this.generation);this.configure();return {result:0};
    }
    if(operation===5){this.cancel();this.configuration=null;this.pending=null;return {result:0};}
    if(operation===6){this.cancel();if(this.configuration)this.configure();this.stats.resets++;return {result:0};}
    if(this.failure)throw this.failure;
    if(!this.decoder&&this.pending){
      if(operation===4)return {result:AGAIN};
      if(operation!==2)throw Error('VP9 source ended before initialization');
      const adapted=videoCodecConfig({...this.pending,...vp9PacketConfig(bytes)});this.configuration=adapted.configuration;this.prefix=adapted.prefix;
      await this.check(signal,this.generation);this.configure();this.pending=null;
    }
    if(!this.decoder)throw Error('Retained decoder is closed');
    if(operation===2){
      if(this.decoder.queuedPackets+this.queue.length>=8)return {result:AGAIN};
      if(!bytes.length||!Number.isSafeInteger(timestamp)||!Number.isSafeInteger(duration)||duration<0)throw Error('Invalid retained packet');
      let data=bytes;
      if(this.needsKey&&fields[7]&&this.prefix?.length){data=new Uint8Array(this.prefix.length+bytes.length);data.set(this.prefix);data.set(bytes,this.prefix.length);}
      const chunk=new this.Chunk({type:fields[7]?'key':'delta',timestamp,...(duration?{duration}:{}),data});
      if(!this.decoder.submit(chunk))return {result:AGAIN};
      this.needsKey=false;this.stats.submitted++;return {result:0};
    }
    if(operation===3){
      if(!this.draining){this.draining=true;const epoch=this.generation;
        this.decoder.drain().then(()=>{if(epoch===this.generation){this.flushed=true;this.wakeup();}},error=>{if(epoch===this.generation){this.failure=error;this.wakeup();}});
      }
      return {result:0};
    }
    if(operation===4){
      // Keep the actual frame and its native timing placeholder together while
      // presentation is full. Returning the existing wait result leaves the
      // native filter runnable by a later capacity wakeup; it does not park the
      // worker or discard exact output.
      if(this.queue.length&&!this.canReceive(this.queue[0],this.generation)){this.stats.blockedReceives++;this.blockedReceiveStreak++;this.stats.maxConsecutiveBlockedReceives=Math.max(this.stats.maxConsecutiveBlockedReceives,this.blockedReceiveStreak);return {result:0};}
      const resumed=this.blockedReceiveStreak>0;this.blockedReceiveStreak=0;const frame=this.queue.shift();
      if(!frame)return {result:this.draining?(this.flushed?EOF:0):this.decoder.queuedPackets>=8?0:AGAIN};
      try{
        const {width,height}=frame.visibleRect;
        if(width<1||height<1||width>8192||height>8192||width*height>this.maxPixels||!Number.isSafeInteger(frame.timestamp)||!Number.isSafeInteger(frame.duration??0)||(frame.duration??0)<0)throw Error('Invalid retained output frame');
        const space=frame.colorSpace;
        this.stats.delivered++;if(resumed)this.stats.capacityResumes++;
        return {result:1,frame,generation:this.generation,fields:[2,2,0,color[space.primaries]??2,color[space.transfer]??2,color[space.matrix]??2,+!!space.fullRange,0],
          timestamp:frame.timestamp,duration:frame.duration??0,pixels:new Uint8Array([16,16,16,16,128,128])};
      }catch(error){this.closeFrame(frame);throw error;}
    }
    throw Error('Unknown retained decoder operation');
  }
  snapshot(){return {...this.stats,queued:this.queue.length,outstanding:this.decoder?.queuedPackets??0,active:!!this.decoder,generation:this.generation};}
}
