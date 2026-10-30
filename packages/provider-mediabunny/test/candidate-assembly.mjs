// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,mkdir,rm,access,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const [candidateArg,coreArg]=process.argv.slice(2);
if(!candidateArg||!coreArg)throw Error('Pass candidate and extracted candidate core directories');
const candidate=resolve(candidateArg),core=resolve(coreArg),root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(root,'../..');
const temporary=await realpath(await mkdtemp(join(tmpdir(),'demuxe-candidate-assembly-test-')));
try{
 const run=(program,args)=>spawnSync(program,args,{encoding:'utf8',cwd:repo,timeout:90000});
 const output=join(temporary,'provider'),assembly=join(root,'assemble-candidate.mjs');
 let result=run(process.execPath,[assembly,candidate,output]);assert.equal(result.status,0,result.stderr);
 const sourceCompanion=JSON.parse(await readFile(join(output,'source-companion.json'),'utf8'));
 const archive=await readFile(join(output,sourceCompanion.path));
 const {createHash}=await import('node:crypto');assert.equal(archive.length,sourceCompanion.bytes);assert.equal(createHash('sha256').update(archive).digest('hex'),sourceCompanion.sha256);
 const licenseMap=JSON.parse(await readFile(join(output,'license-map.json'),'utf8'));
 const candidateManifest=JSON.parse(await readFile(join(candidate,'demuxe-mediabunny-candidate.json'),'utf8'));
 const kind=candidateManifest.assets[0].id.slice('mediabunny-'.length),notice=kind==='webm'?'NOTICE.txt':`NOTICE-${kind}.txt`;
 assert.deepEqual(new Set(Object.keys(licenseMap)),new Set(['package.json','provider-manifest.json','license-map.json','runtime/'+candidateManifest.assets[0].path,sourceCompanion.path,'source-companion.json','build-evidence.json','notices/Apache-2.0.txt','notices/MPL-2.0.txt','notices/CC-BY-4.0.txt','notices/'+notice,'CANDIDATE-NOT-QUALIFIED.txt']));
 result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.equal(result.status,0,result.stderr);
 const extra=join(output,'unexpected.txt');await writeFile(extra,'unexpected');result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await rm(extra);
 const mapFile=join(output,'license-map.json'),originalMap=await readFile(mapFile);const modified=JSON.parse(originalMap);modified['runtime/'+candidateManifest.assets[0].path]=['Apache-2.0'];await writeFile(mapFile,JSON.stringify(modified));result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await writeFile(mapFile,originalMap);
 const incompleteSource=JSON.parse(originalMap);incompleteSource[sourceCompanion.path]=['Apache-2.0','MPL-2.0'];await writeFile(mapFile,JSON.stringify(incompleteSource));result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await writeFile(mapFile,originalMap);
 const installedAsset=join(output,'runtime',candidateManifest.assets[0].path),originalAsset=await readFile(installedAsset),changedAsset=Buffer.from(originalAsset);changedAsset[changedAsset.length-1]^=1;await writeFile(installedAsset,changedAsset);result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await writeFile(installedAsset,originalAsset);
 const cc=join(output,'notices/CC-BY-4.0.txt'),originalCc=await readFile(cc);await writeFile(cc,'forged Creative Commons');result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await writeFile(cc,originalCc);
 const mpl=join(output,'notices/MPL-2.0.txt'),originalMpl=await readFile(mpl);await writeFile(mpl,'Mozilla Public License\nforged');result=run(process.execPath,[join(root,'audit-candidate.mjs'),output]);assert.notEqual(result.status,0);await writeFile(mpl,originalMpl);
 const deployment=join(temporary,'deployment');result=run('python3',[join(repo,'scripts/deploy-providers.py'),'--core',core,'--provider',output,'--output',deployment]);assert.equal(result.status,0,result.stderr);
 const manifest=JSON.parse(await readFile(join(deployment,'demuxe-providers.json'),'utf8'));
 const provider=JSON.parse(await readFile(join(output,'provider-manifest.json'),'utf8')).provides[0];
 assert.equal(manifest.providers.find(item=>item.id===provider.id)?.implementationIdentity,provider.implementationIdentity);
 const corrupt=join(temporary,'corrupt');await cp(candidate,corrupt,{recursive:true});
 const source=JSON.parse(await readFile(join(corrupt,'demuxe-mediabunny-candidate.json'),'utf8'));
 const asset=join(corrupt,source.assets[0].path),data=await readFile(asset);data[data.length-1]^=1;await writeFile(asset,data);
 const rejected=join(temporary,'rejected');result=run(process.execPath,[assembly,corrupt,rejected]);assert.notEqual(result.status,0);await assert.rejects(access(rejected),{code:'ENOENT'});
 const badSource=join(temporary,'bad-source');await cp(candidate,badSource,{recursive:true});
 // Change a preferred-source member and recompute the outer digest: the
 // source inventory, not merely the tarball hash, must reject the change.
 result=run('python3',['-c',`import hashlib,io,json,sys,tarfile
from pathlib import Path
root=Path(sys.argv[1]);metadata=root/'mediabunny-source.json';facts=json.loads(metadata.read_text());archive=root/facts['path'];members=[];changed=False
with tarfile.open(archive,'r:gz') as original:
 for item in original.getmembers():
  data=original.extractfile(item).read() if item.isfile() else None
  if item.name.endswith('demuxe-adapter/mp4-preparation.js'):
   data+=b'\\n// changed\\n';item.size=len(data);changed=True
  members.append((item,data))
assert changed
with tarfile.open(archive,'w:gz') as output:
 for item,data in members: output.addfile(item,io.BytesIO(data) if data is not None else None)
data=archive.read_bytes();facts['sha256']=hashlib.sha256(data).hexdigest();facts['bytes']=len(data);metadata.write_text(json.dumps(facts))
`,badSource]);assert.equal(result.status,0,result.stderr);
 const rejectedSource=join(temporary,'rejected-source');result=run(process.execPath,[assembly,badSource,rejectedSource]);assert.notEqual(result.status,0);await assert.rejects(access(rejectedSource),{code:'ENOENT'});
 const duplicate=join(temporary,'duplicate-source');await cp(candidate,duplicate,{recursive:true});
 // A duplicate archive member must be rejected even after its outer hash
 // and size are recomputed; extraction must not create an output package.
 result=run('python3',['-c',`import hashlib,io,json,sys,tarfile
from pathlib import Path
root=Path(sys.argv[1]);metadata=root/'mediabunny-source.json';facts=json.loads(metadata.read_text());archive=root/facts['path'];members=[]
with tarfile.open(archive,'r:gz') as source:
 for item in source.getmembers(): members.append((item,source.extractfile(item).read() if item.isfile() else None))
item,data=next((item,data) for item,data in members if item.isfile());members.append((item,data))
with tarfile.open(archive,'w:gz') as output:
 for item,data in members: output.addfile(item,io.BytesIO(data) if data is not None else None)
data=archive.read_bytes();facts['sha256']=hashlib.sha256(data).hexdigest();facts['bytes']=len(data);metadata.write_text(json.dumps(facts))
`,duplicate]);assert.equal(result.status,0,result.stderr);
 const duplicateOutput=join(temporary,'duplicate-rejected');result=run(process.execPath,[assembly,duplicate,duplicateOutput]);assert.notEqual(result.status,0);await assert.rejects(access(duplicateOutput),{code:'ENOENT'});
 const existing=join(temporary,'existing');await mkdir(existing);await writeFile(join(existing,'sentinel'),'preserve');
 result=run(process.execPath,[assembly,candidate,existing]);assert.notEqual(result.status,0);assert.equal(await readFile(join(existing,'sentinel'),'utf8'),'preserve');
 console.log(JSON.stringify({status:'candidate-assembly-and-composer-contracts-passed-not-release',provider:provider.id,identity:provider.implementationIdentity,checks:['candidate composition and installed audit','extra file and missing runtime or CC source licenses rejected','installed and build worker corruption rejected','forged MPL and CC license text rejected','rehashed altered or duplicate source rejected before output','existing output preserved']}));
}finally{await rm(temporary,{recursive:true,force:true});}
