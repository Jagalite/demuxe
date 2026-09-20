// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {copyShakaAssets} from '../scripts/copy-shaka-assets.mjs';

test('Shaka assets and notices match the locked upstream package', async () => {
  const pin = await copyShakaAssets();
  assert.equal(Object.keys(pin.files).length, 2);
  for (const [name, expected] of Object.entries(pin.files)) {
    const bytes = await readFile(name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
    assert.ok(bytes.includes(Buffer.from('Copyright')));
  }
  assert.ok(pin.notices.some(item => item.sourcePath === 'third_party/cml-cmcd/NOTICE'));
});

test('a mismatched Shaka install fails before writing runtime assets', async () => {
  await mkdir('build', {recursive: true});
  const root = await mkdtemp(path.resolve('build/shaka-pin-test-'));
  for (const name of ['third_party/shaka-player.json', 'package.json', 'package-lock.json', 'node_modules/shaka-player/package.json']) {
    await mkdir(path.dirname(path.join(root, name)), {recursive: true});
    const bytes = name === 'node_modules/shaka-player/package.json' ? '{"version":"0.0.0"}' : await readFile(name);
    await writeFile(path.join(root, name), bytes);
  }
  await assert.rejects(copyShakaAssets(root), /dependency pin mismatch/);
  await assert.rejects(readFile(path.join(root, 'web/vendor/shaka-player.js')), {code: 'ENOENT'});
});
