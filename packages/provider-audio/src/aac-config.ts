// SPDX-License-Identifier: Apache-2.0
/** Explicit finite extensions; AAC-LC remains the default admission policy. */
export type AacProfile='lc'|'he'|'he-v2'|'usac';
export function aacProfileNumber(profile:AacProfile):number {
 if(profile==='lc')return 1;if(profile==='he')return 4;if(profile==='he-v2')return 28;if(profile==='usac')return 41;
 throw Object.assign(Error('Unknown AAC profile'),{code:'PROVIDER_PROFILE_MISMATCH'});
}
export function validateExtendedAacConfiguration(profile:AacProfile,rate:number,channels:number,extra:Uint8Array,allowAdts=false):void {
 aacProfileNumber(profile);if(profile==='lc')return;
 const reject=():never=>{throw Object.assign(Error('Unqualified explicit AAC extension configuration'),{code:'PROVIDER_PROFILE_MISMATCH'});};
 // Proven sync-SBR ASC: AAC-LC core24k stereo, SBR48k output.
 // Proven implicit-PS ASC: AAC-LC core22.05k mono, decoded44.1k stereo.
 // Exact proven USAC frequency-domain mono configuration. Alternate element,
 // SBR, time-warping or DRC configuration bytes do not enter this envelope.
 const expected=profile==='he'?[0x13,0x10,0x56,0xe5,0x98]:profile==='usac'?[0xf9,0x46,0x23,0x21,0x10,0xc0,0]:[0x13,0x88];
 if(channels!==(profile==='usac'?1:2)||rate!==(profile==='he-v2'?44100:48000))reject();
 if(allowAdts&&profile==='he-v2'&&!extra.length)return;
 if(extra.length!==expected.length||expected.some((v,i)=>extra[i]!==v))reject();
}
export function validateHeV2Adts(packet:Uint8Array):void {
 // Proven MPEG-2-ID, unprotected AAC-LC22.05k mono ADTS frame; actual PS/profile is
 // independently checked on every decoded frame. No multi-block/CRC variant.
 const length=((packet[3]&3)<<11)|(packet[4]<<3)|(packet[5]>>>5);
 if(packet.length<7||packet[0]!==255||packet[1]!==0xf9||(packet[2]>>>6)!==1||((packet[2]>>>2)&15)!==7||(((packet[2]&1)<<2)|(packet[3]>>>6))!==1||(packet[6]&3)!==0||length!==packet.length)
  throw Object.assign(Error('Unqualified HEv2 ADTS frame'),{code:'PROVIDER_PROFILE_MISMATCH'});
}
