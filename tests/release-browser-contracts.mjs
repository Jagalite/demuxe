// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {browsers} from './api-stability/suites.mjs';
import {liveBoundaryCases} from './api-stability/live-boundary-scenarios.mjs';
import {liveNetworkCases} from './api-stability/live-network-scenarios.mjs';
export const releaseBrowserJobs=[
 ['api','tests/public-api.mjs',browsers.core.find(suite=>suite.file==='public-api').minimum],
 ['component','tests/player-component.mjs',61],
 ['boundaries','tests/api-stability/live-boundaries.mjs',liveBoundaryCases.length+liveNetworkCases.length],
 ['worker-tree','tests/worker-tree-containment.mjs',10],
 ['mobile','tests/player-mobile.mjs',null],
];
export const releasePlaywrightVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).devDependencies.playwright;
export function checkReleaseBrowserEnvironment(){
 const installed=createRequire(import.meta.url)('playwright/package.json').version;
 assert.equal(installed,releasePlaywrightVersion,'Installed Playwright must match the release pin; run npm ci --ignore-scripts');
}
export function checkReleaseBrowserReceipt(receipt,minimum){
 assert.equal(receipt.family,'webkit');assert.equal(receipt.passed,true);
 if(minimum!==null){
  assert.ok(Array.isArray(receipt.checks)&&receipt.checks.length>=minimum,`Incomplete browser receipt: expected at least ${minimum} checks`);
  assert.ok(receipt.checks.every(row=>row.passed===true),'Browser receipt contains a failed or incomplete check');
 }
}
