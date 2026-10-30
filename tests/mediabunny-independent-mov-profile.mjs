// SPDX-License-Identifier: Apache-2.0
// Inspect bounded, independently authored MOV facts; this is not qualification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createBoundedReader} from '../packages/provider-mediabunny/bounded-reader.js';
import {inspectMp4TrackProfiles} from '../packages/provider-mediabunny/mp4-profile.js';
const path = 'packages/provider-mediabunny/qualification/fixtures/ffmpeg-aac-mono-48000-noedit.mov';
const bytes = await readFile(path), found = new Map();
const containers = new Set(['moov','trak','mdia','minf','stbl','edts','dinf']);
function walk(start,end) {
 for(let at=start;at<end;) {
  assert.ok(end-at>=8); let size=bytes.readUInt32BE(at), header=8; const type=bytes.toString('latin1',at+4,at+8);
  if(size===1){assert.ok(end-at>=16);size=Number(bytes.readBigUInt64BE(at+8));header=16;}
  if(size===0)size=end-at;
  assert.ok(Number.isSafeInteger(size)&&size>=header&&size<=end-at);
  if(['stsd','sgpd','sbgp','stts','elst'].includes(type)){assert.ok(!found.has(type));found.set(type,bytes.subarray(at+header,at+size));}
  if(containers.has(type))walk(at+header,at+size);
  at+=size;
 }
}
walk(0,bytes.length);
assert.equal(bytes.toString('latin1',8,12),'qt  ');assert.equal(found.has('elst'),false);
const stsd=found.get('stsd');assert.equal(stsd.readUInt32BE(4),1);assert.equal(stsd.toString('latin1',12,16),'mp4a');assert.equal(stsd.readUInt16BE(24),1);
const children=[];for(let at=60;at<stsd.length;){assert.ok(stsd.length-at>=8);const n=stsd.readUInt32BE(at);assert.ok(n>=8&&n<=stsd.length-at);children.push(stsd.toString('latin1',at+4,at+8));at+=n;}
assert.deepEqual(children,['wave','chan']);
const sgpd=found.get('sgpd'),sbgp=found.get('sbgp'),stts=found.get('stts');
assert.equal(sgpd.toString('latin1',4,8),'roll');assert.equal(sgpd.readInt16BE(16),-1);
assert.equal(sbgp.toString('latin1',4,8),'roll');assert.equal(sbgp.readUInt32BE(8),1);assert.equal(sbgp.readUInt32BE(12),151);assert.equal(sbgp.readUInt32BE(16),1);
assert.equal(stts.readUInt32BE(4),1);assert.equal(stts.readUInt32BE(8),151);assert.equal(stts.readUInt32BE(12),1024);
const reader=createBoundedReader({size:bytes.length,read:async(at,n)=>bytes.subarray(at,at+n)},{maxReads:4096});
try{await assert.rejects(inspectMp4TrackProfiles(reader),{code:'PROVIDER_PROFILE_MISMATCH'});}finally{await reader.close();}
console.log(JSON.stringify({status:'independent-noedit-mov-profile-observed-not-qualified',fixture:path,sha256:createHash('sha256').update(bytes).digest('hex'),sampleDescriptionVersion:1,children,packetCount:151,packetSamples:1024,rollDistance:-1,firstPacketUsesRollGroup:true,hasEditList:false,profile:'declined',limitations:['Both sample-description form and first-packet roll assignment are outside the current profile; this inspection does not isolate which rejection occurs first.','No decoded-output or audible-playback qualification is implied.']}));
