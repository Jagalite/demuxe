// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {surfaces, contracts, browsers} from './suites.mjs';
import {publicSurface, recordedSurface} from './surface.mjs';

test('every published entrypoint has contract and scenario coverage',async()=>{
  for(const file of ['package.json','packages/player-core/package.json']) {
    const pkg=JSON.parse(await readFile(file,'utf8'));
    assert.deepEqual(Object.keys(pkg.exports).sort(),Object.keys(surfaces).sort(),file);
  }
  for(const surface of Object.values(surfaces)) {
    assert.ok(surface.contracts.length&&surface.browser.length);
    for(const group of surface.contracts)assert.ok(contracts[group]?.length,group);
    for(const group of surface.browser)assert.ok(browsers[group]?.length,group);
  }
  const files=Object.values(contracts).flat();
  assert.equal(new Set(files).size,files.length,'Duplicate contract membership');
  for(const file of [...files,...Object.values(browsers).flat().map(s=>s.file)])await access(`tests/${file}.mjs`);
});
test('public exports and public class/interface members cannot drift silently',async()=>{
  assert.deepEqual(publicSurface(),await recordedSurface(),
    'Review new/removed API members, add contract and workflow coverage, then refresh public-surface.json');
});
test('all package entrypoints import in SSR without registering browser globals',async()=>{
  for(const entry of Object.keys(surfaces))await import(entry==='.'?'demuxe':`demuxe/${entry.slice(2)}`);
  assert.equal(globalThis.customElements,undefined);
  assert.equal(globalThis.document,undefined);
});

test('behavior map accounts for every declared runtime API without treating inventory as full coverage',async()=>{
 const {buildCoverage}=await import('../../scripts/report-api-coverage.mjs');
 const current=await buildCoverage(),recorded=JSON.parse(await readFile('docs/api-behavior-coverage.json','utf8'));
 assert.deepEqual(current.unmapped,[],'Review newly exported runtime members and record their behavior family or gap');
 const mapping=report=>report.runtime.map(({key,status,behaviorGroup,liveAssertions})=>({key,status,behaviorGroup,liveAssertions}));
 assert.deepEqual(mapping(recorded),mapping(current),'Refresh the reviewed member-level coverage report');
 assert.deepEqual(recorded.structural,current.structural,'Type/data contract inventory drifted');
 assert.ok(current.dataContracts.every(row=>row.status==='structural-only'));
 assert.equal(current.summary.fullyCovered,0,'This family-level inventory must not claim exhaustive behavior coverage');
 for(const group of current.behaviorGroups){assert.ok(group.gaps.length,group.id);assert.ok(group.states&&group.failures&&group.backends,group.id);}
});
