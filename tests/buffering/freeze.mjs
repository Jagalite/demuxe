// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out=path.resolve(process.argv[2]??`results/buffering/runtime-${new Date().toISOString().replaceAll(':','-')}`);
await fs.mkdir(out,{recursive:false});
await fs.cp('web',path.join(out,'web'),{recursive:true,dereference:true});
await fs.mkdir(path.join(out,'fixtures'));await fs.copyFile('fixtures/DejaVuSans.ttf',path.join(out,'fixtures/DejaVuSans.ttf'));
const files={};async function visit(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await visit(file);else{const bytes=await fs.readFile(file);files[path.relative(out,file)]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}}}
await visit(out);await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({created:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Exact local runtime snapshot, retaining original mixed source and third-party terms. Not a release/source-compliance archive.',files},null,2));console.log(out);
