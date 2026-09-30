// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const runtime=process.env.CODEC_RUNTIME??'asyncify';
if(!['asyncify','jspi'].includes(runtime))throw Error('Unsupported codec runtime');
const root=process.cwd(),work=path.resolve('build/codec-preparation/consumer-'+runtime+'-'+Date.now());
const profiles=['truehd-mlp','dts-hd'];
const folders=[process.env.CORE_PACKAGE??'player-core-production-final-review-02',...profiles.map(p=>'provider-ffmpeg-'+p+'-'+runtime+'-production-01')];
const archives=[];
for(const folder of folders){const report=JSON.parse(await readFile('build/media-components/'+folder+'/assembly.json','utf8'));report.archive=path.resolve(report.archive);if(createHash('sha256').update(await readFile(report.archive)).digest('hex')!==(report.sha256??report.archiveSHA256))throw Error('Archive drift');archives.push(report);}
await mkdir(work+'/tmp',{recursive:true});await writeFile(work+'/package.json',JSON.stringify({name:'codec-preparation-consumer',version:'1.0.0',private:true,type:'module'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:work,env:{...process.env,TMPDIR:work+'/tmp',npm_config_cache:work+'/npm-cache'},stdio:'inherit'});
execFileSync('python3',['scripts/deploy-providers.py','--core',work+'/node_modules/demuxe',...profiles.flatMap(p=>['--provider',work+'/node_modules/@demuxe/provider-ffmpeg-'+p+'-'+runtime]),'--output',work+'/deployed'],{cwd:root,stdio:'inherit'});
await writeFile('build/codec-preparation/installed-'+runtime+'.json',JSON.stringify({work,runtime,archives},null,2)+'\n');console.log(work);
