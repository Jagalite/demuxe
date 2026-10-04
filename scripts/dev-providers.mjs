// SPDX-License-Identifier: Apache-2.0
// Launch the regular playground using only explicitly installed provider packages.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2),providers=(args.find(a=>a.startsWith('--providers='))?.slice(12)??'ffmpeg,mpv,ffmpeg-jspi,ffmpeg-asyncify,container,audio-ac3,audio-dts,audio-flac,audio-common').split(',').filter(Boolean);
if(providers.some(p=>!['ffmpeg','mpv','ffmpeg-jspi','ffmpeg-asyncify','container','audio-ac3','audio-dts','audio-flac','audio-common','shaka'].includes(p))||new Set(providers).size!==providers.length||args.some(a=>!a.startsWith('--providers=')&&a!=='--prepare-only'))throw Error('Usage: npm run dev:providers -- [--providers=ffmpeg,mpv] [--prepare-only]');
const folders={shaka:'provider-shaka',core:'player-core-review-fixes',ffmpeg:'provider-ffmpeg-complete',mpv:'provider-mpv-complete','ffmpeg-jspi':'provider-ffmpeg-jspi-complete','ffmpeg-asyncify':'provider-ffmpeg-asyncify-complete',container:'provider-container-review-fixes',...Object.fromEntries(['ac3','dts','flac','common'].map(p=>['audio-'+p,'provider-audio-'+p+'-complete']))};
const reports=await Promise.all(['core',...providers].map(async name=>{
 const report=JSON.parse(await readFile(path.join(root,'build/media-components',folders[name],'assembly.json'),'utf8'));
 report.archive=path.resolve(root,report.archive);
 const hash=createHash('sha256').update(await readFile(report.archive)).digest('hex');
 if(hash!==(report.archiveSHA256??report.sha256))throw Error('Package changed since assembly: '+name);
 return report;
}));
const work=path.join(root,'build/provider-demo',String(Date.now()));await mkdir(work,{recursive:true});
await writeFile(path.join(work,'package.json'),JSON.stringify({name:'demuxe-local-playground',version:'1.0.0',private:true,type:'module'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...reports.map(r=>r.archive)],{cwd:work,stdio:'inherit'});
const runtime=path.join(work,'assets');
execFileSync('python3',['scripts/deploy-providers.py','--core',path.join(work,'node_modules/demuxe'),...providers.flatMap(p=>['--provider',path.join(work,'node_modules/@demuxe/provider-'+p)]),'--output',runtime],{cwd:root,stdio:'inherit'});
await writeFile(path.join(root,'build/provider-demo/latest.json'),JSON.stringify({runtime,providers,archives:reports},null,2)+'\n');
if(!args.includes('--prepare-only')){
 const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,DEMUXE_RUNTIME_ROOT:runtime},stdio:'inherit'});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
 server.on('exit',code=>{process.exitCode=code??0;});
}
