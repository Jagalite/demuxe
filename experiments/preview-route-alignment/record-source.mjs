// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sources=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else if(p.endsWith('.ts'))sources.push({path:p,sha256:createHash('sha256').update(await readFile(p)).digest('hex')});}}
await walk('src');
await writeFile('build/preview-route-alignment/source-identity.json',JSON.stringify({compiledAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Production implementation compiled in isolated output from dirty checkout; not a release archive',sources},null,2)+'\n');
