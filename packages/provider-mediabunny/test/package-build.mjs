// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=resolve(process.argv[2]??'runtime-candidate');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const deployment=JSON.parse(await readFile(join(directory,'demuxe-mediabunny-candidate.json'),'utf8'));
assert.equal(deployment.assets.length,1,'Only executable runtime belongs to acquisition closure');
const asset=deployment.assets[0];
assert.ok(['web/providers/mediabunny/webm.js','web/providers/mediabunny/mp4.js','web/providers/mediabunny/mp4-stream.js'].includes(asset.path),'Unexpected candidate runtime path');
const runtime=await readFile(join(directory,asset.path));
const stream=asset.path.endsWith('/mp4-stream.js'),mp4=stream||asset.path.endsWith('/mp4.js');
assert.equal(runtime.length,asset.bytes);assert.equal(hash(runtime),asset.sha256);
assert.ok(runtime.toString().includes('Mozilla Public'));
assert.ok(runtime.toString().includes(stream?'mediabunny-mp4-stream-1.63.0-source.tar.gz':mp4?'mediabunny-mp4-1.63.0-source.tar.gz':'mediabunny-1.63.0-source.tar.gz'));
const identity='sha256:'+hash(JSON.stringify({['runtime/'+asset.path]:asset.sha256},null,2)+'\n');
assert.equal(identity,deployment.providers[0].implementationIdentity);
const report=JSON.parse(await readFile(join(directory,'mediabunny-build.json'),'utf8'));
assert.equal(report.status,'candidate-not-qualification');
assert.equal(report.implementationIdentity,identity);
assert.ok(report.emittedInputs.some(input=>input.path.includes(mp4?'isobmff-demuxer':'matroska-demuxer')));
assert.ok(!report.emittedInputs.some(input=>(mp4?/matroska|mpeg-ts|adts-demuxer|\.wasm$/:/isobmff|mp4-profile|mpeg-ts|adts-demuxer|\.wasm$/).test(input.path)),'No unrelated container or Wasm payload');
const source=JSON.parse(await readFile(join(directory,'mediabunny-source.json'),'utf8'));
const expectedSource=`web/providers/mediabunny/${stream?'mediabunny-mp4-stream-1.63.0-source.tar.gz':mp4?'mediabunny-mp4-1.63.0-source.tar.gz':'mediabunny-1.63.0-source.tar.gz'}`;
assert.equal(source.path,expectedSource);
const archive=join(directory,source.path);
assert.ok(Number.isSafeInteger(source.bytes)&&source.bytes>=0);assert.match(source.sha256,/^[0-9a-f]{64}$/);
const temporary=await mkdtemp(join(tmpdir(),'demuxe-source-check-'));
try{
  // Validate structure and budgets before any source bytes are extracted.
  execFileSync('python3',[join(dirname(fileURLToPath(import.meta.url)),'source-archive.py'),archive,'--sha256',source.sha256,'--bytes',String(source.bytes),'--extract',temporary],{stdio:'pipe',timeout:30000});
  const manifest=JSON.parse(await readFile(join(temporary,'source-manifest.json'),'utf8'));
  assert.equal(manifest.runtimeIdentity,identity);assert.equal(manifest.upstream,'mediabunny@1.63.0');
  const expected=new Set(manifest.files.map(file=>file.path));
  assert.equal(expected.size,manifest.files.length,'Duplicate source inventory path');let count=0;
  async function verify(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())await verify(path);else{assert.ok((await lstat(path)).isFile());const name=relative(temporary,path);if(name==='source-manifest.json')continue;assert.ok(expected.has(name),'Unlisted source archive file: '+name);const fact=manifest.files.find(file=>file.path===name),data=await readFile(path);assert.equal(data.length,fact.bytes);assert.equal(hash(data),fact.sha256);count++;}}}
  await verify(temporary);assert.equal(count,expected.size);
  assert.ok(manifest.compiledInputs.length>0);
  assert.equal(new Set(manifest.compiledInputs.map(input=>input.path)).size,manifest.compiledInputs.length,'Duplicate compiled input');
  for(const compiled of manifest.compiledInputs){const stored=manifest.files.find(file=>file.path===compiled.path);assert.ok(stored);assert.equal(stored.sha256,compiled.sha256);assert.equal(stored.bytes,compiled.bytes);}
  assert.ok(expected.has('upstream/mediabunny/src/source.ts'));assert.ok(expected.has('upstream/mediabunny/LICENSE'));
  for(const name of ['regenerate.mjs','provenance.json','tools/package-lock.json','mediabunny/tsconfig.json','mediabunny/shared/bitstream.ts','mediabunny/scripts/add-import-extensions.ts'])assert.ok(expected.has('demuxe-adapter/source-build/'+name),'Missing preferred-source build input: '+name);
  assert.ok(expected.has('demuxe-adapter/runtime-webm.js'));assert.ok(expected.has('demuxe-adapter/LICENSE'));
  for(const name of ['fragment-stream.js','mp4-stream.js','remux-producer.js','stream-preparation.js','worker-stream.js','runtime-mp4-stream.js'])assert.ok(expected.has('demuxe-adapter/'+name));
  assert.equal(deployment.providers[0].offers[0].capability,'media.prepare.file');
  assert.equal(JSON.parse(await readFile(join(temporary,'upstream/mediabunny/package.json'),'utf8')).version,'1.63.0');
  console.log(JSON.stringify({status:'artifact-and-source-check-passed',implementationIdentity:identity,runtimeBytes:runtime.length,sourceFiles:count,sourceArchiveBytes:source.bytes}));
}finally{await rm(temporary,{recursive:true,force:true});}
