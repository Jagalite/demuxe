// SPDX-License-Identifier: Apache-2.0
// Install a pinned native artifact inventory; the bundler itself comes from this checkout.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const directory=path.resolve(process.argv[2]??'build/bundle-ci-inputs');
const bytes=await readFile(path.join(directory,'bundle-ci-inventory.json'));
assert.match(process.env.BUNDLE_INVENTORY_SHA256??'',/^[a-f0-9]{64}$/);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(bytes),process.env.BUNDLE_INVENTORY_SHA256,'Native CI inventory changed');
const inventory=JSON.parse(bytes);assert.ok([1,2].includes(inventory.schema));
const sourceCandidate=inventory.schema===2;
if(sourceCandidate){
 assert.equal(process.env.BUNDLE_SOURCE_CANDIDATE,'1','Source candidates require explicit test admission');
 assert.equal(inventory.commit,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
 const slices=JSON.parse(await readFile('licensing/ci-slices.json')).include.map(row=>row.target);
 assert.deepEqual(inventory.targets,[...slices,'ffmpeg','ffmpeg-jspi','ffmpeg-asyncify','mpv'].sort());
 assert.deepEqual(inventory.packages.map(item=>item.name).sort(),['demuxe',...inventory.targets.map(target=>'@demuxe/provider-'+target)].sort());
}
const safe=name=>{assert.match(name,/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);return path.join(directory,name);};
const packages=inventory.packages;
const expectedCount=sourceCandidate?inventory.targets.length+1:16;
assert.equal(packages.length,expectedCount);assert.equal(new Set(packages.map(item=>item.name)).size,expectedCount);
assert.ok(packages.some(item=>item.name==='demuxe'));
for(const item of [...packages,...inventory.fixtures]){
 const bytes=await readFile(safe(item.file));assert.equal(bytes.length,item.bytes);assert.equal(sha(bytes),item.sha256,'Changed native CI artifact: '+item.file);
}
const root=path.resolve('build/bundle-ci-consumer');await mkdir(root);
await writeFile(path.join(root,'package.json'),JSON.stringify({private:true,type:'module'}));
const packed=JSON.parse(execFileSync('npm',['pack',path.resolve('packages/bundler'),'--json','--pack-destination',root],{encoding:'utf8'}))[0];
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',path.join(root,packed.filename),...packages.map(item=>safe(item.file))],{cwd:root,stdio:'inherit'});
const {buildDemuxe}=await import(pathToFileURL(path.join(root,'node_modules/@demuxe/bundler/index.mjs')));
const core=path.join(root,'node_modules/demuxe'),providers=path.join(root,'node_modules/@demuxe');
for(const item of packages){const metadata=JSON.parse(await readFile(path.join(root,'node_modules',item.name,'package.json')));assert.equal(metadata.name,item.name);assert.equal(metadata.version,item.version);}
if(sourceCandidate){
 // Candidate admission is confined to this installed test copy. Package archives
 // and the production qualification registry are never rewritten.
 const identities={};
 for(const item of packages.filter(item=>item.name!=='demuxe')){
  const manifest=JSON.parse(await readFile(path.join(root,'node_modules',item.name,'provider-manifest.json')));
  for(const provider of manifest.provides){assert.ok(!identities[provider.id],'Duplicate provider');identities[provider.id]=provider.implementationIdentity;}
 }
 const file=path.join(core,'web/generated/internal/provider-build.js'),before=await readFile(file);
 const after=Buffer.from('// SPDX-License-Identifier: Apache-2.0\n// CI TEST CANDIDATES ONLY; not production qualification.\nexport const providerDeploymentEnabled = true;\nexport const qualifiedProviderIdentities = Object.freeze('+JSON.stringify(identities)+');\n');
 await writeFile(file,after);
 await writeFile(path.join(root,'candidate-admission.json'),JSON.stringify({commit:inventory.commit,beforeSHA256:sha(before),afterSHA256:sha(after),identities,releaseQualified:false},null,2)+'\n');
}
await mkdir('build/provider-lossless-audio',{recursive:true});
for(const item of inventory.fixtures){const target=path.join('build/provider-lossless-audio',item.file);try{assert.equal(sha(await readFile(target)),item.sha256,'Existing fixture changed');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(target,await readFile(safe(item.file)),{flag:'wx'});}}
for(const delivery of ['assets','embedded'])await buildDemuxe({core,providers:'all',providerDirectory:providers,delivery,output:'build/bundle-flexibility/ci-'+delivery});
assert.equal(sha(await readFile('fixtures/example.mp4')),inventory.exampleSHA256,'Checkout example fixture changed');
assert.ok(inventory.fixtures.some(item=>item.file==='truehd-stereo.mkv'));
// Match finite production routes, including the atomic mpv software provider.
await writeFile('build/bundle-flexibility/ci-cases.json',JSON.stringify([
 {file:'truehd-stereo.mkv',runtime:'asyncify',plan:'native-transcode'},
 {file:'example.mp4',mode:'hybrid',plan:'hybrid'},
 {file:'example.mp4',mode:'software',plan:'software'}
]));
