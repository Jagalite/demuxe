// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import path from 'node:path';
const {qualityState,qualityRequest,checkedQualityPolicy,initialQualityPolicy}=await import(pathToFileURL(path.resolve(process.env.QUALITY_MODULE)).href);
const backend=()=>({quality:{source:9,available:true,request:1,requested:1,preparing:1,demuxed:0,presented:-1,error:0,qualities:[{index:0,width:320,height:180,bitrate:350000},{index:1,width:640,height:360,bitrate:900000}]},adaptation:{policy:{mode:'manual'}}});
test('public IDs are source-scoped and requested quality is not presented quality',()=>{
 const q=qualityState(12,backend());assert.equal(q.requestedId,q.qualities[1].id);assert.equal(q.demuxedId,q.qualities[0].id);assert.equal(q.presentedId,null);
 assert.notEqual(qualityState(13,backend()).qualities[1].id,q.qualities[1].id);assert.notEqual(q.qualities[0].id,'0');
});
test('manual selection resolves only the current source identity',()=>{
 const q=qualityState(12,backend()),policy={mode:'manual',qualityId:q.qualities[1].id};assert.equal(qualityRequest(12,backend(),policy).representation,1);
 assert.throws(()=>qualityRequest(13,backend(),policy),e=>e.code==='INVALID_ARGUMENT');
});
test('unavailable routes and retired sources have no quality inventory',()=>{
 assert.equal(qualityState(null,backend()).qualities.length,0);assert.equal(qualityState(12,{}).available,false);
 assert.throws(()=>qualityRequest(12,{}, {mode:'auto'}),e=>e.code==='UNSUPPORTED_FEATURE');
});
test('automatic ceilings are validated and cannot exclude every representation',()=>{
 for(const maxBandwidth of [0,-1,NaN,Infinity,'1000'])assert.throws(()=>checkedQualityPolicy({mode:'auto',maxBandwidth}));
 assert.throws(()=>qualityRequest(12,backend(),{mode:'auto',maxHeight:100}));
 assert.deepEqual(qualityRequest(12,backend(),{mode:'auto',maxHeight:180}).policy,{mode:'auto',maxHeight:180});
});
test('policy input is copied and native identifiers do not leak in public state',()=>{
 const p={mode:'auto',maxWidth:640},copy=checkedQualityPolicy(p);p.maxWidth=1;assert.equal(copy.maxWidth,640);
 const q=qualityState(12,backend());assert.equal('source' in q,false);assert.equal('index' in q.qualities[0],false);
});
test('initial policy has unambiguous conservative manual or optional automatic ceilings',()=>{
 assert.deepEqual(initialQualityPolicy({mode:'manual'}),{mode:'manual'});assert.deepEqual(initialQualityPolicy({mode:'auto',maxWidth:640}),{mode:'auto',maxWidth:640});
 assert.throws(()=>initialQualityPolicy({mode:'manual',qualityId:'old'}));
});
