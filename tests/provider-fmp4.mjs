// SPDX-License-Identifier: Apache-2.0
import {execFileSync} from 'node:child_process';
import {writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {FragmentedMP4Writer} from '../build/component-candidates/provider-container/src/fmp4.js';
import {runMuxChecks} from './provider-conformance/container.mjs';
await mkdir('build/provider-container', {recursive: true});
const input = 'build/provider-container/no-reorder.mkv';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'fixtures/example.mp4', '-t', '3', '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264', '-bf', '0', '-pix_fmt', 'yuv420p', '-c:a', 'copy', input]);
const result = await runMuxChecks({
  openReader: (blob, signal) => MatroskaReader.open(blob, signal),
  createWriter: tracks => new FragmentedMP4Writer(tracks),
  input: resolve(input),
  outputDirectory: resolve('build/provider-container'),
});
// Keep the established standalone report and remux paths.
result.output = 'build/provider-container/remux.mp4';
await mkdir('results/media-components/container-provider', {recursive: true});
await writeFile('results/media-components/container-provider/mux.json', JSON.stringify(result, null, 2) + '\n');
console.log(result);
