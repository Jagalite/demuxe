// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMediaBunnyInspector} from '@demuxe/provider-mediabunny/inspect/mp4';
import {createMediaBunnyInspector as webmInspector} from '@demuxe/provider-mediabunny/inspect/webm';

test('format-specific MP4 inspector retains bounded partial evidence through its public export',async()=>{
 const bytes=new Uint8Array(await readFile(new URL('../qualification/fixtures/avc-aac-320x240.mp4',import.meta.url)));
 let closed=0;
 const facts=await createMediaBunnyInspector()({id:'format-mp4',size:bytes.length,ownership:'owned',close:()=>{closed++;},read:async(at,n)=>bytes.slice(at,at+n)});
 assert.equal(facts.status,'partial');assert.equal(facts.sourceIdentity,'format-mp4');
 assert.deepEqual(facts.completeFor,['container']);assert.equal(facts.chapters,null);
 assert.deepEqual(facts.tracks.map(track=>track.type),['video','audio']);
 assert.ok(facts.bytesRead<=512*1024);assert.ok(facts.reads<=32);assert.equal(closed,1);
});

test('format-specific entries retain original byte-source failures',async()=>{
 for(const create of [createMediaBunnyInspector,webmInspector]){
  const failure=Error('Pinned source changed');let closed=0;
  await assert.rejects(create()({id:'broken',size:4096,read:async()=>{throw failure;},ownership:'owned',close:()=>{closed++;}}),error=>error===failure);
  assert.equal(closed,1);
 }
});
