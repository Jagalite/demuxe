// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {buildDemuxe,collectPackages} from '../packages/bundler/index.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');
const encoded=value=>JSON.stringify(value,Object.keys(value).sort(),2)+'\n';
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'demuxe-bundler-')),core=path.join(root,'core'),provider=path.join(root,'@demuxe/provider-test');
 const put=async(base,name,data)=>{await mkdir(path.dirname(path.join(base,name)),{recursive:true});await writeFile(path.join(base,name),data);};
 const sources={'dist/index.js':`export const answer=42;export async function run(){return (await import('../web/dependency.js')).answer;}`,'web/dependency.js':'export const answer=42;','web/player.js':'export function definePlayerElement(){}','LICENSE':'Apache-2.0'};
 await put(core,'package.json',JSON.stringify({name:'demuxe',version:'1',exports:{'.':{import:'./dist/index.js'},'./player':{import:'./web/player.js'}}}));
 for(const [name,data]of Object.entries(sources))await put(core,name,data);
 await put(core,'license-map.json',JSON.stringify(Object.fromEntries([...Object.keys(sources),'package.json','license-map.json'].map(n=>[n,['Apache-2.0']]))));
 const artifacts={'runtime/web/test.js':sha('export const test=1;')},identity='sha256:'+sha(encoded(artifacts));
 const manifest={providerContractVersion:1,package:'@demuxe/provider-test',version:'1',compatibleCore:'1',artifacts,assets:[{id:'test-js',path:'web/test.js',sha256:artifacts['runtime/web/test.js'],bytes:20}],provides:[{id:'test',implementationIdentity:identity,assetIds:['test-js'],offers:[]}]};
 await put(provider,'runtime/web/test.js','export const test=1;');
 await put(provider,'provider-manifest.json',JSON.stringify(manifest));await put(provider,'package.json',JSON.stringify({name:manifest.package,version:'1',peerDependencies:{demuxe:'1'}}));await put(provider,'LICENSE','LGPL-2.1-or-later');await put(provider,'license-map.json','{}');
 return {root,core,provider,put,manifest};
}
test('selected and all installed providers preserve identities and notices',async()=>{
 const f=await fixture(),selected=await collectPackages({core:f.core,providers:[f.provider]}),all=await collectPackages({core:f.core,providers:'all',providerDirectory:path.dirname(f.provider)});
 assert.deepEqual(selected.records,all.records);assert.equal(selected.files.get('third_party/providers/provider-test/LICENSE').toString(),'LGPL-2.1-or-later');
 assert.equal(JSON.parse(selected.files.get('demuxe-providers.json')).providers.at(-1).implementationIdentity,f.manifest.provides[0].implementationIdentity);
});
test('empty provider selection contains only browser offers',async()=>{const f=await fixture(),result=await collectPackages({core:f.core});assert.equal(JSON.parse(result.files.get('demuxe-providers.json')).providers.length,3);assert.equal(result.records.length,0);});
test('corrupted provider aborts before output creation',async()=>{const f=await fixture(),output=path.join(f.root,'out');await f.put(f.provider,'runtime/web/test.js','broken');await assert.rejects(buildDemuxe({core:f.core,providers:[f.provider],output}),/integrity mismatch/);await assert.rejects(access(output));});
test('version mismatch rejects provider',async()=>{const f=await fixture();f.manifest.compatibleCore='2';await f.put(f.provider,'provider-manifest.json',JSON.stringify(f.manifest));await assert.rejects(collectPackages({core:f.core,providers:[f.provider]}),/Incompatible/);});
test('package names cannot escape the retained notice directory',async()=>{const f=await fixture();await f.put(f.provider,'package.json',JSON.stringify({name:'@demuxe/../../escape',version:'1',peerDependencies:{demuxe:'1'}}));await assert.rejects(collectPackages({core:f.core,providers:[f.provider]}),/Invalid provider package name/);});
test('duplicate providers reject ownership ambiguity',async()=>{const f=await fixture();await assert.rejects(collectPackages({core:f.core,providers:[f.provider,f.provider]}),/identity\/closure/);});
test('unsafe paths and symlinks cannot escape packages',async()=>{
 const f=await fixture();f.manifest.artifacts['runtime/../secret']=sha('secret');await f.put(f.provider,'provider-manifest.json',JSON.stringify(f.manifest));await assert.rejects(collectPackages({core:f.core,providers:[f.provider]}),/Unsafe/);
 delete f.manifest.artifacts['runtime/../secret'];await f.put(f.provider,'provider-manifest.json',JSON.stringify(f.manifest));await symlink(path.join(f.core,'LICENSE'),path.join(f.provider,'runtime/web/link.js'));f.manifest.artifacts['runtime/web/link.js']=sha('Apache-2.0');await f.put(f.provider,'provider-manifest.json',JSON.stringify(f.manifest));await assert.rejects(collectPackages({core:f.core,providers:[f.provider]}),/Symlink/);
});
test('assets output includes exactly selected files and a usable ESM entry',async()=>{const f=await fixture(),output=path.join(f.root,'assets');const result=await buildDemuxe({core:f.core,providers:[f.provider],output});assert.equal(result.delivery,'assets');assert.equal((await import(path.join(output,'demuxe.mjs'))).answer,42);assert.ok(result.outputs['assets/web/test.js']);await assert.rejects(buildDemuxe({core:f.core,output}),/already exists/);});
test('embedded output is one runtime JS file and is safe to import in Node',async()=>{const f=await fixture(),output=path.join(f.root,'embedded');const result=await buildDemuxe({core:f.core,providers:[f.provider],delivery:'embedded',output});assert.deepEqual(Object.keys(result.outputs),['demuxe.mjs']);assert.equal(typeof(await import(path.join(output,'demuxe.mjs'))).createDemuxeRuntime,'function');const source=await readFile(path.join(output,'demuxe.mjs'),'utf8');assert.ok(source.includes('createDemuxeRuntime'));});
test('core Apache helpers deduplicate without laundering later provider licenses',async()=>{const f=await fixture();async function provider(name,license,bytes='export const answer=42;'){const p=path.join(f.root,name),artifacts={'runtime/web/dependency.js':sha(bytes)},identity='sha256:'+sha(encoded(artifacts));await f.put(p,'runtime/web/dependency.js',bytes);await f.put(p,'package.json',JSON.stringify({name:'@demuxe/provider-'+name,version:'1',peerDependencies:{demuxe:'1'}}));await f.put(p,'provider-manifest.json',JSON.stringify({providerContractVersion:1,package:'@demuxe/provider-'+name,version:'1',compatibleCore:'1',artifacts,assets:[{id:'shared',path:'web/dependency.js',sha256:sha(bytes),bytes:Buffer.byteLength(bytes)}],provides:[{id:name,implementationIdentity:identity,assetIds:['shared'],offers:[]}]}));await f.put(p,'license-map.json',JSON.stringify({'runtime/web/dependency.js':[license]}));await f.put(p,'LICENSE',license);return p;}const a=await provider('a','Apache-2.0'),b=await provider('b','LGPL-2.1-or-later');await assert.rejects(collectPackages({core:f.core,providers:[a,b]}),/collision/);const c=await provider('c','Apache-2.0');const ok=await collectPackages({core:f.core,providers:[a,c]});assert.equal(ok.files.get('web/dependency.js').toString(),'export const answer=42;');assert.equal(ok.records.length,2);assert.ok(ok.files.has('third_party/providers/provider-a/LICENSE'));assert.ok(ok.files.has('third_party/providers/provider-c/LICENSE'));const wrong=await provider('wrong','Apache-2.0','export const answer=43;');await assert.rejects(collectPackages({core:f.core,providers:[wrong]}),/collision/);});
