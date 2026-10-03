// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const root=process.env.DEMUXE_REACHABILITY_ROOT??fileURLToPath(new URL('../../',import.meta.url));
const read=path=>readFile(root+'/'+path,'utf8');
const legacy=['engine-worker.js','filter-copyback-engine-worker.js','retained-engine-worker.js','subtitled-engine-worker.js','subtitle-perf-engine-worker.js'];
const bindings=['player','filter-copyback-player','retained-player','subtitled-player','subtitle-perf-player'];
test('public generated import closure and packaged workers exclude reviewed legacy demo bindings',{timeout:120000},async()=>{
 const {stdout}=await promisify(execFile)(process.execPath,['scripts/generated-runtime-files.mjs',root],{cwd:root,maxBuffer:4*1024*1024});const files=JSON.parse(stdout);
 for(const name of bindings)for(const extension of ['js','d.ts'])assert.equal(files.includes(`web/generated/${name}.${extension}`),false,'legacy binding became public: '+name);
 assert.ok(files.includes('web/generated/internal/wasm-player.js'));
 const packaging=await read('scripts/package-beta.py'),match=packaging.match(/for name in \[('mpv-subtitle-worker\.js'[^\]]*)\]:\s*add\('web\/\'\+name\)/);
 assert.ok(match,'explicit worker asset allowlist shape changed: review boundary');const assets=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 for(const name of legacy)assert.equal(assets.includes(name),false,'legacy worker became packaged: '+name);
 for(const name of ['software-full-engine-worker.js','filter-retained-engine-worker.js','mpv-subtitle-worker.js'])assert.ok(assets.includes(name),'production worker absent: '+name);
 const facade=JSON.parse(await read('package.json'));assert.equal(facade.exports['./player'].import,'./web/generated/player/index.js');
});
test('legacy worker edges remain explicit demo/experiment dependencies, separate from production WasmPlayer',async()=>{
 const player=await read('src/player.ts');assert.match(player,/export class BrowserPlayer/);assert.ok(player.includes("new URL('../engine-worker.js'"));
 for(const path of ['web/index.html','web/legacy-example.html','web/benchmark.html'])assert.ok((await read(path)).includes('generated/player.js'),path);
 for(const [path,binding]of [['web/retained.html','retained-player.js'],['web/subtitled.html','subtitled-player.js'],['web/filter-player.js','filter-copyback-player.js']])assert.ok((await read(path)).includes(binding),path);
 const wasm=await read('src/internal/wasm-player.ts');assert.ok(wasm.includes('web/filter-retained-engine-worker.js'));assert.ok(wasm.includes('web/software-full-engine-worker.js'));
 for(const name of legacy)assert.equal(wasm.includes('web/'+name),false);
});

test('explicit worker policy imports are present in beta and provider source inventories',async()=>{
 const packaging=await read('scripts/package-beta.py'),inventory=JSON.parse(await read('licensing/provider-packages.json'));
 const workers=['software-full-engine-worker','filter-retained-engine-worker','retained-decoder-worker','io-worker','audio-worklet','fast-source-inspector'];
 for(const worker of workers){
  const source=await read('web/'+worker+'.js');
  for(const match of source.matchAll(/from ['"]\.\/generated\/internal\/machine\/([^'"]+)\.js['"]/g)){
   const name=match[1],input='src/internal/machine/'+name+'.ts',output='web/generated/internal/machine/'+name+'.js';
   assert.ok(packaging.includes("'"+name+"'"),'beta worker helper missing: '+name);
   assert.ok(inventory.playerCoreSources.includes(input),'core source missing: '+input);
   assert.ok(inventory.profiles.mpv.generated.includes(output),'provider helper missing: '+output);
   assert.ok(inventory.ownershipRules.some(rule=>rule.owner==='core'&&rule.paths?.includes(input)),'source owner missing: '+input);
  }
 }
});
