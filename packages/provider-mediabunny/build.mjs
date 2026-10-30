// SPDX-License-Identifier: Apache-2.0
import {mkdir,writeFile,readFile,cp,mkdtemp,rm,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {build,version:esbuildVersion}=await import(process.env.DEMUXE_ESBUILD_MODULE?pathToFileURL(process.env.DEMUXE_ESBUILD_MODULE).href:'esbuild');
const root=dirname(fileURLToPath(import.meta.url));
if(!process.argv[2])throw new Error('Pass an output directory for the candidate runtime');
const directory=resolve(process.argv[2]);
const kind=process.argv[3]??'webm';
if(!['webm','mp4','mp4-stream'].includes(kind))throw new Error('Unknown runtime kind');
const path=`web/providers/mediabunny/${kind}.js`;
const archiveName=kind==='webm'?'mediabunny-1.63.0-source.tar.gz':`mediabunny-${kind}-1.63.0-source.tar.gz`;
const compiledInputs=new Map();
const result=await build({absWorkingDir:root,entryPoints:[join(root,`runtime-${kind}.js`)],nodePaths:process.env.DEMUXE_PROVIDER_NODE_MODULES?[process.env.DEMUXE_PROVIDER_NODE_MODULES]:[],bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,legalComments:'inline',metafile:true,write:false,plugins:[{name:'source-correspondence',setup(api){api.onLoad({filter:/\.js$/,namespace:'file'},async args=>{const contents=await readFile(args.path);compiledInputs.set(args.path,{sha256:createHash('sha256').update(contents).digest('hex'),bytes:contents.length});return {contents,loader:'js'};});}}]});
const data=result.outputFiles[0].contents;
const digest=value=>createHash('sha256').update(value).digest('hex');
const asset={id:'mediabunny-'+kind,path,bytes:data.byteLength,sha256:digest(data),dependencies:[]};
const identity='sha256:'+digest(JSON.stringify({['runtime/'+path]:asset.sha256},null,2)+'\n');
const provider={id:kind==='webm'?'mediabunny-file-preparation':kind==='mp4'?'mediabunny-mp4-file-preparation':'mediabunny-mp4-stream-preparation',implementationIdentity:identity,technology:'javascript',delivery:['optional-assets'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}],assetIds:[asset.id],packageName:'@demuxe/provider-mediabunny'};
await mkdir(join(directory,dirname(path)),{recursive:true});
await writeFile(join(directory,path),data);
await writeFile(join(directory,'demuxe-mediabunny-candidate.json'),JSON.stringify({schema:1,providerContractVersion:1,revision:'mediabunny-'+kind+'-candidate',assets:[asset],providers:[provider]},null,2)+'\n');
const emittedInputs=Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,fact])=>fact.bytesInOutput>0).map(([path,fact])=>({path,bytes:fact.bytesInOutput}));
await writeFile(join(directory,'mediabunny-build.json'),JSON.stringify({status:'candidate-not-qualification',implementationIdentity:identity,bytes:asset.bytes,emittedInputs},null,2)+'\n');
const upstreamInput=Object.keys(result.metafile.inputs).map(name=>resolve(root,name)).find(name=>name.includes('/mediabunny/dist/modules/'));
if(!upstreamInput)throw new Error('Cannot establish bundled upstream source correspondence');
const upstream=upstreamInput.slice(0,upstreamInput.indexOf('/dist/modules/'));
const metadata=JSON.parse(await readFile(join(upstream,'package.json'),'utf8'));
if(metadata.name!=='mediabunny'||metadata.version!=='1.63.0')throw new Error('Unexpected MediaBunny dependency version');
const providerDirectory=join(directory,dirname(path));
await cp(join(root,'LICENSE'),join(providerDirectory,'Apache-2.0.txt'));
await cp(join(root,'LICENSES/CC-BY-4.0.txt'),join(providerDirectory,'CC-BY-4.0.txt'));
await cp(join(upstream,'LICENSE'),join(providerDirectory,'MPL-2.0.txt'));
await writeFile(join(providerDirectory,kind==='webm'?'NOTICE.txt':`NOTICE-${kind}.txt`),`Demuxe adapters: Apache-2.0.\nDemuxe documentation: CC-BY-4.0.\nMediaBunny 1.63.0: Copyright (c) 2026-present, Vanilagy and contributors; MPL-2.0.\nOriginal notices are retained in ${kind}.js and the corresponding source archive.\nCorresponding source: ./${archiveName}\nThe source archive is available separately and is not a playback acquisition dependency.\n`);
const stage=await mkdtemp(join(tmpdir(),'demuxe-mediabunny-sources-'));
try{
  const adapter=join(stage,'demuxe-adapter'),library=join(stage,'upstream/mediabunny');
  await mkdir(adapter,{recursive:true});await mkdir(library,{recursive:true});
  const copySource=source=>!relative(root,source).split(sep).some(part=>['__pycache__','node_modules','__MACOSX','.DS_Store'].includes(part)||part.startsWith('._'))&&!source.endsWith('.pyc');
  for(const name of ['index.js','index.d.ts','adapter-factories.js','inspect-mp4.js','inspect-webm.js','preview-mp4.js','preview-webm.js','inspect-format.d.ts','preview-format.d.ts','build-delivery.mjs','assemble-candidate.mjs','audit-candidate.mjs','bounded-reader.js','packet-copy.js','file-preparation.js','video-preparation.js','track-metadata.js','worker-preparation.js','matroska-profile.js','mp4-preparation.js','mp4-profile.js','runtime-mp4.js','runtime-webm.js','fragment-stream.js','mp4-stream.js','remux-producer.js','stream-preparation.js','worker-stream.js','runtime-mp4-stream.js','build.mjs','package.json','package-lock.json','README.md','LICENSE','LICENSES','test','source-build'])await cp(join(root,name),join(adapter,name),{recursive:true,filter:copySource});
  for(const name of ['src','dist/modules','LICENSE','package.json'])await cp(join(upstream,name),join(library,name),{recursive:true});
  const files=[];
  async function inventory(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const full=join(directory,entry.name);if(entry.isDirectory())await inventory(full);else{if(!(await lstat(full)).isFile())throw new Error('Nonregular source archive entry');const bytes=await readFile(full);files.push({path:relative(stage,full),bytes:bytes.length,sha256:digest(bytes)});}}}
  await inventory(stage);files.sort((a,b)=>a.path.localeCompare(b.path));
  const compiled=[];
  for(const [path,fact] of compiledInputs){
    const archived=path.startsWith(upstream+'/')?'upstream/mediabunny/'+relative(upstream,path):path.startsWith(root+'/')?'demuxe-adapter/'+relative(root,path):undefined;
    if(!archived)throw new Error('Compiled input is outside archived source roots: '+path);
    const stored=files.find(file=>file.path===archived);
    if(!stored||stored.sha256!==fact.sha256||stored.bytes!==fact.bytes)throw new Error('Source changed during build: '+path);
    compiled.push({path:archived,...fact});
  }
  await writeFile(join(stage,'source-manifest.json'),JSON.stringify({upstream:'mediabunny@1.63.0',runtimeIdentity:identity,tools:{node:process.version,esbuild:esbuildVersion},compiledInputs:compiled,files},null,2)+'\n');
  const archive=join(providerDirectory,archiveName);
  // macOS otherwise adds AppleDouble records that are absent from the source
  // inventory and become stray ._ JavaScript modules with non-BSD extractors.
  execFileSync('tar',['-czf',archive,'-C',stage,'demuxe-adapter','upstream','source-manifest.json'],{env:{...process.env,COPYFILE_DISABLE:'1'}});
  const sourceBytes=await readFile(archive);
  await writeFile(join(directory,'mediabunny-source.json'),JSON.stringify({runtimeIdentity:identity,path:relative(directory,archive),bytes:sourceBytes.length,sha256:digest(sourceBytes),files:files.length},null,2)+'\n');
}finally{await rm(stage,{recursive:true,force:true});}
console.log(JSON.stringify({implementationIdentity:identity,bytes:asset.bytes,status:'candidate-not-qualification'}));
