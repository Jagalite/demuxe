// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
async function server(t,runtime){
 const child=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0',...(runtime?{DEMUXE_RUNTIME_ROOT:runtime}:{DEMUXE_RUNTIME_ROOT:''})},stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();});
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),10000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exit '+code));});child.stdout.on('data',chunk=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(chunk));if(match){clearTimeout(timer);resolve(match[0]);}});});
}
test('installed beta public entries retain their actual relative imports',async t=>{
 const runtime=await mkdtemp(path.join(tmpdir(),'demuxe-beta-server-'));t.after(()=>rm(runtime,{recursive:true,force:true}));
 await mkdir(path.join(runtime,'web/generated'),{recursive:true});
 await writeFile(path.join(runtime,'index.js'),"export * from './web/generated/index.js';\n");
 await writeFile(path.join(runtime,'player.js'),"export * from './web/generated/player.js';\n");
 await writeFile(path.join(runtime,'web/generated/index.js'),'export const betaEntry = 1;\n');
 const origin=await server(t,runtime);
 for(const name of ['index','player'])assert.equal(await(await fetch(origin+'/'+name+'.js')).text(),"export * from './web/generated/"+name+".js';\n");
 assert.equal(await(await fetch(origin+'/web/generated/index.js')).text(),'export const betaEntry = 1;\n');
 assert.equal(await(await fetch(origin+'/index.js',{method:'HEAD'})).text(),'');
});
test('installed modular core keeps its dist facade when no root entry exists',async t=>{
 const runtime=await mkdtemp(path.join(tmpdir(),'demuxe-core-server-'));t.after(()=>rm(runtime,{recursive:true,force:true}));
 await mkdir(path.join(runtime,'dist'));await writeFile(path.join(runtime,'dist/index.js'),'export const coreEntry = 2;\n');
 const origin=await server(t,runtime);
 assert.equal(await(await fetch(origin+'/index.js')).text(),"export * from './dist/index.js';");
 assert.equal(await(await fetch(origin+'/dist/index.js')).text(),'export const coreEntry = 2;\n');
});
test('source checkout public facade keeps its generated entry',async t=>{
 const origin=await server(t);
 assert.equal(await(await fetch(origin+'/index.js')).text(),"export * from './web/generated/index.js';");
});
