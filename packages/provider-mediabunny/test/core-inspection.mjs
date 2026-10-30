// SPDX-License-Identifier: Apache-2.0
import {test,after} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {dirname,resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createMediaBunnyInspector} from '../index.js';
import {WAVE} from 'mediabunny';
const sourceRoot=process.env.DEMUXE_CORE_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../src');
const temporary=await mkdtemp(join(tmpdir(),'demuxe-inspector-contract-'));
const outfile=join(temporary,'sources.mjs');
after(()=>rm(temporary,{recursive:true,force:true}));
await build({entryPoints:[join(sourceRoot,'sources.ts')],outfile,bundle:true,platform:'node',format:'esm'});
const {inspectMedia}=await import(pathToFileURL(outfile).href);
function fixture(){const b=Buffer.alloc(2044);b.write('RIFF');b.writeUInt32LE(2036,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(2000,40);return b;}
test('core inspector bridge retains source budgets and close ownership',async()=>{let closed=0,reads=0;const bytes=fixture();const input={kind:'bytes',transport:'application-managed',id:'core-fixture',size:bytes.length,ownership:'owned',read:async(at,n)=>{reads++;return bytes.subarray(at,at+n)},close(){closed++;}};const result=await inspectMedia(input,{assetBase:'https://demuxe.test/',inspector:createMediaBunnyInspector({formats:[WAVE]})});assert.equal(result.sourceIdentity,'core-fixture');assert.equal(result.format,'WAVE');assert.equal(result.status,'partial');assert.equal(result.reads,reads);assert.equal(closed,1);});
test('core preserves original byte-source failure',async()=>{const original=new Error('authorization expired');const input={kind:'bytes',transport:'application-managed',id:'broken',size:2044,read:async()=>{throw original}};await assert.rejects(inspectMedia(input,{assetBase:'https://demuxe.test/',inspector:createMediaBunnyInspector({formats:[WAVE]})}),error=>error.message.includes('authorization expired'));});
