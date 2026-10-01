// SPDX-License-Identifier: Apache-2.0
// Independent ffprobe byte/timing references, malicious tables, bounded reads.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {IsoBmffReader} from '../build/isobmff-reader/isobmff.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixtures=JSON.parse(await readFile('build/isobmff-fixtures/fixtures.json')),results=[];
class LocalBlob extends Blob{
 reads=[];async arrayBuffer(){throw Error('Whole-file read forbidden');}
 slice(start,end,type){this.reads.push({start,end});assert.ok(end-start<=65536,'bounded slice');return super.slice(start,end,type);}
}
for(const f of fixtures){
 const bytes=await readFile(f.input),file=new LocalBlob([bytes]),reader=await IsoBmffReader.open(file,new AbortController().signal);
 const reference=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',f.input],{maxBuffer:4*1024*1024}));
 const packets=[];for await(const p of reader.packets())packets.push(p);
 for(const stream of reference.streams){
  const track=reader.tracks.find(t=>t.number===Number(stream.id)),actual=packets.filter(p=>p.track===track.number),expected=reference.packets.filter(p=>p.stream_index===stream.index);
  const scale=Number(stream.time_base.split('/')[1]);
  if(f.codec.startsWith('pcm-')&&stream.codec_type==='audio'){
   assert.equal(sha(Buffer.concat(actual.map(p=>Buffer.from(p.data)))),sha(Buffer.concat(expected.map(p=>bytes.subarray(Number(p.pos),Number(p.pos)+Number(p.size))))));
   assert.equal(actual.reduce((n,p)=>n+Math.round(p.durationNs*scale/1e9),0),expected.reduce((n,p)=>n+Number(p.duration),0));
   let sample=0;for(const p of actual){assert.equal(Math.round(p.timestampNs*scale/1e9),sample);sample+=Math.round(p.durationNs*scale/1e9);}
  }else{
   assert.equal(actual.length,expected.length,f.id+' packet count');
   for(let i=0;i<actual.length;i++){
    const p=actual[i],e=expected[i],delay=stream.codec_type==='audio'?Math.round((track.codecDelayNs??0)*scale/1e9):0;
    assert.equal(sha(p.data),e.data_hash.split(':')[1].toLowerCase(),f.id+' packet bytes');
    assert.equal(Math.round(p.timestampNs*scale/1e9),Number(e.pts)+delay,f.id+' packet timestamp');
    assert.equal(Math.round(p.durationNs*scale/1e9),Number(e.duration),f.id+' packet duration');
    assert.equal(p.key,e.flags.includes('K'),f.id+' key frame');
   }
  }
 }
 assert.ok(file.reads.length>0);results.push({id:f.id,inputSHA256:sha(bytes),packets:packets.length,bytesRead:reader.bytesRead,maxRead:Math.max(...file.reads.map(r=>r.end-r.start)),passed:true});
}
function locate(b,type,occurrence=0){for(let p=4;p<b.length;p++){if(b.toString('latin1',p,p+4)===type){const size=b.readUInt32BE(p-4);if(size>=8&&p-4+size<=b.length&&occurrence--===0)return p+4;}}throw Error('Box missing '+type);}
const base=await readFile(fixtures[0].input);
// Exercise the independent 64-bit chunk offset path without huge media.
function promoteOffsets(data){
 const parts=[];for(let p=0;p<data.length;){const size=data.readUInt32BE(p),type=data.toString('latin1',p+4,p+8);let payload=data.subarray(p+8,p+size);
  if(['moov','trak','mdia','minf','dinf','stbl','edts'].includes(type))payload=promoteOffsets(payload);
  else if(type==='stco'){const count=payload.readUInt32BE(4),out=Buffer.alloc(8+count*8);payload.copy(out,0,0,8);for(let i=0;i<count;i++)out.writeBigUInt64BE(BigInt(payload.readUInt32BE(8+i*4)),8+i*8);payload=out;}
  const h=Buffer.alloc(8);h.writeUInt32BE(payload.length+8);h.write(type==='stco'?'co64':type,4);parts.push(h,payload);p+=size;
 }return Buffer.concat(parts);
}
const promoted=promoteOffsets(base),wide=await IsoBmffReader.open(new Blob([promoted]),new AbortController().signal),normal=await IsoBmffReader.open(new Blob([base]),new AbortController().signal);
const collect=async r=>{const a=[];for await(const p of r.packets())a.push({track:p.track,time:p.timestampNs,hash:sha(p.data)});return a;};assert.deepEqual(await collect(wide),await collect(normal));results.push({id:'co64-reference-equivalence',passed:true});
const rejects=[
 ['truncated-header',b=>b.subarray(0,5)],
 ['box-overrun',b=>{b.writeUInt32BE(b.length+1,0);return b;}],
 ['encrypted-entry',b=>{b.write('enca',locate(b,'alac')-4);return b;}],
 ['external-reference',b=>{b.writeUInt32BE(0,locate(b,'url '));return b;}],
 ['nonidentity-edit',b=>{b.writeUInt32BE(1,locate(b,'elst')+12);return b;}],
 ['overlapping-chunks',b=>{const p=locate(b,'stco');assert.ok(b.readUInt32BE(p+4)>1);b.writeUInt32BE(b.readUInt32BE(p+8),p+12);return b;}],
 ['chunk-outside-mdat',b=>{b.writeUInt32BE(0,locate(b,'stco')+8);return b;}],
 ['wrong-sample-count',b=>{const p=locate(b,'stsz');b.writeUInt32BE(b.readUInt32BE(p+8)+1,p+8);return b;}],
 ['wrong-chunk-description',b=>{b.writeUInt32BE(2,locate(b,'stsc')+16);return b;}],
 ['transformed-video',b=>{b.writeUInt32BE(0,locate(b,'tkhd')+40);return b;}],
 ['fragmented-source',b=>{b.write('moof',locate(b,'moov')-4);return b;}],
 ['wrong-original-format',b=>{b.write('fl32',locate(b,'frma'));return b;}],
 ['wrong-sample-config-kind',b=>{b.write('dfLa',locate(b,'alac',1)-4);return b;}],
 ['nonsquare-pixels',b=>{const p=locate(b,'pasp');b.writeUInt32BE(2,p);return b;}],
];
for(const [id,mutate]of rejects){const data=mutate(Buffer.from(base));await assert.rejects(()=>IsoBmffReader.open(new Blob([data]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH',id);results.push({id,rejected:true,passed:true});}
const aacMono=await readFile(fixtures.find(f=>f.id==='aac-mono44100').input),fractional=Buffer.from(aacMono),edit=locate(fractional,'elst',1);fractional.writeUInt32BE(319,edit+8);
await assert.rejects(()=>IsoBmffReader.open(new Blob([fractional]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');results.push({id:'fractional-aac-edit-rejected',passed:true});
const odd=fixtures.find(f=>f.id==='aac-odd'),oddReader=await IsoBmffReader.open(new Blob([await readFile(odd.input)]),new AbortController().signal);let discarded=0;for await(const p of oddReader.packets())discarded+=Math.round((p.discardPaddingNs??0)*48000/1e9);assert.equal(discarded,880);results.push({id:'aac-edit-final-tail880',referenceSamples:odd.referenceSamples,discardSamples:discarded,passed:true});
const controller=new AbortController();controller.abort();await assert.rejects(()=>IsoBmffReader.open(new Blob([base]),controller.signal),e=>e.name==='AbortError');results.push({id:'abort-before-open',passed:true});
const ctl=new AbortController(),reader=await IsoBmffReader.open(new Blob([base]),ctl.signal),iterator=reader.packets();await iterator.next();ctl.abort();await assert.rejects(()=>iterator.next(),e=>e.name==='AbortError');results.push({id:'abort-during-packets',passed:true});
// Append a large skippable box: metadata discovery must not fetch its payload.
const header=Buffer.alloc(8);header.writeUInt32BE(32*1024*1024+8);header.write('free',4);const padded=new LocalBlob([base,header,new Uint8Array(32*1024*1024)]),large=await IsoBmffReader.open(padded,new AbortController().signal);
for await(const p of large.packets()){}assert.ok(large.bytesRead<base.length+1024);results.push({id:'32mib-free-bounded',size:padded.size,bytesRead:large.bytesRead,passed:true});
await mkdir('build/isobmff-reader',{recursive:true});await writeFile('build/isobmff-reader/results.json',JSON.stringify({passed:true,scope:'Finite stereo48k AVC MOV/MP4, independent ffprobe packet references and malformed structure rejection',results},null,2)+'\n');console.log(results.length+' ISO BMFF reader cases passed');
