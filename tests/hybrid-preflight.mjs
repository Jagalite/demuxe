// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hybridPreflight} from '../web/hybrid-preflight.js';

const video={type:'video',browserConfig:{kind:1,description:new Uint8Array([1,100,0,31,255,225,0]),width:1280,height:720}};
test('rejects explicit unsupported configuration with matching decoder policy',async()=>{
 const reason=await hybridPreflight([video],{async isConfigSupported(config){
  assert.equal(config.codec,'avc1.64001f');assert.equal(config.hardwareAcceleration,'no-preference');
  assert.equal(config.optimizeForLatency,false);assert.equal(config.description,video.browserConfig.description);
  return {supported:false};
 }});
 assert.match(reason,/unsupported.*avc1.64001f/);
});
test('supported, missing and ambiguous configurations do not reject',async()=>{
 assert.equal(await hybridPreflight([video],{isConfigSupported:async()=>({supported:true})}),undefined);
 const unexpected={isConfigSupported(){throw Error('must not query');}};
 assert.equal(await hybridPreflight([{type:'video'}],unexpected),undefined);
 assert.equal(await hybridPreflight([video,video],unexpected),undefined);
 assert.equal(await hybridPreflight([{...video,attachedPicture:true}],unexpected),undefined);
});
test('exceptions and a stalled capability query retain runtime fallback',async()=>{
 assert.equal(await hybridPreflight([video],{isConfigSupported(){throw Error('query failed');}}),undefined);
 assert.equal(await hybridPreflight([video],{isConfigSupported:()=>new Promise(()=>{})},5),undefined);
 assert.match(await hybridPreflight([video],null),/unavailable/);
});
