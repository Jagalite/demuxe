// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveSeekTarget} from '../web/generated/player/interaction.js';
const ranges=[{start:0,end:10},{start:20,end:30}];
test('UI seeks cross gaps in the requested direction',()=>{
  assert.equal(resolveSeekTarget(13,ranges,8),20);
  assert.equal(resolveSeekTarget(17,ranges,22),9.95);
  assert.equal(resolveSeekTarget(5,ranges,8),5);
  assert.equal(resolveSeekTarget(-10,ranges,8),0);
  assert.equal(resolveSeekTarget(40,ranges,8),29.95);
});
test('moving live windows, short ranges and configured playback limits bound UI seeks',()=>{
  assert.equal(resolveSeekTarget(105,[{start:110,end:140}],115),110);
  assert.equal(resolveSeekTarget(11,[{start:10,end:10.01}],9),10);
  assert.equal(resolveSeekTarget(25,ranges,8,{start:5,end:9}),8.95);
  assert.equal(resolveSeekTarget(0,ranges,8,{start:5,end:25}),5);
  assert.equal(resolveSeekTarget(15,ranges,8,{start:11,end:19}),null);
  for(const value of [NaN,Infinity,-Infinity])assert.equal(resolveSeekTarget(value,ranges,8),null);
  assert.equal(resolveSeekTarget(1,[],0),null);assert.equal(resolveSeekTarget(1,null,0),null);
});
