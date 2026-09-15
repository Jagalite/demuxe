// Progressive bounded read-ahead for small selected resources. The fixed storage
// is charged before allocation; native readers can consume before download ends.
// Large/unknown responses retain demand-driven transport and no guessed timing.
export class MeasuredResponse {
  constructor(reader, size, {reserve, release, complete, failed, progress, discarded, stallMs=5000}) {
    reserve(size);
    try {this.bytes = new Uint8Array(size);} catch(error) {release(size); throw error;}
    this.discarded=discarded;this.stallMs=stallMs;this.progress=progress;this.reader=reader;this.size=size;this.release=release;this.complete=complete;this.failed=failed;
    this.received=0;this.position=0;this.done=false;this.error=null;this.waiters=[];this.closed=false;
    this.pumping=this.pump();
  }
  wake(){for(const resolve of this.waiters.splice(0))resolve();}
  async pump(){
    try{
      let progressAt=performance.now();
      for(;;){
        const {done,value}=await this.reader.read();
        if(this.closed)return;
        if(done){if(this.received!==this.size)throw Error('Resource ended before its declared length');this.done=true;this.complete();this.wake();return;}
        if(!(value instanceof Uint8Array))throw Error('Invalid resource byte chunk');
        this.progress(value.byteLength);
        if(value.buffer.byteLength>2*1024*1024||value.byteLength>this.size-this.received){this.discarded(value.byteLength);throw Error('Resource exceeds its declared length or chunk budget');}
        if(!value.byteLength){
          if(performance.now()-progressAt>=this.stallMs)throw Error('Resource request stalled');
          await new Promise(resolve=>setTimeout(resolve,0));continue;
        }
        progressAt=performance.now();
        this.bytes.set(value,this.received);this.received+=value.byteLength;this.wake();
      }
    }catch(error){if(!this.closed){this.error=error;this.failed(error);this.wake();}}
  }
  async read(){
    while(!this.closed&&!this.error&&this.position===this.received&&!this.done)await new Promise(resolve=>this.waiters.push(resolve));
    if(this.error)throw this.error;
    if(this.closed)throw Error('Resource request cancelled');
    if(this.position===this.received)return {done:true};
    const end=Math.min(this.received,this.position+65536),value=this.bytes.subarray(this.position,end);this.position=end;
    return {done:false,value};
  }
  cancel(){
    if(this.closed)return Promise.resolve();this.closed=true;this.wake();
    const bytes=this.bytes;this.bytes=null;this.discarded(this.received-this.position);
    // Keep accounting until the outstanding producer read has retired.
    void this.pumping.finally(()=>{this.release(bytes.byteLength);}).catch(()=>{});
    return this.reader.cancel().catch(()=>{});
  }
}
