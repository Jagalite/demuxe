// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const demoEntryAssets=['index.html','pages-boot.js','web/generated/index.js','web/generated/player/index.js','web/player-demo.js','web/player.css'];
export function verifyDemoManifest(bytes){
 const manifest=JSON.parse(bytes);assert.equal(manifest.status,'tagged-development-demo');assert.ok(typeof manifest.sourceTag==='string'&&manifest.sourceTag.length>0);assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(manifest.dirtySource,false);return manifest;
}
export function demoAssetURL(base,name){
 assert.ok(/^[a-zA-Z0-9._/-]+$/.test(name)&&!name.startsWith('/')&&!name.split('/').some(part=>part==='..'||part==='.'),'Unsafe manifest asset path');
 const root=new URL(base),url=new URL(name,root);assert.equal(url.origin,root.origin);assert.ok(url.pathname.startsWith(root.pathname));return url.href;
}
export function verifyDemoAsset(bytes,expected,name){
 assert.ok(expected&&Number.isSafeInteger(expected.bytes)&&expected.bytes>=0&&/^[a-f0-9]{64}$/.test(expected.sha256),`Missing/invalid manifest entry: ${name}`);
 assert.equal(bytes.length,expected.bytes,`Served byte count mismatch: ${name}`);assert.equal(sha256(bytes),expected.sha256,`Served asset hash mismatch: ${name}`);return {bytes:bytes.length,sha256:sha256(bytes)};
}
export async function verifyDemoAssets(base,manifest,names,read){
 const verified={};for(const name of new Set(names)){const bytes=await read(demoAssetURL(base,name));verified[name]=verifyDemoAsset(bytes,manifest.files?.[name],name);}return verified;
}
async function main(){
 const args=process.argv.slice(2),outputAt=args.indexOf('--output'),output=outputAt<0?null:args[outputAt+1];
 assert.ok(outputAt<0||output,'--output requires a file path');
 const url='https://jagalite.github.io/demuxe/';
 const read=async url=>{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert.ok(response.ok,`${response.status}: ${url}`);return Buffer.from(await response.arrayBuffer());};
 const bytes=await read(new URL('deployment-manifest.json',url)),manifest=verifyDemoManifest(bytes);
 const names=args.includes('--all')?[...demoEntryAssets,...Object.keys(manifest.files).filter(name=>name.endsWith('.wasm')||name.endsWith('.mjs')||name.startsWith('web/generated/player/'))]:demoEntryAssets;
 const assets=await verifyDemoAssets(url,manifest,names,read),report={passed:true,scope:'Served assets match the fetched deployment manifest; intended release and playback not verified',deployment:{url,sourceTag:manifest.sourceTag,sourceCommit:manifest.sourceCommit,manifestSHA256:sha256(bytes)},assets};
 if(output){await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
