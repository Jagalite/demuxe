// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {tracks} from '../web/generated/internal/state.js';
import {normalizeTrackPolicy,defaultTrack,trackAllowed,assertTrackSelection} from '../web/generated/internal/track-policy.js';
const list=tracks([{id:1,type:'audio',lang:'jpn',title:'Main',codec:'flac',default:true,selected:true,'ff-index':1},{id:2,type:'audio',lang:'eng',title:'Dub',codec:'flac','ff-index':2}],1,'hybrid');
test('default policy preserves file defaults and ordered preferences normalize language aliases',()=>{
 assert.equal(defaultTrack(list).id,list[0].id);assert.equal(defaultTrack(list,{default:[{language:'fra'},{language:'en-US'}]}).id,list[1].id);
 assert.equal(defaultTrack(list,{default:{title:'missing'}}).id,list[0].id);
 assert.equal(defaultTrack(list,{default:'off'}),null);
});
test('allowlists use OR between matchers and AND within each matcher',()=>{
 const policy={allowed:[{language:'en',codec:'FLAC'},{streamIndex:9}]};assert.equal(trackAllowed(list[0],policy),false);assert.equal(trackAllowed(list[1],policy),true);
 assert.equal(defaultTrack(list,policy).id,list[1].id);assert.equal(trackAllowed(list[1],{allowed:[{language:'en',title:'Main'}]}),false);
 assert.equal(defaultTrack(list,{allowed:[]}),null);assert.throws(()=>defaultTrack(list,{allowed:[],allowOff:false}),/requires a matching track/);
});
test('policy snapshots are immutable and invalid configurations fail closed',()=>{
 const input={audio:{allowed:[{language:'en'}],default:'file'}};const copy=normalizeTrackPolicy(input);input.audio.allowed[0].language='ja';assert.equal(copy.audio.allowed[0].language,'en');assert.ok(Object.isFrozen(copy.audio.allowed));
 for(const value of [null,[],{typo:{}},{audio:{allowOff:'false'}},{audio:{default:'off',allowOff:false}},{audio:{allowed:[{}]}},{audio:{default:[]}},{audio:{allowed:[{streamIndex:-1}]}},{audio:{default:{language:'invalid!'}}}])assert.throws(()=>normalizeTrackPolicy(value),/Track policy/);
});
test('manual selections enforce locks, auto, off and allowed tracks independently',()=>{
 assert.throws(()=>assertTrackSelection({locked:true},list[0].id,list[0]),/locked/);
 assert.throws(()=>assertTrackSelection({allowOff:false},null),/not allowed/);
 assert.throws(()=>assertTrackSelection({allowAuto:false},'auto'),/not allowed/);
 assert.throws(()=>assertTrackSelection({allowed:[{language:'en'}]},list[0].id,list[0]),/not allowed/);
 assert.doesNotThrow(()=>assertTrackSelection({allowOff:false},list[1].id,list[1]));
});
