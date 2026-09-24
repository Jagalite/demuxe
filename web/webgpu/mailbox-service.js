// SPDX-License-Identifier: Apache-2.0
import {WebGPUCodecRuntime} from './runtime.js';

// Same-worker bridge: the mpv decoder pthread talks through the legacy
// ticketed mailbox, while GPUTexture handles remain in this playback worker.
// Operations: configure=1, packet=2, drain=3, receive=4, close=5, reset=6.
const PACKET_OFFSET=80,FRAME_OFFSET=PACKET_OFFSET+8*1024*1024;
const CODEC_OFFSET=FRAME_OFFSET+1920*1080*3/2;
const AGAIN=-6,EOF=-541478725,IO=-29;
export class WebGPUMailboxService {
  constructor(engine,{onFrame,onWakeup,onError,gpu}={}){
    this.engine=engine;this.onFrame=onFrame;this.onWakeup=onWakeup;this.onError=onError;
    this.runtime=new WebGPUCodecRuntime({gpu,onFrameAvailable:()=>this.onWakeup?.(),
      onDeviceLost:error=>{this.failure=error;this.onError?.(error);this.onWakeup?.();}});
    this.pointer=engine._web_decoder_ptr();this.busy=false;this.closed=false;
    this.draining=false;this.flushed=false;this.failure=null;this.configuration=null;
    this.timer=setInterval(()=>{void this.pump();},1);
  }
  get diagnostics(){return this.runtime.diagnostics;}
  views(){
    const memory=this.engine.HEAPU8.buffer;
    return {memory,header:new Int32Array(memory,this.pointer,16),view:new DataView(memory,this.pointer)};
  }
  async pump(){
    if(this.closed||this.busy)return;
    const {memory,header,view}=this.views(),ticket=Atomics.load(header,0);
    if((ticket&3)!==1)return;
    this.busy=true;let result=0;
    const operation=header[2],valid=()=>Atomics.load(header,0)===ticket;
    try{
      if(operation===1){
        const size=header[4];if(size<0||size>65536)throw Error('Invalid GPU decoder configuration size');
        const codec=new TextDecoder().decode(new Uint8Array(memory,this.pointer+CODEC_OFFSET,64)).split('\0',1)[0];
        if(!codec)throw Error('Missing external decoder codec');
        const configuration={codec,description:new Uint8Array(memory,this.pointer+PACKET_OFFSET,size).slice(),
          width:header[5],height:header[6],depth:header[8],profile:header[14],level:header[15]};
        this.failure=null;this.draining=this.flushed=false;
        if(!await this.runtime.configure(codec,configuration))throw Error(`No qualified WebGPU decoder for ${codec}`);
        this.configuration={codec,configuration};
      }else if(operation===2){
        if(this.failure)throw Error(this.failure);
        const size=header[4];if(size<1||size>8*1024*1024)throw Error('GPU decoder packet size limit');
        const pts=view.getFloat64(64,true),duration=view.getFloat64(72,true);
        if(!Number.isSafeInteger(pts)||!Number.isSafeInteger(duration)||duration<0)throw Error('Invalid GPU decoder timestamps');
        const packet={bytes:new Uint8Array(memory,this.pointer+PACKET_OFFSET,size).slice(),key:!!header[7],pts,duration,generation:this.runtime.generation};
        result=await this.runtime.submit(packet)?0:AGAIN;
        if(result===0)this.onWakeup?.();
      }else if(operation===3){
        this.draining=true;this.flushed=false;
        const generation=this.runtime.generation;
        void this.runtime.drain().then(()=>{if(generation===this.runtime.generation){this.flushed=true;this.onWakeup?.();}},
          error=>{if(generation===this.runtime.generation){this.failure=String(error);this.onError?.(this.failure);this.onWakeup?.();}});
      }else if(operation===4){
        if(this.failure)throw Error(this.failure);
        const frame=this.runtime.receiveFrame();
        if(frame){
          // mpv receives metadata only. Its selected PTS later determines when
          // the retained GPU surface is drawn by WebGPUPresenter.
          header[5]=2;header[6]=2;header[8]=0;
          header[9]=2;header[10]=2;header[11]=2;header[12]=0;
          new Uint8Array(memory,this.pointer+FRAME_OFFSET,6).set([16,16,16,16,128,128]);
          view.setFloat64(64,frame.pts,true);view.setFloat64(72,frame.duration,true);
          try{this.onFrame?.({retainedFrame:frame,pts:frame.pts,generation:frame.generation});}
          catch(error){frame.close();throw error;}
          result=1;
        }else result=this.draining?(this.flushed?EOF:0):AGAIN;
      }else if(operation===5){await this.runtime.reset();this.configuration=null;this.draining=this.flushed=false;this.failure=null;}
      else if(operation===6){
        const saved=this.configuration;await this.runtime.reset();this.draining=this.flushed=false;
        if(saved&&!await this.runtime.configure(saved.codec,saved.configuration))throw Error('WebGPU decoder reset admission failed');
        this.failure=null;
      }else throw Error('Unknown external decoder operation');
    }catch(error){this.failure=String(error);if(!this.closed)this.onError?.(this.failure,error);result=IO;}
    finally{
      if(valid()){header[3]=result;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}
      this.busy=false;
    }
  }
  async close(){
    if(this.closed)return;this.closed=true;clearInterval(this.timer);
    // Wake a decoder pthread before its engine joins. An in-flight asynchronous
    // adapter operation cannot later acknowledge the invalidated ticket.
    const {header}=this.views(),ticket=Atomics.load(header,0);
    if((ticket&3)===1){header[3]=IO;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}
    this.onWakeup?.();
    // A pending packet keeps its own copied bytes; destroy invalidates its epoch.
    await this.runtime.destroy();
  }
}
