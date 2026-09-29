// SPDX-License-Identifier: Apache-2.0
// Install exact candidate archives and compose disjoint component deployments.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),work=path.join(root,'build/component-consumer',String(Date.now()));
const folders=[process.env.CORE_PACKAGE??'player-core-review-fixes','provider-container-review-fixes','provider-audio-ac3-complete','provider-audio-dts-complete','provider-audio-flac-complete','provider-audio-common-complete'];
const archives=await Promise.all(folders.map(async folder=>{
 const report=JSON.parse(await readFile(path.join(root,'build/media-components',folder,'assembly.json'),'utf8'));report.archive=path.resolve(root,report.archive);
 if(createHash('sha256').update(await readFile(report.archive)).digest('hex')!==(report.sha256??report.archiveSHA256))throw Error('Archive drift: '+folder);return report;
}));
await mkdir(work,{recursive:true});await writeFile(path.join(work,'package.json'),JSON.stringify({name:'component-local-consumer',private:true,type:'module',version:'1.0.0'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:work,stdio:'inherit'});
for(const [name,providers]of Object.entries({fine:['audio-ac3','audio-dts','audio-flac'],common:['audio-common'],combined:['audio-ac3','audio-dts','audio-flac','audio-common'],missing:[]})){
 execFileSync('python3',['scripts/deploy-providers.py','--core',path.join(work,'node_modules/demuxe'),'--provider',path.join(work,'node_modules/@demuxe/provider-container'),...providers.flatMap(p=>['--provider',path.join(work,'node_modules/@demuxe/provider-'+p)]),'--output',path.join(work,name)],{cwd:root,stdio:'inherit'});
}
await writeFile(path.join(root,'build/component-consumer/latest.json'),JSON.stringify({work,archives},null,2)+'\n');
console.log(work);
