// SPDX-License-Identifier: MIT
// Cooperative boundary for the retained decoder ABI. Browser callbacks own
// their results until the scheduler restores the requesting native task.
const IO=-29,TIMEDOUT=-73,PACKET_MAX=8*1024*1024,FRAME_MAX=1920*1080*3/2;
export class CooperativeDecoderMailbox {
  constructor(scheduler,service,{timeoutMs=5000,onFrame=frame=>frame.close()}={}) {
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>60000)throw Error('Invalid decoder deadline');
    if(typeof service?.execute!=='function'||typeof service?.cancel!=='function')throw Error('Invalid decoder service');
    this.scheduler=scheduler;this.service=service;this.timeoutMs=timeoutMs;this.onFrame=onFrame;
    this.closed=false;this.generation=0;this.pending=null;
    this.stats={requests:0,committed:0,cancelled:0,timeouts:0,errors:0,lateResults:0};
    this.imports={request:scheduler.wrapImport('demuxe_decoder.request',(ptr,operation)=>this.request(ptr,operation))};
    this.unsubscribe=scheduler.onStop(()=>this.close());
  }
  attach(memory) {
    if(!(memory instanceof WebAssembly.Memory)||!(memory.buffer instanceof ArrayBuffer))throw Error('Private decoder memory required');
    this.memory=memory;
  }
  request(ptr,operation) {
    ptr>>>=0;
    if(this.closed||this.pending||!Number.isInteger(operation)||operation<1||operation>6||ptr%8||ptr>this.memory.buffer.byteLength-80)return IO;
    const header=new Int32Array(this.memory.buffer,ptr,16),view=new DataView(this.memory.buffer,ptr,80);
    const size=operation===1||operation===2?header[4]:0;
    if(size<0||size>(operation===1?65536:PACKET_MAX)||ptr+80>this.memory.buffer.byteLength-size)return IO;
    // The service must never retain or mutate native mailbox bytes. Native
    // tasks can grow memory while this caller is suspended.
    const input={operation,fields:Array.from(header),timestamp:view.getFloat64(64,true),duration:view.getFloat64(72,true),
      bytes:new Uint8Array(this.memory.buffer,ptr+80,size).slice()};
    const request={ptr,generation:this.generation,controller:new AbortController(),timer:null,settled:false,done:false};
    this.pending=request;this.stats.requests++;
    return this.scheduler.park(wait=>{
      const discard=response=>{response?.frame?.close();};
      const settle=response=>{
        if(request.done||request.settled){this.stats.lateResults++;discard(response);return;}
        request.settled=true;clearTimeout(request.timer);request.timer=null;
        // Validate and take ownership of service metadata before yielding.
        try {
          if(!response||!Number.isInteger(response.result)||response.result<-2147483648||response.result>2147483647)throw Error('Invalid decoder result');
          if(response.fields&&(!Array.isArray(response.fields)||response.fields.length!==8||response.fields.some(v=>!Number.isInteger(v)||v<-2147483648||v>2147483647)))throw Error('Invalid decoder frame metadata');
          if(response.timestamp!==undefined&&!Number.isSafeInteger(response.timestamp))throw Error('Invalid decoder timestamp');
          if(response.duration!==undefined&&(!Number.isSafeInteger(response.duration)||response.duration<0))throw Error('Invalid decoder duration');
          if(response.pixels&&(!(response.pixels instanceof Uint8Array)||response.pixels.length>FRAME_MAX))throw Error('Invalid decoder pixel result');
          response={...response,fields:response.fields?.slice(),pixels:response.pixels?.slice()};
        } catch {discard(response);response={result:IO};this.stats.errors++;}
        request.discard=()=>{discard(response);response={result:IO};};
        wait.task.resumeAction=()=>{
          try {
            if(this.closed||request.controller.signal.aborted||request.generation!==this.generation)return request.timeout?TIMEDOUT:IO;
            const memory=this.memory.buffer;
            if(ptr>memory.byteLength-80)return IO;
            if(response.pixels&&ptr+80+PACKET_MAX>memory.byteLength-response.pixels.length)return IO;
            const fields=new Int32Array(memory,ptr,16),data=new DataView(memory,ptr,80);
            if(response.fields)fields.set(response.fields,5);
            if(response.timestamp!==undefined)data.setFloat64(64,response.timestamp,true);
            if(response.duration!==undefined)data.setFloat64(72,response.duration,true);
            if(response.pixels)new Uint8Array(memory,ptr+80+PACKET_MAX,response.pixels.length).set(response.pixels);
            fields[3]=response.result;
            if(response.frame){const frame=response.frame;response.frame=null;try{this.onFrame(frame);}catch(error){frame.close();throw error;}}
            this.stats.committed++;return response.result;
          }finally{request.done=true;request.discard();if(this.pending===request)this.pending=null;}
        };
        this.scheduler.readyWait(wait,0);
      };
      request.abort=(timeout=false)=>{
        if(request.done||request.controller.signal.aborted)return;
        request.timeout=timeout;request.controller.abort();this.stats.cancelled++;
        if(timeout)this.stats.timeouts++;
        request.discard?.();settle({result:timeout?TIMEDOUT:IO});
      };
      request.timer=setTimeout(()=>request.abort(true),this.timeoutMs);
      Promise.resolve().then(()=>request.controller.signal.aborted?{result:IO}:this.service.execute(input,request.controller.signal))
        .then(settle,()=>{this.stats.errors++;settle({result:IO});});
    });
  }
  cancel() {this.generation++;this.pending?.abort();this.service.cancel();}
  close() {
    if(this.closed)return;
    this.closed=true;
    try{this.cancel();}
    finally{
      if(this.pending){clearTimeout(this.pending.timer);this.pending.done=true;this.pending.discard?.();this.pending=null;}
      this.unsubscribe?.();
    }
  }
  snapshot() {return {...this.stats,pending:+!!this.pending,timers:+!!this.pending?.timer,closed:this.closed};}
}
