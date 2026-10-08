// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {PlayerError,playerError} from '../../web/generated/internal/errors.js';

// Exact captured Firefox worker error; the suffix is diagnostic stack text.
const capturedFirefoxError = "Error: Retained decoder: Error: Retained presentation frame budget\ncheckDecoder@http://127.0.0.1:61861/web/private-mpv/playback-host.js:90:67\npump/<@http://127.0.0.1:61861/web/private-mpv/playback-host.js:91:7\npromise callback*serial@http://127.0.0.1:61861/web/private-mpv/playback-host.js:23:28\npump@http://127.0.0.1:61861/web/private-mpv/playback-host.js:88:17\npump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:72:31\nsetTimeout handler*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\nasync*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11\n";

test('retained frame budget with the full Firefox setTimeout stack is a decode failure',()=>{
  const error=playerError(new Error(capturedFirefoxError));
  assert.equal(error.code,'DECODE_FAILED');assert.equal(error.retryable,false);
  assert.equal(error.message,capturedFirefoxError);
});

test('Chrome and Firefox stack function names, URLs and line numbers do not classify failures',()=>{
  for(const stack of [
    '\n    at Timeout.permission (/private/worker.wasm:403:1)\n    at initialization (/source.js:1:1)',
    '\npermission@https://example.test/initialization.wasm:403:1\nsetTimeout handler@https://example.test/source.js:1:1',
  ])assert.equal(playerError(new Error('Decoder queue overflow'+stack)).code,'DECODE_FAILED');
});

test('known semantic timeout, transport, asset and argument classifications are preserved',()=>{
  for(const [message,code]of [
    ['Native command deadline','NETWORK_TIMEOUT'],['Request timed out','NETWORK_TIMEOUT'],
    ['Source transport:\nRead deadline exceeded','NETWORK_TIMEOUT'],
    ['Source transport: Error: HTTP 403','SOURCE_PERMISSION'],['Authorization refresh deadline','SOURCE_PERMISSION'],
    ['Source transport: Error: Expected HTTP 206; received 200','INVALID_ARGUMENT'],
    ['Source representation changed','SOURCE_CHANGED'],['Source changed length','SOURCE_CHANGED'],
    ['Failed to fetch module','ASSET_LOAD_FAILED'],['WebAssembly compile failed','ASSET_LOAD_FAILED'],
    ['Operation aborted','ABORTED'],['Unsupported codec','UNSUPPORTED_MEDIA'],
    ['Video filters require Software','UNSUPPORTED_FEATURE'],
  ])assert.equal(playerError(new Error(message+'\n    at Timeout.worker (decoder.wasm:403:1)')).code,code,message);
});

test('retained decoder request deadlines preserve decoder ownership without reclassifying transport or output watchdogs',()=>{
  for(const message of [
    'Retained decoder request deadline exceeded',
    'Retained decoder: Retained decoder request deadline exceeded',
    'Error: Retained decoder: Error: Retained decoder request deadline exceeded\ncheckDecoder@http://127.0.0.1:61861/web/private-mpv/playback-host.js:90:67\nsetTimeout handler*pump@http://127.0.0.1:61861/web/private-mpv/playback-worker.js:98:11',
  ]){
    const error=playerError(new Error(message),7,'seek','session');
    assert.equal(error.code,'DECODE_FAILED',message);assert.equal(error.retryable,false);
    assert.equal(error.message,message);assert.equal(error.operationId,7);assert.equal(error.scope,'session');
  }
  assert.equal(playerError(new Error('Worker failed',{cause:Error('Retained decoder request deadline exceeded')})).code,'DECODE_FAILED');
  for(const message of ['Native command deadline','Private Software output deadline','Native output deadline','Source transport: Read deadline exceeded','Retained decoder: Source transport read deadline exceeded']){
    const error=playerError(new Error(message));assert.equal(error.code,'NETWORK_TIMEOUT',message);assert.equal(error.retryable,true);
  }
  const sourceTimeout=new PlayerError('NETWORK_TIMEOUT','Source read deadline');
  assert.equal(playerError(new Error('Retained decoder request deadline exceeded',{cause:sourceTimeout})).code,'NETWORK_TIMEOUT');
});

test('structured causes contribute actual messages and typed semantics without stack heuristics',()=>{
  assert.equal(playerError(new Error('Source transport',{cause:Error('Read timed out')})).code,'NETWORK_TIMEOUT');
  assert.equal(playerError(new Error('Source transport',{cause:Error('HTTP 403 forbidden')})).code,'SOURCE_PERMISSION');
  assert.equal(playerError(new Error('Source transport',{cause:Error('Operation aborted')})).code,'ABORTED');
  const aborted=Error('Stopped');aborted.name='AbortError';
  assert.equal(playerError(new Error('Decode interrupted',{cause:aborted})).code,'ABORTED');
  const typed=new PlayerError('SOURCE_CHANGED','Representation replaced',12,'open','operation',false);
  const wrapped=playerError(new Error('Decoder wrapper',{cause:typed}),null,null,'session');
  assert.equal(wrapped.code,'SOURCE_CHANGED');assert.equal(wrapped.operationId,12);assert.equal(wrapped.operation,'open');
  assert.equal(wrapped.scope,'session');assert.equal(wrapped.message,'Decoder wrapper');
});

test('cause traversal terminates on cycles and reads at most eight error messages',()=>{
  const cycle=Error('Decoder failed');cycle.cause=cycle;
  assert.equal(playerError(cycle).code,'DECODE_FAILED');
  let current=Error('HTTP 403');
  for(let i=0;i<8;i++)current=new Error('Decoder failed',{cause:current});
  assert.equal(playerError(current).code,'DECODE_FAILED');
  assert.equal(playerError(current.cause).code,'SOURCE_PERMISSION');
  const a=Error('Decoder failed'),b=Error('Read deadline');a.cause=b;b.cause=a;
  assert.equal(playerError(a).code,'NETWORK_TIMEOUT');
});

test('classification retains the original message for public redaction',()=>{
  const error=playerError(new Error('Decoder failed\nframe@https://user:password@example.test/player.wasm?token=secret:403:1\nAuthorization: Bearer credential'));
  assert.equal(error.code,'DECODE_FAILED');assert.match(error.message,/Decoder failed\nframe@https:\/\/example\.test\/player\.wasm/);
  assert.doesNotMatch(error.message,/password|token=secret|Bearer credential/);
});

test('range retry exhaustion remains a network budget failure with opaque or per-attempt abort causes',()=>{
 for(const cause of [new TypeError('Failed to fetch'),new DOMException('Idle request','AbortError')]){
  const error=playerError(new Error('Media read retry limit exceeded',{cause}));
  assert.equal(error.code,'NETWORK_TIMEOUT');assert.equal(error.retryable,true);assert.match(error.message,/retry limit/);
 }
 assert.equal(playerError(new DOMException('Superseded','AbortError')).code,'ABORTED');
});
