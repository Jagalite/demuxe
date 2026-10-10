// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256,verifyDemoManifest,verifyDemoAssets,demoAssetURL} from '../scripts/verify-demo-assets.mjs';
const data=Buffer.from('actual executable bytes'),entry={bytes:data.length,sha256:sha256(data)};
const manifest={status:'tagged-development-demo',sourceTag:'v-test',sourceCommit:'a'.repeat(40),dirtySource:false,files:{'web/player.js':entry}};
test('demo verification accepts clean tagged deployments without pinning a release',()=>{
 for(const changes of [{},{sourceTag:'v-next',sourceCommit:'b'.repeat(40)}]){
  const current={...manifest,...changes};assert.deepEqual(verifyDemoManifest(Buffer.from(JSON.stringify(current))),current);
 }
 for(const changes of [{status:'preview'},{dirtySource:true},{sourceTag:''},{sourceCommit:'invalid'}])assert.throws(()=>verifyDemoManifest(Buffer.from(JSON.stringify({...manifest,...changes}))));
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
