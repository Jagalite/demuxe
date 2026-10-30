// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,symlink,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {version as esbuildVersion} from 'esbuild';

const candidate=resolve(process.argv[2]??'runtime-candidate');
const evidence=process.argv[3];
const sourceTools=process.env.DEMUXE_SOURCE_BUILD_TOOLS;
if(!sourceTools)throw Error('Set DEMUXE_SOURCE_BUILD_TOOLS to tools installed from source-build/tools/package-lock.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=JSON.parse(await readFile(join(candidate,'mediabunny-source.json'),'utf8'));
const deployment=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
const asset=deployment.assets?.[0];
assert.equal(deployment.assets?.length,1);
assert.ok(['web/providers/mediabunny/webm.js','web/providers/mediabunny/mp4.js','web/providers/mediabunny/mp4-stream.js'].includes(asset.path),'Unexpected candidate runtime path');
const expectedSource=`web/providers/mediabunny/${asset.path.endsWith('/mp4-stream.js')?'mediabunny-mp4-stream-1.63.0-source.tar.gz':asset.path.endsWith('/mp4.js')?'mediabunny-mp4-1.63.0-source.tar.gz':'mediabunny-1.63.0-source.tar.gz'}`;
assert.equal(source.path,expectedSource);
const archive=resolve(candidate,source.path);
assert.ok(Number.isSafeInteger(source.bytes)&&source.bytes>=0);assert.match(source.sha256,/^[0-9a-f]{64}$/);
const stage=await mkdtemp(join(tmpdir(),'demuxe-source-rebuild-'));
try{
 // Extract only after the shared member and resource-budget validator succeeds.
 execFileSync('python3',[join(dirname(fileURLToPath(import.meta.url)),'source-archive.py'),archive,'--sha256',source.sha256,'--bytes',String(source.bytes),'--extract',stage],{timeout:30000});
 // Retain the complete inventory/compiled-input checks after archive safety.
 execFileSync(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'package-build.mjs'),candidate],{stdio:'inherit',timeout:90000});
 const manifest=JSON.parse(await readFile(join(stage,'source-manifest.json'),'utf8'));
 assert.equal(manifest.tools.esbuild,esbuildVersion,'Use the recorded esbuild version');
 assert.equal(manifest.tools.node,process.version,'Use the recorded Node version');
 const kind=asset.path.endsWith('/mp4-stream.js')?'mp4-stream':asset.path.endsWith('/mp4.js')?'mp4':'webm';
 const adapter=join(stage,'demuxe-adapter'),modules=join(stage,'node_modules');
 await mkdir(join(stage,'regenerated'));
 const regenerated=join(stage,'regenerated/mediabunny');
 const regeneration=JSON.parse(execFileSync(process.execPath,[join(adapter,'source-build/regenerate.mjs'),join(stage,'upstream/mediabunny'),regenerated,resolve(sourceTools)],{encoding:'utf8',timeout:120000}));
 assert.equal(regeneration.status,'typescript-regeneration-and-typecheck-passed');
 await mkdir(modules);await symlink(regenerated,join(modules,'mediabunny'));
 // Only the recorded build tools are external. The final worker uses modules
 // regenerated from preferred TypeScript, not the archived/live dist files.
 const output=join(stage,'rebuilt');
 const buildLog=execFileSync(process.execPath,[join(adapter,'build.mjs'),output,kind],{
  cwd:adapter,encoding:'utf8',timeout:90000,
  env:{...process.env,DEMUXE_ESBUILD_MODULE:fileURLToPath(import.meta.resolve('esbuild')),DEMUXE_PROVIDER_NODE_MODULES:modules,NODE_PATH:''}
 });
 const original=await readFile(join(candidate,asset.path)),rebuilt=await readFile(join(output,asset.path));
 assert.deepEqual(rebuilt,original,'Archived inputs must reproduce the exact executable bytes');
 const rebuiltDeployment=JSON.parse(await readFile(join(output,'demuxe-mediabunny-candidate.json'),'utf8'));
 assert.deepEqual(rebuiltDeployment,deployment);
 const formatRebuild=[];
 if(process.env.DEMUXE_FORMAT_DELIVERY){
  const directory=join(stage,'rebuilt-formats');
  execFileSync(process.execPath,[join(adapter,'build-delivery.mjs'),directory],{cwd:adapter,timeout:90000,stdio:'pipe',env:{...process.env,DEMUXE_ESBUILD_MODULE:fileURLToPath(import.meta.resolve('esbuild')),DEMUXE_PROVIDER_NODE_MODULES:modules,NODE_PATH:''}});
  const formats=JSON.parse(await readFile(join(directory,'format-delivery.json'),'utf8'));
  for(const entry of formats.entries){
   const data=await readFile(join(directory,entry.name+'.js'));
   assert.deepEqual(data,await readFile(join(resolve(process.env.DEMUXE_FORMAT_DELIVERY),entry.name+'.js')),'Preferred TypeScript must reproduce format bundle: '+entry.name);
   for(const input of entry.compiledInputs){const stored=manifest.files.find(file=>file.path===input.path);assert.ok(stored,'Missing format build source: '+input.path);assert.equal(stored.sha256,input.sha256,input.path);}
   formatRebuild.push({name:entry.name,bytes:data.length,sha256:sha(data)});
  }
 }
 const receipt={status:'preferred-typescript-worker-rebuild-passed-not-release',kind,implementationIdentity:source.runtimeIdentity,
  runtime:{path:asset.path,bytes:rebuilt.length,sha256:sha(rebuilt)},
  source:{path:source.path,bytes:source.bytes,sha256:source.sha256},tools:manifest.tools,
  verifierSHA256:sha(await readFile(fileURLToPath(import.meta.url))),regeneration,formatRebuild,buildLog:buildLog.trim(),
  limits:['Regenerates and type-checks upstream modules from archived preferred TypeScript, then rebuilds exact worker bytes',
   'Does not prove a reproducible source tarball or rebuild unused upstream extension/bundle/documentation targets',
   'Build tools remain external at their recorded versions; no browser or release qualification is granted']};
 if(evidence)await writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{await rm(stage,{recursive:true,force:true});}
