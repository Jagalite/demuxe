// SPDX-License-Identifier: Apache-2.0
// Prepare a finite local smoke matrix. Browser execution uses the collaborative preview.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {buildDemuxe,collectPackages} from '../packages/bundler/index.mjs';
const suffix=Date.now();
const root='build/bundle-flexibility/quick-splits-'+Date.now();await mkdir(root,{recursive:true});
const packages=path.resolve('build/bundle-ci-consumer/node_modules'),core=path.join(packages,'demuxe');
for(const [name,codec]of [['ac3','ac3'],['eac3','eac3'],['dts','dca'],['copy','aac']]){
 const file='quick-'+name+'-'+suffix+'.mkv';
 if(name==='copy'){await cp('build/provider-container/no-reorder.mkv','build/provider-lossless-audio/'+file);continue;}
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1.2','-map','0:v','-map','1:a','-c:v','libx264','-bf','0','-preset','ultrafast','-c:a',codec,'-strict','-2','-ac','2','-ar','48000','-avoid_negative_ts','make_zero','build/provider-lossless-audio/'+file]);
}
const componentCore=path.join(root,'component-core');await cp(core,componentCore,{recursive:true});
// Test-only entry exposes the real published composition API and container owner.
const entry='quick-components.mjs';await writeFile(path.join(componentCore,entry),"export * from './web/generated/components.js';export {createComponentOwners} from './web/providers/components/provider-container/src/owners.js';\n");
const metadata=JSON.parse(await readFile(path.join(componentCore,'package.json')));metadata.exports['.'].import='./'+entry;await writeFile(path.join(componentCore,'package.json'),JSON.stringify(metadata));
const licenses=JSON.parse(await readFile(path.join(componentCore,'license-map.json')));licenses[entry]=['Apache-2.0'];await writeFile(path.join(componentCore,'license-map.json'),JSON.stringify(licenses));
const cases=[];
const fixture=name=>'quick-'+name+'-'+suffix+'.mkv';
const selections=[
 ['fine',['container','audio-ac3','audio-dts','audio-flac'],[{file:fixture('ac3'),codec:'ac3'},{file:fixture('eac3'),codec:'eac3'},{file:fixture('dts'),codec:'dts-core'}]],
 ['common',['container','audio-common'],[{file:fixture('ac3'),codec:'ac3',binding:'common'},{file:fixture('eac3'),codec:'eac3',binding:'common'},{file:fixture('dts'),codec:'dts-core',binding:'common'}]],
 ['lossless',['container','audio-truehd-mlp','audio-dts-hd','audio-flac'],[{file:'truehd-stereo.mkv',codec:'truehd'},{file:'mlp-stereo.mkv',codec:'mlp'},{file:'dtshd-71.mkv',codec:'dts-hd',channels:8}]],
 ['copy',['container'],[{file:fixture('copy'),copy:true,videoCodec:'avc1.64001e'}]],
 ...['asyncify','jspi'].flatMap(runtime=>[
  ['prep-truehd-mlp-'+runtime,['ffmpeg-truehd-mlp-'+runtime],[{file:'truehd-stereo.mkv',runtime,plan:'native-transcode'},{file:'mlp-stereo.mkv',runtime,plan:'native-transcode'}]],
  ['prep-dts-hd-'+runtime,['ffmpeg-dts-hd-'+runtime],[{file:'dtshd-71.mkv',runtime,plan:'native-transcode'}]],
 ])
];
for(const [name,providers,items]of selections)for(const delivery of ['assets','embedded']){
 const bundleName=path.relative('build/bundle-flexibility',path.join(root,name+'-'+delivery));
 const config={core:name.startsWith('prep-')?core:componentCore,providers:providers.map(p=>path.join(packages,'@demuxe/provider-'+p)),delivery,output:'build/bundle-flexibility/'+bundleName};
 await buildDemuxe(config);
 const collected=await collectPackages(config);await writeFile(config.output+'/smoke-deployment.json',collected.files.get('demuxe-providers.json'));
 for(const item of items)cases.push({bundleName,delivery,type:name.startsWith('prep-')?'player':'component',item});
}
const source=await readFile('tests/bundle-playback.mjs','utf8'),start=source.indexOf('async({item,delivery})=>{'),finish=source.indexOf('  },{item,delivery:manifest.delivery});');
if(start<0||finish<start)throw Error('Player exercise was not found');
const harness='export const exercise='+(source.slice(start,finish)+'}').replace('async({item,delivery})','async({item,delivery,bundleName})').replace("import('/demuxe.mjs')","import('/'+bundleName+'/demuxe.mjs')").replace("fetch('/bundle-manifest.json'","fetch('/'+bundleName+'/bundle-manifest.json'").replace("fetch('/'+name","fetch('/'+bundleName+'/'+name");
// Lifecycle recreation is already separately qualified; omit it from this fast codec smoke.
const begin=harness.indexOf('   if(runtime){'),end=harness.indexOf('   const Player=',begin);
const player=harness.slice(0,begin)+harness.slice(end);
await writeFile(path.join(root,'player.mjs'),player);
await writeFile(path.join(root,'component.mjs'),await readFile('tests/quick-split-components.mjs'));
await writeFile(path.join(root,'cases.json'),JSON.stringify(cases,null,2)+'\n');
console.log(JSON.stringify({root,cases:cases.length,bundles:selections.length*2}));
