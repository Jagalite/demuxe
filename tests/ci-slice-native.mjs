// SPDX-License-Identifier: Apache-2.0
// Load the newly packed Wasm in Node. This is ABI/lifecycle evidence, not a codec matrix.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const target=process.argv[2];
const catalog=JSON.parse(await readFile('licensing/ci-slices.json'));
const row=catalog.include.find(row=>row.target===target);
assert.equal(row?.kind,'audio');
const output=path.resolve('build/ci-slices',target),assembly=JSON.parse(await readFile(output+'/package/assembly.json'));
const installed=output+'/native-test';await mkdir(installed);
execFileSync('tar',['-xzf',assembly.archive,'-C',installed]);
const root=installed+'/package',manifest=JSON.parse(await readFile(root+'/provider-manifest.json'));
const digest=b=>createHash('sha256').update(b).digest('hex');
for(const [name,hash] of Object.entries(manifest.artifacts))assert.equal(digest(await readFile(path.join(root,name))),hash);
const prefix=root+'/runtime/web/providers/audio/'+row.profile;
const factory=(await import(pathToFileURL(prefix+'/module.mjs'))).default;
const module=await factory({wasmBinary:await readFile(prefix+'/module.wasm')});
const pointer=module._malloc(64);assert.ok(pointer>0);module.HEAPU8.fill(0x5a,pointer,pointer+64);assert.equal(module.HEAPU8[pointer+63],0x5a);module._free(pointer);
const decoder=typeof module._mc_create==='function',encoder=typeof module._ae_create==='function';
assert.equal(decoder,!['flac','opus-encoder'].includes(row.profile));
assert.equal(encoder,['flac','common','opus-encoder'].includes(row.profile));
if(decoder){
 for(const name of ['mc_create_config','mc_decode','mc_frame','mc_flush','mc_reset','mc_destroy','mc_info','mc_plane'])assert.equal(typeof module['_'+name],'function',name);
 assert.equal(module._mc_create(-1),0);assert.equal(module._mc_create(10000),0);
}
if(encoder){
 assert.equal(module._ae_create(0,0),0);
 const owner=module._ae_create(2,0);assert.ok(owner>0);
 assert.ok(module._ae_size(owner)>0);assert.ok(module._ae_input(owner)>0);
 module._ae_destroy(owner);
}
await writeFile(output+'/native-check.json',JSON.stringify({passed:true,target,archiveSHA256:digest(await readFile(assembly.archive)),
 implementationIdentity:manifest.provides[0].implementationIdentity,scope:'installed Wasm ABI and allocation/encoder lifecycle only; full codec output qualification remains separate'},null,2)+'\n');
