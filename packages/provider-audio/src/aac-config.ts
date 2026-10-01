// SPDX-License-Identifier: Apache-2.0
/** Explicit finite extensions; AAC-LC remains the default admission policy. */
export type AacProfile='lc'|'he'|'he-v2'|'usac';
export function aacProfileNumber(profile:AacProfile):number {
 if(profile==='lc')return 1;if(profile==='he')return 4;if(profile==='he-v2')return 28;if(profile==='usac')return 41;
 throw Object.assign(Error('Unknown AAC profile'),{code:'PROVIDER_PROFILE_MISMATCH'});
}
export function validateExtendedAacConfiguration(profile:AacProfile,rate:number,channels:number,extra:Uint8Array,allowAdts=false):void {
 aacProfileNumber(profile);if(profile==='lc'){if(channels===8&&(rate!==44100||extra.length!==14||![0x12,0,5,0x0c,5,0x20,1,9,0x44,0,3,0xac,4,0x2f].every((v,i)=>extra[i]===v)))throw Object.assign(Error('Unqualified AAC-LC eight-channel PCE configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});return;}
 const reject=():never=>{throw Object.assign(Error('Unqualified explicit AAC extension configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});};
 // Each envelope binds real ASC bytes, decoded rate and channel count.
 // HE5.1 has native mask207 and stays packet-only; no surround remapping.
 const envelopes:Record<string,readonly [number,number,readonly number[]][]>={
  he:[[48000,2,[0x13,0x10,0x56,0xe5,0x98]],[48000,2,[0x11,0x90,0x56,0xe5,0x98]],[48000,6,[0x13,0,5,0x8c,1,0,1,8,0x80,0,0x56,0xe5,0x98]]],
  'he-v2':[[44100,2,[0x13,0x88]],[32000,2,[0x14,0,6,4,0,0,0,0,0x56,0xe5,0xa8]]],
  usac:[[48000,1,[0xf9,0x46,0x23,0x21,0x10,0xc0,0]],[48000,2,[0xf9,0x46,0x43,0x22,0x14,0xc0,0]],[32000,2,[0xf9,0x4a,0x45,0x22,0x14,0xc0,0]],[44100,2,[0xf9,0x48,0x44,0x22,0x14,0xc0,0]],[88200,2,[0xf9,0x42,0x41,0x22,0x14,0xc0,0]]],
 };
 if(allowAdts&&profile==='he-v2'&&rate===44100&&channels===2&&!extra.length)return;
 if(!envelopes[profile]?.some(([r,c,bytes])=>r===rate&&c===channels&&extra.length===bytes.length&&bytes.every((byte,i)=>extra[i]===byte)))reject();

}
export function validateHeV2Adts(packet:Uint8Array):void {
 // Proven MPEG-2-ID, unprotected AAC-LC22.05k mono ADTS frame; actual PS/profile is
 // independently checked on every decoded frame. No multi-block/CRC variant.
 const length=((packet[3]&3)<<11)|(packet[4]<<3)|(packet[5]>>>5);
 if(packet.length<7||packet[0]!==255||packet[1]!==0xf9||(packet[2]>>>6)!==1||((packet[2]>>>2)&15)!==7||(((packet[2]&1)<<2)|(packet[3]>>>6))!==1||(packet[6]&3)!==0||length!==packet.length)
  throw Object.assign(Error('Unqualified HEv2 ADTS frame'),{code:'PROVIDER_PROFILE_MISMATCH'});
}

export function aacFrameSamples(profile:AacProfile,extra:Uint8Array):number{return profile==='lc'||profile==='usac'||profile==='he'&&extra[0]===0x11&&extra[1]===0x90?1024:2048;}

/** Exact native frame geometry and independently observed container priming for the finite ASC envelopes. */
export function aacExtensionTiming(profile:Exclude<AacProfile,'lc'>,rate:number,channels:number,extra:Uint8Array):{frameSamples:number;primingSamples:number}{
 validateExtendedAacConfiguration(profile,rate,channels,extra);return {frameSamples:aacFrameSamples(profile,extra),primingSamples:profile==='usac'?(rate===88200?2323:2220):0};
}

/** Parse only the leading fill elements in the finite stereo LC packet envelope. */
export function validateLcStereoPacket(packet:Uint8Array):void {
 const reject=():never=>{throw Object.assign(Error('Unqualified AAC stereo single-channel element or leading syntax'),{code:'PROVIDER_PROFILE_MISMATCH'});};
 if(packet.length>=2&&packet[0]===255&&(packet[1]&0xf0)===0xf0){
  const header=(packet[1]&1)?7:9,length=packet.length>=7?((packet[3]&3)<<11)|(packet[4]<<3)|(packet[5]>>>5):0;
  if(packet.length<=header||((packet[1]>>>1)&3)!==0||(packet[2]>>>6)!==1||(((packet[2]&1)<<2)|(packet[3]>>>6))!==2||(packet[6]&3)!==0||length!==packet.length)reject();packet=packet.subarray(header);
 }
 let position=0;const bits=(count:number):number=>{if(position+count>packet.length*8)reject();let value=0;for(let i=0;i<count;i++,position++)value=value*2+((packet[position>>>3]>>>(7-(position&7)))&1);return value;};
 for(let elements=0;elements<64;elements++){
  const id=bits(3);if(id===1||id===7)return; // CPE or metadata-only END.
  if(id!==6)reject(); // SCE and other unqualified leading structures.
  let count=bits(4);if(count===15)count+=bits(8)-1;
  if(position+count*8>packet.length*8)reject();position+=count*8;
 }
 reject();
}
