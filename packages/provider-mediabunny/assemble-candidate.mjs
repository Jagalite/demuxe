// SPDX-License-Identifier: Apache-2.0
// Create an installed-package-shaped candidate for the existing deployment
// composer. This deliberately does not grant qualification or publish it.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [candidateArg,outputArg]=process.argv.slice(2);
if(!candidateArg||!outputArg)throw Error('Pass candidate directory and NEW output directory');
const candidate=resolve(candidateArg),output=resolve(outputArg);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const value=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
assert.equal(value.schema,1);assert.equal(value.providerContractVersion,1);
assert.equal(value.assets.length,1);assert.equal(value.providers.length,1);
const asset=value.assets[0],provider=value.providers[0];
const kinds={'mediabunny-file-preparation':'webm','mediabunny-mp4-file-preparation':'mp4','mediabunny-mp4-stream-preparation':'mp4-stream'};
const kind=kinds[provider.id];assert.ok(kind,'Unknown candidate provider');
assert.equal(asset.path,`web/providers/mediabunny/${kind}.js`);assert.equal(asset.id,`mediabunny-${kind}`);
assert.deepEqual(asset.dependencies,[]);assert.deepEqual(provider.assetIds,[asset.id]);
assert.equal(provider.packageName,'@demuxe/provider-mediabunny');
assert.deepEqual(provider.offers,[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]);
assert.equal(provider.technology,'javascript');assert.deepEqual(provider.delivery,['optional-assets']);
const data=await readFile(join(candidate,asset.path));assert.equal(data.length,asset.bytes);assert.equal(sha(data),asset.sha256);
const artifacts={['runtime/'+asset.path]:asset.sha256};
const identity='sha256:'+sha(JSON.stringify(artifacts,null,2)+'\n');assert.equal(provider.implementationIdentity,identity);
const source=JSON.parse(await readFile(join(candidate,'mediabunny-source.json'),'utf8'));
const expectedSource=`web/providers/mediabunny/${kind==='webm'?'mediabunny-1.63.0-source.tar.gz':`mediabunny-${kind}-1.63.0-source.tar.gz`}`;
assert.equal(source.path,expectedSource);assert.equal(source.runtimeIdentity,identity);
assert.ok(Number.isSafeInteger(source.bytes)&&source.bytes>=0&&source.bytes<=128*1024*1024,'Source archive exceeds byte budget');
assert.equal((await stat(join(candidate,source.path))).size,source.bytes);
const sourceBytes=await readFile(join(candidate,source.path));assert.equal(sourceBytes.length,source.bytes);assert.equal(sha(sourceBytes),source.sha256);
// A digest alone does not prove that the source archive contains the actual
// compiled inputs. Run the inventory and correspondence validator before
// creating any output, including its raw archive member safety checks.
execFileSync(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'test/package-build.mjs'),candidate],{stdio:'pipe',timeout:90000});
const noticeName=kind==='webm'?'NOTICE.txt':`NOTICE-${kind}.txt`;
const dir=join(candidate,'web/providers/mediabunny');
const notices=await Promise.all(['Apache-2.0.txt','MPL-2.0.txt','CC-BY-4.0.txt',noticeName].map(name=>readFile(join(dir,name))));
const packageName='@demuxe/provider-mediabunny',version='1.1.2';
const manifest={providerContractVersion:1,package:packageName,version,compatibleCore:version,artifacts,assets:[asset],provides:[provider]};
await mkdir(output); // Exclusive: preserve prior outputs and installed packages.
async function put(name,bytes){const path=join(output,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes,{flag:'wx'});}
const json=value=>JSON.stringify(value,null,2)+'\n';
await put('package.json',json({name:packageName,version,private:true,type:'module',peerDependencies:{demuxe:version}}));
await put('provider-manifest.json',json(manifest));
await put('runtime/'+asset.path,data);
await put('source/'+expectedSource,sourceBytes);
// The source archive lives beneath source/ in this package, unlike the build
// candidate. Record the actual installed path so consumers can resolve it.
await put('source-companion.json',json({...source,path:'source/'+expectedSource}));
await put('build-evidence.json',await readFile(join(candidate,'mediabunny-build.json')));
for(let i=0;i<notices.length;i++)await put('notices/'+['Apache-2.0.txt','MPL-2.0.txt','CC-BY-4.0.txt',noticeName][i],notices[i]);
await put('CANDIDATE-NOT-QUALIFIED.txt','Candidate assembly only. Qualification, release audit and publication are separate gates.\n');
await put('license-map.json',json({
 'package.json':['Apache-2.0'],'provider-manifest.json':['Apache-2.0'],
 'license-map.json':['Apache-2.0'],['runtime/'+asset.path]:['Apache-2.0','MPL-2.0'],
 ['source/'+expectedSource]:['Apache-2.0','MPL-2.0','CC-BY-4.0'],
 'source-companion.json':['Apache-2.0'],'build-evidence.json':['Apache-2.0'],'notices/Apache-2.0.txt':['Apache-2.0'],
 'notices/MPL-2.0.txt':['MPL-2.0'],'notices/CC-BY-4.0.txt':['CC-BY-4.0'],['notices/'+noticeName]:['Apache-2.0','MPL-2.0','CC-BY-4.0'],
 'CANDIDATE-NOT-QUALIFIED.txt':['Apache-2.0']
}));
console.log(json({status:'installed-shape-candidate-not-qualified',provider:provider.id,identity,sourceSHA256:source.sha256}));
