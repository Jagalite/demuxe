// SPDX-License-Identifier: Apache-2.0
// Reference hashes only. Playback never reads these pre-captured coefficients.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCoefficients} from '../prores-frame-webgpu/gpu.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=dirname(dirname(here));
const base=join(root,'build/experiments/prores-frame-webgpu/main');
const sha=parts=>{const hash=createHash('sha256');for(const part of parts)
  hash.update(Buffer.from(part.buffer,part.byteOffset,part.byteLength));return hash.digest('hex');};
const frames=[];
for(let index=0;index<180;index++){
  const digits=String(index).padStart(3,'0');
  const meta=JSON.parse(await readFile(join(base,`frame-${digits}.json`)));
  const source=await readFile(join(base,`frame-${digits}.bin`));
  const prepared=prepareCoefficients(meta,source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength));
  frames.push({frame:index,pts:meta.pts,hash:sha([prepared.packedWords,prepared.descriptorWords,prepared.matrixWords])});
}
const path=join(root,'build/experiments/prores-real-packet-webgpu/oracle-hashes.json');
await writeFile(path,JSON.stringify({source:'validated FFmpeg 9.0.2 coefficient capture',frames},null,2)+'\n');
console.log(`prepared ${frames.length} coefficient oracle hashes`);
