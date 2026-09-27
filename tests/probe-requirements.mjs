// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requirementsForPlan,missingProbeFacts} from '../web/generated/internal/probe-requirements.js';
test('router requests route-specific evidence without equating missing evidence with incompatibility',()=>{
 const basic=['container','tracks'];
 for(const id of ['native-direct','native-direct-gain','native-remux','native-remux-gain'])assert.deepEqual(missingProbeFacts(requirementsForPlan(id),basic),[]);
 for(const id of ['native-direct-mpv','native-video-mpv-audio','native-transcode','native-remux-ass'])assert.deepEqual(missingProbeFacts(requirementsForPlan(id),basic),['duration']);
 assert.deepEqual(missingProbeFacts(requirementsForPlan('hybrid'),basic),['decoder-config']);
 assert.deepEqual(missingProbeFacts(requirementsForPlan('native-flac'),basic),['duration','track-bounds']);
});

test('Software fallback resolves facts missing from earlier uncertain routes',async()=>{
 const {missingRoutingFacts}=await import('../web/generated/internal/probe-requirements.js');
 const plans=[{id:'native-direct-mpv',eligible:false,code:'QUALIFICATION_REQUIRED'},
  {id:'hybrid',eligible:false,code:'DEPLOYMENT_UNAVAILABLE'},{id:'software',eligible:true}];
 assert.deepEqual(missingRoutingFacts(plans,['container','tracks']),['duration']);
 assert.deepEqual(missingRoutingFacts(plans,['container','tracks','duration']),[]);
 assert.deepEqual(missingRoutingFacts([{id:'native-direct-mpv',eligible:false,code:'QUALIFICATION_REQUIRED'},{id:'native-direct',eligible:true}],['container','tracks']),[]);
});
