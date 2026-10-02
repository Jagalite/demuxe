// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {providerAssetGraph} from '../../scripts/provider-asset-graph.mjs';
test('compiled declarations remain artifacts without consuming provider roots',()=>{
 const files={};for(let i=0;i<40;i++){files[`module-${i}.js`]=i?'export const x=1;':"export {x} from './module-1.js';";files[`module-${i}.d.ts`]='export declare const x:number;';}
 const graph=providerAssetGraph(files);assert.equal(graph.roots.length,40);assert.deepEqual(graph.dependencies['module-0.js'],['module-1.js']);assert.equal(Object.keys(graph.dependencies).length,80);
});
test('compiled import closure rejects missing files and unbounded executable roots',()=>{
 assert.throws(()=>providerAssetGraph({'a.js':"import './missing.js';"}),/Missing compiled/);
 assert.throws(()=>providerAssetGraph({'a.js':"import(target);"}),/computed/);
 assert.throws(()=>providerAssetGraph({'a.mjs':"import 'unreviewed';"}),/escapes package/);
 assert.throws(()=>providerAssetGraph(Object.fromEntries(Array.from({length:65},(_,i)=>[i+'.js','']))),/bounded/);
});

test('reviewed runtime engine loads do not become fabricated static imports',()=>{
 const files={'owners.js':'const module=await import(jsAsset.url);'};
 assert.deepEqual(providerAssetGraph(files,['jsAsset.url']).dependencies['owners.js'],[]);
 assert.throws(()=>providerAssetGraph({'owners.js':'await import(other.url);'},['jsAsset.url']),/Unreviewed/);
});

function closure(graph){
 const reached=new Set();
 const visit=name=>{if(reached.has(name))return;reached.add(name);for(const dependency of graph.dependencies[name])visit(dependency);};
 graph.roots.forEach(visit);return [...reached].sort();
}
test('large compiled wrappers compact roots without dropping executable integrity coverage',()=>{
 const files=Object.fromEntries(Array.from({length:100},(_,i)=>['module-'+i+'.js',i<99?`export * from './module-${i+1}.js';`:'export const value=1;']));
 files['entry.d.ts']='export declare const value:number;';
 const graph=providerAssetGraph(files);
 assert.deepEqual(graph.roots,['module-0.js']);
 assert.deepEqual(closure(graph),Object.keys(files).filter(name=>!name.endsWith('.d.ts')).sort());
 assert.equal(Object.keys(graph.dependencies).length,101);
 assert.deepEqual(graph.dependencies['entry.d.ts'],[]);
 assert.deepEqual(providerAssetGraph(files),graph);
});
test('compaction retains disconnected workers, wasm and reviewed computed engine roots',()=>{
 const files=Object.fromEntries(Array.from({length:64},(_,i)=>['part-'+i+'.js',i?'export const value=1;':Array.from({length:63},(_,n)=>`import './part-${n+1}.js';`).join('\n')]));
 Object.assign(files,{'worker.js':'await import(engine.url);','engine.mjs':'export const run=()=>{};','engine.wasm':''});
 const graph=providerAssetGraph(files,[{file:'worker.js',expression:'engine.url'}]);
 assert.deepEqual(graph.roots,['part-0.js','worker.js','engine.mjs','engine.wasm']);
 assert.deepEqual(closure(graph),Object.keys(files).sort());
 assert.deepEqual(graph.dependencies['worker.js'],[]);
});
test('cyclic imports fail even if another root can reach the cycle',()=>{
 assert.throws(()=>providerAssetGraph({'a.js':"import './b.js';",'b.js':"import './a.js';"}),/Cyclic provider/);
 assert.throws(()=>providerAssetGraph({'entry.js':"import './a.js';",'a.js':"import './b.js';",'b.js':"import './a.js';"}),/Cyclic provider/);
});
test('compaction preserves per-module dependency and independent-root budgets',()=>{
 const files=Object.fromEntries(Array.from({length:65},(_,i)=>['part-'+i+'.js','']));
 files['entry.js']=Object.keys(files).map(name=>`import './${name}';`).join('\n');
 assert.throws(()=>providerAssetGraph(files),/Too many provider dependencies/);
 const independent=Object.fromEntries(Array.from({length:65},(_,i)=>['entry-'+i+'.js',`import './leaf-${i}.js';`]));
 for(let i=0;i<65;i++)independent['leaf-'+i+'.js']='';
 assert.throws(()=>providerAssetGraph(independent),/bounded executable root/);
});
