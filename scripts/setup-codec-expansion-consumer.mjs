// SPDX-License-Identifier: Apache-2.0
// Install exact audited local archives and prepare both supported delivery forms.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {buildDemuxe,collectPackages} from '../packages/bundler/index.mjs';
const root=path.resolve('build/codec-expansion'),work=path.join(root,'consumer-'+Date.now());
const targets=['core','container','audio-aac','audio-opus-vorbis','audio-lossless','audio-mp3','audio-pcm','audio-flac','audio-opus-encoder'];
const archives=[];
for(const target of targets){
 const record=JSON.parse(await readFile(path.join(root,'packages',target,'assembly.json')));
 const bytes=await readFile(record.archive),hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==(record.sha256??record.archiveSHA256))throw Error('Package changed: '+target);
 archives.push({...record,archive:path.resolve(record.archive)});
}
await mkdir(work,{recursive:true});await writeFile(work+'/package.json',JSON.stringify({name:'demuxe-codec-expansion-consumer',version:'1.0.0',private:true,type:'module'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:work,stdio:'inherit'});
const core=work+'/component-core';await cp(work+'/node_modules/demuxe',core,{recursive:true});
// Test-only entry exposes public component exports and the installed owner.
// Hashes in every bundle manifest bind this entry separately from the core tgz.
const entry='test-components.mjs';
await writeFile(core+'/'+entry,"// SPDX-License-Identifier: Apache-2.0\nexport * from './web/generated/components.js';export {createComponentOwners} from './web/providers/components/provider-container/src/owners.js';export {PacketAudioDecoder} from './web/providers/components/provider-audio/src/packet-decoder.js';export async function loadTestModule(base,profile){const folder=new URL('web/providers/audio/'+profile+'/',base);const factory=(await import(new URL('module.mjs',folder).href)).default;return factory({wasmBinary:await(await fetch(new URL('module.wasm',folder))).arrayBuffer()});}\n");
const metadata=JSON.parse(await readFile(core+'/package.json'));metadata.exports['.'].import='./'+entry;await writeFile(core+'/package.json',JSON.stringify(metadata));
const licenses=JSON.parse(await readFile(core+'/license-map.json'));licenses[entry]=['Apache-2.0'];await writeFile(core+'/license-map.json',JSON.stringify(licenses));
const fixtures=JSON.parse(await readFile(root+'/decoder-fixtures/fixtures.json')),cases=[];
for(const family of ['aac','opus-vorbis','lossless','mp3','pcm'])for(const delivery of ['assets','embedded']){
 const name=family+'-'+delivery,output=work+'/bundles/'+name;
 const config={core,providers:['container','audio-'+family,'audio-flac','audio-opus-encoder'].map(p=>work+'/node_modules/@demuxe/provider-'+p),delivery,output};
 await buildDemuxe(config);const collected=await collectPackages(config);
 await writeFile(output+'/test-deployment.json',collected.files.get('demuxe-providers.json'));
 for(const f of fixtures.filter(f=>f.profile===family&&f.sampleRate===48000&&f.channels===2)){
  cases.push({bundle:name,delivery,type:'packet',fixture:f});
  if(f.input.endsWith('.mkv'))for(const encoding of ['flac','opus'])cases.push({bundle:name,delivery,type:'composition',encoding,fixture:f});
 }
}
await writeFile(work+'/cases.json',JSON.stringify(cases,null,2)+'\n');
await writeFile(root+'/installed.json',JSON.stringify({work,archives,bundles:10,cases:cases.length},null,2)+'\n');
console.log(work);
