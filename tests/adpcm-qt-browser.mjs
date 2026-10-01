// SPDX-License-Identifier: Apache-2.0
// Execute the maintained installed-page packet gate on the actual pinned adpcm-qt Wasm.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {sha,validatePacketFixture,checkResults,portablePackets} from '../scripts/codec-expansion-ci.mjs';
const root='/tmp/demuxe-imaqt-fixtures',fixtures=JSON.parse(await readFile(root+'/packet-browser.json')),pointer=JSON.parse(await readFile('/tmp/demuxe-imaqt-builds/adpcm-qt.json')),recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);
const record=JSON.parse(recordRaw),wasm=await readFile(pointer.directory+'/module.wasm'),js=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(js),record.artifacts['module.mjs'].sha256);
const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm}),{PacketAudioDecoder}=await import(pathToFileURL(process.env.IMAQT_ADAPTER_MODULE??'/tmp/demuxe-imaqt-adapter/packet-decoder.js'));
const page=await readFile('tests/codec-expansion-page.mjs','utf8'),context=vm.createContext({document:{querySelector:()=>({})},crypto:webcrypto,Uint8Array,Float32Array,Float64Array,Int32Array,DataView,AbortController,setTimeout,fetch:async url=>{const b=await readFile(root+'/'+url.split('/').at(-1));return{json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}});vm.runInContext(page+'\nglobalThis.runPacket=packet;',context);
const results=[];for(const fixture of fixtures){validatePacketFixture(fixture);const result=JSON.parse(JSON.stringify(await context.runPacket({PacketAudioDecoder,loadTestModule:async()=>module},'/',fixture)));results.push({bundle:'adpcm-qt-assets',delivery:'assets',type:'packet',fixture,passed:true,...result});}
checkResults({passed:true,results},results.map(({bundle,delivery,type,fixture})=>({bundle,delivery,type,fixture})));
const portable=await portablePackets(fixtures,readFile,async()=>{});assert.equal(portable.length,4);
const report={passed:true,environment:'Node VM of maintained browser packet gate; installed browser delivery remains separate',buildRecordSHA256:pointer.recordSHA256,pageSHA256:sha(Buffer.from(page)),adapterSHA256:sha(await readFile(process.env.IMAQT_ADAPTER_MODULE??'/tmp/demuxe-imaqt-adapter/packet-decoder.js')),results};await writeFile('results/media-components/codec-expansion/adpcm-qt-page-gate.json',JSON.stringify(report,null,2)+'\n');console.log('IMA-QT maintained page gate PASS',results.length);
