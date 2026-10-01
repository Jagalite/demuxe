// SPDX-License-Identifier: Apache-2.0
/** Exact finite Speex identification headers; headerless FLV stays separate. */
export function speexOggFrameSamples(header:Uint8Array,rate:number,channels:number):number{
 const reject=():never=>{throw Object.assign(Error('Unqualified Ogg Speex identification'),{code:'PROVIDER_PROFILE_MISMATCH'});};
 if(!(header instanceof Uint8Array)||header.length!==80||channels!==1||![8000,32000].includes(rate)||String.fromCharCode(...header.subarray(0,8))!=='Speex   ')reject();
 const v=new DataView(header.buffer,header.byteOffset,header.byteLength),mode=rate===8000?0:2,frame=rate===8000?160:640;
 if(v.getUint32(28,true)!==1||v.getUint32(32,true)!==80||v.getUint32(36,true)!==rate||v.getUint32(40,true)!==mode||v.getUint32(44,true)!==4||v.getUint32(48,true)!==1||v.getInt32(52,true)!==-1||v.getUint32(56,true)!==frame||v.getUint32(60,true)!==0||v.getUint32(64,true)!==1||v.getUint32(68,true)!==0||v.getUint32(72,true)!==0||v.getUint32(76,true)!==0)reject();
 return frame;
}
