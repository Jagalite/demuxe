// SPDX-License-Identifier: Apache-2.0
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {runContainerChecks} from './provider-conformance/container.mjs';
await mkdir('build/provider-container', {recursive: true});
const file = 'build/provider-container/copy.mkv';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'fixtures/example.mp4', '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', file]);
const result = await runContainerChecks({
  openReader: (blob, signal) => MatroskaReader.open(blob, signal),
  input: resolve(file),
  outputDirectory: resolve('results/media-components/container-provider'),
});
console.log(result);
