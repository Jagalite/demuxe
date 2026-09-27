// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('standard/full deployment preserves hashes, paths and safe upgrades', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'demuxe-assets-')));
  try {
    const pkg = path.join(root, 'package'), dest = path.join(root, 'custom folder/runtime-v1');
    const files = {};
    for (const name of ['bin/demuxe.mjs', 'web/engine-hybrid/player.wasm', 'web/engine-software-yuv/player.wasm', 'web/engine-software-full/player.wasm', 'web/engine-software-full/player.mjs', 'web/engine-remux/remux.wasm', 'web/private-remux.js', 'web/private-mpv.js', 'web/private-mpv/LICENSE.txt', ...['jspi','asyncify'].flatMap(backend=>['subtitles','audio'].flatMap(profile=>['service.mjs','service.wasm','manifest.json'].map(file=>`web/engine-mpv-${profile}-${backend}/${file}`))), 'web/private-ffmpeg/bridge.js', 'web/engine-remux-jspi/remux.wasm', 'web/engine-remux-asyncify/remux.wasm', 'web/engine-adaptation-jspi/remux.wasm', 'web/engine-adaptation-asyncify/remux.wasm', 'web/generated/internal/runtime-worker.js', 'fixtures/DejaVuSans.ttf', 'LICENSE', 'third_party/notices.json', 'web/vendor/shaka-player.js', 'web/vendor/shaka-player.transmuxer-worker.js', 'third_party/shaka-player.json']) {
      const bytes = name === 'bin/demuxe.mjs' ? await readFile(new URL('../bin/demuxe.mjs', import.meta.url)) : Buffer.from(name);
      await mkdir(path.dirname(path.join(pkg, name)), {recursive:true});
      await writeFile(path.join(pkg, name), bytes);
      files[name] = {bytes:bytes.length, sha256:hash(bytes)};
    }
    await writeFile(path.join(pkg, 'package.json'), JSON.stringify({name:'demuxe', version:'test'}));
    const release = JSON.stringify({schema:1, version:'test', publicModes:['native','hybrid','software'], files});
    await writeFile(path.join(pkg, 'release-manifest.json'), release);
    const run = (...args) => execFileSync(process.execPath, [path.join(pkg, 'bin/demuxe.mjs'), 'copy-assets', ...args], {stdio:'pipe'});
    const manifest = async () => JSON.parse(await readFile(path.join(dest, 'demuxe-runtime.json')));
    run(dest);
    let record = await manifest();
    assert.equal(record.assetSet, 'standard');
    assert.equal(record.packageManifestSHA256, hash(release));
    assert.ok(record.files['web/engine-software-yuv/player.wasm']);
    for(const backend of ['jspi','asyncify'])for(const profile of ['remux','adaptation'])assert.ok(record.files[`web/engine-${profile}-${backend}/remux.wasm`]);
    for(const backend of ['jspi','asyncify'])for(const profile of ['subtitles','audio'])assert.ok(record.files[`web/engine-mpv-${profile}-${backend}/service.wasm`]);
    assert.ok(record.files['web/private-mpv/LICENSE.txt']);
    assert.ok(!record.files['web/engine-software-full/player.wasm']);
    await assert.rejects(readFile(path.join(dest, 'web/engine-software-full/player.wasm')), {code:'ENOENT'});
    for (const [name, expected] of Object.entries(record.files)) {
      assert.deepEqual(expected, files[name]);
      assert.equal(hash(await readFile(path.join(dest, name))), expected.sha256);
    }
    run('--full', dest);
    run(dest, '--full');
    record = await manifest();
    assert.equal(record.assetSet, 'full');
    assert.ok(record.files['web/engine-software-full/player.wasm']);
    await writeFile(path.join(dest, 'host.txt'), 'consumer');
    await writeFile(path.join(dest, 'web/engine-software-full/player.mjs'), 'consumer edit');
    run(dest);
    await assert.rejects(readFile(path.join(dest, 'web/engine-software-full/player.wasm')), {code:'ENOENT'});
    assert.equal(await readFile(path.join(dest, 'web/engine-software-full/player.mjs'), 'utf8'), 'consumer edit');
    assert.equal(await readFile(path.join(dest, 'host.txt'), 'utf8'), 'consumer');
    run(dest); // Idempotent standard copy.
    assert.throws(() => run(dest, '--unknown'), /Usage/);
    // Even omitted fallback assets are verified before a standard deployment.
    await writeFile(path.join(pkg, 'web/engine-software-full/player.wasm'), 'corrupt');
    assert.throws(() => run(path.join(root, 'invalid')), /hash mismatch/);
    await assert.rejects(readFile(path.join(root, 'invalid/demuxe-runtime.json')), {code:'ENOENT'});
  } finally { await rm(root, {recursive:true, force:true}); }
});
