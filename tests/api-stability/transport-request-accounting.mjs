// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ResourceLoader} from '../../web/resource-loader.js';
import {RangeReader} from '../../web/range-reader.js';
import {initialResourceLoader,transitionResourceLoader} from '../../web/generated/internal/machine/resource-loader.js';
import {initialRangeReader,transitionRangeReader} from '../../web/generated/internal/machine/range-reader.js';

for(const kind of ['resource','range'])test(`${kind} request admission counts a physical start exactly once`,()=>{
 const transition=kind==='resource'?transitionResourceLoader:transitionRangeReader;
 let state=kind==='resource'?initialResourceLoader(false):initialRangeReader({blockBytes:1024,cacheBytes:2048,readDeadlineMs:15000,immutable:true});
 const begin=transition(state,kind==='resource'?{type:'open',manifest:false}:{type:'begin',offset:0n,capacity:1});state=begin.state;const id=begin.request.id;
 state=transition(state,{type:'request',id,now:0}).state;
 assert.equal(state.stats.requests,0,'constructing a request descriptor is not a network request');
 state=transition(state,{type:'fetch-started',id}).state;assert.equal(state.stats.requests,1);
 const duplicate=transition(state,{type:'fetch-started',id});assert.equal(duplicate.aborted,true);assert.equal(duplicate.state.stats.requests,1);
});

for(const Reader of [ResourceLoader,RangeReader])test(`${Reader.name} header construction failure does not report a network request`,async t=>{
 const reader=new Reader({url:'https://media.example/movie',immutable:true,blockBytes:1024,cacheBytes:2048});
 let fetches=0;t.mock.method(globalThis,'fetch',async()=>{fetches++;throw Error('unexpected fetch');});
 const original=globalThis.Headers;
 globalThis.Headers=class {constructor(){throw Error('synthetic header construction failure');}};
 try{await assert.rejects(reader instanceof ResourceLoader?reader.open('movie'):reader.read(0n,1),/header construction failure/);assert.equal(fetches,0);assert.equal(reader.stats.requests,0);assert.equal(reader.busy,false);}
 finally{globalThis.Headers=original;reader.close();}
});
