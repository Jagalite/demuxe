// SPDX-License-Identifier: Apache-2.0
// Exercise the public inspection owner on an independently authored MOV.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createMediaBunnyInspector} from '../packages/provider-mediabunny/inspect-mp4.js';

const bytes=await readFile('tests/fixtures/mediabunny-independent-aac-stereo.mov');
assert.equal(createHash('sha256').update(bytes).digest('hex'),'5cbd1d262645534a687e3cd357585e69cda8d79e131fcc7e349ec7677815e314');
const directory=await mkdtemp(join(tmpdir(),'demuxe-independent-inspection-'));
after(()=>rm(directory,{recursive:true,force:true}));
const outfile=join(directory,'sources.mjs');
await build({entryPoints:['src/sources.ts'],outfile,bundle:true,platform:'node',format:'esm'});
const {inspectMedia}=await import(pathToFileURL(outfile).href);

test('public inspection preserves partial MOV facts, budget, and owned-source retirement',async()=>{
 let reads=0,returned=0,closed=0;
 const source={kind:'bytes',transport:'application-managed',id:'independent-mov',size:bytes.length,ownership:'owned',
  async read(at,length){reads++;returned+=length;return bytes.subarray(at,at+length);},close(){closed++;}};
 const facts=await inspectMedia(source,{assetBase:'https://demuxe.test/',inspector:createMediaBunnyInspector()});
 assert.equal(facts.sourceIdentity,'independent-mov');assert.equal(facts.status,'partial');
 assert.deepEqual(facts.completeFor,['container']);assert.equal(facts.format,'QuickTime File Format');
 assert.equal(facts.duration,3);assert.equal(facts.chapters,null);assert.equal(facts.tags,null);
 assert.equal(facts.tracks.length,1);const track=facts.tracks[0];
 assert.equal(track.type,'audio');assert.equal(track.codec,'aac');assert.equal(track.channels,null);
 assert.equal(track.sampleRate,null);assert.equal(track.channelLayout,null);assert.equal(track.streamIndex,null);
 assert.equal(facts.reads,reads);assert.equal(facts.bytesRead,returned);assert.ok(reads<=32&&returned<=512*1024);
 assert.equal(closed,1);
});

test('public inspection does not turn a source failure into partial metadata',async()=>{
 const failure=Error('Independent source access revoked');let closed=0;
 const source={kind:'bytes',transport:'application-managed',id:'broken-mov',size:bytes.length,ownership:'owned',
  async read(){throw failure;},close(){closed++;}};
 await assert.rejects(inspectMedia(source,{assetBase:'https://demuxe.test/',inspector:createMediaBunnyInspector()}),error=>error===failure||String(error.message).includes(failure.message));
 assert.equal(closed,1);
});
