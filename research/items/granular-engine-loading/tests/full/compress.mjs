// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const out=fs.readFileSync('research/items/granular-engine-loading/full-run.txt','utf8').trim(),rows=[];
for(const variant of ['baseline','lean','software-baseline','software-common-v2','software-hevc']){
 const data=fs.readFileSync(`${out}/variants/${variant}/player.wasm`),gzip=zlib.gzipSync(data,{level:6}),br=zlib.brotliCompressSync(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:6}});assert.deepEqual(zlib.brotliDecompressSync(br),data);rows.push({variant,rawBytes:data.length,nodeGzip6Bytes:gzip.length,brotli6Bytes:br.length});
}
fs.writeFileSync(`${out}/compression.json`,JSON.stringify({node:process.version,zlib:process.versions.zlib,brotli:process.versions.brotli,rows,note:'Offline size measurement only. Browser latency trials used gzip, not Brotli.'},null,2));console.log(JSON.stringify(rows));
