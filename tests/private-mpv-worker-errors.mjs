// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as pcm from '../web/generated/internal/machine/private-pcm.js';
import * as audioWorker from '../web/generated/internal/machine/private-audio-worker.js';
const source=(await readFile(new URL('../web/private-mpv/audio-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
test('private audio failures retain messages when Firefox stacks contain only frames',()=>{
 const messages=[];
 const context=vm.createContext({...pcm,...audioWorker,AbortController,Map,clearInterval(){},postMessage:value=>messages.push(value)});
 vm.runInContext(source,context);
 const error=new Error('Private mpv initialization: Private mpv backend mismatch');
 error.stack='onmessage/chain<@https://example.test/audio-worker.js:72:91';
 context.cause=error;vm.runInContext('fail(cause)',context);
 assert.equal(messages[0].type,'transportError');
 assert.match(messages[0].error,/Private mpv initialization: Private mpv backend mismatch/);
 assert.match(messages[0].error,/onmessage\/chain</);
});
