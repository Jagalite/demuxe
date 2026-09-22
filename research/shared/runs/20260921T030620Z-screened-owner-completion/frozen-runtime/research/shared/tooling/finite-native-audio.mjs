// SPDX-License-Identifier: Apache-2.0
// Bounded research constructors; callers retain source ownership and fallback.
const limit=16*1024*1024;
const text=(b,a,n)=>String.fromCharCode(...b.subarray(a,a+n));
const fail=m=>{throw Error(m);};
const own=input=>{if(!(input instanceof Uint8Array)||input.length>limit)fail('finite source byte cap');return input.slice();};
const chunk=(name,data)=>{const b=new Uint8Array(8+data.length+(data.length&1));b.set(new TextEncoder().encode(name));new DataView(b.buffer).setUint32(4,data.length,true);b.set(data,8);return b;};
const join=parts=>{const n=parts.reduce((s,b)=>s+b.length,0);if(n>limit+512*1024)fail('output byte cap');const out=new Uint8Array(n);let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;};
function wave(payload,{format,rate,channels,bits}){
 const fmt=new Uint8Array(format===6||format===7?18:16),v=new DataView(fmt.buffer),stride=channels*bits/8;
 v.setUint16(0,format,true);v.setUint16(2,channels,true);v.setUint32(4,rate,true);v.setUint32(8,rate*stride,true);v.setUint16(12,stride,true);v.setUint16(14,bits,true);
 const fact=new Uint8Array(4);new DataView(fact.buffer).setUint32(0,payload.length/stride,true);
 const body=join([new TextEncoder().encode('WAVE'),chunk('fmt ',fmt),...(format===1?[]:[chunk('fact',fact)]),chunk('data',payload)]);
 return chunk('RIFF',body);
}
export function auToWave(input){
 const b=own(input);if(b.length<24)fail('short AU');const v=new DataView(b.buffer);
 const off=v.getUint32(4),size=v.getUint32(8),encoding=v.getUint32(12),rate=v.getUint32(16),channels=v.getUint32(20);
 if(v.getUint32(0)!==0x2e736e64||off<24||off>b.length)fail('AU structure');
 if(![1,27].includes(encoding)||![1,2].includes(channels)||rate<8000||rate>48000)fail('AU codec/rate/layout');
 if(size===0xffffffff||size!==b.length-off||!size||size%channels)fail('AU finite aligned extent');
 return {bytes:wave(b.subarray(off),{format:encoding===1?7:6,rate,channels,bits:8}),mime:'audio/wav',frames:size/channels,rate,channels,sourceBytes:b.length,payloadBytes:size};
}
function caf(input){
 const b=own(input),v=new DataView(b.buffer);if(b.length<8||text(b,0,8)!=='caff\x00\x01\x00\x00')fail('CAF header');
 const chunks=new Map();let at=8;
 while(at<b.length){
  if(at+12>b.length)fail('CAF chunk header');const name=text(b,at,4),size=v.getBigInt64(at+4);
  if(size<0n||size>BigInt(b.length-at-12)||chunks.has(name))fail('CAF chunk extent/duplicate');
  chunks.set(name,b.subarray(at+12,at+12+Number(size)));at+=12+Number(size);
 }
 const d=chunks.get('desc'),data=chunks.get('data');if(!d||d.length!==32||!data||data.length<4)fail('CAF required chunks');
 if(new DataView(data.buffer,data.byteOffset).getUint32(0)!==0)fail('CAF edits unsupported');
 const q=new DataView(d.buffer,d.byteOffset,d.length),result={chunks,payload:data.subarray(4),rate:q.getFloat64(0),codec:text(d,8,4),flags:q.getUint32(12),bpp:q.getUint32(16),fpp:q.getUint32(20),channels:q.getUint32(24),bits:q.getUint32(28),sourceBytes:b.length};
 if(result.rate!==48000||result.channels!==2)fail('CAF scoped rate/layout');
 const ch=chunks.get('chan');if(ch){if(ch.length!==12)fail('CAF channel description');const cv=new DataView(ch.buffer,ch.byteOffset,ch.length);if(cv.getUint32(0)!==0x650002||cv.getUint32(4)!==0||cv.getUint32(8)!==0)fail('CAF non-stereo channel semantics');}
 return result;
}
export function cafPcmToWave(input){
 const c=caf(input),fp=!!(c.flags&1),width=c.bits/8;
 if(c.codec!=='lpcm'||c.flags>3||c.fpp!==1||c.bpp!==c.channels*width||!(fp?c.bits===32:[16,24].includes(c.bits)))fail('CAF packed PCM contract');
 for(const name of c.chunks.keys())if(!['desc','data','chan','info','free'].includes(name))fail('CAF unhandled semantic chunk');
 if(!c.payload.length||c.payload.length%c.bpp||c.payload.length/c.bpp>2000000)fail('CAF PCM sample extent');
 if(fp){const v=new DataView(c.payload.buffer,c.payload.byteOffset,c.payload.length);for(let i=0;i<c.payload.length;i+=4)if(!Number.isFinite(v.getFloat32(i,!!(c.flags&2))))fail('CAF nonfinite sample');}
 const payload=c.payload.slice();if(!(c.flags&2))for(let i=0;i<payload.length;i+=width)for(let j=0;j<width;j++)payload[i+j]=c.payload[i+width-1-j];
 return {bytes:wave(payload,{format:fp?3:1,rate:c.rate,channels:c.channels,bits:c.bits}),mime:'audio/wav',frames:payload.length/c.bpp,rate:c.rate,channels:c.channels,sourceBytes:c.sourceBytes,payloadBytes:payload.length};
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i<<24;for(let j=0;j<8;j++)c=(c<<1)^((c>>>31)?0x04c11db7:0);return c>>>0;});
function crc(b){let c=0;for(const v of b)c=((c<<8)^crcTable[(c>>>24)^v])>>>0;return c;}
function page(payload,granule,seq,flags){
 const n=Math.floor(payload.length/255)+1,b=new Uint8Array(27+n+payload.length),v=new DataView(b.buffer);
 b.set(new TextEncoder().encode('OggS'));b[5]=flags;v.setBigUint64(6,BigInt(granule),true);v.setUint32(14,73169,true);v.setUint32(18,seq,true);b[26]=n;
 for(let i=0;i<n;i++)b[27+i]=i===n-1?payload.length%255:255;b.set(payload,27+n);v.setUint32(22,crc(b),true);return b;
}
export function cafOpusToOgg(input){
 const c=caf(input);if(c.codec!=='opus'||c.flags!==0||c.bpp!==0||c.fpp!==960||c.bits!==0)fail('CAF Opus profile');
 for(const name of c.chunks.keys())if(!['desc','data','chan','info','free','pakt'].includes(name))fail('CAF unhandled Opus metadata');
 const tab=c.chunks.get('pakt');if(!tab||tab.length<24)fail('CAF packet table');const v=new DataView(tab.buffer,tab.byteOffset,tab.length);
 const count=v.getBigInt64(0),valid=v.getBigInt64(8),pre=v.getInt32(16),tail=v.getInt32(20);
 if(count<1n||count>4096n||valid<=0n||pre<0||pre>65535||tail<0||tail>=960||count*960n!==valid+BigInt(pre+tail))fail('CAF timing table');
 const packets=[];let pos=24,off=0;
 for(let i=0;i<Number(count);i++){
  let size=0,done=false;for(let j=0;j<5;j++){if(pos>=tab.length)fail('CAF truncated packet table');const x=tab[pos++];size=size*128+(x&127);if(!(x&128)){done=true;break;}}
  if(!done||size<1||size>1275||off+size>c.payload.length)fail('CAF packet extent');const p=c.payload.subarray(off,off+size);off+=size;
  if((p[0]&3)!==0||(p[0]>>>3)<16||(p[0]>>>3)%4!==3)fail('CAF unqualified Opus frame duration');packets.push(p);
 }
 if(pos!==tab.length||off!==c.payload.length)fail('CAF unowned table/data bytes');
 const head=new Uint8Array(19),h=new DataView(head.buffer);head.set(new TextEncoder().encode('OpusHead'));head[8]=1;head[9]=2;h.setUint16(10,pre,true);h.setUint32(12,48000,true);
 const tags=new Uint8Array(16);tags.set(new TextEncoder().encode('OpusTags'));
 const pages=[page(head,0,0,2),page(tags,0,1,0),...packets.map((p,i)=>page(p,(i+1)*960-(i===packets.length-1?tail:0),i+2,i===packets.length-1?4:0))];
 return {bytes:join(pages),mime:'audio/ogg',frames:Number(valid),rate:48000,channels:2,sourceBytes:c.sourceBytes,payloadBytes:c.payload.length,priming:pre,tail,packets:packets.length};
}
