// SPDX-License-Identifier: Apache-2.0
// Compile the same reviewed source closure used by the optional npm package.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const outputs=JSON.parse(execFileSync(process.execPath,['scripts/compile-component-providers.mjs','container'],{maxBuffer:8*1024*1024}));
for(const [name,item]of Object.entries(outputs)){
 const file=path.join('build/component-candidates',name.slice('web/providers/components/'.length));
 await mkdir(path.dirname(file),{recursive:true});await writeFile(file,item.data);
}
console.log('Compiled reviewed component package sources');
