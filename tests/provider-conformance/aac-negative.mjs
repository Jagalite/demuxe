// SPDX-License-Identifier: Apache-2.0
// Explicit real-source LC syntax negatives have no PCM oracle.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sha} from './package.mjs';
import {decodeProbeHex} from './audio-fixtures.mjs';
export const aacNegativeReason='Unqualified AAC stereo single-channel element or leading syntax';
export function isAacSyntaxNegative(f){return f.codec==='aac'&&f.aacProfile==='lc'&&f.expectedRejection==='PROVIDER_PROFILE_MISMATCH'&&f.expectedMessage===aacNegativeReason&&f.negativeContract==='real-lc-stereo-leading-syntax';}
export function assertPositiveFixtureCoverage(fixtures){assert.ok(fixtures.some(f=>!f.expectedRejection),'Negative-only fixtures cannot qualify an audio offer');}
export async function runAacSyntaxNegative({createDecoder,fixture}){
 assert.ok(isAacSyntaxNegative(fixture),'Unsupported AAC negative contract');assert.equal(fixture.sampleRate,44100);assert.equal(fixture.channels,2);assert.equal(fixture.bitsPerSample,0);assert.ok(['isobmff','adts'].includes(fixture.sourceContainer),'Missing original AAC source framing');
 const fixtureInputs={};for(const[key,hashKey]of [['input','inputSHA256'],['packetFile','packetSHA256']]){const bytes=await readFile(fixture[key]);assert.match(fixture[hashKey]??'',/^[a-f0-9]{64}$/);assert.equal(sha(bytes),fixture[hashKey],'AAC negative source changed');fixtureInputs[fixture[key]]=sha(bytes);}
 const data=JSON.parse(await readFile(fixture.packetFile)),stream=data.streams?.find(s=>s.codec_type==='audio')??data.streams?.[0];assert.equal(stream?.codec_name,'aac');assert.equal(Number(stream.sample_rate),44100);assert.equal(stream.channels,2);assert.ok(stream.profile==='LC'||stream.profile===1,'Negative requires actual LC source');
 const extradata=decodeProbeHex(stream.extradata??'');if(fixture.sourceContainer==='isobmff')assert.ok(extradata.length>0,'Original ASC required');else assert.equal(extradata.length,0,'ADTS must use in-band original configuration');
 const packets=(data.packets??[]).filter(p=>p.stream_index===undefined||p.stream_index===stream.index).map(p=>({data:decodeProbeHex(p.data),pts:Math.round(Number(p.pts_time??0)*44100)}));assert.ok(packets.length&&packets.every(p=>p.data.length&&Number.isSafeInteger(p.pts)),'Missing original AAC access units');
 let rejectionIndex;
 for(let repeat=0;repeat<3;repeat++){
  const decoder=await createDecoder({codec:'aac',sampleRate:44100,channels:2,bitsPerSample:0,aacProfile:'lc',extradata},new AbortController().signal);assert.ok(decoder,'Native decoder factory failed');
  try{
   if(repeat>0)await decoder.reset();let found;
   for(const[i,p]of packets.entries()){try{await decoder.decode(p.data,p.pts);}catch(error){assert.equal(error.code,fixture.expectedRejection,'Wrong AAC rejection code');assert.equal(error.message,aacNegativeReason,'Wrong AAC rejection reason');found=i;break;}}
   assert.notEqual(found,undefined,'Original unsupported AAC sequence was accepted');if(repeat===0)rejectionIndex=found;else assert.equal(found,rejectionIndex,'Reset/repeat changed original syntax rejection');
   // Packet exceptions release the native owner; resetting an errored owner cannot revive it.
   await assert.rejects(async()=>decoder.reset(),/disposed/i,'Rejected decoder owner stayed alive');
   await assert.rejects(async()=>decoder.decode(packets[0].data,packets[0].pts),/disposed/i,'Rejected decoder stayed usable');
  }finally{await decoder.dispose();}
  await assert.rejects(async()=>decoder.decode(packets[0].data,packets[0].pts),/disposed/i,'Disposed decoder stayed usable');
 }
 for(const[name,digest]of Object.entries(fixtureInputs))assert.equal(sha(await readFile(name)),digest,'AAC negative input changed');
 return {id:fixture.id,passed:true,negative:true,scope:'Pinned original LC stereo syntax rejection before PCM access; exact reason, original sequence, reset/repeat and disposal.',fixtureInputs,sourceContainer:fixture.sourceContainer,packetCount:packets.length,rejectionIndex,rejectionCode:fixture.expectedRejection,rejectionMessage:aacNegativeReason};
}
