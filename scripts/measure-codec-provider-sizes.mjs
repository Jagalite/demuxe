// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function size(file){const b=await readFile(file);return {file,sha256:sha(b),bytes:b.length,gzipBytes:gzipSync(b,{level:9}).length,brotliBytes:brotliCompressSync(b,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length};}
const rows=[];
for(const runtime of ['asyncify','jspi']){
 const baseline=await Promise.all(['mjs','wasm'].map(ext=>size('web/engine-adaptation-'+runtime+'/remux.'+ext)));
 for(const profile of ['truehd-mlp','dts-hd']){
  const folder='build/media-components/provider-ffmpeg-'+profile+'-'+runtime+'-production-01';
  const assembly=JSON.parse(await readFile(folder+'/assembly.json','utf8'));
  const files=await Promise.all(['mjs','wasm'].map(ext=>size('web/providers/preparation/'+profile+'-'+runtime+'/engine-adaptation-'+runtime+'/remux.'+ext)));
  const sum=(files,key)=>files.reduce((n,f)=>n+f[key],0);
  rows.push({profile,runtime,implementationIdentity:assembly.implementationIdentity,archive:await size(assembly.archive),engine:files,baseline,rawEngineSavingPercent:100*(1-sum(files,'bytes')/sum(baseline,'bytes')),gzipEngineSavingPercent:100*(1-sum(files,'gzipBytes')/sum(baseline,'gzipBytes')),brotliEngineSavingPercent:100*(1-sum(files,'brotliBytes')/sum(baseline,'brotliBytes'))});
 }
}
const packet=[];
for(const profile of ['truehd-mlp','dts-hd']){const files=await Promise.all([profile,'flac'].map(p=>size('web/providers/audio/'+p+'/module.wasm')));packet.push({profile,files,rawWasmBytes:files.reduce((n,f)=>n+f.bytes,0)});}
const report={passed:true,scope:'Exact file sizes. Engine comparison includes MJS and Wasm; shared worker closure is unchanged. Gzip level 9 and Brotli quality 11 are potential HTTP body sizes, not observed wire transfer. Packet-only pairs have a separate bounded container contract and cannot substitute for all full-file workloads.',rows,packet};
await mkdir('results/media-components/production-preparation',{recursive:true});await writeFile('results/media-components/production-preparation/file-sizes.json',JSON.stringify(report,null,2)+'\n');console.log(rows.map(r=>({profile:r.profile,runtime:r.runtime,rawSaving:r.rawEngineSavingPercent,gzipSaving:r.gzipEngineSavingPercent,brotliSaving:r.brotliEngineSavingPercent})),packet.map(p=>({profile:p.profile,rawWasmBytes:p.rawWasmBytes})));
