// SPDX-License-Identifier: Apache-2.0
// Qualified output adapter at the Wasm write callback. It does not remux, repair
// timestamps, or invent sample boundaries. Unqualified complete batches retain
// the existing gather path; after admission a corrupt/truncated tail is fatal.
const kind=(b,p)=>String.fromCharCode(...b.subarray(p+4,p+8));
function boxes(b,start,end){const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=[];for(let p=start;p<end;){if(p+8>end||out.length>4096)throw Error('Box table');const n=v.getUint32(p);if(n<8||p+n>end)throw Error('Box bounds');out.push({p,n,type:kind(b,p)});p+=n;}return out;}
export function fragmentSamples(moof,mdatSize){
 const v=new DataView(moof.buffer,moof.byteOffset,moof.byteLength),u=p=>v.getUint32(p),one=(a,t)=>{const found=a.filter(x=>x.type===t);if(found.length!==1)throw Error('Missing/ambiguous '+t);return found[0];};
 if(kind(moof,0)!=='moof'||u(0)!==moof.length||mdatSize<8)throw Error('Fragment shape');
 const root=boxes(moof,8,moof.length);one(root,'mfhd');if(root.some(b=>!['mfhd','traf'].includes(b.type)))throw Error('Fragment extensions');
 const samples=[],ids=new Set();
 for(const traf of root.filter(b=>b.type==='traf')){
  const parts=boxes(moof,traf.p+8,traf.p+traf.n);if(parts.some(b=>!['tfhd','tfdt','trun'].includes(b.type)))throw Error('Track fragment extensions');
  const tfhd=one(parts,'tfhd'),tfdt=one(parts,'tfdt'),flags=u(tfhd.p+8);if((flags&~0x020038)!==0||!(flags&0x020000))throw Error('Nonrelative address');
  const id=u(tfhd.p+12);if(!id||ids.has(id))throw Error('Track identity');ids.add(id);
  if(![0,0x01000000].includes(u(tfdt.p+8))||tfdt.n!==(u(tfdt.p+8)?20:16))throw Error('Decode time');
  let q=tfhd.p+16;if(flags&8)q+=4;const defaultSize=flags&16?u(q):0;if(flags&16)q+=4;if(flags&32)q+=4;if(q!==tfhd.p+tfhd.n)throw Error('Track header length');
  for(const trun of parts.filter(b=>b.type==='trun')){
   const vf=u(trun.p+8),f=vf&0xffffff,count=u(trun.p+12);if((vf>>>24)>1||(f&~0x000f05)!==0||!(f&1)||count<1||samples.length+count>65536)throw Error('Sample run');
   let cursor=trun.p+16,offset=v.getInt32(cursor)-moof.length;cursor+=4;if(f&4)cursor+=4;
   for(let i=0;i<count;i++){if(f&0x100)cursor+=4;const size=f&0x200?u(cursor):defaultSize;if(f&0x200)cursor+=4;if(f&0x400)cursor+=4;if(f&0x800)cursor+=4;if(!size||offset<8||offset+size>mdatSize)throw Error('Sample bounds');samples.push([offset,offset+size]);offset+=size;}
   if(cursor!==trun.p+trun.n)throw Error('Run length');
  }
 }
 samples.sort((a,b)=>a[0]-b[0]);let end=8;for(const [a,b] of samples){if(a!==end)throw Error('Noncontiguous sample layout');end=b;}if(end!==mdatSize||!samples.length)throw Error('Incomplete sample map');return samples.map(s=>s[1]);
}
export class ProgressiveMP4 {
 constructor(emit,{minimum=131072,batch=65536}={}){this.emit=emit;this.minimum=minimum;this.batch=batch;this.chunks=[];this.length=0;this.received=0;this.copiedBytes=0;this.emittedBytes=0;this.parts=0;this.active=false;this.rejected=false;}
 peek(n){if(this.chunks[0]?.length>=n)return this.chunks[0].subarray(0,n);const b=new Uint8Array(n);let p=0;for(const c of this.chunks){const k=Math.min(c.length,n-p);b.set(c.subarray(0,k),p);p+=k;if(p===n)break;}return b;}
 take(n){const first=this.chunks[0];let b;if(first.length===n){b=this.chunks.shift();}else{b=new Uint8Array(n);this.copiedBytes+=n;let p=0;while(p<n){const c=this.chunks[0],k=Math.min(c.length,n-p);b.set(c.subarray(0,k),p);p+=k;if(k===c.length)this.chunks.shift();else this.chunks[0]=c.subarray(k);}}this.length-=n;return b;}
 send(n){if(!n)return;const b=this.take(n);this.emittedBytes+=n;this.parts++;this.emit(b);}
 push(bytes){
  this.chunks.push(bytes);this.length+=bytes.length;this.received+=bytes.length;
  if(this.rejected)return;
  if(!this.active){
   if(this.length<8)return;const head=this.peek(8),size=new DataView(head.buffer,head.byteOffset,8).getUint32(0);
   if(kind(head,0)!=='moof'||size<8||size>262144){this.rejected=true;return;}
   if(this.length<size+8)return;
   const header=this.peek(size+8),mdat=new DataView(header.buffer,header.byteOffset+size,8).getUint32(0);
   if(kind(header,size)!=='mdat'||mdat<this.minimum||mdat>8*1024*1024||this.length>=size+mdat){this.rejected=true;return;}
   try{this.ends=fragmentSamples(header.subarray(0,size),mdat);}catch{this.rejected=true;return;}
   this.active=true;this.total=size+mdat;this.position=8;this.send(size+8);
  }
  const available=this.position+this.length,end=this.ends.findLast(n=>n<=available),n=(end??this.position)-this.position;
  if(n>=this.batch||end===this.ends.at(-1)){this.send(n);this.position+=n;}
  if(this.received>8*1024*1024)throw Error('Progressive fragment budget');
 }
 finish(){if(this.active){
  if(this.received<this.total||this.position!==this.ends.at(-1))throw Error('Truncated progressive fragment');
  if(this.length){const tail=this.peek(this.length);if(boxes(tail,0,tail.length).some(b=>b.type!=='mfra'))throw Error('Unexpected progressive fragment tail');this.send(this.length);}
  return true;}return false;}
}
