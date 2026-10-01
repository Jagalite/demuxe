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
