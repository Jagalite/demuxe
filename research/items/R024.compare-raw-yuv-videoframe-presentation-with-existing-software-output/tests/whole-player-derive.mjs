// SPDX-License-Identifier: Apache-2.0
// Creates small source overlays only. Does not execute or qualify the candidate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=process.argv[2];
if (!out) throw Error('Usage: node whole-player-derive.mjs NEW_OUTPUT_DIRECTORY');
await mkdir(out,{recursive:false});
const workerPath='web/software-full-engine-worker.js';
const worker=await readFile(workerPath,'utf8');
const presenterPath=fileURLToPath(new URL('./whole-player-raw-i420.mjs',import.meta.url));
const presenter=await readFile(presenterPath);
const replaceOnce=(source,from,to)=>{if(source.split(from).length!==2)throw Error(`Snapshot seam changed: ${from}`);return source.replace(from,to);};
let candidate=replaceOnce(worker,"import('./yuv-presenter.js')","import('./r024-raw-i420.mjs')");
candidate=replaceOnce(candidate,"softwarePresenter:uploader?'experimental-yuv':'rgb'","softwarePresenter:uploader?'research-r024-raw-i420':'rgb'");
// Unsupported context-loss control must fail explicitly rather than dereference .gl.
candidate=replaceOnce(candidate,"const ext=uploader.gl.getExtension('WEBGL_lose_context');","if(!uploader.gl)throw Error('R024 context-loss experiment unsupported');const ext=uploader.gl.getExtension('WEBGL_lose_context');");
await mkdir(path.join(out,'web'));
await writeFile(path.join(out,'web/software-full-engine-worker.js'),candidate);
await writeFile(path.join(out,'web/r024-raw-i420.mjs'),presenter);
const sha=b=>createHash('sha256').update(b).digest('hex');
await writeFile(path.join(out,'derivation.json'),JSON.stringify({qualified:false,
  sources:[{path:workerPath,sha256:sha(worker),license:'GPL-3.0-or-later'},{path:presenterPath,sha256:sha(presenter),license:'Apache-2.0'}],
  outputs:[{path:'web/software-full-engine-worker.js',sha256:sha(candidate),license:'GPL-3.0-or-later'},{path:'web/r024-raw-i420.mjs',sha256:sha(presenter),license:'Apache-2.0'}],
  instruction:'Overlay only these two paths on an immutable exact maintained asset map. Both YUV control and candidate request softwarePresenter=experimental-yuv; default RGB requests rgb. Do not expose as shipping admission.'},null,2)+'\n');
