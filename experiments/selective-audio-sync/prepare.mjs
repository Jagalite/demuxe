// SPDX-License-Identifier: Apache-2.0
// Recreate the sync experiment's ignored browser assets from the earlier PoC.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=path.resolve('build/selective-audio-poc/assets');
const out=path.resolve('build/selective-audio-sync');
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const replaceOnce=(text,from,to)=>{
  if(text.split(from).length!==2)throw Error('Patch anchor mismatch: '+from.slice(0,60));
  return text.replace(from,to);
};
await fs.access(path.join(base,'demuxe/web/selective-audio-worker.js')).catch(()=>{
  throw Error('Prepare the original PoC first: node experiments/selective-audio-poc/prepare.mjs');
});
await fs.cp(base,out,{recursive:true,force:true});
const web=path.join(out,'demuxe/web');
const playerPath=path.join(web,'generated/internal/wasm-player.js');
let player=await fs.readFile(playerPath,'utf8');
player=replaceOnce(player,"this.audioContext.audioWorklet.addModule(new URL('web/audio-worklet.js', assetBase))",
  "this.audioContext.audioWorklet.addModule(new URL(globalThis.__selectiveAudioPoC ? 'web/selective-sync-worklet.js' : 'web/audio-worklet.js', assetBase))");
await fs.writeFile(playerPath,player);
await fs.copyFile(path.join(import.meta.dirname,'selective-sync-worklet.js'),path.join(web,'selective-sync-worklet.js'));
const workerPath=path.join(web,'selective-audio-worker.js');
let worker=await fs.readFile(workerPath,'utf8');
worker=replaceOnce(worker,`  if (epoch !== nextEpoch) {
    epoch = nextEpoch;`, `  if (epoch !== nextEpoch) {
    // Keep the transferred EOF tail until the worklet consumes it.
    if (audioOnly && Atomics.load(audio,7) && epoch>=0 &&
        (Atomics.load(audio,0)-Atomics.load(audio,1))>0) return;
    epoch = nextEpoch;`);
const oldQueue='(Atomics.load(audio,0)-Atomics.load(audio,1))>>>0';
if(worker.split(oldQueue).length!==3)throw Error('Queue diagnostic patch anchor mismatch');
worker=worker.replaceAll(oldQueue,'Math.max(0,Atomics.load(audio,0)-Atomics.load(audio,1))');
await fs.writeFile(workerPath,worker);
const source=path.join(out,'fixtures/h264-1080p60-ac3.mkv');
if(await hash(source)!=='4f8939c1607f7e369eaccae907ab00f65ffe6272616e1449d5b0882ae329fb68')
  throw Error('Frozen AC-3 fixture hash mismatch');
const proof={sourceSha256:await hash(source),videoOnlySha256:await hash(path.join(out,'fixtures/h264-1080p60-video-only.mp4')),
  engineUnchanged:await hash(path.join(web,'engine-hybrid/player.wasm'))===await hash(path.join(base,'demuxe/web/engine-hybrid/player.wasm')),
  productionWorkletUnchanged:await hash(path.join(web,'audio-worklet.js'))===await hash(path.join(base,'demuxe/web/audio-worklet.js')),
  syncWorkletSha256:await hash(path.join(web,'selective-sync-worklet.js')),
  audioWorkerSha256:await hash(workerPath),playerShimSha256:await hash(playerPath)};
await fs.writeFile('results/selective-audio-sync/preparation.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
