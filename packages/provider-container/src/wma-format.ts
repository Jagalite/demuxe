// SPDX-License-Identifier: Apache-2.0
import {ContainerProfileError} from './matroska.js';
import type {AudioDecoderConfiguration} from '../../provider-audio/src/packet-decoder.js';
/** WMA framing comes from the container's WAVEFORMATEX, never packet guesses. */
export function parseWmaFormat(bytes:Uint8Array,rate:number|undefined,channels:number|undefined,bits:number|undefined):{codec:'wmav1'|'wmav2';configuration:AudioDecoderConfiguration}{
 const fail=():never=>{throw new ContainerProfileError('Unqualified WMA WAVEFORMATEX metadata');};
 if(bytes.length<18)return fail();const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=v.getUint16(0,true);
 if(tag!==0x160&&tag!==0x161)return fail();
 // FFmpeg Matroska reports decoded float precision (32) while the
 // WAVEFORMATEX coded sample width is 16 for these WMA profiles.
 const count=v.getUint16(2,true),sampleRate=v.getUint32(4,true),bitRate=v.getUint32(8,true)*8,blockAlign=v.getUint16(12,true),width=v.getUint16(14,true),extra=v.getUint16(16,true);
 if(extra!==(tag===0x160?4:10)||bytes.length!==18+extra||![44100,48000].includes(sampleRate)||![1,2].includes(count)
  ||rate!==sampleRate||channels!==count||width!==16||(bits!==undefined&&bits!==16&&bits!==32)||!blockAlign||!bitRate||bitRate>10000000)return fail();
 return {codec:tag===0x160?'wmav1':'wmav2',configuration:{sampleRate,channels:count,bitsPerSample:width,bitRate,blockAlign,extradata:bytes.slice(18)}};
}
