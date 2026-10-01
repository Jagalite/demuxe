// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const exec=promisify(execFile);
export const sha=data=>createHash('sha256').update(data).digest('hex');
export const profileMismatch=e=>e?.code==='PROVIDER_PROFILE_MISMATCH';
export const aborted=e=>e?.name==='AbortError';
export async function native(command,args){return (await exec(command,args,{encoding:'buffer',maxBuffer:64*1024*1024})).stdout;}
export async function probe(input){return JSON.parse(await native('ffprobe',['-v','error','-show_packets','-show_streams','-show_format','-show_data','-show_data_hash','sha256','-of','json',input]));}
export const unhex=dump=>Buffer.from((dump??'').split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
export const packetHash=p=>p.data_hash?.split(':')[1]?.toLowerCase();
export class BoundedBlob extends Blob{
 reads=[];maximumReadBound=65536;async arrayBuffer(){throw Error('Conformance forbids whole source Blob reads');}
 slice(start=0,end=this.size,type){assert.ok(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>=start&&end-start<=this.maximumReadBound,'Reader byte-range budget');this.reads.push({start,end});return super.slice(start,end,type);}
}
export async function collect(reader){const packets=[];for await(const p of reader.packets())packets.push(p);assert.ok(packets.length,'Fixture must contain packets');return packets;}
export async function ownershipAndCancellation(open,bytes,reader,packets,controller){
 const snapshots=packets.map(p=>Buffer.from(p.data));for(const p of packets)assert.ok(p.data instanceof Uint8Array,'Owned packet bytes');
 for(let i=0;i<packets.length;i++)assert.deepEqual(Buffer.from(packets[i].data),snapshots[i]);
 packets[0].data[0]^=255;for(let i=1;i<packets.length;i++)assert.deepEqual(Buffer.from(packets[i].data),snapshots[i],'Payloads alias');
 const repeat=reader.packets();assert.deepEqual(Buffer.from((await repeat.next()).value.data),snapshots[0],'Mutating output changes source');await repeat.return?.();packets[0].data[0]^=255;
 assert.deepEqual((await collect(reader)).map(p=>sha(p.data)),snapshots.map(sha),'Early iterator return poisons reader');
 const active=reader.packets();await active.next();controller.abort();await assert.rejects(()=>active.next(),aborted,'Iteration must honor cancellation');
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(()=>open(new Blob([bytes]),cancelled.signal),aborted,'Opening must honor cancellation');
 await assert.rejects(async()=>{const r=await open(new Blob([bytes.subarray(0,Math.min(50,bytes.length-1))]),new AbortController().signal);await collect(r);},profileMismatch,'Truncated source must reject explicitly');
 return {ownedOutput:true,iteratorReturn:true,abortBeforeOpen:true,abortDuringPackets:true,truncationRejected:true};
}
export async function rejectInput(open,bytes,label){await assert.rejects(async()=>{const r=await open(new Blob([bytes]),new AbortController().signal);await collect(r);},profileMismatch,label);return label;}
export async function prepareFixtures(kind,out){
 await mkdir(out,{recursive:true});const rows=[];
 const audio=['-f','lavfi','-i','aevalsrc=0.35*sin(2*PI*443*t)|0.2*sin(2*PI*787*t):s=48000:d=0.731'];
 const video=['-f','lavfi','-i','testsrc2=size=96x64:rate=25'];
 const encode=async(id,extension,args)=>{const input=path.join(out,id+'.'+extension);await native('ffmpeg',['-v','error','-cpuflags','0','-y',...args,input]);rows.push({id,input,container:kind});};
 if(kind==='isobmff')for(const [id,codec,extension,extra]of [['alac','alac','mov',[]],['aac-tail','aac','mp4',[]],['float64','pcm_f64le','mov',[]],['flac','flac','mp4',['-strict','experimental']]])await encode(id,extension,[...video,...audio,'-t','0.731','-c:v','libx264','-threads','1','-bf','0','-pix_fmt','yuv420p','-c:a',codec,...extra]);
 else if(kind==='ogg')for(const [id,codec,extra]of [['opus','libopus',[]],['vorbis','vorbis',['-strict','experimental']],['flac','flac',['-strict','experimental','-sample_fmt','s32','-bits_per_raw_sample','24']]])await encode(id,'ogg',[...audio,'-c:a',codec,...extra]);
 else if(kind==='wave-aiff')for(const [id,codec,ext]of [['wave24','pcm_s24le','wav'],['aiff24','pcm_s24be','aiff'],['wave64','pcm_f64le','wav'],['wave8','pcm_u8','wav'],['aiff8','pcm_s8','aiff']])await encode(id,ext,[...audio,'-c:a',codec]);
 else if(kind==='mpegts')for(const bf of [0,2])await encode('avc-aac-bf'+bf,'ts',[...video,...audio,'-t','0.731','-c:v','libx264','-threads','1','-bf',String(bf),'-pix_fmt','yuv420p','-c:a','aac','-ac','2','-f','mpegts']);
 else if(kind==='webm')for(const [v,a]of [['vp8','libopus'],['vp9','vorbis']])await encode(v+'-'+a,'webm',[...video,...audio,'-t','0.731','-c:v',v==='vp8'?'libvpx':'libvpx-vp9','-threads','1','-deadline','realtime','-cpu-used','8','-auto-alt-ref','0','-lag-in-frames','0','-g','5','-c:a',a,...(a==='vorbis'?['-strict','experimental']:[])]);
 else throw Error('Unqualified container fixture kind');
 return rows;
}
export async function fixtureBytes(f){assert.ok(path.isAbsolute(f.input),'Container fixture path must be absolute');const data=await readFile(f.input);if(f.inputSHA256)assert.equal(sha(data),f.inputSHA256,'Fixture source hash');return data;}
