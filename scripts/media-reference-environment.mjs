// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {access,readFile,realpath,stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');

export async function mediaReferenceEnvironment(env=process.env){
 const executables={};
 for(const name of ['ffmpeg','ffprobe']){
  let executable;
  for(const directory of (env.PATH??'').split(path.delimiter)){
   const candidate=path.resolve(directory||'.',name);
   try{await access(candidate,constants.X_OK);if((await stat(candidate)).isFile()){executable=await realpath(candidate);break;}}
   catch(error){if(!['ENOENT','EACCES','ENOTDIR'].includes(error.code))throw error;}
  }
  assert.ok(executable,'Missing executable: '+name);
  const before=await readFile(executable),hash=sha(before);
  const versionText=execFileSync(executable,['-version'],{env,encoding:'utf8',maxBuffer:128*1024,timeout:10000}).trim();
  assert.ok(versionText.length,'Empty executable version: '+name);
  assert.equal(sha(await readFile(executable)),hash,'Reference executable changed: '+name);
  executables[name]={path:executable,sha256:hash,bytes:before.length,versionText};
 }
 return {schema:1,platform:process.platform,arch:process.arch,nodeVersion:process.version,executables};
}
