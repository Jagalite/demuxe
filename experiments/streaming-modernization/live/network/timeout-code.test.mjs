import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(process.env.RUNTIME_PACKAGE);
const {IncrementalTransport}=await import(pathToFileURL(path.join(root,'web/incremental-transport.js')));
const {playerError}=await import(pathToFileURL(path.join(root,'web/generated/internal/errors.js')));
for(const phase of ['headers','body'])test(`Stalled ${phase} retains the public network timeout classification`,async t=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>phase==='headers'?new Promise(()=>{}):new Response(new ReadableStream());
 const transport=new IncrementalTransport({url:'https://media.test/segment.m4s'},null,{stallMs:10,absoluteMs:1000});
 t.after(()=>{transport.close();globalThis.fetch=old;});
 await assert.rejects(async()=>{const resource=await transport.open('https://media.test/segment.m4s');await transport.read(resource.id,0n,1024);},error=>{
  assert.equal(error.kind,'timeout');const publicError=playerError(new Error('Source transport: '+error.message));
  assert.equal(publicError.code,'NETWORK_TIMEOUT');assert.equal(publicError.retryable,true);return true;
 });
});

test('worker error serialization keeps the message and excludes Firefox timer stack frames',async()=>{
 const {workerErrorMessage}=await import(pathToFileURL(path.join(root,'web/streaming-controller.js')));
 const error=new Error('Integrated streaming demux failed (-1094995529)');
 error.stack='checkFailure@worker.js:21:47\nsetTimeout handler*schedulePump@worker.js:24:8';
 const message=workerErrorMessage(error);assert.equal(message,error.message);
 assert.notEqual(playerError(new Error(message)).code,'NETWORK_TIMEOUT');
 assert.equal(workerErrorMessage('plain failure'),'plain failure');
 assert.equal(playerError(new Error(workerErrorMessage(new Error('Source transport: Resource read timed out waiting for progress')))).code,'NETWORK_TIMEOUT');
});

test('native-first transport failure retains its description and timeout classification',async()=>{
 const {StreamingController}=await import(pathToFileURL(path.join(root,'web/streaming-controller.js')));
 let acceptedSource;const c=new StreamingController({error:()=>-73,errorMessage:source=>{acceptedSource=source;return 'Integrated streaming resource read timed out';}});
 c.reset(7);assert.throws(()=>c.checkFailure(),error=>{assert.equal(playerError(error).code,'NETWORK_TIMEOUT');assert.equal(acceptedSource,7);return true;});
 c.native.errorMessage=()=> 'Integrated streaming resource read failed';
 assert.throws(()=>c.checkFailure(),/resource read failed/);
});
