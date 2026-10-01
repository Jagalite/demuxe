// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,symlink,readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {mediaReferenceEnvironment} from '../scripts/media-reference-environment.mjs';
test('reference identity binds actual executable bytes and real paths, fails missing tools',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'demuxe-reference-env-'));
 const executable=root+'/reference-tool',source='#!/bin/sh\nprintf "bounded reference version\\n"\n';
 await writeFile(executable,source);await chmod(executable,0o755);
 for(const name of ['ffmpeg','ffprobe'])await symlink(executable,root+'/'+name);
 const env={...process.env,PATH:root},record=await mediaReferenceEnvironment(env);
 assert.equal(record.platform,process.platform);assert.equal(record.arch,process.arch);
 for(const tool of Object.values(record.executables)){assert.equal(tool.path,await realpath(executable));assert.equal(tool.sha256,createHash('sha256').update(await readFile(executable)).digest('hex'));assert.equal(tool.versionText,'bounded reference version');}
 await assert.rejects(()=>mediaReferenceEnvironment({...env,PATH:root+'/absent'}),/Missing executable/);
});
