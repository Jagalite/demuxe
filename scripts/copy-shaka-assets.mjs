#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/** Materialize the pinned, unmodified Shaka assets; no CDN or runtime npm import. */
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export async function copyShakaAssets(root = fileURLToPath(new URL('../', import.meta.url))) {
  const readJSON = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
  const [pin, project, lock, installed] = await Promise.all([
    'third_party/shaka-player.json', 'package.json', 'package-lock.json',
    'node_modules/shaka-player/package.json',
  ].map(readJSON));
  const dependency = lock.packages['node_modules/shaka-player'];
  if (project.dependencies?.['shaka-player'] !== pin.version || installed.version !== pin.version ||
      dependency?.version !== pin.version || dependency.integrity !== pin.npmIntegrity) {
    throw new Error('Shaka dependency pin mismatch; review version, asset hashes and notices together');
  }
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const assets = [];
  // Verify every source and retained notice before writing any runtime asset.
  for (const [target, expected] of Object.entries(pin.files)) {
    const bytes = await readFile(path.join(root, 'node_modules/shaka-player', expected.source));
    if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) {
      throw new Error('Shaka upstream asset hash mismatch: ' + expected.source);
    }
    assets.push([target, bytes]);
  }
  for (const notice of pin.notices) {
    const [upstream, retained] = await Promise.all([
      readFile(path.join(root, 'node_modules/shaka-player', notice.sourcePath)),
      readFile(path.join(root, notice.noticePath)),
    ]);
    if (sha(upstream) !== notice.sha256 || sha(retained) !== notice.sha256) {
      throw new Error('Shaka upstream notice mismatch: ' + notice.sourcePath);
    }
  }
  for (const [target, bytes] of assets) {
    const destination = path.join(root, target);
    await mkdir(path.dirname(destination), {recursive: true});
    await writeFile(destination, bytes);
  }
  return pin;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pin = await copyShakaAssets();
  console.log(`Shaka ${pin.version}: verified and copied ${Object.keys(pin.files).length} runtime assets`);
}
