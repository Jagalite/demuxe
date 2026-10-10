// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256,verifyDemoIdentity,verifyDemoAssets,demoAssetURL} from '../scripts/verify-demo-assets.mjs';
const data=Buffer.from('actual executable bytes'),entry={bytes:data.length,sha256:sha256(data)};
const manifest={status:'tagged-development-demo',sourceTag:'v-test',sourceCommit:'a'.repeat(40),dirtySource:false,files:{'web/player.js':entry}};
const bytes=Buffer.from(JSON.stringify(manifest)),pin={...manifest,manifestSHA256:sha256(bytes)};
test('demo qualification binds the selected tag, commit and manifest bytes',()=>{
 assert.deepEqual(verifyDemoIdentity(bytes,pin),manifest);
 for(const changed of [{sourceTag:'v-other'},{sourceCommit:'b'.repeat(40)},{manifestSHA256:'0'.repeat(64)}])assert.throws(()=>verifyDemoIdentity(bytes,{...pin,...changed}));
});
test('demo verification hashes served bytes, not just copied manifest entries',async()=>{
 const read=async()=>data;assert.deepEqual(await verifyDemoAssets('https://demo.test/project/',manifest,['web/player.js'],read),{'web/player.js':entry});
 await assert.rejects(verifyDemoAssets('https://demo.test/project/',manifest,['web/player.js'],async()=>Buffer.from('stale executable bytes')));
 await assert.rejects(verifyDemoAssets('https://demo.test/project/',manifest,['web/absent.js'],read));
});
test('manifest asset paths cannot leave the selected deployment',()=>{
 for(const name of ['../secret','/secret','https://other.test/x','web/../../x','web/%2e%2e/x','web/\\x'])assert.throws(()=>demoAssetURL('https://demo.test/project/',name));
 assert.equal(demoAssetURL('https://demo.test/project/','web/player.js'),'https://demo.test/project/web/player.js');
});
