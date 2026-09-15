// The native AO ring stays at a fixed address in shared Wasm memory. Growing the
// memory does not relocate that prefix. The public AudioWorklet buffer remains
// fixed-size; only this dedicated relay owns PCM copying and consumption feedback.
export class AudioRelay {
  constructor(memory,pointer,buffer,channels,capacity=8192){
    if(!(memory instanceof SharedArrayBuffer)||!(buffer instanceof SharedArrayBuffer)||
       !Number.isInteger(pointer)||pointer<0||pointer%4||![2,6,8].includes(channels)||capacity!==8192||
       pointer+32+capacity*channels*4>memory.byteLength||buffer.byteLength!==64+capacity*channels*4)
      throw Error('Invalid shared audio relay configuration');
    this.native=new Int32Array(memory,pointer,8);this.source=new Float32Array(memory,pointer+32,capacity*channels);
    this.header=new Int32Array(buffer,0,16);this.output=new Float32Array(buffer,64);
    this.channels=channels;this.capacity=capacity;this.epoch=-1;this.forwarded=0;this.closed=false;
  }
  pump(){
    if(this.closed)return;
    const h=this.native,a=this.header,nextEpoch=Atomics.load(h,3);
    if(nextEpoch&1)return;
    if(this.epoch!==nextEpoch){
      this.epoch=nextEpoch;this.forwarded=0;Atomics.store(a,2,0);Atomics.store(a,0,0);Atomics.store(a,3,nextEpoch);return;
    }
    if(Atomics.load(a,4)!==this.epoch)return;
    const consumed=Atomics.load(a,1)>>>0;
    Atomics.store(h,7,0);Atomics.store(h,1,consumed);Atomics.store(h,7,this.epoch);
    const written=Atomics.load(h,0)>>>0,count=(written-this.forwarded)>>>0;
    if(Atomics.load(h,3)!==this.epoch)return;
    if(count>this.capacity)throw Error('PCM capacity invariant violated');
    for(let i=0;i<count;i++){
      const at=((this.forwarded+i)%this.capacity)*this.channels;
      for(let c=0;c<this.channels;c++)this.output[at+c]=this.source[at+c];
    }
    if(Atomics.load(h,3)!==this.epoch)return;
    this.forwarded=written;Atomics.store(a,0,written);
    // Header slot 8 is the rendering/command worker's seek/shutdown gate.
    Atomics.store(a,2,Atomics.load(a,8)===0?Atomics.load(h,2):0);
  }
  close(){this.closed=true;Atomics.store(this.header,2,0);}
}
