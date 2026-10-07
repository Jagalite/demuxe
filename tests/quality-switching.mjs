// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultQualitySelection,qualitySelection,qualitySwitchBuffer} from '../web/generated/internal/machine/quality-switching.js';
import {switchingAbrFactory} from '../web/generated/internal/shaka-abr.js';
const context={candidates:[{id:'low',bandwidth:500000},{id:'high',bandwidth:2000000}],currentId:'low',recommendedId:'high'};
test('default buffers upgrades and expedites downgrades; invalid policy choices fall back',()=>{
 assert.deepEqual(defaultQualitySelection(context),{type:'switch',id:'high',urgency:'buffered'});
 assert.deepEqual(defaultQualitySelection({...context,currentId:'high',recommendedId:'low'}),{type:'switch',id:'low',urgency:'responsive'});
 for(const decision of [undefined,{type:'default'},{type:'switch',id:'other'},{type:'switch',id:'high',urgency:'unsafe'}])assert.deepEqual(qualitySelection(context,decision),{id:'high',urgency:'buffered'});
 assert.equal(qualitySelection(context,{type:'keep'}).id,'low');
 assert.equal(qualitySelection({...context,currentId:'expired'},{type:'keep'}).id,'high');
});
test('relative-margin backends retain buffered media for deferred clearing safety',()=>{
 assert.deepEqual(qualitySwitchBuffer(),{clearBuffer:false,safeMargin:0});
});
test('upstream ABR retains lifecycle and calls the custom choice from its own suggestion path',()=>{
 class Upstream {
  init(switcher,disable){this.switcher=switcher;this.disable=disable;}
  setVariants(variants){this.variants=variants;return true;}
  chooseVariant(){return this.variants[1];}
  getBandwidthEstimate(){return 4000000;}
  suggest(){this.switcher(this.chooseVariant(),false,0);}
  stop(){this.stopped=true;}release(){this.released=true;}
 }
 const low={id:1},high={id:2};let calls=0,observed;
 const factory=switchingAbrFactory({abr:{SimpleAbrManager:Upstream}},(recommended,candidates,estimate)=>{calls++;assert.equal(recommended,high);assert.equal(estimate,4000000);return {variant:candidates[0],urgency:'responsive'};},(variant,urgency)=>{assert.equal(variant,low);assert.equal(urgency,'responsive');return {clearBuffer:true,safeMargin:2};});
 const manager=factory(),disable=()=>{};manager.init((...args)=>{observed=args;},disable);manager.setVariants([low,high]);manager.suggest();
 assert.equal(calls,1);assert.deepEqual(observed,[low,true,2]);assert.equal(manager.disable,disable);manager.stop();manager.release();assert.equal(manager.stopped,true);assert.equal(manager.released,true);
});
