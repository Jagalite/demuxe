// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {sha,probe,packetHash,BoundedBlob,collect,ownershipAndCancellation,rejectInput} from './container-specific-common.mjs';
export function locateBox(b,type,occurrence=0){for(let p=4;p<b.length-4;p++)if(b.toString('latin1',p,p+4)===type){const size=b.readUInt32BE(p-4);if(size>=8&&p-4+size<=b.length&&occurrence--===0)return p+4;}throw Error('Reference box missing '+type);}
const codecs={h264:'V_MPEG4/ISO/AVC',alac:'A_ALAC',aac:'A_AAC',flac:'A_FLAC',pcm_f64le:'A_PCM/FLOAT/IEEE',pcm_f32le:'A_PCM/FLOAT/IEEE',adpcm_ima_qt:'A_ADPCM/IMA_QT'};
export async function checkIsoBmff({open,input,bytes,aacProfile}){
 const ctl=new AbortController(),file=new BoundedBlob([bytes]),reader=await open(file,ctl.signal),packets=await collect(reader),ref=await probe(input),evidence=[];
 assert.equal(reader.tracks.length,ref.streams.length);
 for(const s of ref.streams){const t=reader.tracks.find(t=>t.number===Number(s.id));assert.ok(t,'Reference track ID missing');assert.equal(t.kind,s.codec_type);assert.equal(t.codec,codecs[s.codec_name],'Qualified sample-entry codec');
  if(t.kind==='video'){assert.equal(t.width,s.width);assert.equal(t.height,s.height);}else{assert.equal(t.rate,Number(s.sample_rate));assert.equal(t.channels,s.channels);}
  if(s.extradata_hash)assert.equal(sha(t.privateData),s.extradata_hash.split(':')[1].toLowerCase(),'Original sample-entry configuration');
  const a=packets.filter(p=>p.track===t.number),b=ref.packets.filter(p=>p.stream_index===s.index),scale=Number(s.time_base.split('/')[1]);
  if(s.codec_name.startsWith('pcm_')){assert.equal(sha(Buffer.concat(a.map(p=>Buffer.from(p.data)))),sha(Buffer.concat(b.map(p=>bytes.subarray(Number(p.pos),Number(p.pos)+Number(p.size))))),'Regrouped PCM payload');let sample=0;for(const p of a){assert.equal(Math.round(p.timestampNs*scale/1e9),sample);sample+=Math.round(p.durationNs*scale/1e9);}assert.equal(sample,b.reduce((n,p)=>n+Number(p.duration),0),'Original PCM extent');}
  else{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){assert.equal(sha(a[i].data),packetHash(b[i]),'Original packet payload');const delay=Math.round((t.codecDelayNs??0)*scale/1e9);assert.equal(Math.round(a[i].timestampNs*scale/1e9),Number(b[i].pts)+delay,'Explicit sample-table PTS');assert.equal(Math.round(a[i].durationNs*scale/1e9),Number(b[i].duration),'Explicit sample-table duration');assert.equal(a[i].key,b[i].flags.includes('K'));}}
  if(s.codec_name==='aac'){const duration=Number(s.duration_ts),delay=Math.round((t.codecDelayNs??0)*scale/1e9),discard=Math.round((a.at(-1).discardPaddingNs??0)*scale/1e9);assert.equal(a.length*(['he','hev2'].includes(aacProfile)?2048:1024)-delay-discard,duration,'AAC original edit presentation extent');}
  evidence.push({codec:s.codec_name,packets:a.length,configurationSHA256:sha(t.privateData)});
 }
 const configurationRejections=[];
 if(ref.streams.some(s=>s.codec_name==='aac')&&(!aacProfile||aacProfile==='lc')){
  // Keep the LC envelope narrow when explicit HE/PS/USAC descriptors grow.
  // Change only the ASC's declared length; preserve the real movie and its
  // outer descriptor/box sizes so this exercises configuration admission.
  let p=locateBox(bytes,'esds')+4;
  const descriptor=()=>{const tag=bytes[p++];let length=0,last;do{last=p;length=length*128+(bytes[p]&127);}while(bytes[p++]&128);return{tag,length,start:p,last};};
  const es=descriptor();assert.equal(es.tag,3);assert.equal(bytes[es.start+2],0);p=es.start+3;
  const decoder=descriptor();assert.equal(decoder.tag,4);p=decoder.start+13;
  const asc=descriptor();assert.equal(asc.tag,5);assert.ok([2,5].includes(asc.length),'Admitted LC ASC positive control');
  if(asc.length===5)for(const length of[3,4]){const changed=Buffer.from(bytes);changed[asc.last]=length;configurationRejections.push(await rejectInput(open,changed,'unqualified-lc-asc-length-'+length));}
 }
 const safety=await ownershipAndCancellation(open,bytes,reader,packets,ctl);return {packets:packets.length,tracks:evidence,configurationRejections,maximumRead:Math.max(...file.reads.map(r=>r.end-r.start)),...safety};
}
export async function isoBmffRejections(open,base){
 const mutations=[['box-overrun',b=>b.writeUInt32BE(b.length+1,0)],['fragmented',b=>b.write('moof',locateBox(b,'moov')-4)],['external-reference',b=>b.writeUInt32BE(0,locateBox(b,'url '))],['wrong-sample-count',b=>{const p=locateBox(b,'stsz');b.writeUInt32BE(b.readUInt32BE(p+8)+1,p+8);}],['wrong-chunk-description',b=>b.writeUInt32BE(2,locateBox(b,'stsc')+16)],['chunk-outside-media',b=>b.writeUInt32BE(0,locateBox(b,'stco')+8)],['transformed-video',b=>b.writeUInt32BE(0,locateBox(b,'tkhd')+40)],['unsupported-edit',b=>b.writeUInt32BE(1,locateBox(b,'elst')+12)],['encrypted-sample-entry',b=>{const type=['alac','mp4a','fLaC','f64l'].find(t=>b.includes(Buffer.from(t)));assert.ok(type);b.write('enca',locateBox(b,type)-4);}]];
 const results=[];for(const [id,edit]of mutations){const b=Buffer.from(base);edit(b);results.push(await rejectInput(open,b,id));}return results;
}
