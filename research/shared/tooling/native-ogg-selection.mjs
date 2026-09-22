// SPDX-License-Identifier: Apache-2.0
// Finite, source-bound Ogg FLAC page projection; research only.
const table=Uint32Array.from({length:256},(_,i)=>{let x=i<<24;for(let j=0;j<8;j++)x=(x<<1)^((x>>>31)?0x04c11db7:0);return x>>>0;});
function crc(b){let c=0;for(let i=0;i<b.length;i++)c=((c<<8)^table[((c>>>24)^(i>=22&&i<26?0:b[i]))&255])>>>0;return c;}
const fail=message=>{throw Error(message);};
export async function projectOggPages(input,options){
 if(!(input instanceof Uint8Array)||input.length<79||input.length>16*1024*1024)fail('finite input budget');
 if(!options||!Number.isInteger(options.serial)||options.serial<0||options.serial>0xffffffff||!/^[a-f0-9]{64}$/.test(options.sourceSha256||''))fail('explicit source and stream selection required');
 const b=input.slice(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==options.sourceSha256)fail('source identity');
 const streams=new Map(),selected=[];let at=0,bytes=0,pages=0;
 while(at<b.length){
  if(++pages>4096||at+27>b.length||String.fromCharCode(...b.subarray(at,at+4))!=='OggS'||b[at+4]!==0||b[at+5]&~7)fail('page header');
  const flags=b[at+5],segments=b[at+26],header=27+segments;if(!segments||at+header>b.length)fail('segment table');const lengths=b.subarray(at+27,at+header),size=header+lengths.reduce((a,n)=>a+n,0);if(at+size>b.length)fail('page extent');
  const page=b.subarray(at,at+size),v=new DataView(page.buffer,page.byteOffset,page.byteLength),serial=v.getUint32(14,true),sequence=v.getUint32(18,true);if(crc(page)!==v.getUint32(22,true))fail('page CRC');
  let stream=streams.get(serial);
  if(!stream){
   if(streams.size>=8||sequence!==0||flags!==2||segments!==1||lengths[0]!==51)fail('restricted FLAC BOS');
   const p=page.subarray(header);if(String.fromCharCode(...p.subarray(0,5))!=='\x7fFLAC'||p[5]!==1||p[6]!==0||p[7]!==0||p[8]!==1||String.fromCharCode(...p.subarray(9,13))!=='fLaC'||p[13]!==0||p[14]!==0||p[15]!==0||p[16]!==34)fail('FLAC mapping');
   const packed=new DataView(p.buffer,p.byteOffset,p.byteLength).getBigUint64(27),rate=Number(packed>>44n),channels=Number((packed>>41n)&7n)+1,bits=Number((packed>>36n)&31n)+1,frames=Number(packed&0xfffffffffn);
   if(rate!==48000||channels!==2||![16,24].includes(bits)||frames<1||frames>480000)fail('bounded stereo FLAC profile');
   stream={next:0,continued:false,ended:false,granule:0n,frames,rate,channels};streams.set(serial,stream);
  }else if(flags&2)fail('repeated BOS');
  if(sequence!==stream.next++||stream.ended||!!(flags&1)!==stream.continued)fail('page sequence or packet continuation');
  stream.continued=lengths.at(-1)===255;const granule=v.getBigInt64(6,true);if(granule>=0n){if(granule<stream.granule||granule>BigInt(stream.frames))fail('granule bounds');stream.granule=granule;}
  if(flags&4){if(stream.continued||granule!==BigInt(stream.frames))fail('incomplete EOS');stream.ended=true;}
  if(serial===options.serial){selected.push(page);bytes+=size;}at+=size;
 }
 if([...streams.values()].some(s=>!s.ended)||!selected.length)fail('missing EOS or unknown stream');
 const out=new Uint8Array(bytes);at=0;for(const page of selected){out.set(page,at);at+=page.length;}const s=streams.get(options.serial);
 return {bytes:out,mime:'audio/ogg',frames:s.frames,rate:s.rate,channels:s.channels,selectedPages:selected.length,sourceBytes:b.length};
}
