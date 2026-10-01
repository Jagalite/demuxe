// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
export function assertDtsHdAdmission(PacketAudioDecoder){
const controls=[];
for(const [channels,bits] of [[1,16],[2,0],[2,32],[6,32],[8,32]]){
 let pending=false,destroyed=0;const heap=new Uint8Array(2*1024*1024),module={HEAPU8:heap,_mc_create:()=>1,_mc_configure:()=>0,_malloc:()=>1024,_free(){},_mc_destroy(){destroyed++;},_mc_decode(){pending=true;return 0;},_mc_frame(){if(pending){pending=false;return 0;}return -6;},_mc_info:(_,i)=>[40,48000,channels,6,0,40,channels===1?4:channels===2?3:channels===6?63:1599,0,0,bits][i]??0,_mc_plane:()=>64};
 const decoder=new PacketAudioDecoder(module,'dts-hd',new AbortController().signal);
 assert.throws(()=>decoder.decode(Uint8Array.of(1),0),e=>e.code==='PROVIDER_PROFILE_MISMATCH'&&e.message==='Unqualified finite DTS-HD decoded rate/layout/precision');
 assert.equal(destroyed,1);assert.throws(()=>decoder.decode(Uint8Array.of(1),0),/disposed/);assert.throws(()=>decoder.reset(),/disposed/);
 controls.push({rate:48000,channels,bits,configurationOmitted:true,rejected:true,disposed:true});
}
return controls;
}
