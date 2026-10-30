// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
if(!process.argv[2])throw Error('Pass a destination directory for the tracked backup probe');
const directory=resolve(process.argv[2]),base='research/items/granular-engine-loading/evidence/20260921T162900Z-screen-01/';
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:32*1024*1024});
const inventory=JSON.parse(git('show','HEAD:'+base+'manifest.json'));
const facts=[['remux.mjs','6c25a08af215f68a9aff0893db9e1f3d27c217c1'],['remux.wasm','27f217db62d107c8dc5286562e2bcadc0d52cef2']];
await mkdir(directory,{recursive:true});const provenance=[];
async function preserve(path,bytes){try{await writeFile(path,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;assert.deepEqual(await readFile(path),Buffer.from(bytes),'Existing probe differs; preserve it and choose a new directory');}}
for(const [name,blob] of facts){
 const path=base+'snapshots/runtime/web/engine-remux/'+name,bytes=git('show','HEAD:'+path),sha256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),blob);
 const recorded=inventory.artifacts.find(fact=>fact.path===path);assert.ok(recorded);assert.equal(recorded.bytes,bytes.length);assert.equal(recorded.sha256,sha256);
 await preserve(join(directory,name),bytes);provenance.push({path,gitBlob:blob,bytes:bytes.length,sha256,archivedLicense:recorded.license});
}
const module=new WebAssembly.Module(await readFile(join(directory,'remux.wasm'))),exports=WebAssembly.Module.exports(module),imports=WebAssembly.Module.imports(module);
for(const name of ['rm_error','rm_close','rm_probe','rm_open','rm_duration','rm_video_codec','rm_audio_codec','rm_set_container','rm_start','rm_step'])assert.ok(exports.some(entry=>entry.name===name&&entry.kind==='function'),'Missing packet-copy ABI: '+name);
await preserve(join(directory,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
await preserve(join(directory,'abi.json'),JSON.stringify({exports,imports},null,2)+'\n');
console.log(JSON.stringify({directory,status:'tracked-probe-extracted-not-release',files:provenance.length,limits:['Basic exported-name check does not establish semantic or release compatibility','Archived license metadata does not supply a new redistribution qualification']}));
