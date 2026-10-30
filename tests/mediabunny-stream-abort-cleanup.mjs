// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createMP4StreamProducer} from '../packages/provider-mediabunny/stream-preparation.js';
const runtime=createRequire(import.meta.url)('../packages/provider-mediabunny/node_modules/mediabunny/dist/bundles/mediabunny.node.cjs');
const bytes=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url));
test('aborted acquired stream does not surface secondary parser disposal on retirement',async()=>{
 let disposed=0;class Input extends runtime.Input{dispose(){disposed++;super.dispose();throw Error('dispose failed');}}
 const controller=new AbortController(),reason=new DOMException('Source retired','AbortError');
 const tracks=[{id:'v',type:'video',codec:'h264'},{id:'a',type:'audio',codec:'aac',sampleRate:48000,channels:2}];
 const producer=await createMP4StreamProducer({...runtime,Input},new Blob([bytes]),{sourceTracks:tracks,signal:controller.signal});
 controller.abort(reason);assert.doesNotThrow(()=>producer.terminate());assert.equal(disposed,1);
});

test('explicit retirement without cancellation surfaces parser disposal failure',async()=>{
 const cleanup=Error('dispose failed');let disposed=0;class Input extends runtime.Input{dispose(){disposed++;super.dispose();throw cleanup;}}
 const tracks=[{id:'v',type:'video',codec:'h264'},{id:'a',type:'audio',codec:'aac',sampleRate:48000,channels:2}];
 const producer=await createMP4StreamProducer({...runtime,Input},new Blob([bytes]),{sourceTracks:tracks,signal:new AbortController().signal});
 assert.throws(()=>producer.terminate(),error=>error===cleanup);assert.equal(disposed,1);
});
