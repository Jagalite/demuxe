// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,mkdir,cp,symlink,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const [inputArg,outputArg,toolsArg]=process.argv.slice(2);
if(!inputArg||!outputArg||!toolsArg)throw Error('Pass SDK input, NEW output directory and source-build tools directory');
const input=resolve(inputArg),output=resolve(outputArg),tools=resolve(toolsArg);
const root=dirname(fileURLToPath(import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const provenance=JSON.parse(await readFile(join(root,'provenance.json'),'utf8'));
// Check every preferred source/configuration input against the pinned revision.
for(const fact of provenance.files){
 const bytes=await readFile(join(fact.path.startsWith('src/')?input:join(root,'mediabunny'),fact.path));
 assert.equal(bytes.length,fact.bytes,fact.path);assert.equal(sha(bytes),fact.sha256,fact.path);
}
const lock=JSON.parse(await readFile(join(root,'tools/package-lock.json'),'utf8'));
const toolFacts=[];
for(const [path,fact] of Object.entries(lock.packages)){
 if(!path)continue;
 const metadata=JSON.parse(await readFile(join(tools,path,'package.json'),'utf8'));
 assert.equal(metadata.version,fact.version,'Build tool version: '+path);
 toolFacts.push({name:metadata.name,version:metadata.version,integrity:fact.integrity});
}
// Exclusive directory creation prevents changing a live SDK or earlier output.
await mkdir(output);
for(const name of ['src','package.json','LICENSE'])await cp(join(input,name),join(output,name),{recursive:true});
for(const name of ['shared','tsconfig.json','scripts'])await cp(join(root,'mediabunny',name),join(output,name),{recursive:true});
await symlink(join(tools,'node_modules'),join(output,'node_modules'));
const compiler=join(tools,'node_modules/typescript/bin/tsc');
execFileSync(process.execPath,[compiler,'-p','src','--pretty','false'],{cwd:output,stdio:'pipe',timeout:90000});
// Run the unmodified upstream postprocessor with Node's explicit TS support.
execFileSync(process.execPath,['--experimental-strip-types',join(output,'scripts/add-import-extensions.ts')],{cwd:output,stdio:'pipe',timeout:30000});
async function list(directory){
 const files=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())files.push(...await list(path));else if(entry.name.endsWith('.js'))files.push(path);
 }
 return files;
}
const originalRoot=join(input,'dist/modules'),generatedRoot=join(output,'dist/modules');
const originals=await list(originalRoot),generated=await list(generatedRoot);
assert.deepEqual(generated.map(path=>relative(generatedRoot,path)).sort(),originals.map(path=>relative(originalRoot,path)).sort(),'Generated JavaScript module set');
const modules=[];
for(const path of originals){
 const name=relative(originalRoot,path),bytes=await readFile(path),rebuilt=await readFile(join(generatedRoot,name));
 assert.deepEqual(rebuilt,bytes,'Preferred source must reproduce module: '+name);
 modules.push({path:name,bytes:bytes.length,sha256:sha(bytes)});
}
console.log(JSON.stringify({status:'typescript-regeneration-and-typecheck-passed',revision:provenance.revision,tools:toolFacts,
 compilerSHA256:sha(await readFile(join(tools,'node_modules/typescript/lib/_tsc.js'))),modules}));
