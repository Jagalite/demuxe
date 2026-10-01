// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MatroskaReader,restoreMatroskaWavPack} from '../build/component-candidates/provider-container/src/matroska.js';
const root=process.env.ARCHIVE_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-archive-audio-fixtures',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
const results=[];
for(const f of JSON.parse(await readFile(root+'/compositions.json'))){const row={id:f.id};try{
 const input=await readFile(f.input);assert.equal(sha(input),f.inputSHA256);const json=await readFile(root+'/'+f.id+'.json');assert.equal(sha(json),f.packetSHA256);const ref=JSON.parse(json);
 const reader=await MatroskaReader.open(new Blob([input]),new AbortController().signal),track=reader.tracks.find(t=>t.kind==='audio');assert.equal(track.codec,'A_WAVPACK4');assert.equal(track.privateData.length,2);
 let index=0;for await(const packet of reader.packets()){if(packet.track!==track.number)continue;const host=ref.packets[index++];assert.ok(host);assert.deepEqual(Buffer.from(packet.data),unhex(host.data),'exact native packet restored by maintained FFmpeg mapping');assert.ok(Math.abs(packet.timestampNs-Number(host.pts_time)*1e9)<1,'exact mapped timestamp');}assert.equal(index,ref.packets.length);
 Object.assign(row,{passed:true,packets:index,packetExact:true});console.log(f.id,'mapping PASS');
 }catch(e){if(f.expectedRejection&&f.bitsPerSample>24&&f.id.includes('float')&&e.code==='PROVIDER_PROFILE_MISMATCH')Object.assign(row,{passed:true,floatRejected:true});else Object.assign(row,{passed:false,error:String(e.stack??e)});}results.push(row);}
const mapping=new Uint8Array(13),view=new DataView(mapping.buffer);view.setUint32(0,1,true);view.setUint32(4,0x1800,true);mapping[12]=1;
for(const mode of ['size','version','samples','flags','order']){const payload=mapping.slice(),privateData=new Uint8Array([3,4]),v=new DataView(payload.buffer);if(mode==='size')payload.fill(0);if(mode==='version')privateData.fill(0);if(mode==='samples')v.setUint32(0,65537,true);if(mode==='flags')v.setUint32(4,0x1880,true);if(mode==='order')v.setUint32(4,0x1000,true);assert.throws(()=>restoreMatroskaWavPack(payload,privateData),e=>e.code==='PROVIDER_PROFILE_MISMATCH',mode);}
const inputs=Object.fromEntries(await Promise.all(['packages/provider-container/src/matroska.ts','tests/archive-audio-matroska.mjs','tests/archive-audio-composition-fixtures.py'].map(async p=>[p,sha(await readFile(p))]))),report={passed:results.every(r=>r.passed),scope:'Real independent host A_WAVPACK4 MKV packets reconstructed byte-exactly with bounded framing negatives; no APE Matroska mapping',inputs,results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/archive-audio-matroska.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
