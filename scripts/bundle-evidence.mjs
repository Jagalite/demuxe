// SPDX-License-Identifier: Apache-2.0
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyBundleBinding(directory, binding) {
  assert.ok(binding?.manifestSHA256 && binding.outputs, 'Browser evidence has no artifact binding; rerun playback');
  const bytes=await readFile(path.join(directory,'bundle-manifest.json'));
  assert.equal(binding.manifestSHA256,sha(bytes),'Browser evidence belongs to a different bundle manifest');
  const manifest=JSON.parse(bytes);
  assert.deepEqual(binding.outputs,manifest.outputs,'Browser evidence did not verify all bundle outputs');
  for(const [name,expected]of Object.entries(manifest.outputs)) {
    const bytes=await readFile(path.join(directory,name));
    assert.equal(bytes.length,expected.bytes,'Bundle output size changed: '+name);
    assert.equal(sha(bytes),expected.sha256,'Bundle output changed: '+name);
  }
  return manifest;
}
