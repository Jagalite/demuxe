// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {releaseBrowserJobs,checkReleaseBrowserReceipt,checkReleaseBrowserEnvironment} from './release-browser-contracts.mjs';
const apiMinimum=releaseBrowserJobs.find(([name])=>name==='api')[2];
const receipt=count=>({family:'webkit',passed:true,checks:Array.from({length:count},()=>({passed:true}))});
test('installed browser tooling matches the release pin',checkReleaseBrowserEnvironment);
test('complete API receipt accepts the shared gate minimum and additional cases',()=>{
 assert.ok(apiMinimum>=22,'Worker retirement negative control must be required');
 checkReleaseBrowserReceipt(receipt(apiMinimum),apiMinimum);
 checkReleaseBrowserReceipt(receipt(apiMinimum+1),apiMinimum);
});
test('truncated API receipt fails even when its aggregate claims success',()=>{
 assert.throws(()=>checkReleaseBrowserReceipt(receipt(apiMinimum-1),apiMinimum),/Incomplete browser receipt/);
});
test('failed or unfinished cases cannot hide behind aggregate success',()=>{
 for(const value of [false,undefined]){const row=receipt(apiMinimum);row.checks[0].passed=value;assert.throws(()=>checkReleaseBrowserReceipt(row,apiMinimum),/failed or incomplete/);}
});
test('wrong browser and unsuccessful aggregate receipts fail',()=>{
 assert.throws(()=>checkReleaseBrowserReceipt({...receipt(apiMinimum),family:'firefox'},apiMinimum));
 assert.throws(()=>checkReleaseBrowserReceipt({...receipt(apiMinimum),passed:false},apiMinimum));
});
