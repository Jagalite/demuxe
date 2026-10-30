// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpuSeconds,processTree,resourceLedger} from './process-resources.js';
test('process accounting parses macOS CPU clocks and unordered descendant trees',()=>{
 assert.equal(cpuSeconds('2:03.50'),123.5);assert.equal(cpuSeconds('1:02:03.5'),3723.5);assert.equal(cpuSeconds('2-01:02:03'),176523);
 const rows=processTree('3 2 7 0:01.50\n9 8 999 9:00.00\n2 1 5 0:02.00\n1 0 10 0:03.00',1);
 assert.deepEqual(rows.map(row=>row.pid),[3,2,1]);assert.equal(rows[0].rssBytes,7168);
 assert.throws(()=>processTree('2 0 5 0:00.00',1));assert.throws(()=>cpuSeconds('bad'));
});
test('sample ledger retains exited-child CPU without calling RSS physical memory',()=>{
 const ledger=resourceLedger();const first=ledger.observe([{pid:1,rssBytes:10,cpuSeconds:1},{pid:2,rssBytes:20,cpuSeconds:2}]);
 const final=ledger.observe([{pid:1,rssBytes:12,cpuSeconds:1.5}]);
 assert.equal(first.aggregateRssBytes,30);assert.equal(final.peakAggregateRssBytes,30);assert.equal(final.observedCpuSeconds,3.5);assert.equal(final.samples,2);
});
