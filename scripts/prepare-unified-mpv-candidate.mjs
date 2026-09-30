// SPDX-License-Identifier: Apache-2.0
// Local test admission only. This does not update the production qualification registry.
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';
import {buildDemuxe} from '../packages/bundler/index.mjs';
const [native,output]=process.argv.slice(2);if(!native||!output)throw Error('Usage: prepare-unified-mpv-candidate.mjs <native-output> <fresh-output>');
await mkdir(output);const packages='build/bundle-ci-consumer/node_modules',provider=path.join(output,'provider'),core=path.join(output,'core');
await cp(packages+'/@demuxe/provider-mpv',provider,{recursive:true});await cp(packages+'/demuxe',core,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;const encode=v=>Buffer.from(JSON.stringify(sorted(v),null,2)+'\n');
const nativeRecord=JSON.parse(await readFile(path.join(native,'build-record.json')));
for(const name of ['player.mjs','player.wasm']){
 const data=await readFile(path.join(native,name)),expected=nativeRecord.outputs?.[name];
 if(!expected||expected.sha256!==sha(data)||expected.bytes!==data.length)throw Error('Native build record mismatch: '+name);
}
const manifest=JSON.parse(await readFile(provider+'/provider-manifest.json')),licenses=JSON.parse(await readFile(provider+'/license-map.json'));
const engineLicenses=[...new Set(['hybrid','selective','software-full','software-yuv'].flatMap(role=>['mjs','wasm'].flatMap(ext=>{
 const entry=licenses[`runtime/web/engine-${role}/player.${ext}`];
 if(!Array.isArray(entry)||!entry.length)throw Error('Missing engine license attribution: '+role+'.'+ext);
 return entry;
})))].sort();
for(const role of ['hybrid','selective','software-full','software-yuv']){
 const folder='runtime/web/engine-'+role;
 await rm(path.join(provider,folder),{recursive:true});
 for(const name of Object.keys(manifest.artifacts))if(name.startsWith(folder+'/')){delete manifest.artifacts[name];delete licenses[name];}
 await mkdir(path.join(provider,folder));
 const mode=role==='software-full'?0:role==='software-yuv'?1:2;
 const data=Buffer.from(`// SPDX-License-Identifier: Apache-2.0\nimport createEngine from '../engine-mpv/player.mjs';\nexport default async function(options){const engine=await createEngine(options);if(engine._web_set_render_mode(${mode})!==0)throw Error('Unified mpv mode initialization failed');return engine;}\n`);
 await writeFile(path.join(provider,folder,'player.mjs'),data);manifest.artifacts[folder+'/player.mjs']=sha(data);licenses[folder+'/player.mjs']=['Apache-2.0'];
}
await mkdir(provider+'/runtime/web/engine-mpv');
for(const name of ['player.mjs','player.wasm']){const data=await readFile(path.join(native,name)),target='runtime/web/engine-mpv/'+name;await writeFile(path.join(provider,target),data);manifest.artifacts[target]=sha(data);licenses[target]=engineLicenses;}
manifest.assets=await Promise.all(Object.entries(manifest.artifacts).map(async([name,digest])=>({id:name.slice(8),path:name.slice(8),sha256:digest,bytes:(await readFile(path.join(provider,name))).length,dependencies:[]})));
const identity='sha256:'+sha(encode(manifest.artifacts));
for(const p of manifest.provides){p.implementationIdentity=identity;p.applicationBuild=identity;p.assetIds=manifest.assets.map(a=>a.id);}
await writeFile(provider+'/provider-manifest.json',encode(manifest));await writeFile(provider+'/license-map.json',encode(licenses));
// Preserve the old source reference as historical input, never as correspondence
// evidence for the newly linked engine. A release needs a new source companion.
const inheritedSource=JSON.parse(await readFile(provider+'/source-companion.json'));
const candidateBuild=encode({schema:1,qualification:'local-test-candidate',releaseQualified:false,nativeBuild:nativeRecord,artifacts:manifest.artifacts});
await writeFile(provider+'/engine-build.json',candidateBuild);
await writeFile(provider+'/source-companion.json',encode({schema:1,qualification:'pending',engineBuildSHA256:sha(candidateBuild),inheritedSource,reason:'Unified engine corresponding source archive has not been assembled or verified. Do not publish this candidate.'}));
const metadata=JSON.parse(await readFile(provider+'/package.json'));metadata.private=true;await writeFile(provider+'/package.json',encode(metadata));
await cp('web/generated/internal/provider-runtime.js',core+'/web/generated/internal/provider-runtime.js');
const registry=core+'/web/generated/internal/provider-build.js';let source=await readFile(registry,'utf8');const match=source.match(/Object.freeze\((\{.*\})\)/);if(!match)throw Error('Qualification registry not found');const qualified=JSON.parse(match[1]);for(const p of manifest.provides)qualified[p.id]=identity;
source=source.replace(match[1],JSON.stringify(qualified));await writeFile(registry,'// LOCAL TEST ADMISSION: unified candidate is not release qualified.\n'+source);
const coreMetadata=JSON.parse(await readFile(core+'/package.json'));coreMetadata.private=true;await writeFile(core+'/package.json',encode(coreMetadata));
const bundles={};for(const delivery of ['assets','embedded'])bundles[delivery]=await buildDemuxe({core,providers:[packages+'/@demuxe/provider-ffmpeg',provider],delivery,output:path.join(output,delivery)});
const result={schema:1,qualification:'local-test-candidate',native,identity,providerBytes:manifest.assets.reduce((sum,a)=>sum+a.bytes,0),wasmFiles:manifest.assets.filter(a=>a.path.endsWith('.wasm')),embeddedBytes:bundles.embedded.outputs['demuxe.mjs'].bytes};await writeFile(output+'/candidate.json',encode(result));console.log(JSON.stringify(result));
