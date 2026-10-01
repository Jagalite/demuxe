// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validatePacketFixture} from '../scripts/codec-expansion-ci.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),root='/tmp/demuxe-speex-ogg-fixtures',pagePath='tests/codec-expansion-page.mjs',page=await readFile(pagePath,'utf8');
const fixturesRaw=await readFile(root+'/packet-browser.json'),fixtures=JSON.parse(fixturesRaw),context=vm.createContext({document:{querySelector:()=>({})},crypto:webcrypto,Uint8Array,Float32Array,Float64Array,Int32Array,DataView,AbortController,setTimeout,fetch:async url=>{assert.match(url,/^\/fixtures\/[a-zA-Z0-9.-]+\.(json|f32)$/);const b=await readFile(root+'/'+url.slice('/fixtures/'.length));return{json:async()=>JSON.parse(b),arrayBuffer:async()=>Uint8Array.from(b).buffer};}});
vm.runInContext(page+'\nglobalThis.runPacket=packet;globalThis.qualify=packetQualification;globalThis.clock=packetPts;',context);
const pointer=JSON.parse(await readFile('/tmp/demuxe-speex-signed-builds/speech.json')),recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw),wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(await readFile(pointer.directory+'/module.mjs')),record.artifacts['module.mjs'].sha256);
const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm}),{PacketAudioDecoder}=await import('../build/component-candidates/provider-audio/src/packet-decoder.js');
const results=[];let controls=0,created=0,disposed=0;
const api={loadTestModule:async()=>module,PacketAudioDecoder:class extends PacketAudioDecoder{constructor(...args){super(...args);created++;}dispose(){if(this.owner)disposed++;super.dispose();}}};
for(const f of fixtures){
 validatePacketFixture(f);assert.throws(()=>validatePacketFixture({...f,nativeFrameDuration:undefined}));assert.throws(()=>validatePacketFixture({...f,nativeFrameDuration:1}));controls+=2;
 for(const mutation of [{sampleRate:16000},{channels:2},{speexProfile:undefined},{codec:'amrnb'},{codedClockOffset:1},{originalFirstPTS:-f.frameSamples},{packetClockPolicy:'concatenated'},{referenceSamples:f.referenceSamples-1},{speechFloatQualification:{...f.speechFloatQualification,maxAbsoluteError:1e-4}}]){assert.throws(()=>context.qualify({...f,...mutation}));controls++;}
 const original=JSON.parse(await readFile(root+'/'+f.id+'.json')).packets[0];assert.equal(context.clock(f,original),f.originalFirstPTS);assert.throws(()=>context.clock(f,{...original,pts:original.pts+1}));controls++;
 const result=await context.runPacket(api,'/',f);assert.equal(result.samples,f.referenceSamples);assert.equal(result.nativeFrameDuration,0);assert.equal(result.originalFirstPTS,f.originalFirstPTS);assert.equal(result.codedPaddingRetained,true);assert.equal(result.speechControls.silentRejected,true);assert.equal(result.speechControls.corruptRejected,true);await assert.rejects(()=>context.runPacket(api,'/',{...f,originalFirstPTS:f.originalFirstPTS+1}),/Speex complete coded frame clock changed/);controls++;results.push({id:f.id,...result});
}
assert.equal(created,disposed);const report={passed:true,scope:'Actual maintained browser packet logic evaluated in Node VM against pinned Wasm; not installed browser playback qualification.',controls,created,disposed,results,pageSHA256:sha(Buffer.from(page)),fixturesSHA256:sha(fixturesRaw),nativeRecordSHA256:pointer.recordSHA256};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/speex-ogg-page.json',JSON.stringify(report,null,2)+'\n');console.log('Speex maintained packet page PASS',results.length,controls,'controls');
