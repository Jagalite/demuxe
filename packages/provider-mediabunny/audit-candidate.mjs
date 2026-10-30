// SPDX-License-Identifier: Apache-2.0
// Audit the private installed-shape candidate, without granting qualification.
import assert from 'node:assert/strict';
import {readFile,readdir,lstat,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,join,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const input=process.argv[2];if(!input)throw Error('Pass installed candidate directory');
const root=resolve(input),sha=data=>createHash('sha256').update(data).digest('hex');
const files=new Map();let totalBytes=0;
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const path=join(dir,entry.name),info=await lstat(path);if(info.isSymbolicLink())throw Error('Symlink in candidate: '+path);
 if(info.isDirectory())await scan(path);else{assert.ok(info.isFile(),'Nonregular candidate input');assert.ok(info.size<=128*1024*1024,'Candidate file exceeds byte budget');totalBytes+=info.size;assert.ok(totalBytes<=512*1024*1024,'Candidate exceeds byte budget');files.set(relative(root,path).split('\\').join('/'),await readFile(path));}
}}
await scan(root);
const read=name=>{assert.ok(files.has(name),'Missing candidate file: '+name);return files.get(name);};
const metadata=JSON.parse(read('package.json')),manifest=JSON.parse(read('provider-manifest.json')),source=JSON.parse(read('source-companion.json')),licenses=JSON.parse(read('license-map.json'));
assert.deepEqual(new Set(Object.keys(licenses)),new Set(files.keys()),'License map must cover exact candidate file set');
assert.equal(metadata.name,'@demuxe/provider-mediabunny');assert.equal(metadata.version,'1.1.2');assert.equal(metadata.private,true);
assert.equal(metadata.peerDependencies.demuxe,manifest.compatibleCore);assert.equal(manifest.package,metadata.name);assert.equal(manifest.version,metadata.version);assert.equal(manifest.providerContractVersion,1);
assert.equal(manifest.assets.length,1);assert.equal(manifest.provides.length,1);
const asset=manifest.assets[0],provider=manifest.provides[0],kind={'mediabunny-file-preparation':'webm','mediabunny-mp4-file-preparation':'mp4','mediabunny-mp4-stream-preparation':'mp4-stream'}[provider.id];assert.ok(kind);
assert.equal(asset.path,`web/providers/mediabunny/${kind}.js`);assert.equal(asset.id,`mediabunny-${kind}`);assert.deepEqual(asset.dependencies,[]);assert.deepEqual(provider.assetIds,[asset.id]);
assert.equal(provider.packageName,metadata.name);assert.equal(provider.technology,'javascript');assert.deepEqual(provider.delivery,['optional-assets']);
assert.deepEqual(provider.offers,[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]);
const artifact='runtime/'+asset.path,data=read(artifact);assert.equal(data.length,asset.bytes);assert.equal(sha(data),asset.sha256);
assert.deepEqual(manifest.artifacts,{[artifact]:asset.sha256});assert.equal(provider.implementationIdentity,'sha256:'+sha(JSON.stringify(manifest.artifacts,null,2)+'\n'));
assert.equal(source.runtimeIdentity,provider.implementationIdentity);
const expectedSource=`source/web/providers/mediabunny/${kind==='webm'?'mediabunny-1.63.0-source.tar.gz':`mediabunny-${kind}-1.63.0-source.tar.gz`}`;
assert.equal(source.path,expectedSource);const archive=read(source.path);assert.equal(archive.length,source.bytes);assert.equal(sha(archive),source.sha256);
const notice=kind==='webm'?'NOTICE.txt':`NOTICE-${kind}.txt`;
const expected=new Set(['package.json','provider-manifest.json','license-map.json',artifact,source.path,'source-companion.json','build-evidence.json','notices/Apache-2.0.txt','notices/MPL-2.0.txt','notices/CC-BY-4.0.txt','notices/'+notice,'CANDIDATE-NOT-QUALIFIED.txt']);
assert.deepEqual(new Set(files.keys()),expected,'Unexpected candidate files');
assert.deepEqual(licenses[artifact],['Apache-2.0','MPL-2.0']);assert.deepEqual(licenses[source.path],['Apache-2.0','MPL-2.0','CC-BY-4.0']);
for(const name of ['package.json','provider-manifest.json','license-map.json','source-companion.json','build-evidence.json','notices/Apache-2.0.txt','CANDIDATE-NOT-QUALIFIED.txt'])assert.deepEqual(licenses[name],['Apache-2.0'],name);
assert.deepEqual(licenses['notices/MPL-2.0.txt'],['MPL-2.0']);assert.deepEqual(licenses['notices/CC-BY-4.0.txt'],['CC-BY-4.0']);assert.deepEqual(licenses['notices/'+notice],['Apache-2.0','MPL-2.0','CC-BY-4.0']);
assert.match(read('notices/Apache-2.0.txt').toString(),/Apache License/);assert.match(read('notices/MPL-2.0.txt').toString(),/Mozilla Public License/);assert.match(read('notices/'+notice).toString(),/Corresponding source/);
// Reconstruct the build layout in a temporary directory and independently run
// its archive inventory / compiled-input correspondence checks.
const temporary=await mkdtemp(join(tmpdir(),'demuxe-installed-candidate-audit-'));
try{
 const path=source.path.slice('source/'.length);await mkdir(dirname(join(temporary,path)),{recursive:true});await writeFile(join(temporary,path),archive);await mkdir(dirname(join(temporary,asset.path)),{recursive:true});await writeFile(join(temporary,asset.path),data);
 await writeFile(join(temporary,'mediabunny-source.json'),JSON.stringify({...source,path}));await writeFile(join(temporary,'demuxe-mediabunny-candidate.json'),JSON.stringify({assets:[asset],providers:[provider]}));
 // mediabunny-build.json is build evidence; require it separately in the
 // candidate package so the emitted graph can be checked as well.
 const build=JSON.parse(read('build-evidence.json'));await writeFile(join(temporary,'mediabunny-build.json'),JSON.stringify(build));
 execFileSync(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'test/package-build.mjs'),temporary],{stdio:'pipe',timeout:90000});
 // Bind the distributed license texts to the exact source companion, rather
 // than accepting arbitrary files containing a license title.
 const licenseHashes=JSON.parse(execFileSync('python3',['-c',`import hashlib,json,sys,tarfile
with tarfile.open(sys.argv[1], 'r:gz') as source:
 names=['demuxe-adapter/LICENSE','upstream/mediabunny/LICENSE','demuxe-adapter/LICENSES/CC-BY-4.0.txt']
 print(json.dumps([hashlib.sha256(source.extractfile(name).read()).hexdigest() for name in names]))
`,join(temporary,path)],{encoding:'utf8',timeout:30000}));
 assert.equal(sha(read('notices/Apache-2.0.txt')),licenseHashes[0],'Apache notice differs from corresponding source');
 assert.equal(sha(read('notices/MPL-2.0.txt')),licenseHashes[1],'MPL notice differs from corresponding source');
 assert.equal(sha(read('notices/CC-BY-4.0.txt')),licenseHashes[2],'CC notice differs from corresponding source');
 const archiveName=expectedSource.split('/').at(-1);
 const expectedNotice=`Demuxe adapters: Apache-2.0.\nDemuxe documentation: CC-BY-4.0.\nMediaBunny 1.63.0: Copyright (c) 2026-present, Vanilagy and contributors; MPL-2.0.\nOriginal notices are retained in ${kind}.js and the corresponding source archive.\nCorresponding source: ./${archiveName}\nThe source archive is available separately and is not a playback acquisition dependency.\n`;
 assert.equal(read('notices/'+notice).toString(),expectedNotice,'Candidate notice differs from build recipe');
}finally{await rm(temporary,{recursive:true,force:true});}
console.log(JSON.stringify({status:'installed-candidate-audit-passed-not-release',provider:provider.id,identity:provider.implementationIdentity,files:files.size,sourceSHA256:source.sha256}));
