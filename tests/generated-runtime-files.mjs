// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const collector=path.resolve('scripts/generated-runtime-files.mjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'demuxe-exports-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,write(name,text){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);},run(){return spawnSync(process.execPath,[collector,root],{encoding:'utf8'});}};}
test('public exports include static, dynamic and declaration imports, not runtime URL literals',t=>{
 const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':{types:'./web/generated/index.d.ts',import:'./web/generated/index.js'},'./player':'./web/generated/player.js'}}));
 f.write('web/generated/index.js',`export {x} from './dependency.js';export const lazy=()=>import('./lazy.js');new URL('./generated/internal/runtime-worker.js', workerURL);const example="import('./not-an-import.js')";/* import './comment.js' */`);
 f.write('web/generated/index.d.ts',`export type X=import('./types.js').X;`);
 for(const name of ['player.js','dependency.js','dependency.d.ts','lazy.js','types.d.ts'])f.write('web/generated/'+name,'export {};');
 const r=f.run();assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),['dependency.d.ts','dependency.js','index.d.ts','index.js','lazy.js','player.js','types.d.ts'].map(n=>'web/generated/'+n).sort());
});
test('a genuine missing import is rejected',t=>{const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':'./web/generated/index.js'}}));f.write('web/generated/index.js',`import './missing.js';`);f.write('web/generated/missing.d.ts','export {};');const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/Missing generated runtime dependency: web\/generated\/missing.js/);});
test('all real public entrypoints and their generated dependencies can be collected',()=>{const r=spawnSync(process.execPath,[collector,process.cwd()],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const files=JSON.parse(r.stdout);for(const name of ['index.js','player/index.js','contracts.js','integration/index.js','media-element/index.js','adapters/videojs.js','internal/runtime-worker.js'])assert.ok(files.includes('web/generated/'+name),name);});
