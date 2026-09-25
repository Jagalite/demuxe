// SPDX-License-Identifier: Apache-2.0
// Broad, read-only metadata screen of locally available Demuxe fixture trees.
import {execFileSync} from 'node:child_process';
import {openAsBlob} from 'node:fs';
import {stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectFile} from './fast-inspector.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const trees = ['fixtures', 'build/fixtures/software-full', 'build/hybrid-cpu-attribution/assets-paired-simple-draw-20260923/fixtures'];
const names = new Set();
for (const tree of trees) for (const file of execFileSync('rg', ['--files', tree], {cwd: root, encoding: 'utf8'}).split('\n'))
  if (/\.(mp4|m4a|mov|mkv|webm|ts|wav|flac|mp3|ogg|aac|avi|mpg)$/i.test(file)) names.add(file);
const result = {schema: 1, date: new Date().toISOString(), trees, files: []};
for (const file of [...names].sort()) {
  const absolute = path.join(root, file);
  try {
    const info = await stat(absolute);
    const blob = await openAsBlob(absolute);
    const probe = await inspectFile(blob);
    result.files.push({file, size: info.size, ...probe});
  } catch (error) {result.files.push({file, error: String(error)});}
}
await writeFile(path.join(here, '../notes/catalogue-screen.json'), JSON.stringify(result, null, 2) + '\n');
const count = result.files.reduce((a, x) => (a[x.status ?? 'error'] = (a[x.status ?? 'error'] ?? 0) + 1, a), {});
console.log(JSON.stringify({files: result.files.length, count}));
