// SPDX-License-Identifier: Apache-2.0
// Explicit, local-only admission of exact candidate bytes for qualification.
// The published qualification registry and original core archive stay untouched.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),packages=path.resolve(process.env.AC3_PACKAGES??'build/codec-expansion/packages');
const consumer=path.resolve(process.env.AC3_CONSUMER??'build/codec-expansion/ac3-consumer');
const sha=b=>createHash('sha256').update(b).digest('hex');
const archives=[];
for(const name of ['core','ffmpeg-ac3-eac3-jspi','ffmpeg-ac3-eac3-asyncify']){
 const report=JSON.parse(await readFile(path.join(packages,name,'assembly.json')));
 const archive=path.resolve(report.archive);assert.equal(sha(await readFile(archive)),report.sha256??report.archiveSHA256);
 archives.push({...report,archive});
}
await mkdir(consumer,{recursive:true});await writeFile(consumer+'/package.json',JSON.stringify({name:'ac3-fullfile-candidate-test',version:'1.0.0',private:true,type:'module'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:consumer,stdio:'inherit'});
const identities=Object.fromEntries(['browser-original','browser-prepared','web-audio-gain'].map(id=>[id,'demuxe-browser-v1']));
for(const runtime of ['jspi','asyncify']){
 const manifest=JSON.parse(await readFile(consumer+'/node_modules/@demuxe/provider-ffmpeg-ac3-eac3-'+runtime+'/provider-manifest.json'));
 for(const provider of manifest.provides)identities[provider.id]=provider.implementationIdentity;
}
const file=consumer+'/node_modules/demuxe/web/generated/internal/provider-build.js';
const before=await readFile(file),after=Buffer.from('// SPDX-License-Identifier: Apache-2.0\n// LOCAL QUALIFICATION CANDIDATE ONLY: exact installed manifest identities.\nexport const providerDeploymentEnabled = true;\nexport const bundledShakaIncluded = false;\nexport const qualifiedProviderIdentities = Object.freeze('+JSON.stringify(identities)+');\n');
await writeFile(file,after);
await writeFile(consumer+'/test-qualification.json',JSON.stringify({testOnly:true,releaseQualified:false,archives,identities,coreAdmissionOriginalSHA256:sha(before),coreAdmissionTestSHA256:sha(after)},null,2)+'\n');
for(const runtime of ['jspi','asyncify'])execFileSync('python3',['scripts/deploy-providers.py','--core',consumer+'/node_modules/demuxe','--provider',consumer+'/node_modules/@demuxe/provider-ffmpeg-ac3-eac3-'+runtime,'--output',consumer+'/deployed-'+runtime],{cwd:root,stdio:'inherit'});
console.log(consumer);
