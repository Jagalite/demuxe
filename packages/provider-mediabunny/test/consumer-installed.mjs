// SPDX-License-Identifier: Apache-2.0
// Run from an isolated consumer after installing the candidate core and adapter.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectMedia} from 'demuxe';
import {createMediaBunnyInspector} from '@demuxe/provider-mediabunny/inspect/mp4';
import {createMediaBunnyPreviewProvider} from '@demuxe/provider-mediabunny/preview/mp4';
if(!process.argv[2])throw Error('Pass the retained MP4 fixture');
const bytes=await readFile(process.argv[2]);
const source={kind:'bytes',transport:'application-managed',id:'isolated-consumer',size:bytes.length,ownership:'borrowed',read:async(at,n)=>new Uint8Array(bytes.subarray(at,at+n))};
const facts=await inspectMedia(source,{assetBase:'https://consumer.test/',inspector:createMediaBunnyInspector()});
assert.equal(facts.status,'partial');assert.deepEqual(facts.completeFor,['container']);assert.equal(facts.sourceIdentity,source.id);assert.deepEqual(facts.tracks.map(track=>track.type),['video','audio']);
const preview=createMediaBunnyPreviewProvider({getSource:()=>null});assert.equal(preview.id,'mediabunny-preview');await preview.release();
console.log(JSON.stringify({status:'isolated-installed-inspection-passed-not-release',format:facts.format,tracks:facts.tracks.map(track=>track.type),bytesRead:facts.bytesRead,reads:facts.reads}));
