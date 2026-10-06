// SPDX-License-Identifier: Apache-2.0
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyInstalledFiles(root,manifest){
 if(!manifest?.files||Object.keys(manifest.files).length===0)throw Error('Missing runtime inventory');
 for(const [name,expected]of Object.entries(manifest.files)){
  if(path.isAbsolute(name)||name.includes('\\')||name.split('/').includes('..'))throw Error('Unsafe runtime path');
  const bytes=await readFile(path.join(root,name));
  if(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw Error('Installed runtime differs: '+name);
 }
}
export async function installLiveRuntime(archive){
 const root=await mkdtemp(path.join(tmpdir(),'demuxe-live-release-'));
 try{
  archive=path.resolve(archive);
  const archiveSHA256=sha(await readFile(archive));
  await writeFile(path.join(root,'package.json'),'{"private":true,"type":"module"}\n');
  execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund',archive],{cwd:root,env:{...process.env,npm_config_cache:path.join(root,'npm-cache')},stdio:'pipe',timeout:120000});
  if(sha(await readFile(archive))!==archiveSHA256)throw Error('Archive changed during installation');
  const runtimeRoot=path.join(root,'node_modules/demuxe');
  const manifest=JSON.parse(await readFile(path.join(runtimeRoot,'release-manifest.json'),'utf8'));
  await verifyInstalledFiles(runtimeRoot,manifest);
  return {runtimeRoot,archiveSHA256,manifest,cleanup:()=>rm(root,{recursive:true,force:true})};
 }catch(error){await rm(root,{recursive:true,force:true});throw error;}
}
